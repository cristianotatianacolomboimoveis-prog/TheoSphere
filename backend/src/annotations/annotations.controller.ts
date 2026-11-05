import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AnnotationsService, SyncAnnotationItem } from './annotations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';

@Controller('annotations')
@UseGuards(JwtAuthGuard)
export class AnnotationsController {
  constructor(private readonly annotationsService: AnnotationsService) {}

  /**
   * Consulta anotações do usuário autenticado com suporte a sincronização incremental (since).
   */
  @Get()
  async getAnnotations(
    @Req() req: Request,
    @Query('since') sinceStr?: string,
    @Query('startRef') startRefStr?: string,
    @Query('endRef') endRefStr?: string,
    @Query('includeDeleted') includeDeletedStr?: string,
  ) {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const since = sinceStr ? new Date(sinceStr) : undefined;
    const startRef = startRefStr ? parseInt(startRefStr, 10) : undefined;
    const endRef = endRefStr ? parseInt(endRefStr, 10) : undefined;
    const includeDeleted = includeDeletedStr === 'true';

    const annotations = await this.annotationsService.listAnnotations(userId, {
      since,
      startRef,
      endRef,
      includeDeleted,
    });

    return {
      success: true,
      data: annotations,
    };
  }

  /**
   * Sincronização bidirecional em lote com resolução Last-Write-Wins.
   */
  @Post('sync')
  async sync(@Req() req: Request, @Body('items') items: SyncAnnotationItem[]) {
    if (!Array.isArray(items)) {
      throw new BadRequestException(
        'Formato inválido: items deve ser uma lista.',
      );
    }

    const userId = (req as any).user?.userId || (req as any).user?.id;
    const result = await this.annotationsService.syncBatch(userId, items);

    return result;
  }

  /**
   * Soft-delete de anotação (gera tombstone com deletedAt).
   */
  @Delete(':id')
  async delete(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    await this.annotationsService.softDelete(userId, id);
    return {
      success: true,
      message: 'Anotação removida com sucesso.',
    };
  }
}
