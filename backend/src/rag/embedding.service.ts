import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';
import Redis from 'ioredis';
import { createHash } from 'node:crypto';

/**
 * EmbeddingService — Gerencia a criação de embeddings vetoriais via Google Gemini (Prioridade) ou OpenAI (Fallback).
 *
 * Usa text-embedding-004 do Google (768 dimensões) ou text-embedding-3-small (1536 dimensões - truncado).
 *
 * Para economizar ainda mais, implementa:
 * - Cache local de embeddings recentes (evita reprocessar queries iguais)
 * - Normalização de texto antes de gerar embedding
 * - Batch processing nativo do Gemini
 */
@Injectable()
export class EmbeddingService implements OnModuleDestroy {
  private readonly logger = new Logger(EmbeddingService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private openai: OpenAI | null = null;
  private readonly VECTOR_DIM = 768;

  // ─── Cache layer ────────────────────────────────────────────────────────
  // Two-tier:
  //   L1 (in-process Map) — sub-µs, capped at 1k entries via LRU.
  //   L2 (Redis)          — cross-pod, TTL 24h, ~1ms hit.
  // Embedding cost saved per L1 hit ≈ $0.000025 (Gemini); per L2 hit ≈ same
  // minus 1ms RTT. The combined hit-rate dominates RAG/search throughput
  // when users repeat semantically-identical queries.
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
      this.genAI = new GoogleGenerativeAI(geminiKey);
      this.logger.log(
        'Google Gemini AI inicializado para Embeddings (768 dims).',
      );
    } else if (openaiKey && !openaiKey.startsWith('sk-your')) {
      this.openai = new OpenAI({ apiKey: openaiKey });
      this.logger.log(
        'OpenAI inicializado para Embeddings (Fallback 1536->768 dims).',
      );
    } else {
      this.logger.warn(
        'Nenhuma API KEY (Gemini/OpenAI) configurada. Operando em modo Fallback Local.',
      );
    }

