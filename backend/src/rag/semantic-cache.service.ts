import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { EmbeddingService } from './embedding.service';
import { PrismaService } from '../prisma.service';

/**
 * SemanticCacheService — pgvector-backed semantic cache for AI responses.
 *
 * Replaces the previous Redis+JSON full-scan implementation. Now:
 *  - embeddings live in `SemanticCacheEntry.embedding vector(768)`
 *  - similarity is computed in-database with the pgvector cosine operator (`<=>`)
 *  - lookups are accelerated by an HNSW ANN index
 *  - TTL is enforced via `expiresAt` (set on insert, filtered on read)
 *
 * Pipeline (per query):
 *   1. embed query → 768-d vector
 *   2. SELECT … ORDER BY embedding <=> $1 LIMIT 1 (filtered by scope/tradition/expiresAt)
 *   3. if cosine_similarity ≥ threshold → cache hit (increment hitCount)
 *   4. else → caller falls through to LLM and stores result via cacheResponse()
 *
 * NOTE: pgvector's `<=>` returns cosine *distance* in [0, 2]. We convert to
 * cosine *similarity* via `1 - distance` so the threshold semantics match the
 * old API (0.9 = very similar).
 */

interface SimilarityRow {
  id: string;
  response: string;
  distance: number; // cosine distance ∈ [0, 2]
  hitCount: number;
  scope: 'global' | 'user';
}

@Injectable()
export class SemanticCacheService {
  private readonly logger = new Logger(SemanticCacheService.name);

  // 0.9 similarity ≈ 0.1 cosine distance
  private readonly SIMILARITY_THRESHOLD = 0.9;

  /**
   * Aprendizado contínuo (2026-07-20): TTL e teto de entradas configuráveis
   * por env var. Default: 30 dias / 100k entradas — em servidor próprio o
   * cache vira memória de longo prazo; o teto protege a latência do índice
   * HNSW descartando as entradas menos usadas (menor hitCount) primeiro.
   */
  private readonly TTL_SECONDS: number;
  private readonly MAX_ENTRIES: number;

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const ttlHours = Number(
      this.config.get<string>('SEMANTIC_CACHE_TTL_HOURS') ?? 720,
    );
    this.TTL_SECONDS =
      (Number.isFinite(ttlHours) && ttlHours > 0 ? ttlHours : 720) * 60 * 60;

