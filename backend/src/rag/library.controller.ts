import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LibraryService } from './library.service';

class LookupQuery {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  term!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[GH]\d+$/, { message: 'strongId deve ser no formato G123 ou H456' })
  strongId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/)
  limit?: string;
}

/**
 * /api/v1/library — consulta à biblioteca pessoal do usuário (Google Drive
 * indexado em UserEmbedding via DriveRagService).
 *
 * Endpoint primário: `GET /lookup` — usado pelo WordStudy / ExegesisPanel
 * quando o usuário clica em uma palavra grega/hebraica ou versículo. Retorna
 * os trechos mais relevantes encontrados nas obras que ele mesmo importou
 * (BDAG, HALOT, TDNT, comentários, etc.).
 */
@Controller('api/v1/library')
@UseGuards(JwtAuthGuard)
export class LibraryController {
  constructor(private readonly library: LibraryService) {}

  @Get('lookup')
  // 60 lookups/min/IP. Cada lookup faz 1 embedding (Gemini) + 2 queries SQL —
  // limite generoso pra estudo intenso mas blinda contra scraping.
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async lookup(@Query() query: LookupQuery, @Req() req: Request) {
    const userId = req.user?.userId;
    if (!userId) {
      // Defensive — JwtAuthGuard already enforces this.
      throw new BadRequestException('missing user context');
    }

    const limit = query.limit ? parseInt(query.limit, 10) : 10;

    const excerpts = await this.library.lookup(userId, query.term, {
      strongId: query.strongId,
      limit,
    });

    return {
      success: true,
      data: {
        term: query.term,
        strongId: query.strongId,
        count: excerpts.length,
        excerpts,
      },
    };
  }
}
