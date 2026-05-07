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
  private readonly TTL_SECONDS = 24 * 60 * 60; // 24h

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly prisma: PrismaService,
    // Kept for future tuning (e.g. THRESHOLD via env). Unused for now.
    private readonly configService: ConfigService,
  ) {}

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
    } catch (err) {
      this.logger.warn(
        `scheduledPrune failed: ${(err as Error).message}`,
      );
    }
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
          (id, scope, "userId", tradition, "queryText", response, embedding, "hitCount", "expiresAt", "createdAt")
        VALUES (
          gen_random_uuid()::text,
          ${scope},
          ${userId},
          ${tradition},
          ${query},
          ${response},
          ${Prisma.raw(`'${literal}'::vector`)},
          0,
          ${expiresAt},
          NOW()
        );
      `;
    } catch (err) {
      this.logger.error(`Failed to insert cache entry: ${(err as Error).message}`);
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
