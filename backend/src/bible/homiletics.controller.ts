import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  BadRequestException,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { HomileticsService, SermonOutlineResponse } from './homiletics.service';
import { CacheControlInterceptor } from '../common/interceptors/cache-control.interceptor';

export class GenerateOutlineBodyDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(66)
  bookId!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  chapter!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  startVerse?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  endVerse?: number;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsString()
  audience?: string;

  @IsOptional()
  @IsString()
  tradition?: string;
}

@Controller('api/v1/homiletics')
export class HomileticsController {
  constructor(private readonly homileticsService: HomileticsService) {}

  /**
   * POST /api/v1/homiletics/outline
   * Gera um esboço homilético expositivo estruturado completo.
   */
  @Post('outline')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  async generateOutlinePost(
    @Body() body: GenerateOutlineBodyDto,
  ): Promise<{ success: boolean; data: SermonOutlineResponse }> {
    const data = await this.homileticsService.generateOutline(body);
    return { success: true, data };
  }

  /**
   * GET /api/v1/homiletics/outline/:bookId/:chapter
   * Atalho GET com cache de 1 hora para renderização instantânea no leitor.
   */
  @Get('outline/:bookId/:chapter')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @UseInterceptors(new CacheControlInterceptor(3600))
  async generateOutlineGet(
    @Param('bookId') bookIdStr: string,
    @Param('chapter') chapterStr: string,
    @Query('startVerse') startVerseStr?: string,
    @Query('endVerse') endVerseStr?: string,
    @Query('theme') theme?: string,
    @Query('tradition') tradition?: string,
  ): Promise<{ success: boolean; data: SermonOutlineResponse }> {
    const bookId = parseInt(bookIdStr, 10);
    const chapter = parseInt(chapterStr, 10);
    if (isNaN(bookId) || bookId < 1 || bookId > 66) {
      throw new BadRequestException(
        'bookId must be an integer between 1 and 66',
      );
    }
    if (isNaN(chapter) || chapter < 1) {
      throw new BadRequestException('chapter must be a positive integer');
    }

    const startVerse = startVerseStr ? parseInt(startVerseStr, 10) : undefined;
    const endVerse = endVerseStr ? parseInt(endVerseStr, 10) : undefined;

    const data = await this.homileticsService.generateOutline({
      bookId,
      chapter,
      startVerse,
      endVerse,
      theme,
      tradition,
    });
    return { success: true, data };
  }
}
