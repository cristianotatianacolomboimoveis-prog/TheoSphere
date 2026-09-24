import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  Matches,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import {
  CrossReferencesService,
  CrossRefBatchResult,
} from './cross-references.service';

class ListQuery {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  ref!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/)
  limit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  translation?: string;

  @IsOptional()
  @IsString()
  includeText?: string;
}

class CountsBody {
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  refs!: string[];
}

/**
 * /api/v1/cross-refs — TSK cross-references for the BibleReader.
 *
 * Endpoints are public (no JwtAuthGuard): cross-refs are reference-grade
 * public-domain data, like Strong's seed. Throttle is generous enough for
 * a normal reading session and chokes scraping.
 */
@Controller('api/v1/cross-refs')
export class CrossReferencesController {
  constructor(private readonly service: CrossReferencesService) {}

  /**
   * GET /api/v1/cross-refs?ref=John+3:16&limit=50&translation=BLIVRE
   * → { success, data: { source, count, translation, refs: [{ target, rank, votes, text, bookNamePt }] } }
   */
  @Get()
  // 120 list-calls/min/IP: more than enough for click-driven UX.
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  async list(@Query() query: ListQuery) {
    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    const translation = query.translation || 'BLIVRE';
    const includeText = query.includeText !== 'false';
    const refs = await this.service.list(
      query.ref.trim(),
      limit,
      translation,
      includeText,
    );
    return {
      success: true,
      data: {
        source: query.ref.trim(),
        count: refs.length,
        translation: translation.toUpperCase().trim(),
        refs,
      },
    };
  }

  /**
   * POST /api/v1/cross-refs/counts
   * Body: { refs: ["John 3:16", "John 3:17", ...] }
   * → { success, data: { counts: { "John 3:16": 14, "John 3:17": 8 } } }
   *
   * Bulk counter used by the BibleReader to render "🔗 N" badges without
   * one round-trip per verse. Refs with zero cross-refs are omitted from
   * the response.
   */
  @Post('counts')
  // Lower throttle: the client is supposed to batch — one call per chapter.
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async counts(@Body() body: CountsBody): Promise<{
    success: true;
    data: CrossRefBatchResult;
  }> {
    if (!Array.isArray(body.refs)) {
      throw new BadRequestException('refs must be an array of strings');
    }
    const data = await this.service.countsByRef(body.refs);
    return { success: true, data };
  }
}
