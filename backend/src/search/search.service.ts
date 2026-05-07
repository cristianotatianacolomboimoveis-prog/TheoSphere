import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { EmbeddingService } from '../rag/embedding.service';

export interface HybridSearchOptions {
  /** Limit returned results. Default 20, capped at 100. */
  limit?: number;
  /** Filter by translation code (e.g. 'KJV', 'ARA'). Default: any. */
  translation?: string;
  /** RRF constant — higher dampens dominance of top ranks. Default 60. */
  rrfK?: number;
  /** Pool size pulled from each retriever before fusion. Default 50. */
  poolSize?: number;
}

export interface HybridHit {
  id: string;
  bookId: number;
  chapter: number;
  verse: number;
  translation: string;
  text: string;
  score: number;
  vectorRank: number | null;
  keywordRank: number | null;
}

interface VectorRow {
  id: string;
  bookId: number;
  chapter: number;
  verse: number;
  translation: string;
  text: string;
  distance: number;
}

interface KeywordRow {
  id: string;
  bookId: number;
  chapter: number;
  verse: number;
  translation: string;
  text: string;
  rank: number;
}

/**
 * Hybrid search over BibleVerse:
 *   Reciprocal Rank Fusion (RRF) of two independent retrievers
 *     1. Vector retriever: pgvector cosine ANN over `embedding`
 *     2. Keyword retriever: PostgreSQL full-text search (to_tsvector + plainto_tsquery)
 *
 * Why RRF and not weighted-sum?
 *   RRF is parameter-light, robust to score-distribution mismatch between
 *   retrievers (cosine distance vs ts_rank), and is the de-facto baseline
 *   for hybrid retrieval (Cormack et al. 2009).
 *
 * Score per document d:
 *     score(d) = Σ_r  1 / (k + rank_r(d))
 * where r ranges over the retrievers that returned d, rank_r is 1-indexed,
 * and k is a smoothing constant (default 60).
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingService,
  ) {}

  async hybridSearchVerses(
    query: string,
    opts: HybridSearchOptions = {},
  ): Promise<HybridHit[]> {
    const trimmed = query?.trim();
    if (!trimmed || trimmed.length < 2) return [];

    const limit = Math.min(opts.limit ?? 20, 100);
    const poolSize = Math.min(opts.poolSize ?? 50, 200);
    const k = opts.rrfK ?? 60;
    const translation = opts.translation;

    // Run both retrievers in parallel; degrade gracefully if either fails.
    const [vectorHits, keywordHits] = await Promise.all([
      this.vectorSearch(trimmed, poolSize, translation).catch((err) => {
        this.logger.warn(`vector search failed: ${(err as Error).message}`);
        return [] as VectorRow[];
      }),
      this.keywordSearch(trimmed, poolSize, translation).catch((err) => {
        this.logger.warn(`keyword search failed: ${(err as Error).message}`);
        return [] as KeywordRow[];
      }),
    ]);

    return this.fuse(vectorHits, keywordHits, k, limit);
  }

  // ─── Retrievers ─────────────────────────────────────────────────────────

  private async vectorSearch(
    query: string,
    poolSize: number,
    translation?: string,
  ): Promise<VectorRow[]> {
    let embedding: number[];
    try {
      embedding = await this.embeddings.createEmbedding(query);
    } catch (err) {
      this.logger.warn(
        `embedding for vector search failed: ${(err as Error).message}`,
      );
      return [];
    }
    const literal = `[${embedding
      .map((n) => (Number.isFinite(n) ? n : 0))
      .join(',')}]`;

    return this.prisma.$queryRaw<VectorRow[]>`
      SELECT id, "bookId", chapter, verse, translation, text,
             (embedding <=> ${Prisma.raw(`'${literal}'::vector`)}) AS distance
      FROM "BibleVerse"
      WHERE embedding IS NOT NULL
        AND (${translation ?? null}::text IS NULL OR translation = ${translation ?? null})
      ORDER BY embedding <=> ${Prisma.raw(`'${literal}'::vector`)}
      LIMIT ${poolSize};
    `;
  }

  private async keywordSearch(
    query: string,
    poolSize: number,
    translation?: string,
  ): Promise<KeywordRow[]> {
    // `plainto_tsquery` handles user input safely (no operator chars),
    // and `simple` config avoids language-specific stemming surprises
    // (the corpus is multi-lingual: PT, EN, GR, HE).
    return this.prisma.$queryRaw<KeywordRow[]>`
      SELECT id, "bookId", chapter, verse, translation, text,
             ts_rank(to_tsvector('simple', text),
                     plainto_tsquery('simple', ${query})) AS rank
      FROM "BibleVerse"
      WHERE to_tsvector('simple', text) @@ plainto_tsquery('simple', ${query})
        AND (${translation ?? null}::text IS NULL OR translation = ${translation ?? null})
      ORDER BY rank DESC
      LIMIT ${poolSize};
    `;
  }

  // ─── Fusion ─────────────────────────────────────────────────────────────

  private fuse(
    vectorHits: VectorRow[],
    keywordHits: KeywordRow[],
    k: number,
    limit: number,
  ): HybridHit[] {
    const merged = new Map<
      string,
      {
        row: VectorRow | KeywordRow;
        score: number;
        vectorRank: number | null;
        keywordRank: number | null;
      }
    >();

    vectorHits.forEach((row, i) => {
      const rank = i + 1; // 1-indexed
      merged.set(row.id, {
        row,
        score: 1 / (k + rank),
        vectorRank: rank,
        keywordRank: null,
      });
    });

    keywordHits.forEach((row, i) => {
      const rank = i + 1;
      const existing = merged.get(row.id);
      if (existing) {
        existing.score += 1 / (k + rank);
        existing.keywordRank = rank;
      } else {
        merged.set(row.id, {
          row,
          score: 1 / (k + rank),
          vectorRank: null,
          keywordRank: rank,
        });
      }
    });

    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ row, score, vectorRank, keywordRank }) => ({
        id: row.id,
        bookId: row.bookId,
        chapter: row.chapter,
        verse: row.verse,
        translation: row.translation,
        text: row.text,
        score,
        vectorRank,
        keywordRank,
      }));
  }
}
