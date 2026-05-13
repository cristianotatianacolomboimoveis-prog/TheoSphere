import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI, Content } from '@google/generative-ai';
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

export interface RagResponse {
  content: string;
  cached: boolean;
  similarity?: number;
  cacheSource?: 'global' | 'user';
  contextUsed: boolean;
  contextDocCount: number;
  tokensEstimated: number;
  costEstimated: number;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private openai: OpenAI | null = null;

  constructor(
    private embeddingService: EmbeddingService,
    private semanticCache: SemanticCacheService,
    private userContext: UserContextService,
    private prisma: PrismaService,
    private search: SearchService,
  ) {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
      this.genAI = new GoogleGenerativeAI(geminiKey);
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
   * Pipeline principal de chat com RAG.
   */
  async chat(
    query: string,
    userId?: string,
    tradition?: string,
    conversationHistory: ChatMessage[] = [],
    jsonMode: boolean = false,
  ): Promise<RagResponse> {
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
      };
    }

    // ═══ ETAPA 1: Semantic Cache ═══
    const cached = await this.semanticCache.findSimilarResponse(
      sanitizedQuery,
      userId,
      tradition,
    );

    if (cached) {
      this.logger.log(`[RAG] Cache HIT (${cached.source}) — Economia: ~$0.015`);

      // Adiciona XP ao usuário se disponível
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
      };
    }

    // ═══ ETAPA 2: Buscar contexto do usuário ═══
    let userContextText = '';
    let contextDocCount = 0;

    if (userId) {
      userContextText = await this.userContext.buildUserContext(
        userId,
        sanitizedQuery,
      );
      contextDocCount = (
        userContextText.match(/--- 📝|--- 📖|--- 🖍️|--- 📚|--- 🔖/g) || []
      ).length;
    }

    // ═══ ETAPA 3: Buscar bases de conhecimento (pgvector) ═══
    let theologicalContext = '';
    let bibleContext = '';

    try {
      const results = await Promise.all([
        this.getTheologicalContext(sanitizedQuery, tradition),
        this.getBibleContext(sanitizedQuery),
        this.getLexicalContext(sanitizedQuery),
        this.getTechnicalCommentaryContext(sanitizedQuery),
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
        `Bases de conhecimento indisponíveis: ${error.message}`,
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
            model: 'gemini-1.5-flash',
            op: 'chat',
            tradition,
            userId,
          },
          async () => {
            const model = this.genAI!.getGenerativeModel({
              model: 'gemini-1.5-flash',
              generationConfig: {
                temperature: jsonMode ? 0.2 : 0.7,
                maxOutputTokens: 2000,
                responseMimeType: jsonMode ? 'application/json' : 'text/plain',
              },
            });

            const history: Content[] = conversationHistory.map((m) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            }));

            const chat = model.startChat({
              history,
              systemInstruction: {
                role: 'system',
                parts: [
                  {
                    text: `${THEO_AI_SYSTEM_PROMPT}\n\nCONTEXTO DO USUÁRIO:\n${userContextText}\n\nCONTEXTO TEOLÓGICO:\n${theologicalContext}\n\nCONTEXTO BÍBLICO:\n${bibleContext}\n\nTRADIÇÃO PREFERIDA: ${tradition || 'Geral'}`,
                  },
                ],
              },
            });

            const result = await chat.sendMessage(sanitizedQuery);
            const response = await result.response;
            return response.text();
          },
        );
      } catch (error: any) {
        this.logger.error(`[RAG Erro Gemini]: ${error.message}`);
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
            const fullPrompt = `System: ${THEO_AI_SYSTEM_PROMPT}\n\nUser Context: ${userContextText}\n\nTheology Context: ${theologicalContext}\n\nBible Context: ${bibleContext}\n\nTradition: ${tradition || 'General'}\n\nUser Question: ${sanitizedQuery}`;
            const res = await this.openai!.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [
                ...(conversationHistory as any),
                { role: 'user', content: fullPrompt },
              ],
              temperature: jsonMode ? 0.2 : 0.7,
            });
            outputTokens = res.usage?.completion_tokens || 0;
            return res.choices[0].message.content || '';
          },
        );
      } catch (error: any) {
        this.logger.error(`[RAG Erro OpenAI]: ${error.message}`);
      }
    }

    if (!responseContent) {
      responseContent = generateFallbackResponse(query, jsonMode);
    }

    // ═══ ETAPA 5: Salvar no cache ═══
    await this.semanticCache.cacheResponse(
      sanitizedQuery,
      responseContent,
      userId,
      tradition,
    );

    // Adiciona XP ao usuário
    await this.addUserXP(userId, 15);

    // Calcula custo estimado Gemini (Flash 1.5: $0.075/1M tokens)
    const totalInputTokens = this.estimateTokens(
      THEO_AI_SYSTEM_PROMPT +
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

    return {
      content: responseContent,
      cached: false,
      contextUsed: contextDocCount > 0,
      contextDocCount,
      tokensEstimated: totalInputTokens + totalOutputTokens,
      costEstimated,
    };
  }

  /**
   * Sanitiza o input para prevenir Prompt Injection e caracteres maliciosos.
   */
  private sanitizeInput(input: string): string {
    if (!input) return '';
    return input
      .replace(
        /System:|User:|Assistant:|Assistant Instruction:|Ignore previous instructions/gi,
        '',
      ) // Blindagem básica
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove caracteres de controle
      .trim()
      .substring(0, 1000); // Limite de 1k chars para evitar DoS por tokens
  }

  /**
   * Indexa documentos do usuário para RAG personalizado.
   */
  async indexUserContent(userId: string, documents: UserDocument[]) {
    return this.userContext.indexUserDocuments(userId, documents);
  }

  /**
   * Busca contexto na base teológica (TheologyEmbedding com pgvector).
   */
  private async getTheologicalContext(
    query: string,
    tradition?: string,
  ): Promise<string> {
    const queryEmbedding = await this.embeddingService.createEmbedding(query);

    try {
      let docs: any[];

      if (tradition) {
        docs = await this.prisma.$queryRaw`
          SELECT content, tradition, 
                 1 - (embedding <=> ${queryEmbedding}::vector) as similarity
          FROM "TheologyEmbedding"
          WHERE tradition = ${tradition}
          ORDER BY embedding <=> ${queryEmbedding}::vector
          LIMIT 3;
        `;
      } else {
        docs = await this.prisma.$queryRaw`
          SELECT content, tradition,
                 1 - (embedding <=> ${queryEmbedding}::vector) as similarity
          FROM "TheologyEmbedding"
          ORDER BY embedding <=> ${queryEmbedding}::vector
          LIMIT 5;
        `;
      }

      if (!docs || docs.length === 0) {
        this.logger.debug(
          '[RAG] Vector search returned empty — using classic commentary fallback',
        );
        return this.getFallbackCommentaryContext(query);
      }

      return [
        '=== BASE DE CONHECIMENTO TEOLÓGICO ===',
        ...docs.map(
          (d: any) =>
            `[${d.tradition}] (relevância: ${(d.similarity * 100).toFixed(0)}%)\n${d.content}`,
        ),
        '=== FIM DA BASE DE CONHECIMENTO ===',
      ].join('\n\n');
    } catch {
      this.logger.debug(
        '[RAG] Vector search failed — using classic commentary fallback',
      );
      return this.getFallbackCommentaryContext(query);
    }
  }

  /**
   * Busca versículos relevantes na base bíblica local (pgvector).
   */
  private async getBibleContext(query: string): Promise<string> {
    try {
      const hits = await this.search.hybridSearchVerses(query, { limit: 5 });
      if (hits.length === 0) return '';

      return [
        '=== VERSÍCULOS BÍBLICOS RELEVANTES ===',
        ...hits.map((h) => {
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
   * Busca dados léxicos (BDAG/HALOT) no banco de dados.
   */
  private async getLexicalContext(query: string): Promise<string> {
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
   * Busca comentários técnicos e críticos.
   */
  private async getTechnicalCommentaryContext(query: string): Promise<string> {
    try {
      const commentaries = await this.prisma.technicalCommentary.findMany({
        where: {
          content: { contains: query, mode: 'insensitive' },
        },
        take: 2,
      });

      if (commentaries.length === 0) return '';

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

      if (query.toLowerCase().includes(c.reference.toLowerCase())) {
        score += 10;
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
}
