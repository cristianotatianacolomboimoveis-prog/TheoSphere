import {
  Controller,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SearchService } from './search.service';

@Controller('api/v1/search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  private parseLimit(limit?: string, fallback = 20, max = 100): number {
    if (limit == null || limit.trim() === '') return fallback;
    const parsed = Number.parseInt(limit, 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException('limit must be a positive integer');
    }
    return Math.min(parsed, max);
  }

  /**
   * GET /api/v1/search/verses?q=...&translation=KJV&limit=20
   * Hybrid (keyword + vector) search across BibleVerse.
   */
  @Get('verses')
  async verses(
    @Query('q') q: string,
    @Query('translation') translation?: string,
    @Query('limit') limit?: string,
  ) {
    if (!q || q.trim().length < 2) {
      throw new BadRequestException('Query "q" must be at least 2 characters');
    }
    const safeLimit = this.parseLimit(limit, 20, 100);
    const tController = Date.now();
    const data = await this.search.hybridSearchVerses(q, {
      translation,
      limit: safeLimit,
    });
    const totalMs = Date.now() - tController;
    // Meta expõe o timing por braço para investigar a meta declarada de
    // <200ms. Campos vêm de propriedades não-enumeráveis anexadas ao array
    // por hybridSearchVerses; ausentes viram null naturalmente.
    const d = data as unknown as {
      vectorStatus?: string;
      vectorMs?: number;
      keywordMs?: number;
      fusionMs?: number;
      retrieversMs?: number;
    };
    return {
      success: true,
      count: data.length,
      data,
      meta: {
        vectorArm: d.vectorStatus || 'ok',
        timing: {
          vectorMs: d.vectorMs ?? null,
          keywordMs: d.keywordMs ?? null,
          fusionMs: d.fusionMs ?? null,
          retrieversMs: d.retrieversMs ?? null,
          totalMs,
        },
      },
    };
  }

  /**
   * GET /api/v1/search/advanced?q=...&translation=KJV&limit=50
   *
   * Structured search supports field-aware filters while retaining a
   * deterministic SQL path for morphological / lexical constraints.
   *
   * Examples:
   *   agape AND eros
   *   "in the beginning"
   *   book:John chapter:1-3
   *   strong:G26 book:John
   *   morph:V-AAI book:Romans chapter:5
   *   lemma:λόγος
   */
  @Get('advanced')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async advanced(
    @Query('q') q: string,
    @Query('translation') translation?: string,
    @Query('limit') limit?: string,
  ) {
    if (!q || q.trim().length < 2) {
      throw new BadRequestException('Query "q" must be at least 2 characters');
    }
    const safeLimit = this.parseLimit(limit, 50, 200);
    const { parsed, hits } = await this.search.advancedSearch(q, {
      translation,
      limit: safeLimit,
    });
    return {
      success: true,
      data: {
        parsed: {
          bookName: parsed.bookName ?? null,
          chapterMin: parsed.chapterMin ?? null,
          chapterMax: parsed.chapterMax ?? null,
          strongId: parsed.strongId ?? null,
          morph: parsed.morph ?? null,
          lemma: parsed.lemma ?? null,
          must: parsed.must,
          mustNot: parsed.mustNot,
          phrases: parsed.phrases,
          shouldGroups: parsed.shouldGroups,
          hasStructure: parsed.hasStructure,
        },
        count: hits.length,
        hits,
      },
    };
  }
}
