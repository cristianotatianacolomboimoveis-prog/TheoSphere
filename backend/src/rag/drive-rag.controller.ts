import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { DriveRagService } from './drive-rag.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class IngestDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  folderId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  tradition?: string;
}

@Controller('drive-library')
export class DriveRagController {
  constructor(private readonly driveRagService: DriveRagService) {}

  @Post('ingest')
  @UseGuards(JwtAuthGuard)
  // Ingestão é cara (lê pasta inteira do Drive). 5/hora/usuário é
  // generoso para uso normal e blinda contra loops acidentais no client.
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  async ingestFolder(@Body() body: IngestDto, @Req() req: Request) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Usuário não autenticado via JWT.');
    }
    return this.driveRagService.ingestFolder(
      body.folderId,
      userId,
      body.tradition,
    );
  }

  /**
   * Re-extrai a biblioteca inteira do usuário. Use depois de:
   *   • Upgrade da heurística de detecção de lema/Strong (drive-rag.service)
   *   • Adição de suporte a novo formato (ex: EPUB, na Fase C)
   *   • Mudança de organização da pasta
   *
   * Operação destrutiva: apaga TODOS os UserEmbedding `library_book` do
   * usuário antes de re-ingerir. Limite estrito de 2/dia/usuário.
   */
  @Post('reindex')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 24 * 3_600_000, limit: 2 } })
  async reindex(@Body() body: IngestDto, @Req() req: Request) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Usuário não autenticado via JWT.');
    }
    return this.driveRagService.reindex(
      body.folderId,
      userId,
      body.tradition,
    );
  }
}
