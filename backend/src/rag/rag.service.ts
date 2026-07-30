import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI, type Content } from '@google/genai';
import { OpenAI } from 'openai';
import { EmbeddingService } from './embedding.service';
import { SemanticCacheService } from './semantic-cache.service';
import { UserContextService, UserDocument } from './user-context.service';
import { PrismaService } from '../prisma.service';
import { withLlmTelemetry } from '../observability/llm-telemetry';
import { SearchService } from '../search/search.service';
import { THEO_AI_SYSTEM_PROMPT } from './prompts';
import { CLASSIC_COMMENTARIES } from './classic-commentaries';
import { generateFallbackResponse } from './fallback-responses';
import { TheologicalSourcesService } from './theological-sources.service';
import { CURATED_GRAPHS } from './curated-graphs.registry';
import { RerankerService } from './reranker.service';

/**
 * RagService — Orquestrador principal do sistema RAG via Google Gemini.
 *
 * Pipeline de economia de custos:
 *  - Cache Semântico Local ($0.00)
 *  - Google Gemini 1.5 Flash ($0.075/1M tokens - ultra barato)
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/** Fonte individual utilizada na composição da resposta RAG. */
export interface RagSource {
  type:
    | 'bible'
    | 'theology'
    | 'lexicon'
    | 'commentary'
    | 'classic'
    | 'personal'
    | 'sefaria';
  title: string;
  reference?: string; // ex: "João 3:16", "Strong G26"
  snippet: string; // primeiros ~150 caracteres do conteúdo
  score?: number; // relevância, se disponível
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
  sources: RagSource[]; // fontes utilizadas na resposta
  /**
   * true quando nenhum provedor de IA respondeu e o conteúdo veio do texto
   * pré-escrito de fallback-responses.ts.
   *
   * Existe porque em 29/07/2026 a cota do Gemini estourou e a plataforma
   * passou dias devolvendo um ensaio genérico sobre Calvinismo, com HTTP 200,
   * para qualquer pergunta — indistinguível de uma resposta real, tanto para
   * o usuário quanto para o monitoramento.
   */
  degraded?: boolean;
  /** Motivo legível da degradação (ex.: cota excedida, timeout). */
  degradedReason?: string;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private genAI: GoogleGenAI | null = null;
  private openai: OpenAI | null = null;