    // Redis L2 cache. If REDIS_URL is unset or the connection fails, the
    // service degrades to L1-only — RAG still works, just with a smaller
    // hit-rate after pod restarts / scale-out.
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
        this.logger.warn(`Redis L2 cache init failed: ${err.message}`);
        this.redis = null;
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit().catch(() => {});
  }

  // ─── Cache helpers ──────────────────────────────────────────────────────

  private cacheKey(normalized: string): string {
    // SHA-256 keeps Redis keys bounded (8KB texts → 64-char hex) and avoids
    // weird chars in keys.
    return `emb:768:${createHash('sha256').update(normalized).digest('hex')}`;
  }

  private async readCache(normalized: string): Promise<number[] | null> {
    // L1
    const l1 = this.embeddingCache.get(normalized);
    if (l1 && Date.now() - l1.timestamp < this.L1_TTL_MS) {
      return l1.embedding;
    }
    // L2
    if (this.redis && this.redis.status === 'ready') {
      try {
        const raw = await this.redis.get(this.cacheKey(normalized));
        if (raw) {
          const parsed = JSON.parse(raw) as number[];
          // Promote to L1.
          this.setL1(normalized, parsed);
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
    embedding: number[],
  ): Promise<void> {
    this.setL1(normalized, embedding);
    if (this.redis && this.redis.status === 'ready') {
      // Fire-and-forget; latency mustn't block the caller.
      this.redis
        .setex(
          this.cacheKey(normalized),
          this.L2_TTL_S,
          JSON.stringify(embedding),
        )
        .catch((err) =>
          this.logger.warn(`L2 write failed: ${(err as Error).message}`),
        );
    }
  }

  private setL1(key: string, embedding: number[]): void {
    if (this.embeddingCache.size >= this.MAX_CACHE_SIZE) {
      // Cheap LRU-ish eviction: drop the oldest by timestamp.
      let oldestKey = '';
      let oldestTime = Infinity;
      for (const [k, v] of this.embeddingCache) {
        if (v.timestamp < oldestTime) {
          oldestTime = v.timestamp;
          oldestKey = k;
        }
      }
      if (oldestKey) this.embeddingCache.delete(oldestKey);
    }
    this.embeddingCache.set(key, { embedding, timestamp: Date.now() });
  }

  /**
   * Normaliza o texto antes de criar o embedding.
   * Reduz tokens desnecessários = menos custo.
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ') // colapsa espaços
      .replace(/[^\w\sàáâãéêíóôõúç.,;:!?()"-]/gi, '') // remove chars especiais
      .trim()
      .slice(0, 8000); // Limite para evitar tokens excessivos (~2000 tokens)
  }

  /**
   * Gera um embedding determinístico de 768 dimensões baseado no texto.
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
   * Cria embedding para um texto único via Google Gemini.
   */
  async createEmbedding(text: string): Promise<number[]> {
    const normalized = this.normalizeText(text);

    const cached = await this.readCache(normalized);
    if (cached) return cached;

    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: 'text-embedding-004',
        });
        const result = await model.embedContent({
          content: { role: 'user', parts: [{ text: normalized }] },
          taskType: 'RETRIEVAL_DOCUMENT' as any,
          outputDimensionality: 768,
        } as any);
        const embedding = result.embedding.values;
        await this.writeCache(normalized, embedding);
        return embedding;
      } catch (error) {
        this.logger.error(`Erro Gemini embedding: ${error.message}`);
      }
    }

    if (this.openai) {
      try {
        const res = await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: normalized,
          dimensions: this.VECTOR_DIM,
        });
        const embedding = res.data[0].embedding;
        await this.writeCache(normalized, embedding);
        return embedding;
      } catch (error) {
        this.logger.error(`Erro OpenAI embedding: ${error.message}`);
      }
    }

    const fallback = this.generateLocalFallbackEmbedding(normalized);
    await this.writeCache(normalized, fallback);
    return fallback;
  }

  /**
   * Cria embeddings em batch via Gemini.
   */
  async createBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.genAI) {
      return texts.map((t) =>
        this.generateLocalFallbackEmbedding(this.normalizeText(t)),
      );
    }

    const normalized = texts.map((t) => this.normalizeText(t));
    // Resolve all cache lookups in parallel (L1 sync, L2 async).
    const results: (number[] | null)[] = await Promise.all(
      normalized.map((n) => this.readCache(n)),
    );

    const uncachedIndices = results
      .map((r, i) => (r === null ? i : -1))
      .filter((i) => i >= 0);

    if (uncachedIndices.length === 0) return results as number[][];

    try {
      const model = this.genAI.getGenerativeModel({
        model: 'text-embedding-004',
      });
      const uncachedTexts = uncachedIndices.map((i) => normalized[i]);

      // Process in parallel for high performance
      await Promise.all(
        uncachedIndices.map(async (originalIndex, i) => {
          const text = uncachedTexts[i];
          const result = await model.embedContent({
            content: { role: 'user', parts: [{ text }] },
            taskType: 'RETRIEVAL_DOCUMENT' as any,
            outputDimensionality: 768,
          } as any);

          const embedding = result.embedding.values;
          results[originalIndex] = embedding;
          await this.writeCache(normalized[originalIndex], embedding);
        })
      );

      return results as number[][];
    } catch (error) {
      this.logger.error(`Erro Gemini embedding: ${error.message}`);
      return texts.map((t) =>
        this.generateLocalFallbackEmbedding(this.normalizeText(t)),
      );
    }
  }

  /**
   * Calcula a similaridade cosseno entre dois vetores.
   * Usado para busca semântica local sem precisar do pgvector.
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
      // SCAN-DEL the namespace to avoid blocking-KEYS in production.
      const stream = this.redis.scanStream({ match: 'emb:768:*', count: 200 });
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
