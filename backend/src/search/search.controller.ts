import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SearchService } from './search.service';

@Controller('api/v1/search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

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
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const data = await this.search.hybridSearchVerses(q, {
      translation,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });
    return { success: true, count: data.length, data };
  }

  /**
   * GET /api/v1/search/advanced?q=...&translation=KJV&limit=50
   *
   * Logos-style structured search. Accepts the same syntax the BibleReader
   * search input emits:
   *
   *   • free-text terms       agape AND eros
   *   • quoted phrases        "in the beginning"
   *   • field filters         book:John chapter:1-3
   *   • exclusions            repent -hell
   *   • lemma filter          lemma:λόγος   (treated as literal term)
   *
   * Response includes `parsed` so the UI can render confirmation chips
   * ("book: John", "chapter: 1-3", etc.) and educate the user on what
   * was interpreted.
   */
  @Get('advanced')
  // 60/min — hybrid search runs an embedding + 2 SQL queries per call.
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async advanced(
    @Query('q') q: string,
    @Query('translation') translation?: string,
    @Query('limit') limit?: string,
  ) {
    if (!q || q.trim().length < 2) {
      throw new BadRequestException('Query "q" must be at least 2 characters');
    }
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const { parsed, hits } = await this.search.advancedSearch(q, {
      translation,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });
    return {
      success: true,
      data: {
        parsed: {
          bookName: parsed.bookName ?? null,
          chapterMin: parsed.chapterMin ?? null,
          chapterMax: parsed.chapterMax ?? null,
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
