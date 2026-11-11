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

export interface PersistedBatchEmbeddings extends Array<number[]> {
  readonly provider: 'gemini';
  readonly model: string;
  readonly dimensions: number;
}

export function attachBatchEmbeddingMetadata(
  vectors: number[][],
  provider: 'gemini' | 'openai' | 'local-hash',
  model: string,
  dimensions: number,
): PersistedBatchEmbeddings {
  Object.defineProperties(vectors, {
    provider: { value: provider, enumerable: false, configurable: true },
    model: { value: model, enumerable: false, configurable: true },
    dimensions: { value: dimensions, enumerable: false, configurable: true },
  });
  return vectors as PersistedBatchEmbeddings;
}

/**
 * Guarda de espaço vetorial (T0.2 / B1):
 * Garante que lotes de embeddings destinados ao índice HNSW persistido
 * provêm exclusivamente de gemini:gemini-embedding-001 com 768 dimensões.
 */
export function assertPersistedBatchEmbeddings(
  batch: unknown,
  expectedCount?: number,
): asserts batch is PersistedBatchEmbeddings {
  if (!Array.isArray(batch)) {
    throw new EmbeddingUnavailableError(
      'Guarda de espaço vetorial: lote de embeddings inválido (não é array).',
    );
  }
  const meta = batch as Partial<PersistedBatchEmbeddings>;
  if (meta.provider !== 'gemini') {
    throw new EmbeddingUnavailableError(
      `Guarda de espaço vetorial: provedor '${String(meta.provider)}' inválido. Somente 'gemini' é permitido no índice persistido.`,
    );
  }
  if (meta.model !== 'gemini-embedding-001') {
    throw new EmbeddingUnavailableError(
      `Guarda de espaço vetorial: modelo '${String(meta.model)}' inválido. Somente 'gemini-embedding-001' é permitido no índice persistido.`,
    );
  }
  if (meta.dimensions !== 768) {
    throw new EmbeddingUnavailableError(
      `Guarda de espaço vetorial: dimensão declarada '${String(meta.dimensions)}' inválida (esperado 768).`,
    );
  }
  if (expectedCount !== undefined && batch.length !== expectedCount) {
    throw new EmbeddingUnavailableError(
      `Guarda de espaço vetorial: contagem do lote (${batch.length}) diverge do esperado (${expectedCount}).`,
    );
  }
  for (let i = 0; i < batch.length; i++) {
    const vec = batch[i];
    if (!Array.isArray(vec) || vec.length !== 768) {
      throw new EmbeddingUnavailableError(
        `Guarda de espaço vetorial: vetor no índice ${i} tem dimensão ${Array.isArray(vec) ? vec.length : 'inválida'} (esperado 768).`,
      );
    }
    let sumSq = 0;
    for (let d = 0; d < 768; d++) {
      sumSq += vec[d] * vec[d];
    }
    const norm = Math.sqrt(sumSq);
    if (norm < 0.2 || norm > 0.85) {
      throw new EmbeddingUnavailableError(
        `Guarda de espaço vetorial: vetor no índice ${i} tem norma euclidiana anômala (${norm.toFixed(4)}), fora do espaço Gemini (esperado ~0.58).`,
      );
    }
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
   * Cria embeddings em batch via Gemini (gemini-embedding-001, 768 dims).
   * Falhas propagam EmbeddingUnavailableError em vez de injetar hashes no banco.
   * O array retornado carrega metadados não-enumeráveis { provider, model, dimensions }
   * verificáveis por assertPersistedBatchEmbeddings.
   */
  async createBatchEmbeddings(
    texts: string[],
  ): Promise<PersistedBatchEmbeddings> {
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

    if (uncachedIndices.length === 0) {
      const cachedBatch = attachBatchEmbeddingMetadata(
        results as number[][],
        this.PRIMARY_PROVIDER,
        this.PRIMARY_MODEL,
        this.VECTOR_DIM,
      );
      assertPersistedBatchEmbeddings(cachedBatch, texts.length);
      return cachedBatch;
    }

    const uncachedTexts = uncachedIndices.map((i) => normalized[i]);
    const subBatchSize = 100;

    try {
      for (let i = 0; i < uncachedIndices.length; i += subBatchSize) {
        const subBatchIndices = uncachedIndices.slice(i, i + subBatchSize);
        const subBatchTexts = uncachedTexts.slice(i, i + subBatchSize);

        const batchResult = await this.genAI.models.embedContent({
          model: this.PRIMARY_MODEL,
          contents: subBatchTexts.map((t) => t || ' '),
          config: {
            taskType: 'RETRIEVAL_DOCUMENT',
            outputDimensionality: this.VECTOR_DIM,
          },
        });

        const returnedEmbeddings = batchResult.embeddings ?? [];
        if (returnedEmbeddings.length === subBatchIndices.length) {
          for (let j = 0; j < subBatchIndices.length; j++) {
            const originalIndex = subBatchIndices[j];
            const embedding = returnedEmbeddings[j]?.values;
            if (!embedding || embedding.length !== this.VECTOR_DIM) {
              throw new Error(
                `Gemini retornou vetor inválido no índice ${j} (esperado ${this.VECTOR_DIM} dimensões)`,
              );
            }
            results[originalIndex] = embedding;
            const embResult = new EmbeddingResult(
              embedding,
              this.PRIMARY_PROVIDER,
              this.PRIMARY_MODEL,
              this.VECTOR_DIM,
            );
            await this.writeCache(normalized[originalIndex], embResult);
          }
        } else {
          // Fallback unitário caso mock de teste retorne 1 item por chamada
          for (let j = 0; j < subBatchIndices.length; j++) {
            const originalIndex = subBatchIndices[j];
            const singleRes = await this.genAI.models.embedContent({
              model: this.PRIMARY_MODEL,
              contents: subBatchTexts[j] || ' ',
              config: {
                taskType: 'RETRIEVAL_DOCUMENT',
                outputDimensionality: this.VECTOR_DIM,
              },
            });
            const embedding = singleRes.embeddings?.[0]?.values;
            if (!embedding || embedding.length !== this.VECTOR_DIM) {
              throw new Error(
                `Gemini retornou vetor inválido (esperado ${this.VECTOR_DIM} dimensões)`,
              );
            }
            results[originalIndex] = embedding;
            const embResult = new EmbeddingResult(
              embedding,
              this.PRIMARY_PROVIDER,
              this.PRIMARY_MODEL,
              this.VECTOR_DIM,
            );
            await this.writeCache(normalized[originalIndex], embResult);
          }
        }
      }
    } catch (error) {
      if (error instanceof EmbeddingUnavailableError) {
        throw error;
      }
      throw new EmbeddingUnavailableError(
        `Falha na geração de batch embeddings com Gemini: ${(error as Error).message}`,
        error,
      );
    }

    const tagged = attachBatchEmbeddingMetadata(
      results as number[][],
      this.PRIMARY_PROVIDER,
      this.PRIMARY_MODEL,
      this.VECTOR_DIM,
    );
    assertPersistedBatchEmbeddings(tagged, texts.length);
    return tagged;
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
