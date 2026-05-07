import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
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
}
