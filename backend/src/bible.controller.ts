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

  @Get('books')
  async getBooks() {
    const books = await this.ingestionService.getBooks();
    return { success: true, data: books };
  }

  @Get('chapter')
  async getChapterQuery(
    @Query('translation') translation: string,
    @Query('bookId') bookId: string,
    @Query('book') bookName: string,
    @Query('chapter') chapter: string,
  ) {
    let resolvedBookId = parseInt(bookId);
    if (isNaN(resolvedBookId) && bookName) {
      resolvedBookId = await this.ingestionService.resolveBookId(bookName);
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

  @Get('lexicon/:strongId')
  async getLexicon(@Param('strongId') strongId: string) {
    const entry = await this.ingestionService.getLexicon(strongId);
    if (!entry) throw new BadRequestException(`Lexicon ${strongId} not found`);
    return { success: true, data: entry };
  }

  @Get('ingest-embeddings')
  async ingestEmbeddings(
    @Query('translation') translation: string,
    @Query('limit') limit: string,
  ) {
    // Fire and forget em produção, ou await para testes
    void this.ingestionService.massGenerateEmbeddings(
      translation || 'ARA',
      parseInt(limit) || 1000
    );
    return { success: true, message: `Iniciada geração de embeddings para ${translation}` };
  }
}