    const maxEntries = Number(
      this.config.get<string>('SEMANTIC_CACHE_MAX_ENTRIES') ?? 100_000,
    );
    this.MAX_ENTRIES =
      Number.isFinite(maxEntries) && maxEntries > 0 ? maxEntries : 100_000;
  }

  /**
   * Returns the most similar cached response if cosine similarity ≥ threshold.
   * Searches the user-scoped cache first, then the global cache.
   */
  async findSimilarResponse(
    query: string,
    userId?: string,
    tradition?: string,
  ): Promise<{
    response: string;
    similarity: number;
    source: 'global' | 'user';
  } | null> {
    // ── Passo 0: acerto exato, sem custo de API ────────────────────────────
    // Antes de 30/07/2026 o lookup começava direto no createEmbedding, então
    // repetir a mesma pergunta gastava uma chamada faturada para redescobrir
    // algo que já estava no banco. Cada pergunta custava 2 requisições
    // (embedding + geração) e consumia a cota diária no dobro da velocidade.
    const exact = await this.queryExact({ query, userId, tradition });
    if (exact) {
      this.logger.debug('[Cache] acerto exato (sem embedding)');
      return exact;
    }

    let embedding: number[];
    try {
      embedding = await this.embeddingService.createEmbedding(query);
    } catch (err) {
      this.logger.warn(
        `Embedding failed; cache lookup skipped: ${(err as Error).message}`,
      );
      return null;
    }

    // 1. user scope first (more relevant if present)
    if (userId) {
      const userHit = await this.queryNearest({
        embedding,
        scope: 'user',
        userId,
        tradition,
      });
      if (userHit) return userHit;
    }

    // 2. fall back to global scope
    return this.queryNearest({ embedding, scope: 'global', tradition });
  }

  /**
   * Stores an entry in the global cache (and additionally in the user cache
   * when a userId is provided). Uses a single round-trip per scope.
   */
  async cacheResponse(
    query: string,
    response: string,
    userId?: string,
    tradition?: string,
  ): Promise<void> {
    let embedding: number[];
    try {
      embedding = await this.embeddingService.createEmbedding(query);
    } catch (err) {
      this.logger.warn(
        `Embedding failed; cache store skipped: ${(err as Error).message}`,
      );
      return;
    }

    const expiresAt = new Date(Date.now() + this.TTL_SECONDS * 1000);

    // global
    await this.insertEntry({
      scope: 'global',
      userId: null,
      tradition: tradition ?? null,
      query,
      response,
      embedding,
      expiresAt,
    });

    // user (private copy — keeps user-scoped lookups fast and isolated)
    if (userId) {
      await this.insertEntry({
        scope: 'user',
        userId,
        tradition: tradition ?? null,
        query,
        response,
        embedding,
        expiresAt,
      });
    }
  }

  /**
   * Cron-driven prune (every hour at :05) of cache entries whose `expiresAt`
   * is in the past. Keeps the table — and the HNSW index — bounded so ANN
   * lookup latency stays predictable.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledPrune(): Promise<void> {
    try {
      await this.pruneExpired();
      await this.pruneOverflow();
    } catch (err) {
      this.logger.warn(`scheduledPrune failed: ${(err as Error).message}`);
    }
  }

  /**
   * Mantém a tabela dentro de MAX_ENTRIES descartando primeiro as entradas
   * menos aproveitadas (menor hitCount) e mais antigas — política LRU-like
   * que preserva as respostas mais reutilizadas ("aprendizado" consolidado).
   */
  async pruneOverflow(): Promise<number> {
    const total = await this.prisma.semanticCacheEntry.count();
    const excess = total - this.MAX_ENTRIES;
    if (excess <= 0) return 0;

    const result = await this.prisma.$executeRaw`
      DELETE FROM "SemanticCacheEntry"
      WHERE id IN (
        SELECT id FROM "SemanticCacheEntry"
        ORDER BY "hitCount" ASC, "createdAt" ASC
        LIMIT ${excess}
      );
    `;
    this.logger.log(
      `Pruned ${result} low-value cache entries (cap=${this.MAX_ENTRIES})`,
    );
    return Number(result);
  }

  /**
   * Remove do cache toda entrada quase idêntica à query (similaridade ≥ 0.95).
   * Usado pelo feedback negativo (👎): uma resposta ruim para de ser servida
   * imediatamente, em vez de esperar o TTL.
   */
  async invalidateSimilar(query: string): Promise<number> {
    let embedding: number[];
    try {
      embedding = await this.embeddingService.createEmbedding(query);
    } catch (err) {
      this.logger.warn(
        `Embedding failed; invalidateSimilar skipped: ${(err as Error).message}`,
      );
      return 0;
    }
    const literal = this.toVectorLiteral(embedding);
    const result = await this.prisma.$executeRaw`
      DELETE FROM "SemanticCacheEntry"
      WHERE (embedding <=> ${Prisma.raw(`'${literal}'::vector`)}) <= 0.05;
    `;
    if (Number(result) > 0) {
      this.logger.log(`[Feedback 👎] Invalidated ${result} cache entries`);
    }
    return Number(result);
  }

  /** Drops every entry whose expiresAt is in the past. Run from a cron. */
  async pruneExpired(): Promise<number> {
    const result = await this.prisma.semanticCacheEntry.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (result.count > 0) {
      this.logger.log(`Pruned ${result.count} expired cache entries`);
    }
    return result.count;
  }

  /** Removes every entry tied to a specific user. */
  async invalidateUserCache(userId: string): Promise<void> {
    const result = await this.prisma.semanticCacheEntry.deleteMany({
      where: { scope: 'user', userId },
    });
    this.logger.log(
      `[Cache INVALIDATED] user=${userId} removed=${result.count}`,
    );
  }

  /** Wipes the entire cache (global + per-user). */
  async clearAll(): Promise<void> {
    const result = await this.prisma.semanticCacheEntry.deleteMany({});
    this.logger.log(`[Cache CLEAR] removed=${result.count}`);
  }

  async getStats() {
    const [globalCount, userCount, totalHitsAgg] = await Promise.all([
      this.prisma.semanticCacheEntry.count({ where: { scope: 'global' } }),
      this.prisma.semanticCacheEntry.count({ where: { scope: 'user' } }),
      this.prisma.semanticCacheEntry.aggregate({ _sum: { hitCount: true } }),
    ]);
    return {
      globalCacheSize: globalCount,
      userCacheCount: userCount,
      totalEntries: globalCount + userCount,
      totalHits: totalHitsAgg._sum.hitCount ?? 0,
    };
  }

  // ─── internals ──────────────────────────────────────────────────────────

  /**
   * Normaliza a pergunta para o hash: minúsculas, acentos removidos, espaços
   * colapsados e pontuação final descartada. "Quem foi Nínive?" e
   * "quem foi ninive" viram a mesma chave.
   */
  private hashQuery(query: string): string {
    const normalized = query
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[.?!]+$/, '')
      .trim();
    return createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Acerto exato por hash — uma consulta indexada, zero chamadas de API.
   * Devolve `similarity: 1` porque o texto é literalmente o mesmo.
   */
  private async queryExact(params: {
    query: string;
    userId?: string;
    tradition?: string;
  }): Promise<{
    response: string;
    similarity: number;
    source: 'global' | 'user';
  } | null> {
    const { query, userId, tradition } = params;
    const hash = this.hashQuery(query);

    try {
      // Escopo do usuário primeiro (mais relevante), depois o global.
      const rows = await this.prisma.$queryRaw<
        { response: string; scope: string; id: string }[]
      >`
        SELECT id, response, scope
        FROM "SemanticCacheEntry"
        WHERE "queryHash" = ${hash}
          AND "expiresAt" > NOW()
          AND (
            (scope = 'user' AND "userId" = ${userId ?? null})
            OR scope = 'global'
          )
          AND (${tradition ?? null}::text IS NULL OR tradition IS NULL OR tradition = ${tradition ?? null})
        ORDER BY CASE WHEN scope = 'user' THEN 0 ELSE 1 END
        LIMIT 1;
      `;

      const hit = rows[0];
      if (!hit) return null;

      // hitCount alimenta a política de prune (LRU-like) — manter atualizado.
      await this.prisma.$executeRaw`
        UPDATE "SemanticCacheEntry" SET "hitCount" = "hitCount" + 1 WHERE id = ${hit.id};
      `;

      return {
        response: hit.response,
        similarity: 1,
        source: hit.scope === 'user' ? 'user' : 'global',
      };
    } catch (err) {
      // Banco antigo sem a coluna: segue para a busca vetorial.
      this.logger.debug(
        `[Cache] match exato indisponível: ${(err as Error).message}`,
      );
      return null;
    }
  }

  private async queryNearest(params: {
    embedding: number[];
    scope: 'global' | 'user';
    userId?: string;
    tradition?: string;
  }): Promise<{
    response: string;
    similarity: number;
    source: 'global' | 'user';
  } | null> {
    const { embedding, scope, userId, tradition } = params;
    const literal = this.toVectorLiteral(embedding);

    // We use raw SQL because Prisma can't model the `<=>` operator natively.
    // All untrusted inputs are bound through ${} (Prisma.sql) — never interpolated.
    // The vector literal is built from a number[] and trivially safe.
    const rows = await this.prisma.$queryRaw<SimilarityRow[]>`
      SELECT id,
             response,
             "hitCount",
             scope,
             (embedding <=> ${Prisma.raw(`'${literal}'::vector`)}) AS distance
      FROM "SemanticCacheEntry"
      WHERE scope = ${scope}
        AND "expiresAt" > NOW()
        AND (${userId ?? null}::text IS NULL OR "userId" = ${userId ?? null})
        AND (${tradition ?? null}::text IS NULL OR tradition IS NULL OR tradition = ${tradition ?? null})
      ORDER BY embedding <=> ${Prisma.raw(`'${literal}'::vector`)}
      LIMIT 1;
    `;

    if (rows.length === 0) return null;

    const row = rows[0];
    const similarity = 1 - Number(row.distance);
    if (similarity < this.SIMILARITY_THRESHOLD) return null;

    // increment hit counter (best-effort, fire-and-forget would be fine too)
    await this.prisma.semanticCacheEntry.update({
      where: { id: row.id },
      data: { hitCount: { increment: 1 } },
    });

    return {
      response: row.response,
      similarity,
      source: scope,
    };
  }

  private async insertEntry(params: {
    scope: 'global' | 'user';
    userId: string | null;
    tradition: string | null;
    query: string;
    response: string;
    embedding: number[];
    expiresAt: Date;
  }): Promise<void> {
    const { scope, userId, tradition, query, response, embedding, expiresAt } =
      params;
    const literal = this.toVectorLiteral(embedding);

    try {
      await this.prisma.$executeRaw`
        INSERT INTO "SemanticCacheEntry"
          (id, scope, "userId", tradition, "queryText", "queryHash", response, embedding, "hitCount", "expiresAt", "createdAt")
        VALUES (
          gen_random_uuid()::text,
          ${scope},
          ${userId},
          ${tradition},
          ${query},
          ${this.hashQuery(query)},
          ${response},
          ${Prisma.raw(`'${literal}'::vector`)},
          0,
          ${expiresAt},
          NOW()
        );
      `;
    } catch (err) {
      this.logger.error(
        `Failed to insert cache entry: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Serialize a number[] as a pgvector literal: `[0.1, 0.2, ...]`.
   * Inputs are floats from our own embedding pipeline → no escaping needed.
   */
  private toVectorLiteral(vec: number[]): string {
    return `[${vec.map((n) => (Number.isFinite(n) ? n : 0)).join(',')}]`;
  }
}
