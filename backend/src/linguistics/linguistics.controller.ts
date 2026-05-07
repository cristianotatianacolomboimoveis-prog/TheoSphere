import { Controller, Get, Param } from '@nestjs/common';
import { LinguisticsService } from './linguistics.service';

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
}
