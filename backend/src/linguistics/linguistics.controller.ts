import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { LinguisticsService } from './linguistics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CacheControlInterceptor } from '../common/interceptors/cache-control.interceptor';

/**
 * Routes for lexical / morphological analysis (BDAG / HALOT / Strong's).
 *
 * Previously these endpoints lived inside BibleController; they now live in
 * their own module to keep concerns isolated and to allow Linguistics to be
 * imported standalone (e.g. by future ML pipelines).
 */
@Controller('api/v1/linguistics')
export class LinguisticsController {
  constructor(private readonly linguistics: LinguisticsService) {}

  @Get('lexical/:strongId')
  async getLexical(@Param('strongId') strongId: string) {
    const data = await this.linguistics.getRootAnalysis(strongId);
    return { success: true, data };
  }

  @Get('search-root/:strongId')
  async searchByRoot(@Param('strongId') strongId: string) {
    const occurrences = await this.linguistics.findOccurrencesByRoot(strongId);
    return { success: true, data: occurrences };
  }

  /**
   * Interlinear real palavra-a-palavra (STEP Bible TAGNT, CC BY 4.0).
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
    if (isNaN(b) || isNaN(c) || b < 1 || b > 66 || c < 1) {
      throw new BadRequestException('bookId (1-66) e chapter são obrigatórios');
    }
    const data = await this.linguistics.getInterlinearChapter(b, c);
    return { success: true, data };
  }

  /**
   * Ocorrências de um Strong's no texto original (dados interlineares reais).
   * GET /api/v1/linguistics/occurrences/:strongId?limit=100
   */
  @Get('occurrences/:strongId')
  @UseInterceptors(new CacheControlInterceptor(86400))
  async getOccurrences(
    @Param('strongId') strongId: string,
    @Query('limit') limit?: string,
  ) {
    if (!/^[GH]\d{1,5}$/i.test(strongId)) {
      throw new BadRequestException('strongId inválido (ex: G976, H430)');
    }
    const data = await this.linguistics.getOccurrences(
      strongId,
      limit ? parseInt(limit, 10) : undefined,
    );
    return { success: true, data };
  }
}
