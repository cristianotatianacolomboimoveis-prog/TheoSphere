import {
  Controller,
  Get,
  Param,
  Query,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { BibleIngestionService } from './bible-ingestion.service';
import { safeFetch, SafeFetchError } from './common/http/safe-fetch';

const ALLOWED_TRANSLATIONS = new Set([
  'ARA',
  'NVIPT',
  'KJV',
  'TR',
  'WLC',
  'web',
  'kjv',
  'asv',
  'ylt',
]);

@Controller('api/v1/bible')
export class BibleController {
  private readonly logger = new Logger(BibleController.name);

  constructor(private ingestionService: BibleIngestionService) {}

  @Get('versions')
  async getVersions() {
    return { success: true, data: ['ARA', 'NVIPT', 'KJV', 'TR', 'WLC'] };
  }

  @Get('chapter')
  async getChapterQuery(
    @Query('translation') translation: string,
    @Query('bookId') bookId: string,
    @Query('book') bookName: string,
    @Query('chapter') chapter: string,
  ) {
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

    let resolvedBookId = parseInt(bookId);
    if (isNaN(resolvedBookId) && bookName) {
      resolvedBookId = bookMap[bookName.toLowerCase()] || 1;
    }

    const verses = await this.ingestionService.ingestChapter(
      translation || 'KJV',
      resolvedBookId || 1,
      parseInt(chapter) || 1,
    );
    return {
      success: true,
      data: { verses, translation: translation || 'KJV', bookId: resolvedBookId, chapter },
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

  /**
   * Fallback proxy to bible-api.com. Hardened (SEC-006):
   *   • translation allow-list — no value-injection into the upstream URL
   *   • ref length cap — defends against gigantic path components
   *   • safeFetch with 5s timeout + 2 retries (exp. backoff)
   */
  @Get('fallback')
  async getFallback(
    @Query('ref') ref: string,
    @Query('translation') translation: string,
  ) {
    if (!ref || typeof ref !== 'string' || ref.length > 64) {
      throw new BadRequestException('ref is required and must be ≤ 64 chars');
    }
    if (!translation || !ALLOWED_TRANSLATIONS.has(translation)) {
      throw new BadRequestException(
        `translation must be one of: ${[...ALLOWED_TRANSLATIONS].join(', ')}`,
      );
    }

    const url =
      `https://bible-api.com/${encodeURIComponent(ref)}` +
      `?translation=${encodeURIComponent(translation)}`;

    try {
      const response = await safeFetch(url, { timeoutMs: 5_000, retries: 2 });
      if (!response.ok) return { success: false, data: [] };
      const data = await response.json();
      return { success: true, data };
    } catch (err) {
      this.logger.warn(`[fallback] upstream failure: ${err instanceof SafeFetchError ? err.message : String(err)}`);
      return { success: false, error: 'upstream unavailable' };
    }
  }

  @Get('sefaria/:ref')
  async getSefaria(@Param('ref') ref: string) {
    const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?context=0&commentary=0`;
    try {
      const response = await safeFetch(url, { timeoutMs: 8_000, retries: 2 });
      if (!response.ok) return { success: false, data: [] };
      const data = await response.json();
      
      // Normalize Sefaria response to our standard format
      const verses = Array.isArray(data.text) 
        ? data.text.map((t: string, i: number) => ({ verse: i + 1, text: t }))
        : [];

      return { 
        success: true, 
        data: { 
          verses, 
          translation: 'Sefaria', 
          book: data.book,
          ref: data.ref,
          hebrew: data.he()
        } 
      };
    } catch (err) {
      this.logger.warn(`[sefaria] upstream failure: ${err.message}`);
      return { success: false, error: 'sefaria unavailable' };
    }
  }

  // NOTE: lexical / search-root endpoints moved to LinguisticsController
  // (see /api/v1/linguistics/...) as part of strict modularization.
}
