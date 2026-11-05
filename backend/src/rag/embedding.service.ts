import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { OpenAI } from 'openai';
import Redis from 'ioredis';
import { createHash } from 'node:crypto';

export class EmbeddingUnavailableError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'EmbeddingUnavailableError';
  }
}

export class EmbeddingResult {
  constructor(
    public readonly vector: number[],
    public readonly provider: 'gemini' | 'openai' | 'local-hash',
    public readonly model: string,
    public readonly dimensions: number = 768,
  ) {}

  toJSON(): number[] {
    return this.vector;
  }

  [Symbol.iterator]() {
    return this.vector[Symbol.iterator]();
  }

  map<T>(fn: (val: number, index: number, array: number[]) => T): T[] {
    return this.vector.map(fn);
  }

  get length(): number {
    return this.vector.length;
  }
}

/**
 * EmbeddingService — Gerencia a criação de embeddings vetoriais via Google Gemini (Exclusivo para índices persistidos).
 *
 * Modelo Canônico: gemini-embedding-001 (768 dimensões).
 *
 * T0.2: Não mistura espaços vetoriais. Para índices persistidos (pgvector),
 * somente embeddings gerados pelo mesmo provedor+modelo (Gemini) são aceitos.
 * Fallbacks locais ou de terceiros são estritamente efêmeros e nunca gravados em cache ou banco.
 */
@Injectable()
export class EmbeddingService implements OnModuleDestroy {
  private readonly logger = new Logger(EmbeddingService.name);
  private genAI: GoogleGenAI | null = null;
  private openai: OpenAI | null = null;
  private readonly VECTOR_DIM = 768;
  private readonly PRIMARY_PROVIDER = 'gemini';
  private readonly PRIMARY_MODEL = 'gemini-embedding-001';

  // ─── Cache layer ────────────────────────────────────────────────────────
  // Two-tier: L1 (in-process Map), L2 (Redis).
  // Cache keys incluem explicitamente provider:model:dim para evitar contaminação.
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly L1_TTL_MS = 3_600_000; // 1h
  private readonly L2_TTL_S = 86_400; // 24h
  private embeddingCache = new Map<
    string,
    { embedding: number[]; timestamp: number }
  >();
  private redis: Redis | null = null;

  constructor() {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
      this.genAI = new GoogleGenAI({ apiKey: geminiKey });
      this.logger.log(
        'Google Gemini AI inicializado para Embeddings primários (768 dims).',
      );
    } else {
      this.logger.warn(
        'Nenhuma GEMINI_API_KEY configurada. Consultas vetoriais persistidas reportarão falha.',
      );
    }

