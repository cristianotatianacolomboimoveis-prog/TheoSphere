import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { EmbeddingService } from '../rag/embedding.service';
import {
  parseAdvancedQuery,
  toTsQuery,
  type ParsedQuery,
} from './query-parser';
import { resolveBookId } from '../common/book-map';

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

    // ── 0. Reference Detection ──────────────────────────────────────────
    // Se a query parece uma referência (ex: Gênesis 1:1 ou João 3:16)
    const refMatch = trimmed.match(
      /^([1-3]?\s?[a-zA-Záéíóúâêîôûãõç]+)\s+(\d+)(?::(\d+))?$/i,
    );
    if (refMatch) {
      const bookName = refMatch[1];
      const chapter = parseInt(refMatch[2]);
      const verse = refMatch[3] ? parseInt(refMatch[3]) : null;

      // Mapa canônico compartilhado (common/book-map.ts)

      const resolvedBookId = resolveBookId(bookName);
      if (resolvedBookId) {
        const results = await this.prisma.bibleVerse.findMany({
          where: {
            bookId: resolvedBookId,
            chapter: chapter,
            ...(verse ? { verse } : {}),
            ...(opts.translation ? { translation: opts.translation } : {}),
          },
          orderBy: { verse: 'asc' },
          take: opts.limit || 50,
        });

        if (results.length > 0) {
          return results.map((r) => ({
            id: r.id,
            bookId: r.bookId,
            chapter: r.chapter,
            verse: r.verse,
            translation: r.translation,
            text: r.text,
            score: 1.0,
            vectorRank: 1,
            keywordRank: 1,
          }));
        }
      }
    }

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

  /**
   * Advanced search — parses Logos-style query syntax and routes to
   * either a pure-SQL execution (when structural filters are present)
   * or the hybrid retriever (when query is free-text only).
   *
   * Examples:
   *   advancedSearch("agape AND eros")                       → hybrid
   *   advancedSearch("book:John chapter:1-3 grace")          → structured + FTS
   *   advancedSearch('book:Romans "by faith"')               → structured + phrase
   *   advancedSearch("repent -hell")                         → hybrid w/ NOT
   *   advancedSearch("strong:G26 book:John")                 → interlinear join
   *   advancedSearch("morph:V-AAI book:Romans chapter:5")    → morfológica
   *
   * Returns the parsed query alongside hits so the client can show chips
   * confirming what was interpreted.
   */
  async advancedSearch(
    query: string,
    opts: HybridSearchOptions = {},
  ): Promise<{ parsed: ParsedQuery; hits: HybridHit[] }> {
    const parsed = parseAdvancedQuery(query);

    // No structural filters → fall back to the existing hybrid pipeline.
    if (!parsed.hasStructure) {
      const hits = await this.hybridSearchVerses(parsed.plain || query, opts);
      return { parsed, hits };
    }

    const limit = Math.min(opts.limit ?? 50, 200);
    const translation = opts.translation;

    const bookId = parsed.bookName ? resolveBookId(parsed.bookName) : null;

    const whereParts: Prisma.Sql[] = [];
    if (bookId) whereParts.push(Prisma.sql`"bookId" = ${bookId}`);
    if (parsed.chapterMin != null && parsed.chapterMax != null) {
      whereParts.push(
        Prisma.sql`"chapter" BETWEEN ${parsed.chapterMin} AND ${parsed.chapterMax}`,
      );
    }
    if (translation) {
      whereParts.push(Prisma.sql`"translation" = ${translation}`);
    }

    // ── Filtros de língua original (strong:/morph:) via InterlinearWord ──
    // EXISTS correlacionado usa os índices (bookId, chapter) e (strongId)
    // da tabela InterlinearWord; o morph é comparado por prefixo (V → todos
    // os verbos, V-AAI → aoristo ativo indicativo, etc.).
    if (parsed.strongId || parsed.morph || parsed.lemma) {
      const iwConds: Prisma.Sql[] = [
        Prisma.sql`iw."bookId" = "BibleVerse"."bookId"`,
        Prisma.sql`iw."chapter" = "BibleVerse"."chapter"`,
        Prisma.sql`iw."verse" = "BibleVerse"."verse"`,
      ];
      if (parsed.strongId) {
        iwConds.push(Prisma.sql`iw."strongId" = ${parsed.strongId}`);
      }
      if (parsed.lemma) {
        // Igualdade exata no lema original (ἀγαπάω, אָהַב). Parâmetro
        // vinculado — sem interpolação de string.
        iwConds.push(Prisma.sql`iw."lemma" = ${parsed.lemma}`);
      }
      if (parsed.morph) {
        // parsed.morph já foi sanitizado no parser ([A-Z0-9-]); o escape de
        // curingas abaixo é defesa extra para o LIKE.
        const morphPrefix = parsed.morph.replace(/[%_]/g, '') + '%';
        iwConds.push(Prisma.sql`iw."morph" LIKE ${morphPrefix}`);
      }
      whereParts.push(
        Prisma.sql`EXISTS (SELECT 1 FROM "InterlinearWord" iw WHERE ${Prisma.join(iwConds, ' AND ')})`,
      );
    }

    const tsQ = toTsQuery(parsed);
    let orderBy: Prisma.Sql;

    if (tsQ) {
      whereParts.push(
        Prisma.sql`to_tsvector('simple', "text") @@ to_tsquery('simple', ${tsQ})`,
      );
      orderBy = Prisma.sql`ts_rank(to_tsvector('simple', "text"), to_tsquery('simple', ${tsQ})) DESC,
                          "bookId" ASC, "chapter" ASC, "verse" ASC`;
    } else {
      orderBy = Prisma.sql`"bookId" ASC, "chapter" ASC, "verse" ASC`;
    }

    const whereSql =
      whereParts.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(whereParts, ' AND ')}`
        : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        bookId: number;
        chapter: number;
        verse: number;
        translation: string;
        text: string;
        rank: number | null;
      }>
    >`
      SELECT id, "bookId", chapter, verse, translation, text,
             ${
               tsQ
                 ? Prisma.sql`ts_rank(to_tsvector('simple', "text"), to_tsquery('simple', ${tsQ}))`
                 : Prisma.sql`1.0`
             } AS rank
      FROM "BibleVerse"
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT ${limit};
    `;

    const hits: HybridHit[] = rows.map((r, idx) => ({
      id: r.id,
      bookId: r.bookId,
      chapter: r.chapter,
      verse: r.verse,
      translation: r.translation,
      text: r.text,
      score: typeof r.rank === 'number' ? r.rank : 1.0,
      vectorRank: null,
      keywordRank: idx + 1,
    }));

    return { parsed, hits };
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
