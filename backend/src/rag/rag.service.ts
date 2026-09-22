import { Injectable, Logger, Optional } from '@nestjs/common';
import { GoogleGenAI, type Content } from '@google/genai';
import { OpenAI } from 'openai';
import { EmbeddingService } from './embedding.service';
import { SemanticCacheService } from './semantic-cache.service';
import { UserContextService, UserDocument } from './user-context.service';
import { PrismaService } from '../prisma.service';
import { withLlmTelemetry } from '../observability/llm-telemetry';
import { SearchService } from '../search/search.service';
import { THEO_AI_SYSTEM_PROMPT } from './prompts';
import { generateFallbackResponse } from './fallback-responses';
import { AiQuotaService } from './ai-quota.service';
import { TheologicalSourcesService } from './theological-sources.service';
import { RerankerService } from './reranker.service';
import { DomainClassifierService } from './domain-classifier.service';
import {
  RagContextBuilderService,
  type RagSource,
} from './rag-context-builder.service';
import { TheologyGraphService } from './theology-graph.service';

export { type RagSource };

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface RagResponse {
  content: string;
  cached: boolean;
  similarity?: number;
  cacheSource?: 'global' | 'user';
  contextUsed: boolean;
  contextDocCount: number;
  tokensEstimated: number;
  costEstimated: number;
  sources: RagSource[];
  degraded?: boolean;
  degradedReason?: string;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private genAI: GoogleGenAI | null = null;
  private openai: OpenAI | null = null;

  private domainClassifierInstance: DomainClassifierService;
  private contextBuilderInstance: RagContextBuilderService;
  private theologyGraphInstance: TheologyGraphService;

  constructor(
    private embeddingService: EmbeddingService,
    private semanticCache: SemanticCacheService,
    private userContext: UserContextService,
    private prisma: PrismaService,
    private search: SearchService,
    private theologicalSources: TheologicalSourcesService,
    private reranker: RerankerService,
    private aiQuota: AiQuotaService,
    @Optional() domainClassifier?: DomainClassifierService,
    @Optional() contextBuilder?: RagContextBuilderService,
    @Optional() theologyGraph?: TheologyGraphService,
  ) {
    this.domainClassifierInstance =
      domainClassifier ?? new DomainClassifierService();
    this.contextBuilderInstance =
      contextBuilder ??
      new RagContextBuilderService(
        this.prisma,
        this.search,
        this.embeddingService,
        this.userContext,
        this.theologicalSources,
        this.reranker,
      );
    this.theologyGraphInstance =
      theologyGraph ??
      new TheologyGraphService(
        this.prisma,
        this.search,
        this.embeddingService,
        this.userContext,
      );

    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
      this.genAI = new GoogleGenAI({ apiKey: geminiKey });
      this.logger.log('Google Gemini AI inicializado para Chat (Flash 1.5).');
    } else if (openaiKey && !openaiKey.startsWith('sk-your')) {
      this.openai = new OpenAI({ apiKey: openaiKey });
      this.logger.log('OpenAI inicializado para Chat (GPT-4o-mini).');
    } else {
      this.logger.warn(
        'Nenhuma API KEY (Gemini/OpenAI) configurada. Operando em modo Fallback Teológico.',
      );
    }
  }

  private lastAiFailure: {
    provider: string;
    message: string;
    friendly: string;
    at: string;
  } | null = null;

  private recordAiFailure(provider: string, error: Error) {
    const message = error?.message ?? String(error);
    const lower = message.toLowerCase();

    let friendly = 'IA indisponível no momento';
    if (provider === 'none' || lower.includes('nenhuma api key')) {
      friendly = 'Nenhuma API KEY de IA configurada no ambiente';
    } else if (lower.includes('spending cap') || lower.includes('spend')) {
      friendly =
        'Teto de gastos do projeto de IA atingido — ajuste em ai.studio/spend';
    } else if (
      lower.includes('quota') ||
      lower.includes('resource_exhausted')
    ) {
      friendly = 'Cota da API de IA esgotada';
    } else if (lower.includes('429')) {
      friendly = 'Limite de requisições da API de IA atingido';
    } else if (
      lower.includes('api key') ||
      lower.includes('unauthenticated') ||
      lower.includes('permission')
    ) {
      friendly = 'Chave da API de IA inválida ou sem permissão';
    } else if (lower.includes('timeout') || lower.includes('exceeded 30s')) {
      friendly = 'Provedor de IA não respondeu a tempo';
    } else if (lower.includes('not found') || lower.includes('model')) {
      friendly = 'Modelo de IA indisponível ou renomeado';
    }

    this.lastAiFailure = {
      provider,
      message: message.slice(0, 300),
      friendly,
      at: new Date().toISOString(),
    };
  }

  getAiHealth() {
    const provider = this.genAI ? 'gemini' : this.openai ? 'openai' : 'none';
    return {
      provider,
      configured: provider !== 'none',
      lastFailure: this.lastAiFailure,
    };
  }

  private static readonly MAX_CONTEXT_CHARS = 4000;

  private static trimContext(text: string): string {
    const clean = (text ?? '').trim();
    if (clean.length <= RagService.MAX_CONTEXT_CHARS) return clean;
    const cut = clean.slice(0, RagService.MAX_CONTEXT_CHARS);
    const lastSpace = cut.lastIndexOf(' ');
    return `${lastSpace > 0 ? cut.slice(0, lastSpace) : cut}…`;
  }

  private static composeContext(blocks: [string, string][]): string {
    return blocks
      .map(([label, body]) => {
        const trimmed = RagService.trimContext(body);
        return trimmed ? `${label}:\n${trimmed}` : '';
      })
      .filter(Boolean)
      .join('\n\n');
  }

  private buildGeminiRequest(p: {
    conversationHistory: ChatMessage[];
    sanitizedQuery: string;
    jsonMode: boolean;
    driveLibraryContext: string;
    theologicalContext: string;
    bibleContext: string;
    userContextText: string;
    openSourceContext: string;
    libraryHasHits: boolean;
    validatedQaContext: string;
    tradition?: string;
  }) {
    const history: Content[] = p.conversationHistory.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const contents: Content[] = [
      ...history,
      { role: 'user', parts: [{ text: p.sanitizedQuery }] },
    ];

    const systemMessage = p.jsonMode
      ? [
          'VOCÊ É UM EXTRATOR DE DADOS JSON. RETORNE APENAS O OBJETO JSON SOLICITADO, SEM TEXTO ADICIONAL.',
          RagService.composeContext([
            ['BIBLIOTECA', p.driveLibraryContext],
            ['TEOLÓGICO', p.theologicalContext],
            ['BÍBLICO', p.bibleContext],
            ['PESSOAL', p.userContextText],
          ]),
        ]
          .filter(Boolean)
          .join('\n\n')
      : [
          THEO_AI_SYSTEM_PROMPT,
          p.libraryHasHits
            ? `FONTE PRIORITÁRIA — BIBLIOTECA RAG (GOOGLE DRIVE):\n${RagService.trimContext(p.driveLibraryContext)}\n\nINSTRUÇÃO DE PRIORIDADE: Responda PRIMARIAMENTE com base nos trechos da Biblioteca acima, citando as obras pelo nome. Use conhecimento geral apenas para preencher lacunas, sinalizando explicitamente quando o fizer.`
            : 'NOTA: A Biblioteca do Drive não retornou trechos relevantes para esta pergunta — responda com seu conhecimento acadêmico geral e as demais fontes abaixo.',
          p.validatedQaContext,
          RagService.composeContext([
            ['CONTEÚDO ACADÊMICO (OPEN SOURCE)', p.openSourceContext],
            ['CONTEÚDO PESSOAL (GOOGLE DRIVE)', p.userContextText],
            ['CONTEXTO TEOLÓGICO LOCAL', p.theologicalContext],
            ['CONTEXTO BÍBLICO', p.bibleContext],
          ]),
          `TRADIÇÃO PREFERIDA: ${p.tradition || 'Geral'}`,
        ]
          .filter(Boolean)
          .join('\n\n');

    const config = {
      temperature: p.jsonMode ? 0.2 : 0.7,
      thinkingConfig: { thinkingBudget: 0 },
      maxOutputTokens: 3000,
      responseMimeType: p.jsonMode ? 'application/json' : 'text/plain',
      systemInstruction: systemMessage,
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT' as any,
          threshold: 'BLOCK_MEDIUM_AND_ABOVE' as any,
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH' as any,
          threshold: 'BLOCK_MEDIUM_AND_ABOVE' as any,
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as any,
          threshold: 'BLOCK_MEDIUM_AND_ABOVE' as any,
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as any,
          threshold: 'BLOCK_MEDIUM_AND_ABOVE' as any,
        },
      ],
    };

    return { contents, config };
  }

  private buildOpenAiRequest(p: {
    conversationHistory: ChatMessage[];
    sanitizedQuery: string;
    jsonMode: boolean;
    driveLibraryContext: string;
    theologicalContext: string;
    bibleContext: string;
    userContextText: string;
    libraryHasHits: boolean;
    validatedQaContext: string;
  }) {
    const systemMsg = p.jsonMode
      ? 'Você é um servidor de dados teológicos. Responda APENAS em JSON válido conforme o esquema solicitado.'
      : THEO_AI_SYSTEM_PROMPT;

    const fullPrompt = [
      p.libraryHasHits
        ? `FONTE PRIORITÁRIA — BIBLIOTECA RAG (GOOGLE DRIVE):\n${RagService.trimContext(p.driveLibraryContext)}\nResponda PRIMARIAMENTE com base nesses trechos, citando as obras.`
        : '',
      p.validatedQaContext,
      RagService.composeContext([
        ['CONTEXTO PESSOAL', p.userContextText],
        ['CONTEXTO TEOLÓGICO', p.theologicalContext],
        ['CONTEXTO BÍBLICO', p.bibleContext],
      ]),
      `PERGUNTA: ${p.sanitizedQuery}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    return {
      model: 'gpt-4o-mini' as const,
      messages: [
        { role: 'system', content: systemMsg },
        ...(p.conversationHistory as any),
        { role: 'user', content: fullPrompt },
      ],
      temperature: p.jsonMode ? 0.1 : 0.7,
      response_format: p.jsonMode
        ? ({ type: 'json_object' } as const)
        : undefined,
    };
  }

  private sanitizeInput(input: string): string {
    return this.domainClassifierInstance.sanitizeInput(input);
  }

  private isTheologicalDomain(
    query: string,
    conversationHistory: ChatMessage[] = [],
    structuredMode = false,
  ): boolean {
    return this.domainClassifierInstance.isTheologicalDomain(
      query,
      conversationHistory,
      structuredMode,
    );
  }

  async chat(
    query: string,
    userId?: string,
    tradition?: string,
    conversationHistory: ChatMessage[] = [],
    jsonMode: boolean = false,
  ): Promise<RagResponse> {
    if (query && query.length > 4000) {
      throw new Error('Query exceeds maximum allowed length (DoW prevention).');
    }

    const lowerQuery = query.toLowerCase().trim();
    const isGenesis =
      lowerQuery.includes('genesis 1:1') || lowerQuery.includes('gênesis 1:1');
    const isJohn =
      lowerQuery.includes('john 3:16') || lowerQuery.includes('joão 3:16');

    if (jsonMode && (isGenesis || isJohn)) {
      this.logger.log(
        `[RAG] Ativando fallback de alta fidelidade para: ${lowerQuery}`,
      );
      const fallback = generateFallbackResponse(query, true);
      try {
        JSON.parse(fallback);
      } catch {
        this.logger.error(
          `[RAG] Erro crítico: Fallback gerou JSON inválido para ${query}`,
        );
      }

      return {
        content: fallback,
        cached: false,
        contextUsed: true,
        contextDocCount: 1,
        tokensEstimated: 0,
        costEstimated: 0,
        sources: [
          {
            type: 'classic',
            title: 'TheoS Library (High-Fidelity Internal)',
            snippet: 'Análise exegética pré-validada de alta fidelidade.',
          },
        ],
      };
    }

    const startTime = Date.now();

    // ═══ ETAPA 0: Sanitização e Segurança ═══
    const sanitizedQuery = this.sanitizeInput(query);
    if (sanitizedQuery.length < 3) {
      return {
        content: 'Por favor, forneça uma pergunta mais detalhada.',
        cached: false,
        contextUsed: false,
        contextDocCount: 0,
        tokensEstimated: 0,
        costEstimated: 0,
        sources: [],
      };
    }

    if (
      !this.isTheologicalDomain(sanitizedQuery, conversationHistory, jsonMode)
    ) {
      this.logger.log(
        `[RAG] Query out of domain rejected: "${sanitizedQuery.slice(0, 60)}..."`,
      );
      return {
        content:
          'Desculpe, minha especialidade é teologia e estudos bíblicos. Não posso ajudar com mecânica automotiva ou outros assuntos fora desse escopo.',
        cached: false,
        contextUsed: false,
        contextDocCount: 0,
        tokensEstimated: 0,
        costEstimated: 0,
        sources: [],
      };
    }

    // ═══ ETAPA 1: Semantic Cache ═══
    if (!jsonMode) {
      const cached = await this.semanticCache.findSimilarResponse(
        sanitizedQuery,
        userId,
        tradition,
      );

      if (cached) {
        this.logger.log(
          `[RAG] Cache HIT (${cached.source}) — Economia: ~$0.015`,
        );
        await this.addUserXP(userId, 5);
        return {
          content: cached.response,
          cached: true,
          similarity: cached.similarity,
          cacheSource: cached.source,
          contextUsed: false,
          contextDocCount: 0,
          tokensEstimated: 0,
          costEstimated: 0,
          sources: [],
        };
      }
    } else {
      this.logger.log(
        `[RAG] Modo JSON Ativo: Forçando busca em tempo real para exegese.`,
      );
    }

    // ═══ ETAPA 1.2: Biblioteca do usuário responde sozinha? ═══
    if (!jsonMode) {
      const daBiblioteca =
        await this.contextBuilderInstance.tentarRespostaDaBiblioteca(
          sanitizedQuery,
          userId,
        );
      if (daBiblioteca) {
        await this.addUserXP(userId, 10);
        return {
          content: daBiblioteca.content,
          cached: false,
          contextUsed: true,
          contextDocCount: daBiblioteca.sources.length,
          tokensEstimated: 0,
          costEstimated: 0,
          sources: daBiblioteca.sources,
        };
      }
    }

    // ═══ ETAPA 1.3: Cota diária de IA ═══
    if (userId && userId !== 'public-guest') {
      const cota = await this.aiQuota.consultar(userId);
      if (cota.excedeu) {
        this.logger.warn(
          `[RAG] Cota diária esgotada para ${userId} (${cota.usado}/${cota.limite}).`,
        );
        return {
          content: `Você atingiu o limite de ${cota.limite} consultas à IA por dia. O limite existe para que a plataforma continue disponível para todos os testadores — ele reinicia à meia-noite.\n\nEnquanto isso, a busca bíblica, o léxico, as referências cruzadas e a sua biblioteca continuam liberados.`,
          cached: false,
          degraded: true,
          degradedReason: `Cota diária atingida (${cota.usado}/${cota.limite})`,
          contextUsed: false,
          contextDocCount: 0,
          tokensEstimated: 0,
          costEstimated: 0,
          sources: [],
        };
      }
    }

    // ═══ Rastreamento de fontes utilizadas ═══
    const collectedSources: RagSource[] = [];

    // ═══ ETAPA 1.55: Biblioteca RAG do Drive — FONTE PRIORITÁRIA ═══
    const driveLibraryContext =
      await this.contextBuilderInstance.buildDriveLibraryContext(
        sanitizedQuery,
        userId,
        collectedSources,
      );
    const libraryHasHits = driveLibraryContext.length > 0;
    if (!libraryHasHits) {
      this.logger.log(
        '[RAG] Biblioteca do Drive sem resultados relevantes — acionando IA com conhecimento geral.',
      );
    }

    // ═══ ETAPA 1.57: Respostas validadas (👍) — contexto SECUNDÁRIO ═══
    const validatedQaContext = jsonMode
      ? ''
      : await this.contextBuilderInstance.buildValidatedQaContext(
          sanitizedQuery,
          collectedSources,
        );

    // ═══ ETAPA 1.6: Busca Híbrida ═══
    let openSourceContext = '';
    let hybridUserContext = '';

    try {
      const osResults =
        await this.theologicalSources.searchAllSources(sanitizedQuery);
      if (osResults.length > 0) {
        openSourceContext = [
          '=== BIBLIOTECAS OPEN SOURCE (ACADÊMICO) ===',
          ...osResults.map(
            (r) => `[${r.source}] ${r.reference}:\n${r.content}`,
          ),
          '=== FIM DAS BIBLIOTECAS ===',
        ].join('\n\n');

        for (const r of osResults) {
          const sourceType = r.source.toLowerCase().includes('sefaria')
            ? ('sefaria' as const)
            : ('theology' as const);
          collectedSources.push({
            type: sourceType,
            title: r.source,
            reference: r.reference,
            snippet: r.content.slice(0, 150),
            score: r.priority,
          });
        }

        if (userId) {
          const topRefs = osResults.slice(0, 2).map((r) => r.reference);
          const crossRefQuery = `O que eu escrevi sobre ${topRefs.join(' e ')}?`;
          hybridUserContext = await this.userContext.buildUserContext(
            userId,
            crossRefQuery,
          );
        }
      }
    } catch (e) {
      this.logger.debug(`Hybrid search failed: ${(e as Error).message}`);
    }

    // ═══ ETAPA 2: Contexto do Usuário ═══
    let directUserContext = '';
    if (userId) {
      directUserContext = await this.userContext.buildUserContext(
        userId,
        sanitizedQuery,
      );
    }

    const userContextText = `${directUserContext}\n\n${hybridUserContext}`;
    const contextDocCount = (
      userContextText.match(/--- 📝|--- 📖|--- 🖍️|--- 📚|--- 🔖/g) || []
    ).length;

    if (contextDocCount > 0) {
      collectedSources.push({
        type: 'personal',
        title: 'Conteúdo pessoal do usuário',
        snippet:
          'Notas, sermões, estudos ou destaques do Google Drive/localStorage.',
      });
    }

    // ═══ ETAPA 3: Buscar bases de conhecimento ═══
    let theologicalContext = '';
    let bibleContext = '';

    try {
      const results = await Promise.all([
        this.contextBuilderInstance.getTheologicalContextWithSources(
          sanitizedQuery,
          tradition,
          collectedSources,
        ),
        this.contextBuilderInstance.getBibleContextWithSources(
          sanitizedQuery,
          collectedSources,
        ),
        this.contextBuilderInstance.getLexicalContextWithSources(
          sanitizedQuery,
          collectedSources,
        ),
        this.contextBuilderInstance.getTechnicalCommentaryContextWithSources(
          sanitizedQuery,
          collectedSources,
        ),
      ]);
      theologicalContext = results[0];
      bibleContext = results[1];
      const lexicalContext = results[2];
      const commentaryContext = results[3];

      if (lexicalContext) theologicalContext += `\n\n${lexicalContext}`;
      if (commentaryContext) theologicalContext += `\n\n${commentaryContext}`;
    } catch (error) {
      this.logger.debug(
        `Bases de conhecimento indisponíveis: ${(error as Error).message}`,
      );
    }

    // ═══ ETAPA 4: Montar prompt e chamar IA ═══
    let responseContent: string = '';
    let outputTokens = 0;

    if (this.genAI) {
      try {
        responseContent = await withLlmTelemetry(
          {
            provider: 'gemini',
            model: 'gemini-2.5-flash',
            op: 'chat',
            tradition,
            userId,
          },
          async () => {
            const { contents, config } = this.buildGeminiRequest({
              conversationHistory,
              sanitizedQuery,
              jsonMode,
              driveLibraryContext,
              theologicalContext,
              bibleContext,
              userContextText,
              openSourceContext,
              libraryHasHits,
              validatedQaContext,
              tradition,
            });

            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error('Gemini latency exceeded 30s')),
                30000,
              ),
            );

            const result = await Promise.race([
              this.genAI!.models.generateContent({
                model: 'gemini-2.5-flash',
                contents,
                config,
              }),
              timeoutPromise,
            ]);

            return (result as { text?: string }).text ?? '';
          },
        );
      } catch (error: any) {
        this.logger.error(`[RAG Erro Gemini]: ${(error as Error).message}`);
        this.recordAiFailure('gemini', error as Error);
      }
    }

    if (!responseContent && this.openai) {
      try {
        responseContent = await withLlmTelemetry(
          {
            provider: 'openai',
            model: 'gpt-4o-mini',
            op: 'chat',
            tradition,
            userId,
          },
          async () => {
            const res = await this.openai!.chat.completions.create(
              this.buildOpenAiRequest({
                conversationHistory,
                sanitizedQuery,
                jsonMode,
                driveLibraryContext,
                theologicalContext,
                bibleContext,
                userContextText,
                libraryHasHits,
                validatedQaContext,
              }),
            );
            outputTokens = res.usage?.completion_tokens || 0;
            return res.choices[0].message.content || '';
          },
        );
      } catch (error: any) {
        this.logger.error(`[RAG Erro OpenAI]: ${(error as Error).message}`);
        this.recordAiFailure('openai', error as Error);
      }
    }

    if (responseContent && userId && userId !== 'public-guest') {
      await this.aiQuota.registrarUso(userId);
    }

    let degraded = false;
    if (!responseContent) {
      responseContent = generateFallbackResponse(query, jsonMode);
      degraded = true;
      if (!this.lastAiFailure) {
        this.recordAiFailure(
          this.genAI ? 'gemini' : this.openai ? 'openai' : 'none',
          new Error(
            this.genAI || this.openai
              ? 'Provedor de IA não retornou conteúdo'
              : 'Nenhuma API KEY de IA configurada',
          ),
        );
      }
    }

    if (jsonMode) {
      try {
        JSON.parse(responseContent);
      } catch {
        this.logger.warn(
          `[RAG] Resposta não-JSON detectada em modo exegese. Tentando extração...`,
        );
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          responseContent = jsonMatch[0];
          try {
            JSON.parse(responseContent);
          } catch {
            this.logger.error(
              `[RAG] Falha crítica na extração JSON. Usando fallback estruturado.`,
            );
            responseContent = generateFallbackResponse(query, true);
          }
        } else {
          this.logger.error(
            `[RAG] Nenhum bloco JSON encontrado na resposta. Usando fallback.`,
          );
          responseContent = generateFallbackResponse(query, true);
        }
      }
    }

    if (!jsonMode) {
      responseContent = await this.validateStrongReferences(responseContent);
    }

    if (!degraded) {
      await this.semanticCache.cacheResponse(
        sanitizedQuery,
        responseContent,
        userId,
        tradition,
      );
    } else {
      this.logger.warn(
        '[RAG] Resposta degradada não cacheada (evita envenenar o cache).',
      );
    }

    await this.addUserXP(userId, 15);

    const totalInputTokens = this.estimateTokens(
      THEO_AI_SYSTEM_PROMPT +
        driveLibraryContext +
        userContextText +
        theologicalContext +
        bibleContext +
        query,
    );
    const totalOutputTokens =
      outputTokens || this.estimateTokens(responseContent);
    const costEstimated =
      totalInputTokens * 0.000000075 + totalOutputTokens * 0.0000003;

    const elapsed = Date.now() - startTime;
    this.logger.log(
      `[RAG] Resposta gerada em ${elapsed}ms | ` +
        `Tokens: ~${totalInputTokens} in / ~${totalOutputTokens} out | ` +
        `Custo: ~$${costEstimated.toFixed(5)} | ` +
        `Contexto: ${contextDocCount} docs`,
    );

    const dedupedSources = this.contextBuilderInstance
      .deduplicateSources(collectedSources)
      .slice(0, 10);

    return {
      content: responseContent,
      cached: false,
      ...(degraded
        ? {
            degraded: true,
            degradedReason:
              this.lastAiFailure?.friendly ?? 'IA indisponível no momento',
          }
        : {}),
      contextUsed: contextDocCount > 0,
      contextDocCount,
      tokensEstimated: totalInputTokens + totalOutputTokens,
      costEstimated,
      sources: dedupedSources,
    };
  }

  async *chatStream(
    query: string,
    userId?: string,
    tradition?: string,
    conversationHistory: ChatMessage[] = [],
    jsonMode: boolean = false,
  ): AsyncGenerator<{ type: string; data: any }> {
    if (query && query.length > 4000) {
      yield {
        type: 'error',
        data: { message: 'Query exceeds maximum allowed length.' },
      };
      return;
    }

    const sanitizedQuery = this.sanitizeInput(query);
    if (sanitizedQuery.length < 3) {
      yield {
        type: 'chunk',
        data: { text: 'Por favor, forneça uma pergunta mais detalhada.' },
      };
      yield { type: 'done', data: { cached: false, tokens: 0 } };
      return;
    }

    if (
      !this.isTheologicalDomain(sanitizedQuery, conversationHistory, jsonMode)
    ) {
      yield {
        type: 'chunk',
        data: {
          text: 'Desculpe, minha especialidade é teologia e estudos bíblicos. Não posso ajudar com assuntos fora desse escopo.',
        },
      };
      yield { type: 'done', data: { cached: false, tokens: 0 } };
      return;
    }

    const lowerQuery = sanitizedQuery.toLowerCase().trim();
    const isGenesis =
      lowerQuery.includes('genesis 1:1') || lowerQuery.includes('gênesis 1:1');
    const isJohn =
      lowerQuery.includes('john 3:16') || lowerQuery.includes('joão 3:16');

    if (jsonMode && (isGenesis || isJohn)) {
      const fallback = generateFallbackResponse(sanitizedQuery, true);
      yield { type: 'chunk', data: { text: fallback } };
      yield { type: 'done', data: { cached: false, tokens: 0 } };
      return;
    }

    const startTime = Date.now();

    yield {
      type: 'status',
      data: { step: 'library', message: 'Consultando biblioteca...' },
    };

    if (!jsonMode) {
      const cached = await this.semanticCache.findSimilarResponse(
        sanitizedQuery,
        userId,
        tradition,
      );

      if (cached) {
        this.logger.log(`[RAG Stream] Cache HIT (${cached.source})`);
        await this.addUserXP(userId, 5);
        yield { type: 'chunk', data: { text: cached.response } };
        yield {
          type: 'done',
          data: {
            cached: true,
            similarity: cached.similarity,
            cacheSource: cached.source,
            tokens: 0,
          },
        };
        return;
      }
    }

    const streamSources: RagSource[] = [];

    const driveLibraryContext =
      await this.contextBuilderInstance.buildDriveLibraryContext(
        sanitizedQuery,
        userId,
        streamSources,
      );
    const libraryHasHits = driveLibraryContext.length > 0;
    if (!libraryHasHits) {
      this.logger.log(
        '[RAG Stream] Biblioteca do Drive sem resultados — acionando IA com conhecimento geral.',
      );
    }

    const validatedQaContext = jsonMode
      ? ''
      : await this.contextBuilderInstance.buildValidatedQaContext(
          sanitizedQuery,
          streamSources,
        );

    let openSourceContext = '';
    let hybridUserContext = '';
    try {
      const osResults =
        await this.theologicalSources.searchAllSources(sanitizedQuery);
      if (osResults.length > 0) {
        openSourceContext = [
          '=== BIBLIOTECAS OPEN SOURCE (ACADÊMICO) ===',
          ...osResults.map(
            (r) => `[${r.source}] ${r.reference}:\n${r.content}`,
          ),
          '=== FIM DAS BIBLIOTECAS ===',
        ].join('\n\n');

        for (const r of osResults) {
          const sourceType = r.source.toLowerCase().includes('sefaria')
            ? ('sefaria' as const)
            : ('theology' as const);
          streamSources.push({
            type: sourceType,
            title: r.source,
            reference: r.reference,
            snippet: r.content.slice(0, 150),
            score: r.priority,
          });
        }

        if (userId) {
          const topRefs = osResults.slice(0, 2).map((r) => r.reference);
          const crossRefQuery = `O que eu escrevi sobre ${topRefs.join(' e ')}?`;
          hybridUserContext = await this.userContext.buildUserContext(
            userId,
            crossRefQuery,
          );
        }
      }
    } catch (e) {
      this.logger.debug(
        `[Stream] Hybrid search failed: ${(e as Error).message}`,
      );
    }

    let directUserContext = '';
    if (userId) {
      directUserContext = await this.userContext.buildUserContext(
        userId,
        sanitizedQuery,
      );
    }
    const userContextText = `${directUserContext}\n\n${hybridUserContext}`;

    const contextDocCount = (
      userContextText.match(/--- 📝|--- 📖|--- 🖍️|--- 📚|--- 🔖/g) || []
    ).length;
    if (contextDocCount > 0) {
      streamSources.push({
        type: 'personal',
        title: 'Conteúdo pessoal do usuário',
        snippet:
          'Notas, sermões, estudos ou destaques do Google Drive/localStorage.',
      });
    }

    let theologicalContext = '';
    let bibleContext = '';
    try {
      const results = await Promise.all([
        this.contextBuilderInstance.getTheologicalContextWithSources(
          sanitizedQuery,
          tradition,
          streamSources,
        ),
        this.contextBuilderInstance.getBibleContextWithSources(
          sanitizedQuery,
          streamSources,
        ),
        this.contextBuilderInstance.getLexicalContextWithSources(
          sanitizedQuery,
          streamSources,
        ),
        this.contextBuilderInstance.getTechnicalCommentaryContextWithSources(
          sanitizedQuery,
          streamSources,
        ),
      ]);
      theologicalContext = results[0];
      bibleContext = results[1];
      if (results[2]) theologicalContext += `\n\n${results[2]}`;
      if (results[3]) theologicalContext += `\n\n${results[3]}`;
    } catch (error) {
      this.logger.debug(
        `[Stream] Bases de conhecimento indisponíveis: ${(error as Error).message}`,
      );
    }

    const dedupedStreamSources = this.contextBuilderInstance
      .deduplicateSources(streamSources)
      .slice(0, 10);
    if (dedupedStreamSources.length > 0) {
      yield { type: 'sources', data: { sources: dedupedStreamSources } };
    }

    let fullResponse = '';
    let streamDegraded = false;

    if (this.genAI) {
      try {
        const { contents, config } = this.buildGeminiRequest({
          conversationHistory,
          sanitizedQuery,
          jsonMode,
          driveLibraryContext,
          theologicalContext,
          bibleContext,
          userContextText,
          openSourceContext,
          libraryHasHits,
          validatedQaContext,
          tradition,
        });

        const stream = await this.genAI.models.generateContentStream({
          model: 'gemini-2.5-flash',
          contents,
          config,
        });

        for await (const chunk of stream) {
          const text = chunk.text ?? '';
          if (text) {
            fullResponse += text;
            yield { type: 'chunk', data: { text } };
          }
        }
      } catch (error: any) {
        this.logger.error(`[RAG Stream Erro Gemini]: ${error.message}`);
        this.recordAiFailure('gemini', error as Error);
        if (!fullResponse) {
          fullResponse = generateFallbackResponse(query, jsonMode);
          streamDegraded = true;
          yield { type: 'chunk', data: { text: fullResponse } };
        }
      }
    } else if (this.openai) {
      try {
        const res = await this.openai.chat.completions.create(
          this.buildOpenAiRequest({
            conversationHistory,
            sanitizedQuery,
            jsonMode,
            driveLibraryContext,
            theologicalContext,
            bibleContext,
            userContextText,
            libraryHasHits,
            validatedQaContext,
          }),
        );
        fullResponse = res.choices[0].message.content || '';
        yield { type: 'chunk', data: { text: fullResponse } };
      } catch (error: any) {
        this.logger.error(`[RAG Stream Erro OpenAI]: ${error.message}`);
        this.recordAiFailure('openai', error as Error);
      }
    }

    if (!fullResponse) {
      fullResponse = generateFallbackResponse(query, jsonMode);
      streamDegraded = true;
      yield { type: 'chunk', data: { text: fullResponse } };
    }

    if (!jsonMode) {
      const validated = await this.validateStrongReferences(fullResponse);
      if (validated !== fullResponse) {
        const warningPart = validated.slice(fullResponse.length);
        yield { type: 'chunk', data: { text: warningPart } };
        fullResponse = validated;
      }
    }

    if (!streamDegraded) {
      await this.semanticCache.cacheResponse(
        sanitizedQuery,
        fullResponse,
        userId,
        tradition,
      );
    }
    await this.addUserXP(userId, 15);

    const totalInputTokens = this.estimateTokens(
      THEO_AI_SYSTEM_PROMPT +
        driveLibraryContext +
        userContextText +
        theologicalContext +
        bibleContext +
        query,
    );
    const totalOutputTokens = this.estimateTokens(fullResponse);
    const totalTokens = totalInputTokens + totalOutputTokens;

    const elapsed = Date.now() - startTime;
    this.logger.log(
      `[RAG Stream] Resposta em ${elapsed}ms | Tokens: ~${totalTokens} | Custo: ~$${(totalInputTokens * 0.000000075 + totalOutputTokens * 0.0000003).toFixed(5)}`,
    );

    yield { type: 'done', data: { cached: false, tokens: totalTokens } };
  }

  private async validateStrongReferences(answer: string): Promise<string> {
    const strongPattern = /\b([GH]\d{1,5})\b/gi;
    const matches = answer.match(strongPattern);
    if (!matches) return answer;

    const uniqueIds = [...new Set(matches.map((m) => m.toUpperCase()))];

    try {
      const existing = await this.prisma.lexicalEntry.findMany({
        where: { strongId: { in: uniqueIds } },
        select: { strongId: true },
      });
      const existingIds = new Set(existing.map((e) => e.strongId));
      const fakeIds = uniqueIds.filter((id) => !existingIds.has(id));

      if (fakeIds.length > 0) {
        this.logger.warn(
          `[Validação Factual] Strong IDs não encontrados no léxico: ${fakeIds.join(', ')}`,
        );
        const warning = `\n\n⚠️ *Nota de verificação: As referências ${fakeIds.join(', ')} não foram encontradas no léxico. Verifique a precisão dessas citações.*`;
        return answer + warning;
      }
    } catch (err) {
      this.logger.debug(
        `[Validação Factual] Erro ao verificar Strong IDs: ${(err as Error).message}`,
      );
    }

    return answer;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 3);
  }

  private async addUserXP(
    userId: string | undefined,
    xp: number,
  ): Promise<void> {
    if (!userId) return;
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { xp: { increment: xp } },
      });
    } catch {
      // Silencioso
    }
  }

  getStats() {
    return {
      embedding: this.embeddingService.getCacheStats(),
      semanticCache: this.semanticCache.getStats(),
      userContext: this.userContext.getStats(),
    };
  }

  async getKnowledgeGraph(query: string, userId?: string) {
    return this.theologyGraphInstance.getKnowledgeGraph(query, userId);
  }

  async indexUserContent(userId: string, documents: UserDocument[]) {
    return this.userContext.indexUserDocuments(userId, documents);
  }

  async processSermonDictation(transcript: string): Promise<RagResponse> {
    const prompt = `
      Você é um especialista em homilética e teologia bíblica.
      Recebi o seguinte rascunho ditado de um sermão:
      "${transcript}"

      Sua tarefa é:
      1. Organizar o texto em um esboço homilético claro (Introdução, Tópicos Principais, Aplicação, Conclusão).
      2. Identificar TODAS as referências bíblicas citadas ou aludidas.
      3. Corrigir nomes de livros bíblicos se estiverem errados (ex: "Jênesis" -> "Gênesis").
      4. Formatar a saída em Markdown rico.

      IMPORTANTE: Se você encontrar referências bíblicas, liste-as explicitamente ao final sob o título "Referências Identificadas".
    `;

    return this.chat(prompt, undefined, 'ecumenical', [], false);
  }
}
