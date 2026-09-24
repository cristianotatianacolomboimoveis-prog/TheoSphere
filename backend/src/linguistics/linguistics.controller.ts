import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { LinguisticsService } from './linguistics.service';
import { CacheControlInterceptor } from '../common/interceptors/cache-control.interceptor';

/**
 * Routes for lexical / morphological analysis (Strong's + interlinear).
 */
@Controller('api/v1/linguistics')
export class LinguisticsController {
  constructor(private readonly linguistics: LinguisticsService) {}

  @Get('lexical/:strongId')
  async getLexical(@Param('strongId') strongId: string) {
    if (!/^[GH]\d{1,5}[A-Z]?$/i.test(strongId)) {
      throw new BadRequestException('strongId inválido (ex: G976, H430)');
    }
    const data = await this.linguistics.getRootAnalysis(strongId);
    return { success: true, data };
  }

  /**
   * Estudo aprofundado de palavra original (Logos-style Word Study).
   * GET /api/v1/linguistics/word-study/:strongId
   */
  @Get('word-study/:strongId')
  @UseInterceptors(new CacheControlInterceptor(86400))
  async getWordStudy(@Param('strongId') strongId: string) {
    if (!/^[GH]\d{1,5}[A-Z]?$/i.test(strongId)) {
      throw new BadRequestException('strongId inválido (ex: G976, H430)');
    }
    const data = await this.linguistics.getWordStudyDetails(strongId);
    return { success: true, data };
  }

  @Get('search-root/:strongId')
  async searchByRoot(
    @Param('strongId') strongId: string,
    @Query('translation') translation?: string,
  ) {
    if (!/^[GH]\d{1,5}[A-Z]?$/i.test(strongId)) {
      throw new BadRequestException('strongId inválido (ex: G976, H430)');
    }
    const occurrences = await this.linguistics.findOccurrencesByRoot(
      strongId,
      translation || 'BLIVRE',
    );
    return { success: true, data: occurrences };
  }

  /**
   * Interlinear real palavra-a-palavra (STEP Bible TAGNT/TAHOT).
   * GET /api/v1/linguistics/interlinear/:bookId/:chapter
   */
  @Get('interlinear/:bookId/:chapter')
  @UseInterceptors(new CacheControlInterceptor(86400))
  async getInterlinear(
    @Param('bookId') bookId: string,
    @Param('chapter') chapter: string,
  ) {
    const b = parseInt(bookId, 10);
    const c = parseInt(chapter, 10);
    if (
      !Number.isInteger(b) ||
      !Number.isInteger(c) ||
      b < 1 ||
      b > 66 ||
      c < 1
    ) {
      throw new BadRequestException('bookId (1-66) e chapter são obrigatórios');
    }
    const data = await this.linguistics.getInterlinearChapter(b, c);
    return { success: true, data };
  }

  /**
   * Ocorrências de um Strong's no texto original.
   * GET /api/v1/linguistics/occurrences/:strongId?limit=100
   */
  @Get('occurrences/:strongId')
  @UseInterceptors(new CacheControlInterceptor(86400))
  async getOccurrences(
    @Param('strongId') strongId: string,
    @Query('limit') limit?: string,
  ) {
    if (!/^[GH]\d{1,5}[A-Z]?$/i.test(strongId)) {
      throw new BadRequestException('strongId inválido (ex: G976, H430)');
    }
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const safeLimit = Number.isInteger(parsedLimit)
      ? Math.min(Math.max(parsedLimit as number, 1), 200)
      : undefined;
    const data = await this.linguistics.getOccurrences(strongId, safeLimit);
    return { success: true, data };
  }

  /**
   * Resolve uma forma flexionada para as análises presentes no corpus.
   * Não inventa lemas via IA; devolve também candidatos para tornar
   * ambiguidades explícitas.
   *
   * GET /api/v1/linguistics/analyze-word?word=ἠγάπησεν&language=greek
   */
  @Get('analyze-word')
  @UseInterceptors(new CacheControlInterceptor(86400))
  async analyzeWord(
    @Query('word') word: string,
    @Query('language') language: string,
  ) {
    const normalizedLanguage = language?.toLowerCase();
    if (normalizedLanguage !== 'greek' && normalizedLanguage !== 'hebrew') {
      throw new BadRequestException('language deve ser greek ou hebrew');
    }
    if (!word || word.trim().length === 0 || word.length > 200) {
      throw new BadRequestException(
        'word é obrigatório e deve ter até 200 caracteres',
      );
    }

    const data = await this.linguistics.lemmatize(word, normalizedLanguage);
    return { success: true, data };
  }
}
