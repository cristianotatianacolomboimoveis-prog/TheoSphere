import {
  Controller,
  Get,
  Query,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ResourcesService, ResourceCitationItem } from './resources.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/v1/resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  /**
   * GET /resources/references?ref=BBCCCVVV ou ref=Romans%208:28
   * Retorna os trechos de obras clássicas que citam ou comentam o versículo.
   */
  @Get('references')
  async getReferences(
    @Query('ref') ref: string,
    @Query('limit') limitStr?: string,
  ): Promise<{ ref: string; count: number; results: ResourceCitationItem[] }> {
    if (!ref || typeof ref !== 'string') {
      throw new BadRequestException(
        'Parâmetro ref é obrigatório (ex: 45008028 ou "Romans 8:28").',
      );
    }

    const limit = limitStr ? parseInt(limitStr, 10) : 20;
    const numericInput = /^\d+$/.test(ref.trim())
      ? parseInt(ref.trim(), 10)
      : ref;

    const results = await this.resourcesService.findReferences(
      numericInput,
      limit,
    );
    return {
      ref,
      count: results.length,
      results,
    };
  }
}