    if (openaiKey && !openaiKey.startsWith('sk-your')) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    }

    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });
      this.redis.on('error', (err) => {
        if (this.redis && !this.redis['hasLoggedError']) {
          this.logger.warn(`Redis L2 cache unavailable: ${err.message}`);
          this.redis['hasLoggedError'] = true;
        }
      });
      this.redis.connect().catch((err) => {
        this.logger.warn(
          `Redis L2 cache init failed: ${(err as Error).message}`,
        );
        this.redis = null;
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit().catch(() => {});
  }

  // ─── Cache helpers ──────────────────────────────────────────────────────

  /**
   * T0.2: Chave de cache inclui explicitamente provider:model:dim
   */
  private cacheKey(
    normalized: string,
    provider = this.PRIMARY_PROVIDER,
    model = this.PRIMARY_MODEL,
    dim = this.VECTOR_DIM,
  ): string {
    const hash = createHash('sha256').update(normalized).digest('hex');
    return `emb:${provider}:${model}:${dim}:${hash}`;
  }

  private async readCache(normalized: string): Promise<number[] | null> {
    const key = this.cacheKey(normalized);
    // L1
    const l1 = this.embeddingCache.get(key);
    if (l1 && Date.now() - l1.timestamp < this.L1_TTL_MS) {
      return l1.embedding;
    }
    // L2
    if (this.redis && this.redis.status === 'ready') {
      try {
        const raw = await this.redis.get(key);
        if (raw) {
          const parsed = JSON.parse(raw) as number[];
          this.setL1(key, parsed);
          return parsed;
        }
      } catch (err) {
        this.logger.warn(`L2 read failed: ${(err as Error).message}`);
      }
    }
    return null;
  }

  private async writeCache(
    normalized: string,
    result: EmbeddingResult,
  ): Promise<void> {
    // T0.2: Escreve no cache APENAS embeddings do provedor primário
    if (
      result.provider !== this.PRIMARY_PROVIDER ||
      result.model !== this.PRIMARY_MODEL
    ) {
      this.logger.warn(
        `Ignorando gravação em cache de vetor não-primário (${result.provider}:${result.model})`,
      );
      return;
    }

    const key = this.cacheKey(
      normalized,
      result.provider,
      result.model,
      result.dimensions,
    );
    this.setL1(key, result.vector);

    if (this.redis && this.redis.status === 'ready') {
      this.redis
        .setex(key, this.L2_TTL_S, JSON.stringify(result.vector))
        .catch((err) =>
          this.logger.warn(`L2 write failed: ${(err as Error).message}`),
        );
    }
  }

  private setL1(key: string, embedding: number[]): void {
    this.embeddingCache.delete(key);
    this.embeddingCache.set(key, { embedding, timestamp: Date.now() });
    if (this.embeddingCache.size > this.MAX_CACHE_SIZE) {
      const oldest = this.embeddingCache.keys().next().value;
      if (oldest) this.embeddingCache.delete(oldest);
    }
  }

  /**
   * Normaliza o texto antes de criar o embedding.
   */
  public normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\p{L}\p{N}\p{M}\s.,;:!?()"-]/gu, '')
      .trim()
      .slice(0, 8000);
  }

  /**
   * Gera um embedding determinístico de fallback para contextos puramente efêmeros em memória.
   * AVISO: Nunca gravar em banco nem em cache de busca vetorial.
   */
  private generateLocalFallbackEmbedding(text: string): number[] {
    const vector = new Array(this.VECTOR_DIM).fill(0);
    const words = text.split(/\s+/).filter((w) => w.length > 2);

    if (words.length === 0) {
      for (let i = 0; i < text.length; i++) {
        const idx = (text.charCodeAt(i) * 17) % this.VECTOR_DIM;
        vector[idx] += 0.1;
      }
    } else {
      words.forEach((word) => {
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
          hash = (hash << 5) - hash + word.charCodeAt(i);
          hash |= 0;
        }
        const idx = Math.abs(hash) % this.VECTOR_DIM;
        vector[idx] += 1.0;
      });
    }

    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0),
    );
    return magnitude === 0 ? vector : vector.map((v) => v / magnitude);
  }

  /**
   * T0.2: Cria embedding para consulta contra índice persistido.
   * Retorna { vector, provider, model, dimensions }.
   * Se o provedor primário (Gemini) estiver indisponível, LANÇA EmbeddingUnavailableError.
   */
  async createEmbedding(text: string): Promise<EmbeddingResult> {
    const normalized = this.normalizeText(text);

    const cached = await this.readCache(normalized);
    if (cached) {
      return new EmbeddingResult(
        cached,
        this.PRIMARY_PROVIDER,
        this.PRIMARY_MODEL,
        this.VECTOR_DIM,
      );
    }

    if (!this.genAI) {
      throw new EmbeddingUnavailableError(
        'Provedor primário de embeddings (Google Gemini gemini-embedding-001) não está disponível.',
      );
    }

    try {
      const result = await this.genAI.models.embedContent({
        model: this.PRIMARY_MODEL,
        contents: normalized,
        config: {
          taskType: 'RETRIEVAL_DOCUMENT',
          outputDimensionality: this.VECTOR_DIM,
        },
      });

      const embedding = result.embeddings?.[0]?.values;
      if (!embedding || embedding.length !== this.VECTOR_DIM) {
        throw new Error(
          `Gemini retornou vetor inválido (esperado ${this.VECTOR_DIM} dimensões)`,
        );
      }

      const embResult = new EmbeddingResult(
        embedding,
        this.PRIMARY_PROVIDER,
        this.PRIMARY_MODEL,
        this.VECTOR_DIM,
      );

      await this.writeCache(normalized, embResult);
      return embResult;
    } catch (error) {
      this.logger.error(
        `Erro no provedor primário Gemini embedding: ${(error as Error).message}`,
      );
      throw new EmbeddingUnavailableError(
        `Falha na geração de embedding com Gemini: ${(error as Error).message}`,
        error,
      );
    }
  }

  /**
   * T0.2: Criação de embedding para contextos efêmeros (ex: similaridade de request local).
   * NUNCA gravar no banco de dados nem no cache de embeddings.
   */
  async createEphemeralFallbackEmbedding(
    text: string,
  ): Promise<EmbeddingResult> {
    const normalized = this.normalizeText(text);

    if (this.openai) {
      try {
        const res = await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: normalized,
          dimensions: this.VECTOR_DIM,
        });
        const embedding = res.data[0].embedding;
        return new EmbeddingResult(
          embedding,
          'openai',
          'text-embedding-3-small',
          this.VECTOR_DIM,
        );
      } catch (error) {
        this.logger.warn(
          `Erro OpenAI ephemeral embedding: ${(error as Error).message}`,
        );
      }
    }

    const fallback = this.generateLocalFallbackEmbedding(normalized);
    return new EmbeddingResult(
      fallback,
      'local-hash',
      'deterministic-hash-v1',
      this.VECTOR_DIM,
    );
  }

  /**
   * Cria embeddings em batch via Gemini.
   * Falhas propagam EmbeddingUnavailableError em vez de injetar hashes no banco.
   */
  async createBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.genAI) {
      throw new EmbeddingUnavailableError(
        'Provedor primário Gemini não configurado para batch.',
      );
    }

    const normalized = texts.map((t) => this.normalizeText(t));
    const results: (number[] | null)[] = await Promise.all(
      normalized.map((n) => this.readCache(n)),
    );

    const uncachedIndices = results
      .map((r, i) => (r === null ? i : -1))
      .filter((i) => i >= 0);

    if (uncachedIndices.length === 0) return results as number[][];

    const uncachedTexts = uncachedIndices.map((i) => normalized[i]);
    const subBatchSize = 10;

    for (let i = 0; i < uncachedIndices.length; i += subBatchSize) {
      const subBatch = uncachedIndices.slice(i, i + subBatchSize);
      await Promise.all(
        subBatch.map(async (originalIndex, j) => {
          const text = uncachedTexts[i + j];
          const result = await this.genAI!.models.embedContent({
            model: this.PRIMARY_MODEL,
            contents: text,
            config: {
              taskType: 'RETRIEVAL_DOCUMENT',
              outputDimensionality: this.VECTOR_DIM,
            },
          });

          const embedding = result.embeddings?.[0]?.values;
          if (!embedding) throw new Error('Gemini retornou embedding vazio');
          results[originalIndex] = embedding;

          const embResult = new EmbeddingResult(
            embedding,
            this.PRIMARY_PROVIDER,
            this.PRIMARY_MODEL,
            this.VECTOR_DIM,
          );
          await this.writeCache(normalized[originalIndex], embResult);
        }),
      );
    }

    return results as number[][];
  }

  /**
   * Calcula a similaridade cosseno entre dois vetores.
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /** Wipes both cache tiers — used by tests and admin tools. */
  async clearCache(): Promise<void> {
    this.embeddingCache.clear();
    if (this.redis && this.redis.status === 'ready') {
      const stream = this.redis.scanStream({
        match: 'emb:gemini:gemini-embedding-001:*',
        count: 200,
      });
      const pipeline = this.redis.pipeline();
      let pending = 0;
      stream.on('data', (keys: string[]) => {
        for (const k of keys) {
          pipeline.del(k);
          pending++;
        }
      });
      await new Promise<void>((resolve, reject) => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      if (pending > 0) await pipeline.exec();
    }
    this.logger.log('Cache de embeddings (L1 + L2) limpo.');
  }

  /** Retorna estatísticas do cache */
  getCacheStats(): { size: number; maxSize: number; ttlMinutes: number } {
    return {
      size: this.embeddingCache.size,
      maxSize: this.MAX_CACHE_SIZE,
      ttlMinutes: this.L1_TTL_MS / 60_000,
    };
  }
}
