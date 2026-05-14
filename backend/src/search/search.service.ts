import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { EmbeddingService } from '../rag/embedding.service';
import { parseAdvancedQuery, toTsQuery, type ParsedQuery } from './query-parser';

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
    const refMatch = trimmed.match(/^([1-3]?\s?[a-zA-Záéíóúâêîôûãõç]+)\s+(\d+)(?::(\d+))?$/i);
    if (refMatch) {
      const bookName = refMatch[1];
      const chapter = parseInt(refMatch[2]);
      const verse = refMatch[3] ? parseInt(refMatch[3]) : null;

      const bookMap: Record<string, number> = {
        "gênesis": 1, "genesis": 1, "êxodo": 2, "exodus": 2, "levítico": 3, "leviticus": 3,
        "números": 4, "numbers": 4, "deuteronômio": 5, "deuteronomy": 5, "josué": 6, "joshua": 6,
        "juízes": 7, "judges": 7, "rute": 8, "ruth": 8, "1 samuel": 9, "2 samuel": 10,
        "1 reis": 11, "2 reis": 12, "1 crônicas": 13, "2 crônicas": 14, "esdras": 15, "ezra": 15,
        "neemias": 16, "nehemiah": 16, "ester": 17, "esther": 17, "jó": 18, "job": 18,
        "salmos": 19, "psalms": 19, "provérbios": 20, "proverbs": 20, "eclesiastes": 21, "ecclesiastes": 21,
        "cantares": 22, "song of solomon": 22, "isaías": 23, "isaiah": 23, "jeremias": 24, "jeremiah": 24,
        "lamentações": 25, "lamentations": 25, "ezequiel": 26, "ezekiel": 26, "daniel": 27,
        "oséias": 28, "hosea": 28, "joel": 29, "amós": 30, "amos": 30, "obadias": 31, "obadiah": 31,
        "jonas": 32, "jonah": 32, "miquéias": 33, "micah": 33, "naum": 34, "nahum": 34,
        "habacuque": 35, "habakkuk": 35, "sofonias": 36, "zephaniah": 36, "ageu": 37, "haggai": 37,
        "zacarias": 38, "zechariah": 38, "malaquias": 39, "malachi": 39, "mateus": 40, "matthew": 40,
        "marcos": 41, "mark": 41, "lucas": 42, "luke": 42, "joão": 43, "john": 43, "atos": 44, "acts": 44,
        "romanos": 45, "romans": 45, "1 coríntios": 46, "2 coríntios": 47, "gálatas": 48, "galatians": 48,
        "efésios": 49, "ephesians": 49, "filipenses": 50, "philippians": 50, "colossenses": 51, "colossians": 51,
        "1 tessalonicenses": 52, "2 tessalonicenses": 53, "1 timóteo": 54, "2 timóteo": 55, "tito": 56, "titus": 56,
        "filemom": 57, "philemon": 57, "hebreus": 58, "hebrews": 58, "tiago": 59, "james": 59,
        "1 pedro": 60, "2 pedro": 61, "1 joão": 62, "2 joão": 63, "3 joão": 64, "judas": 65, "apocalipse": 66, "revelation": 66
      };

      const resolvedBookId = bookMap[bookName.toLowerCase()];
      if (resolvedBookId) {
        const results = await this.prisma.bibleVerse.findMany({
          where: {
            bookId: resolvedBookId,
            chapter: chapter,
            ...(verse ? { verse } : {}),
            ...(opts.translation ? { translation: opts.translation } : {})
          },
          orderBy: { verse: 'asc' },
          take: opts.limit || 50
        });

        if (results.length > 0) {
          return results.map(r => ({
            id: r.id,
            bookId: r.bookId,
            chapter: r.chapter,
            verse: r.verse,
            translation: r.translation,
            text: r.text,
            score: 1.0,
            vectorRank: 1,
            keywordRank: 1
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

    const bookId = parsed.bookName
      ? this.resolveBookId(parsed.bookName)
      : null;

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

  /**
   * Best-effort book-name → bookId resolver. Handles English and
   * Portuguese names, with and without leading number tokens.
   * Returns null if no match — caller falls back to ignoring the filter.
   */
  private resolveBookId(name: string): number | null {
    const key = name.toLowerCase().replace(/\s+/g, ' ').trim();
    // Subset of the map used in hybridSearchVerses' reference-detection
    // branch. Kept inline so the search module has no circular dep on the
    // bible module.
    const bookMap: Record<string, number> = {
      'gênesis': 1, genesis: 1, 'êxodo': 2, exodus: 2, 'levítico': 3, leviticus: 3,
      'números': 4, numbers: 4, 'deuteronômio': 5, deuteronomy: 5, 'josué': 6, joshua: 6,
      'juízes': 7, judges: 7, rute: 8, ruth: 8, '1 samuel': 9, '2 samuel': 10,
      '1 reis': 11, '2 reis': 12, '1 crônicas': 13, '2 crônicas': 14, esdras: 15, ezra: 15,
      neemias: 16, nehemiah: 16, ester: 17, esther: 17, 'jó': 18, job: 18,
      salmos: 19, psalms: 19, 'provérbios': 20, proverbs: 20, eclesiastes: 21, ecclesiastes: 21,
      cantares: 22, 'song of solomon': 22, 'isaías': 23, isaiah: 23, jeremias: 24, jeremiah: 24,
      'lamentações': 25, lamentations: 25, ezequiel: 26, ezekiel: 26, daniel: 27,
      'oséias': 28, hosea: 28, joel: 29, 'amós': 30, amos: 30, obadias: 31, obadiah: 31,
      jonas: 32, jonah: 32, 'miquéias': 33, micah: 33, naum: 34, nahum: 34,
      habacuque: 35, habakkuk: 35, sofonias: 36, zephaniah: 36, ageu: 37, haggai: 37,
      zacarias: 38, zechariah: 38, malaquias: 39, malachi: 39, mateus: 40, matthew: 40,
      marcos: 41, mark: 41, lucas: 42, luke: 42, 'joão': 43, john: 43, atos: 44, acts: 44,
      romanos: 45, romans: 45, '1 coríntios': 46, '1 corinthians': 46, '2 coríntios': 47, '2 corinthians': 47,
      'gálatas': 48, galatians: 48, 'efésios': 49, ephesians: 49, filipenses: 50, philippians: 50,
      colossenses: 51, colossians: 51, '1 tessalonicenses': 52, '1 thessalonians': 52,
      '2 tessalonicenses': 53, '2 thessalonians': 53, '1 timóteo': 54, '1 timothy': 54,
      '2 timóteo': 55, '2 timothy': 55, tito: 56, titus: 56, filemom: 57, philemon: 57,
      hebreus: 58, hebrews: 58, tiago: 59, james: 59, '1 pedro': 60, '1 peter': 60,
      '2 pedro': 61, '2 peter': 61, '1 joão': 62, '1 john': 62, '2 joão': 63, '2 john': 63,
      '3 joão': 64, '3 john': 64, judas: 65, jude: 65, apocalipse: 66, revelation: 66,
    };
    return bookMap[key] ?? null;
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
