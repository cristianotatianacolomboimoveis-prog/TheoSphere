import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  BOOK_NAME_TO_ID,
  BOOK_ID_TO_NAME_PT,
  normalizeRefToCanonicalEn,
} from '../common/book-map';

export interface CrossRef {
  target: string;
  rank: number | null;
  votes: number | null;
  text?: string;
  bookNamePt?: string;
}

export interface CrossRefBatchResult {
  /** Map verse-ref → count of cross-refs available. Hot path for chapter scroll. */
  counts: Record<string, number>;
}

/**
 * CrossReferencesService — serves Treasury of Scripture Knowledge data.
 *
 * Two hot paths:
 *   • `list(sourceRef)` — when the user clicks the "🔗 N" badge on a verse,
 *     we return the up to N targets sorted by (rank ASC NULLS LAST, votes DESC),
 *     enriched with inline verse text in the requested translation.
 *
 *   • `countsByRef(refs)` — when the BibleReader renders a chapter, it asks
 *     in ONE roundtrip how many cross-refs exist for each verse on screen,
 *     so each verse can render its badge without N+1 queries. Backed by
 *     a single GROUP BY query.
 *
 * The dataset is seeded by `seed-tsk.ts` (small built-in corpus) and may be
 * extended via the `tsk:import` script (full openbible.info CSV ingestion).
 */
@Injectable()
export class CrossReferencesService {
  private readonly logger = new Logger(CrossReferencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists cross-refs for a single source reference, sorted best-first,
   * enriched with inline scripture text.
   *
   * @param sourceRef    canonical English or PT ref (e.g. "John 3:16" or "João 3:16")
   * @param limit        max results (default 50, hard cap 200)
   * @param translation  Bible translation for inline text (default 'BLIVRE')
   * @param includeText  whether to batch-fetch verse texts (default true)
   */
  async list(
    sourceRef: string,
    limit = 50,
    translation = 'BLIVRE',
    includeText = true,
  ): Promise<CrossRef[]> {
    const safeLimit = Math.min(Math.max(1, limit), 200);
    const normalizedSource = normalizeRefToCanonicalEn(sourceRef);

    const rows = await this.prisma.crossReference.findMany({
      where: {
        OR: [{ sourceRef }, { sourceRef: normalizedSource }],
      },
      orderBy: [{ rank: { sort: 'asc', nulls: 'last' } }, { votes: 'desc' }],
      take: safeLimit,
      select: { targetRef: true, rank: true, votes: true },
    });

    if (rows.length === 0) return [];

    // Deduplica alvos preservando a melhor ordem
    const seen = new Set<string>();
    const uniqueRows: typeof rows = [];
    for (const r of rows) {
      if (!seen.has(r.targetRef)) {
        seen.add(r.targetRef);
        uniqueRows.push(r);
      }
    }

    const parsedTargets = uniqueRows.map((r) => {
      const m = r.targetRef.match(
        /^(\d?\s*[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]*?)\s+(\d+):(\d+)$/,
      );
      if (!m) {
        return { ...r, parsed: null, bookId: undefined };
      }
      const bookKey = m[1].toLowerCase().replace(/\s+/g, ' ').trim();
      const bookId = BOOK_NAME_TO_ID[bookKey];
      return {
        ...r,
        parsed: {
          bookName: m[1].trim(),
          chapter: parseInt(m[2], 10),
          verse: parseInt(m[3], 10),
        },
        bookId,
      };
    });

    const textMap = new Map<string, string>();
    if (includeText) {
      const activeTranslation = (translation || 'BLIVRE').toUpperCase().trim();
      const verseConditions = parsedTargets
        .filter(
          (
            t,
          ): t is typeof t & {
            bookId: number;
            parsed: { chapter: number; verse: number };
          } => typeof t.bookId === 'number' && t.parsed !== null,
        )
        .map((t) => ({
          bookId: t.bookId,
          chapter: t.parsed.chapter,
          verse: t.parsed.verse,
        }));

      if (verseConditions.length > 0) {
        try {
          const verses = await this.prisma.bibleVerse.findMany({
            where: {
              translation: activeTranslation,
              OR: verseConditions,
            },
            select: {
              bookId: true,
              chapter: true,
              verse: true,
              text: true,
            },
          });
          for (const v of verses) {
            textMap.set(`${v.bookId}:${v.chapter}:${v.verse}`, v.text);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(
            `Falha ao buscar textos de versículos para TSK: ${msg}`,
          );
        }
      }
    }

    return parsedTargets.map((p) => {
      const textKey =
        p.bookId && p.parsed
          ? `${p.bookId}:${p.parsed.chapter}:${p.parsed.verse}`
          : null;
      const bookNamePt = p.bookId ? BOOK_ID_TO_NAME_PT[p.bookId] : undefined;
      return {
        target: p.targetRef,
        rank: p.rank,
        votes: p.votes,
        text: textKey ? textMap.get(textKey) : undefined,
        bookNamePt,
      };
    });
  }

  /**
   * Bulk count of cross-refs for many source refs in a single query. Used
   * by the BibleReader to decorate each verse with a "🔗 N" badge in O(1)
   * client roundtrip regardless of chapter size.
   *
   * Returns a plain map; refs with zero cross-refs are simply absent.
   */
  async countsByRef(sourceRefs: string[]): Promise<CrossRefBatchResult> {
    const rawUnique = Array.from(
      new Set(sourceRefs.filter((r) => typeof r === 'string' && r.length > 0)),
    );
    if (rawUnique.length === 0) return { counts: {} };

    const queryRefs = Array.from(
      new Set(rawUnique.flatMap((r) => [r, normalizeRefToCanonicalEn(r)])),
    );

    const grouped = await this.prisma.crossReference.groupBy({
      by: ['sourceRef'],
      where: { sourceRef: { in: queryRefs } },
      _count: { _all: true },
    });

    const counts: Record<string, number> = {};
    for (const row of grouped) {
      counts[row.sourceRef] = row._count._all;
    }

    // Mapeia de volta para os refs originais informados pelo chamador
    for (const ref of rawUnique) {
      if (!counts[ref]) {
        const canonical = normalizeRefToCanonicalEn(ref);
        if (counts[canonical]) {
          counts[ref] = counts[canonical];
        }
      }
    }

    return { counts };
  }
}