  constructor(
    private embeddingService: EmbeddingService,
    private semanticCache: SemanticCacheService,
    private userContext: UserContextService,
    private prisma: PrismaService,
    private search: SearchService,
    private theologicalSources: TheologicalSourcesService,
    private reranker: RerankerService,
  ) {
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

  /**
   * Última falha de provedor de IA. Alimenta GET /api/v1/health/ai e o campo
   * `degradedReason` das respostas — sem isso o erro só existia numa linha de
   * log do Render, invisível para quem usa e para o monitoramento.
   */
  private lastAiFailure: {
    provider: string;
    message: string;
    friendly: string;
    at: string;
  } | null = null;

  /** Traduz o erro do provedor para uma causa acionável. */
  private recordAiFailure(provider: string, error: Error) {
    const message = error?.message ?? String(error);
    const lower = message.toLowerCase();

    let friendly = 'IA indisponível no momento';
    // Ausência de chave vem antes: a mensagem contém "API KEY" e cairia no
    // ramo de chave inválida, que aponta para o diagnóstico errado.
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

  /** Estado do subsistema de IA — consumido por GET /api/v1/health/ai. */
  getAiHealth() {
    const provider = this.genAI ? 'gemini' : this.openai ? 'openai' : 'none';
    return {
      provider,
      configured: provider !== 'none',
      lastFailure: this.lastAiFailure,
    };
  }

  /**
   * Pipeline principal de chat com RAG.
   */
  // ─── Builders compartilhados chat/chatStream (refactor 2026-07-21) ────
  // chat() e chatStream() montavam contents, system prompt e config do
  // Gemini (e as messages do OpenAI) em blocos duplicados de ~90 linhas.
  // Fonte única aqui; os call sites decidem apenas entre generateContent
  // e generateContentStream (ou stream vs completions no OpenAI).

  /**
   * Teto por bloco de contexto. Trechos recuperados podem vir longos e o
   * modelo raramente aproveita o excedente — mas ele é cobrado por token
   * de entrada em toda chamada.
   */
  private static readonly MAX_CONTEXT_CHARS = 4000;

  /** Corta um bloco de contexto no limite, sem partir palavra. */
  private static trimContext(text: string): string {
    const clean = (text ?? '').trim();
    if (clean.length <= RagService.MAX_CONTEXT_CHARS) return clean;
    const cut = clean.slice(0, RagService.MAX_CONTEXT_CHARS);
    const lastSpace = cut.lastIndexOf(' ');
    return `${lastSpace > 0 ? cut.slice(0, lastSpace) : cut}…`;
  }

  /**
   * Monta os blocos rotulados, descartando os vazios. Um rótulo sem conteúdo
   * é custo puro: ocupa tokens de entrada e não informa nada.
   */
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

    // Blocos vazios não entram mais no prompt. Antes os rótulos iam sempre —
    // "CONTEÚDO PESSOAL (GOOGLE DRIVE):" seguido de nada — e o modelo pagava
    // por tokens que não carregavam informação (economia 2026-07-30).
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
      /**
       * O gemini-2.5-flash "pensa" antes de responder, e os tokens de
       * raciocínio saem do MESMO maxOutputTokens da resposta. Medido em
       * 30/07/2026 com uma pergunta exegética real:
       *
       *   raciocínio livre, teto 3000 → 1852 tok pensando, resposta CORTADA
       *   raciocínio livre, teto 1500 →  57 tok de resposta (173 caracteres!)
       *   raciocínio  = 0,  teto 2000 → resposta COMPLETA, 6242 caracteres
       *
       * Ou seja: a plataforma vinha truncando respostas mesmo com 3000, e o
       * corte para 1500 (tentativa de economia) as destruiu. Desligar o
       * raciocínio devolve resposta inteira, mais longa e ainda assim mais
       * barata — 1812 tokens de saída contra 2996.
       */
      thinkingConfig: { thinkingBudget: 0 },
      /**
       * maxOutputTokens é TETO, não reserva: você paga pelos tokens que o
       * modelo realmente gera. Baixá-lo não economiza nada em resposta curta
       * — só corta a longa no meio da frase. A economia veio de desligar o
       * raciocínio (≈1850 tokens por chamada), não daqui.
       */
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

    // Mesma regra do builder do Gemini: bloco vazio não vai para o prompt.
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
    // Force high-quality fallback for key demonstration verses
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

      // Validação extra: garante que é uma string JSON válida
      try {
        JSON.parse(fallback);
      } catch (e) {
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
            title: 'TheoS Library (High-Fidelity Internal)',
            url: '#',
            snippet: 'Análise exegética pré-validada de alta fidelidade.',
          },
        ],
        meta: {
          model: 'theos-internal-gold',
          tokens: 0,
          processingTime: 5,
        },
      } as any; // Cast for meta compatibility
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
    // Importante: No modo JSON (Exegese), ignoramos o cache semântico para evitar
    // retornar respostas textuais antigas que quebrariam o frontend.
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
          sources: [], // cache hit — fontes não rastreadas
        };
      }
    } else {
      this.logger.log(
        `[RAG] Modo JSON Ativo: Forçando busca em tempo real para exegese.`,
      );
    }

    // ═══ ETAPA 1.5: Hard-Override para Exegese PhD (Passagens Base) ═══
    // Garante que passagens fundamentais sempre retornem dados reais, mesmo se a IA falhar ou for lenta.
    if (
      jsonMode &&
      (sanitizedQuery.toLowerCase().includes('gênesis 1:1') ||
        sanitizedQuery.toLowerCase().includes('genesis 1:1') ||
        sanitizedQuery.toLowerCase().includes('joão 3:16') ||
        sanitizedQuery.toLowerCase().includes('john 3:16'))
    ) {
      this.logger.log('[RAG] Aplicando Hard-Override para passagem base.');
      return {
        content: generateFallbackResponse(sanitizedQuery, true),
        cached: false,
        contextUsed: true,
        contextDocCount: 1,
        tokensEstimated: 0,
        costEstimated: 0,
        sources: [
          {
            type: 'classic' as const,
            title: 'TheoSphere Internal Library',
            snippet: 'Análise exegética pré-validada de alta fidelidade.',
          },
        ],
      };
    }

    // ═══ Rastreamento de fontes utilizadas ═══
    const collectedSources: RagSource[] = [];

    // ═══ ETAPA 1.55: Biblioteca RAG do Drive — FONTE PRIORITÁRIA ═══
    // Regra do produto (2026-07-20): sempre buscar primeiro na biblioteca
    // ingerida do Google Drive (usuário + acervo compartilhado). Com hits,
    // a IA responde ancorada nesses trechos; sem hits, aciona a IA com
    // conhecimento geral (fluxo tradicional abaixo).
    const driveLibraryContext = await this.buildDriveLibraryContext(
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
      : await this.buildValidatedQaContext(sanitizedQuery, collectedSources);

    // ═══ ETAPA 1.6: Busca Híbrida (Open Source + Cross-Reference no Drive) ═══
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

        // Coleta fontes do open source (Sefaria, Bible API, etc.)
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

        // Cruzamento Inteligente: Buscar no Drive sobre as referências encontradas no Open Source
        if (userId) {
          const topRefs = osResults.slice(0, 2).map((r) => r.reference);
          const crossRefQuery = `O que eu escrevi sobre ${topRefs.join(' e ')}?`;
          hybridUserContext = await this.userContext.buildUserContext(
            userId,
            crossRefQuery,
          );
          this.logger.log(
            `[Híbrido] Cruzando dados externos com notas pessoais sobre ${topRefs.join(', ')}`,
          );
        }
      }
    } catch (e) {
      this.logger.debug(`Hybrid search failed: ${(e as Error).message}`);
    }

    // ═══ ETAPA 2: Contexto do Usuário (Busca Direta) ═══
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

    // Coleta fontes pessoais do usuário
    if (contextDocCount > 0) {
      collectedSources.push({
        type: 'personal',
        title: 'Conteúdo pessoal do usuário',
        snippet:
          'Notas, sermões, estudos ou destaques do Google Drive/localStorage.',
      });
    }

    // ═══ ETAPA 3: Buscar bases de conhecimento (pgvector) ═══
    let theologicalContext = '';
    let bibleContext = '';

    try {
      const results = await Promise.all([
        this.getTheologicalContextWithSources(
          sanitizedQuery,
          tradition,
          collectedSources,
        ),
        this.getBibleContextWithSources(sanitizedQuery, collectedSources),
        this.getLexicalContextWithSources(sanitizedQuery, collectedSources),
        this.getTechnicalCommentaryContextWithSources(
          sanitizedQuery,
          collectedSources,
        ),
      ]);
      theologicalContext = results[0];
      bibleContext = results[1];
      const lexicalContext = results[2];
      const commentaryContext = results[3];

      // Adiciona novos contextos se existirem
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
            // @google/genai 2.x: chamada unificada `models.generateContent`.
            // Request montado pelo builder compartilhado com chatStream.
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

            // 30s Timeout + Race for resilience (DT-9)
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

            // `result.text` é um getter que concatena as partes textuais.
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

    // Nenhum provedor respondeu: o conteúdo abaixo é texto pré-escrito, não
    // uma resposta à pergunta. Marcamos para que a interface avise e para que
    // a verificação diária consiga enxergar (antes isso era HTTP 200 mudo).
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

    // ═══ ETAPA 4.5: Validação e Extração JSON (Anti-Crash) ═══
    if (jsonMode) {
      try {
        // Tenta parsear para validar. Se falhar, tenta extrair.
        JSON.parse(responseContent);
      } catch (e) {
        this.logger.warn(
          `[RAG] Resposta não-JSON detectada em modo exegese. Tentando extração...`,
        );
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          responseContent = jsonMatch[0];
          try {
            JSON.parse(responseContent);
          } catch (e2) {
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

    // ═══ ETAPA 4.6: Validação factual pós-geração (Strong's IDs) ═══
    if (!jsonMode) {
      responseContent = await this.validateStrongReferences(responseContent);
    }

    // ═══ ETAPA 5: Salvar no cache ═══
    // Resposta degradada NÃO entra no cache. Em 29/07/2026 o texto de
    // fallback foi cacheado durante a queda de cota e passou a ser servido
    // com `cached: true` mesmo depois da IA voltar — o TTL padrão é de 30
    // dias, então a plataforma continuaria mentindo por um mês.
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

    // Adiciona XP ao usuário
    await this.addUserXP(userId, 15);

    // Calcula custo estimado Gemini (Flash 1.5: $0.075/1M tokens)
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

    // Deduplicação e limitação das fontes (top 10 por score)
    const dedupedSources = this.deduplicateSources(collectedSources).slice(
      0,
      10,
    );

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

  /**
   * Sanitiza o input para prevenir Prompt Injection e caracteres maliciosos.
   */
  private sanitizeInput(input: string): string {
    if (!input) return '';
    return (
      input
        .replace(
          /System:|User:|Assistant:|Assistant Instruction:|Ignore previous instructions/gi,
          '',
        ) // Blindagem básica
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove caracteres de controle
        .trim()
        .substring(0, 1000)
    ); // Limite de 1k chars para evitar DoS por tokens
  }

  /**
   * Classifica se uma query está dentro do domínio teológico, bíblico ou histórico da TheoSphere.
   */
  private isTheologicalDomain(
    query: string,
    conversationHistory: ChatMessage[] = [],
    structuredMode = false,
  ): boolean {
    // Sempre verifica a query atual contra o filtro de domínio,
    // independentemente do histórico de conversa (previne bypass por contexto).
    const q = query.toLowerCase().trim();

    // 1. Blacklist explícita (assuntos puramente mundanos/off-topic)
    const blacklistKeywords = [
      'motor de carro',
      'consertar carro',
      'trocar pneu',
      'receita de bolo',
      'programar em javascript',
      'código python',
      'desenvolvimento web',
      'campeonato de futebol',
      'fórmula 1',
      'previsão do tempo',
      'ações da bolsa',
      'como assar',
      'jogos eletrônicos',
      'smartphone',
    ];

    const hasBlacklistKeyword = blacklistKeywords.some((keyword) =>
      q.includes(keyword),
    );
    if (hasBlacklistKeyword) {
      return false;
    }

    // Prompts estruturados (Factbook, Exegese) são montados pela própria aplicação,
    // não digitados livremente pelo usuário. A whitelist de palavras-chave não cobre
    // nomes próprios bíblicos (Melquisedeque, Nínive, Filemom...) e rejeitava dossiês
    // legítimos. A blacklist acima continua valendo para o termo inserido pelo usuário.
    if (structuredMode) {
      return true;
    }

    // 2. Whitelist abrangente de termos teológicos, bíblicos, apologéticos e filosóficos
    const inDomainKeywords = [
      // Teologia e Escritura
      'deus',
      'jesus',
      'cristo',
      'bíblia',
      'biblia',
      'escritura',
      'versículo',
      'versiculo',
      'teologia',
      'fé',
      'salvação',
      'graça',
      'pecado',
      'perdão',
      'espirito',
      'igreja',
      'pastor',
      'exegese',
      'léxico',
      'lexico',
      'grego',
      'hebraico',
      'aramaico',
      'strong',
      'análise',
      'analise',
      'comentário',
      'comentario',
      'calvino',
      'lutero',
      'agostinho',
      'tomás',
      'spurgeon',
      'wesley',
      'henry',
      'clarke',
      'dogma',
      'doutrina',
      'trindade',
      'criação',
      'criacao',
      'fim dos tempos',
      'apocalipse',
      'gênesis',
      'genesis',
      'evangelho',
      'epístola',
      'epistola',
      'profeta',
      'salmo',
      'provérbio',
      'proverbio',
      'exílio',
      'exilio',
      'templo',
      'aliança',
      'alianca',
      'testamento',
      'hermenêutica',
      'hermeneutica',
      'homilética',
      'homiletica',
      'sermão',
      'sermao',
      'pregação',
      'pregacao',
      'justificação',
      'justificacao',
      'santificação',
      'santificacao',
      'redenção',
      'redencao',
      'escatologia',
      'eclesiologia',
      'cristologia',
      'pneumatologia',
      'soteriologia',
      'teodiceia',
      'sofrimento',
      'mortalidade',
      'ressurreição',
      'ressurreicao',
      'milagre',
      'parábola',
      'parabola',
      'sefaria',
      'hebrew',
      // Figuras Bíblicas Importantes
      'paulo',
      'pedro',
      'joão',
      'joao',
      'lucas',
      'mateus',
      'marcos',
      'tiago',
      'moisés',
      'moises',
      'abraão',
      'abraao',
      'isaque',
      'jacó',
      'jaco',
      'davi',
      'salomão',
      'salomao',
      'elias',
      'eliseu',
      'isaías',
      'isaias',
      'jeremias',
      'ezequiel',
      'daniel',
      'maria',
      'josé',
      'jose',
      // Sacramentos e Práticas (Batismo, Aspersão, Imersão)
      'batismo',
      'aspersão',
      'imersão',
      'aspersao',
      'imersao',
      'ceia',
      'comunhão',
      'comunhao',
      'sacramento',
      'culto',
      'liturgia',
      'oração',
      'oracao',
      'jejum',
      'adoração',
      'adoracao',
      'santo',
      'santidade',
      // Tradições (Arminianismo, Calvinismo, Apologética)
      'arminiana',
      'arminiano',
      'arminianismo',
      'armínio',
      'arminio',
      'calvinista',
      'calvinismo',
      'reformada',
      'puritano',
      'protestante',
      'luterana',
      'anglicana',
      'católica',
      'catolica',
      'ortodoxa',
      'apologética',
      'apologetica',
      'apologista',
      'apologia',
      'apologético',
      'apologetico',
      // Filosofia e Razão
      'filosofia',
      'filosófico',
      'filosofico',
      'metafísica',
      'metafisica',
      'epistemologia',
      'ontologia',
      'ética',
      'etica',
      'moral',
      'razão',
      'razao',
      'lógica',
      'logica',
      'existencialismo',
      'existencial',
      'platão',
      'platao',
      'aristóteles',
      'aristoteles',
      'descartes',
      'kant',
      'hegel',
      'nietzsche',
      'sartre',
      'kierkegaard',
      'ciência',
      'ciencia',
      'cosmovisão',
      'cosmovisao',
      'ateísmo',
      'ateismo',
      'agnosticismo',
      'teísmo',
      'teismo',
      'deísmo',
      'deismo',
      'panteísmo',
      'panteismo',
      'livre-arbítrio',
      'livre arbitrio',
      'determinismo',
      'vontade',
    ];

    const hasInDomainKeyword = inDomainKeywords.some((keyword) =>
      q.includes(keyword),
    );

    // 3. Padrões de referências bíblicas (ex: "Jo 3:16", "Genesis 1:1")
    const bibleRefRegex =
      /\b([1-3]\s+)?[A-Za-záéíóúçêôãõü]{2,15}\s+\d+([\s:,]+\d+)?\b/i;
    const hasBibleRef = bibleRefRegex.test(q);

    if (hasInDomainKeyword || hasBibleRef) {
      return true;
    }

    // 4. Indicadores de perguntas gerais de caráter reflexivo/filosófico ou termos de continuação
    const generalQuestionIndicators = [
      'quem',
      'como',
      'onde',
      'quando',
      'porque',
      'por que',
      'qual',
      'quais',
      'o que',
      'explique',
      'responda',
      'continue',
      'comente',
      'fale',
      'diga',
      'descreva',
      'prossiga',
    ];
    const isGeneralQuestion = generalQuestionIndicators.some((ind) =>
      q.includes(ind),
    );

    if (isGeneralQuestion) {
      return true;
    }

    return false;
  }

  /**
   * Indexa documentos do usuário para RAG personalizado.
   */
  async indexUserContent(userId: string, documents: UserDocument[]) {
    return this.userContext.indexUserDocuments(userId, documents);
  }

  // ═══ Wrappers que delegam ao método original e coletam fontes ═══

  /**
   * Busca contexto teológico e coleta fontes para atribuição.
   */
  private async getTheologicalContextWithSources(
    query: string,
    tradition: string | undefined,
    sources: RagSource[],
  ): Promise<string> {
    const queryEmbedding = await this.embeddingService.createEmbedding(query);

    try {
      let docs: any[];

      if (tradition) {
        docs = await this.prisma.$queryRaw`
          SELECT content, tradition,
                 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
          FROM "TheologyEmbedding"
          WHERE tradition = ${tradition}
          ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
          LIMIT 12;
        `;
      } else {
        docs = await this.prisma.$queryRaw`
          SELECT content, tradition,
                 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
          FROM "TheologyEmbedding"
          ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
          LIMIT 15;
        `;
      }

      const topDocs = await this.rerankContext(query, docs, 4);

      if (!topDocs || topDocs.length === 0) {
        // Fallback: comentários clássicos — coleta fontes deles
        const fallback = this.getFallbackCommentaryContextWithSources(
          query,
          sources,
        );
        return fallback;
      }

      // Coleta fontes teológicas do pgvector
      for (const d of topDocs) {
        sources.push({
          type: 'theology',
          title: `Base Teológica (${d.tradition || 'Geral'})`,
          snippet: (d.content || '').slice(0, 150),
          score: d.similarity ? Number(d.similarity) : undefined,
        });
      }

      return [
        '=== BASE DE CONHECIMENTO TEOLÓGICO ===',
        ...topDocs.map(
          (d: any) =>
            `[${d.tradition}] (relevância: ${(d.similarity * 100).toFixed(0)}%)\n${d.content}`,
        ),
        '=== FIM DA BASE DE CONHECIMENTO ===',
      ].join('\n\n');
    } catch (err: any) {
      this.logger.debug(
        `[RAG] Vector search failed: ${err.message} — using classic commentary fallback`,
      );
      return this.getFallbackCommentaryContextWithSources(query, sources);
    }
  }

  /**
   * Busca versículos bíblicos e coleta fontes para atribuição.
   */
  private async getBibleContextWithSources(
    query: string,
    sources: RagSource[],
  ): Promise<string> {
    try {
      const hits = await this.search.hybridSearchVerses(query, { limit: 10 });
      const topHits = await this.rerankContext(query, hits, 4);

      if (topHits.length === 0) return '';

      // Coleta fontes bíblicas
      for (const h of topHits) {
        sources.push({
          type: 'bible',
          title: `${h.bookId} ${h.chapter}:${h.verse}`,
          reference: `${h.bookId} ${h.chapter}:${h.verse} (${h.translation})`,
          snippet: (h.text || '').slice(0, 150),
        });
      }

      return [
        '=== VERSÍCULOS BÍBLICOS RELEVANTES ===',
        ...topHits.map((h) => {
          const ranks: string[] = [];
          if (h.vectorRank !== null) ranks.push(`vec#${h.vectorRank}`);
          if (h.keywordRank !== null) ranks.push(`kw#${h.keywordRank}`);
          const meta = `[${h.translation}] ${h.bookId}:${h.chapter}:${h.verse} (${ranks.join(', ')})`;
          return `${meta}\n${h.text}`;
        }),
        '=== FIM DOS VERSÍCULOS ===',
      ].join('\n\n');
    } catch (err) {
      this.logger.error(
        `Bible hybrid search failed: ${(err as Error).message}`,
      );
      return '';
    }
  }

  /**
   * Busca dados léxicos e coleta fontes para atribuição.
   */
  private async getLexicalContextWithSources(
    query: string,
    sources: RagSource[],
  ): Promise<string> {
    try {
      const entries = await this.prisma.lexicalEntry.findMany({
        where: {
          OR: [
            { word: { contains: query, mode: 'insensitive' } },
            { definition: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 3,
      });

      if (entries.length === 0) return '';

      // Coleta fontes léxicas
      for (const e of entries) {
        sources.push({
          type: 'lexicon',
          title: `${e.word} (${e.strongId})`,
          reference: e.strongId,
          snippet: (e.definition || '').slice(0, 150),
        });
      }

      return [
        '=== DADOS LÉXICOS ACADÊMICOS ===',
        ...entries.map(
          (e) =>
            `[${e.strongId}] ${e.word}: ${e.definition} (Ref: ${e.academicRef})`,
        ),
        '=== FIM DOS DADOS LÉXICOS ===',
      ].join('\n');
    } catch {
      return '';
    }
  }

  /**
   * Busca comentários técnicos e coleta fontes para atribuição.
   */
  private async getTechnicalCommentaryContextWithSources(
    query: string,
    sources: RagSource[],
  ): Promise<string> {
    try {
      const commentaries = await this.prisma.technicalCommentary.findMany({
        where: {
          content: { contains: query, mode: 'insensitive' },
        },
        take: 2,
      });

      if (commentaries.length === 0) return '';

      // Coleta fontes de comentários técnicos
      for (const c of commentaries) {
        sources.push({
          type: 'commentary',
          title: `${c.author} — ${c.source}`,
          snippet: (c.content || '').slice(0, 150),
        });
      }

      return [
        '=== COMENTÁRIOS TÉCNICOS/CRÍTICOS ===',
        ...commentaries.map((c) => `[${c.author} - ${c.source}] ${c.content}`),
        '=== FIM DOS COMENTÁRIOS ===',
      ].join('\n');
    } catch {
      return '';
    }
  }

  /**
   * Fallback de comentários clássicos com coleta de fontes.
   */
  private getFallbackCommentaryContextWithSources(
    query: string,
    sources: RagSource[],
  ): string {
    const context = this.getFallbackCommentaryContext(query);

    // Extrai autores dos comentários clássicos que foram usados
    const queryWords = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3);
    if (queryWords.length > 0) {
      const scored = CLASSIC_COMMENTARIES.map((c) => {
        const haystack =
          `${c.reference} ${c.author} ${c.work} ${c.text} ${c.tradition} ${c.keywords?.join(' ') || ''}`.toLowerCase();
        let score = queryWords.reduce(
          (acc, word) => acc + (haystack.includes(word) ? 1 : 0),
          0,
        );
        const normalizedQuery = query
          .toLowerCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '');
        const normalizedRef = c.reference
          .toLowerCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '');
        if (normalizedQuery.includes(normalizedRef)) score += 15;
        return { entry: c, score };
      });

      const top = scored
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
      for (const s of top) {
        sources.push({
          type: 'classic',
          title: `${s.entry.author} — ${s.entry.work} (${s.entry.year})`,
          reference: s.entry.reference,
          snippet: s.entry.text.slice(0, 150),
          score: s.score,
        });
      }
    }

    return context;
  }

  /**
   * Remove fontes duplicadas (mesmo reference ou title) e ordena por score.
   */
  private deduplicateSources(sources: RagSource[]): RagSource[] {
    const seen = new Set<string>();
    const unique: RagSource[] = [];

    // Ordena por score decrescente (fontes sem score ficam no final)
    const sorted = [...sources].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    for (const s of sorted) {
      // Chave de deduplicação: reference (se existir) ou title
      const key = s.reference
        ? `${s.type}:${s.reference}`
        : `${s.type}:${s.title}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(s);
      }
    }

    return unique;
  }

  /**
   * Contexto fallback baseado em keyword matching nos comentários clássicos.
   */
  private getFallbackCommentaryContext(query: string): string {
    const queryWords = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3);

    if (queryWords.length === 0) return '';

    const scored = CLASSIC_COMMENTARIES.map((c) => {
      const haystack =
        `${c.reference} ${c.author} ${c.work} ${c.text} ${c.tradition} ${c.keywords?.join(' ') || ''}`.toLowerCase();

      let score = queryWords.reduce(
        (acc, word) => acc + (haystack.includes(word) ? 1 : 0),
        0,
      );

      // Melhoria: Busca por inclusão de referência de forma robusta
      const normalizedQuery = query
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const normalizedRef = c.reference
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      if (normalizedQuery.includes(normalizedRef)) {
        score += 15; // Aumento no peso para match de referência direta
      }

      return { entry: c, score };
    });

    const top = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((s) => s.entry);

    if (top.length === 0) return '';

    return [
      '=== COMENTARISTAS CLÁSSICOS (FALLBACK) ===',
      ...top.map(
        (c) =>
          `[${c.author} — ${c.work}, ${c.year}] (${c.tradition})\nPassagem: ${c.reference}\n"${c.text}"`,
      ),
      '=== FIM DOS COMENTARISTAS CLÁSSICOS ===',
    ].join('\n\n');
  }

  /**
   * Refina a relevância do contexto recuperado via Cross-Encoder Reranking.
   *
   * Pipeline:
   *   1. Bi-encoder (pgvector) retorna top-N candidatos (~5ms)
   *   2. Cross-encoder (Gemini Flash) re-pontua os N pares (query, doc) (~200ms)
   *   3. Retorna top-K por score do cross-encoder
   *
   * O cross-encoder vê query e documento simultaneamente, capturando
   * nuances que bi-encoders perdem (ex: negação, relação entre conceitos).
   * Fallback automático para keyword-overlap se Gemini estiver indisponível.
   */
  /**
   * Monta o bloco SECUNDÁRIO de respostas validadas por humanos (👍).
   * Sempre rotulado como resposta anterior do TheoAI e nunca com a mesma
   * autoridade da Biblioteca — mitiga o feedback loop de auto-aprendizado.
   */
  private async buildValidatedQaContext(
    query: string,
    sources: RagSource[],
  ): Promise<string> {
    const hits = await this.userContext.searchValidatedQa(query);
    if (hits.length === 0) return '';

    for (const h of hits) {
      sources.push({
        type: 'theology',
        title: 'TheoAI — Resposta validada',
        reference: h.question.slice(0, 80),
        snippet: h.answer.slice(0, 150),
        score: h.similarity,
      });
    }

    return [
      '=== RESPOSTAS ANTERIORES VALIDADAS DO THEOAI (CONTEXTO SECUNDÁRIO) ===',
      'Material auxiliar validado por usuários. NUNCA sobrepõe a Biblioteca do Drive nem as fontes acadêmicas; use apenas como apoio de consistência.',
      ...hits.map(
        (h) =>
          `[Pergunta anterior: "${h.question}" | relevância: ${(h.similarity * 100).toFixed(0)}%]\n${h.answer}`,
      ),
      '=== FIM DAS RESPOSTAS VALIDADAS ===',
    ].join('\n\n');
  }

  /**
   * Monta o bloco de contexto prioritário da Biblioteca RAG do Drive.
   * Sempre consultada antes da IA (regra 2026-07-20): com hits, a resposta
   * é ancorada nas obras ingeridas; string vazia = sem material relevante.
   * Também registra cada obra encontrada em `sources` (type 'classic').
   */
  private async buildDriveLibraryContext(
    query: string,
    userId: string | undefined,
    sources: RagSource[],
  ): Promise<string> {
    const hits = await this.userContext.searchDriveLibrary(query, userId);
    if (hits.length === 0) return '';

    for (const h of hits) {
      sources.push({
        type: 'classic',
        title: h.title,
        snippet: h.content.slice(0, 150),
        score: h.similarity,
      });
    }

    return [
      '=== BIBLIOTECA RAG (GOOGLE DRIVE) — FONTE PRIORITÁRIA ===',
      ...hits.map(
        (h) =>
          `[Obra: ${h.title} | relevância: ${(h.similarity * 100).toFixed(0)}%]\n${h.content}`,
      ),
      '=== FIM DA BIBLIOTECA ===',
    ].join('\n\n');
  }

  private async rerankContext(
    query: string,
    documents: any[],
    limit: number,
  ): Promise<any[]> {
    if (!documents || documents.length === 0) return [];
    return this.reranker.rerank(query, documents, limit);
  }

  /**
   * Validação factual pós-geração: verifica se os Strong IDs citados pela IA
   * realmente existem no banco de dados, prevenindo alucinações léxicas.
   */
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

  /** Estimativa simples de tokens (1 token ≈ 4 chars para português) */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 3);
  }

  /** Adiciona XP ao usuário */
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

  /** Retorna estatísticas completas do RAG */
  getStats() {
    return {
      embedding: this.embeddingService.getCacheStats(),
      semanticCache: this.semanticCache.getStats(),
      userContext: this.userContext.getStats(),
    };
  }

  /**
   * Gera um Grafo de Conhecimento Teológico em tempo real.
   * Conecta versículos, tópicos, documentos do usuário e geografia.
   */
  async getKnowledgeGraph(query: string, userId?: string) {
    this.logger.log(`[Graph] Gerando topologia teológica para: "${query}"`);

    // Check for curated graphs first
    const curated = CURATED_GRAPHS[query];
    if (curated) {
      this.logger.log(`[Graph] Retornando grafo curado para: "${query}"`);
      return curated;
    }

    const nodes: any[] = [];
    const links: any[] = [];
    const seenNodes = new Set<string>();

    const addNode = (
      id: string,
      label: string,
      type: string,
      color: string,
      val: number = 10,
    ) => {
      if (!seenNodes.has(id)) {
        nodes.push({ id, label, type, color, val });
        seenNodes.add(id);
        return true;
      }
      return false;
    };

    const addLink = (
      source: string,
      target: string,
      label: string = '',
      value: number = 1,
    ) => {
      links.push({ source, target, label, value });
    };

    // 1. Nó Central (A busca ou versículo atual)
    const centralId = 'center';
    addNode(centralId, query, 'query', '#ff9800', 25);

    // 2. Buscar Versículos Relacionados
    try {
      const bibleHits = await this.search.hybridSearchVerses(query, {
        limit: 8,
      });
      for (const h of bibleHits) {
        const vId = `verse-${h.bookId}-${h.chapter}-${h.verse}`;
        const vLabel = `${h.bookId}:${h.chapter}:${h.verse}`;
        addNode(vId, vLabel, 'verse', '#2196f3', 15);
        addLink(centralId, vId, 'menciona', 2);
      }
    } catch (e) {
      this.logger.error(`Graph: Bible search failed: ${(e as Error).message}`);
    }

    // 3. Buscar Conceitos Teológicos (Embeddings)
    try {
      const queryEmbedding = await this.embeddingService.createEmbedding(query);
      const theologyDocs: any[] = await this.prisma.$queryRaw`
        SELECT id, tradition, 
               substring(content from 1 for 40) as preview
        FROM "TheologyEmbedding"
        ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT 6;
      `;
      for (const t of theologyDocs) {
        const tId = `theo-${t.id}`;
        addNode(
          tId,
          `${t.tradition}: ${t.preview}...`,
          'concept',
          '#ffc107',
          12,
        );
        addLink(centralId, tId, 'temático', 1.5);
      }
    } catch (e) {
      this.logger.error(
        `Graph: Theology search failed: ${(e as Error).message}`,
      );
    }

    // 4. Buscar Documentos do Usuário (Drive/Notas)
    if (userId) {
      try {
        const userResults = await this.userContext.searchUserContext(
          userId,
          query,
          5,
        );
        for (const res of userResults) {
          const doc = res.document;
          const dId = `doc-${doc.id}`;
          addNode(
            dId,
            `${doc.type.toUpperCase()}: ${doc.content.slice(0, 30)}...`,
            'document',
            '#4caf50',
            14,
          );
          addLink(centralId, dId, 'personalizado', 1.8);
        }
      } catch (e) {
        this.logger.error(
          `Graph: User context search failed: ${(e as Error).message}`,
        );
      }
    }

    // 5. Buscar Dados Léxicos (Lexicon Deep-Link) - SEC-011
    try {
      const strongMatch = query.match(/[GH]\d{1,5}/i);
      if (strongMatch) {
        const strongId = strongMatch[0].toUpperCase();
        const lexicon = await this.prisma.lexicalEntry.findUnique({
          where: { strongId },
        });
        if (lexicon) {
          addNode(
            `lex-${strongId}`,
            `${strongId}: ${lexicon.word}`,
            'lexicon',
            '#e91e63',
            20,
          );
          addLink(centralId, `lex-${strongId}`, 'definicão léxica', 2);
        }
      }
    } catch (e) {
      this.logger.debug(
        `Graph: Lexicon search failed: ${(e as Error).message}`,
      );
    }

    return { nodes, links };
  }

  /**
   * Pipeline de chat com streaming via SSE (Server-Sent Events).
   * Reutiliza as etapas 0-3 do pipeline padrão, mas na etapa 4
   * usa generateContentStream para transmitir chunks em tempo real.
   */
  async *chatStream(
    query: string,
    userId?: string,
    tradition?: string,
    conversationHistory: ChatMessage[] = [],
    jsonMode: boolean = false,
  ): AsyncGenerator<{ type: string; data: any }> {
    // ═══ ETAPA 0: Sanitização e Segurança ═══
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

    // Force high-quality fallback para passagens-chave em modo JSON
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

    // UX 2026-07-20: status único e limpo durante toda a preparação —
    // o usuário vê apenas "Consultando biblioteca..." até o texto começar.
    yield {
      type: 'status',
      data: { step: 'library', message: 'Consultando biblioteca...' },
    };

    // ═══ ETAPA 1: Semantic Cache ═══
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

    // ═══ ETAPA 1.5: Hard-Override para Exegese (Passagens Base) ═══
    if (jsonMode && (isGenesis || isJohn)) {
      const fallback = generateFallbackResponse(sanitizedQuery, true);
      yield { type: 'chunk', data: { text: fallback } };
      yield { type: 'done', data: { cached: false, tokens: 0 } };
      return;
    }

    // ═══ Rastreamento de fontes utilizadas (streaming) ═══
    const streamSources: RagSource[] = [];

    // ═══ ETAPA 1.55: Biblioteca RAG do Drive — FONTE PRIORITÁRIA ═══
    const driveLibraryContext = await this.buildDriveLibraryContext(
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

    // ═══ ETAPA 1.57: Respostas validadas (👍) — contexto SECUNDÁRIO ═══
    const validatedQaContext = jsonMode
      ? ''
      : await this.buildValidatedQaContext(sanitizedQuery, streamSources);

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

        // Coleta fontes open source
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
      streamSources.push({
        type: 'personal',
        title: 'Conteúdo pessoal do usuário',
        snippet:
          'Notas, sermões, estudos ou destaques do Google Drive/localStorage.',
      });
    }

    // ═══ ETAPA 3: Bases de conhecimento (pgvector) ═══
    let theologicalContext = '';
    let bibleContext = '';
    try {
      const results = await Promise.all([
        this.getTheologicalContextWithSources(
          sanitizedQuery,
          tradition,
          streamSources,
        ),
        this.getBibleContextWithSources(sanitizedQuery, streamSources),
        this.getLexicalContextWithSources(sanitizedQuery, streamSources),
        this.getTechnicalCommentaryContextWithSources(
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

    // Emite evento de fontes após coleta de contexto
    const dedupedStreamSources = this.deduplicateSources(streamSources).slice(
      0,
      10,
    );
    if (dedupedStreamSources.length > 0) {
      yield { type: 'sources', data: { sources: dedupedStreamSources } };
    }

    // ═══ ETAPA 4: Stream da IA ═══
    // (sem novo status — mantém "Consultando biblioteca..." até o 1º chunk)
    let fullResponse = '';
    // Marca quando o texto veio do fallback pré-escrito e não da IA.
    let streamDegraded = false;

    if (this.genAI) {
      try {
        // Request montado pelo builder compartilhado com chat()
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
        // Fallback: tenta resposta não-streaming
        if (!fullResponse) {
          fullResponse = generateFallbackResponse(query, jsonMode);
          streamDegraded = true;
          yield { type: 'chunk', data: { text: fullResponse } };
        }
      }
    } else if (this.openai) {
      // Fallback OpenAI (sem streaming por enquanto, envia resposta inteira)
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

    // Fallback final se nenhuma IA respondeu
    if (!fullResponse) {
      fullResponse = generateFallbackResponse(query, jsonMode);
      streamDegraded = true;
      yield { type: 'chunk', data: { text: fullResponse } };
    }

    // ═══ ETAPA 4.6: Validação factual pós-geração (Strong's IDs) — Streaming ═══
    if (!jsonMode) {
      const validated = await this.validateStrongReferences(fullResponse);
      if (validated !== fullResponse) {
        const warningPart = validated.slice(fullResponse.length);
        yield { type: 'chunk', data: { text: warningPart } };
        fullResponse = validated;
      }
    }

    // ═══ ETAPA 5: Salvar no cache e calcular custos ═══
    // Mesma regra do chat(): texto de fallback não entra no cache, senão
    // continua sendo servido por 30 dias depois da IA voltar.
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

  /**
   * Processa ditado de sermão: organiza tópicos e extrai referências bíblicas.
   */
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
