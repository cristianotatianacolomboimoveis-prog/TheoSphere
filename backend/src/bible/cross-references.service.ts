import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface CrossRef {
  target: string;
  rank: number | null;
  votes: number | null;
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
 *     we return the up to N targets sorted by (rank ASC NULLS LAST, votes DESC).
 *     This is the canonical Logos/OliveTree behaviour.
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
   * Lists cross-refs for a single source reference, sorted best-first.
   *
   * @param sourceRef  canonical English short ref (e.g. "John 3:16")
   * @param limit      max results (default 50, hard cap 200)
   */
  async list(sourceRef: string, limit = 50): Promise<CrossRef[]> {
    const safeLimit = Math.min(Math.max(1, limit), 200);
    const rows = await this.prisma.crossReference.findMany({
      where: { sourceRef },
      // rank ASC, NULLs last (Prisma honours nulls: 'last')
      orderBy: [{ rank: { sort: 'asc', nulls: 'last' } }, { votes: 'desc' }],
      take: safeLimit,
      select: { targetRef: true, rank: true, votes: true },
    });
    return rows.map((r) => ({
      target: r.targetRef,
      rank: r.rank,
      votes: r.votes,
    }));
  }

  /**
   * Bulk count of cross-refs for many source refs in a single query. Used
   * by the BibleReader to decorate each verse with a "🔗 N" badge in O(1)
   * client roundtrip regardless of chapter size.
   *
   * Returns a plain map; refs with zero cross-refs are simply absent.
   */
  async countsByRef(sourceRefs: string[]): Promise<CrossRefBatchResult> {
    const unique = Array.from(
      new Set(sourceRefs.filter((r) => typeof r === 'string' && r.length > 0)),
    );
    if (unique.length === 0) return { counts: {} };

    // Prisma's groupBy is the cleanest path here — single roundtrip,
    // typed result, no raw SQL.
    const grouped = await this.prisma.crossReference.groupBy({
      by: ['sourceRef'],
      where: { sourceRef: { in: unique } },
      _count: { _all: true },
    });

    const counts: Record<string, number> = {};
    for (const row of grouped) {
      counts[row.sourceRef] = row._count._all;
    }
    return { counts };
  }
}
