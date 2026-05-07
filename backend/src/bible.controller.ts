import { Controller, Get, Param, Query } from '@nestjs/common';
import { BibleIngestionService } from './bible-ingestion.service';

@Controller('api/v1/bible')
export class BibleController {
  constructor(private ingestionService: BibleIngestionService) {}

  @Get('versions')
  async getVersions() {
    return { success: true, data: ['ARA', 'NVIPT', 'KJV', 'TR', 'WLC'] };
  }

  @Get('chapter')
  async getChapterQuery(
    @Query('translation') translation: string,
    @Query('bookId') bookId: string,
    @Query('chapter') chapter: string,
  ) {
    const verses = await this.ingestionService.ingestChapter(
      translation || 'KJV',
      parseInt(bookId) || 1,
      parseInt(chapter) || 1,
    );
    return {
      success: true,
      data: { verses, translation: translation || 'KJV', bookId, chapter },
    };
  }

  @Get('chapter/:translation/:bookId/:chapter')
  async getChapterParam(
    @Param('translation') translation: string,
    @Param('bookId') bookId: string,
    @Param('chapter') chapter: string,
  ) {
    const verses = await this.ingestionService.ingestChapter(
      translation,
      parseInt(bookId),
      parseInt(chapter),
    );
    return { success: true, data: { verses, translation, bookId, chapter } };
  }

  @Get('fallback')
  async getFallback(
    @Query('ref') ref: string,
    @Query('translation') translation: string,
  ) {
    try {
      const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=${translation}`;
      const response = await fetch(url);
      if (!response.ok) return { success: false, data: [] };
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // NOTE: lexical / search-root endpoints moved to LinguisticsController
  // (see /api/v1/linguistics/...) as part of strict modularization.
}
