import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
  UseInterceptors,
} from '@nestjs/common';
import { ArchaeologyService } from './archaeology.service';
import { CacheControlInterceptor } from '../common/interceptors/cache-control.interceptor';

/**
 * Acervo arqueológico — endpoints públicos de leitura.
 *
 * GET /api/v1/archaeology              — lista com filtros (category, authenticity, q, limit, offset)
 * GET /api/v1/archaeology/stats        — contagens por categoria/autenticidade
 * GET /api/v1/archaeology/by-ref?ref=  — descobertas ligadas a uma referência bíblica
 * GET /api/v1/archaeology/near?lat=&lng=&radius= — proximidade geográfica (Atlas 4D)
 * GET /api/v1/archaeology/:slug        — detalhe de uma descoberta
 */
@Controller('api/v1/archaeology')
export class ArchaeologyController {
  constructor(private readonly service: ArchaeologyService) {}

  @Get()
  @UseInterceptors(new CacheControlInterceptor(3600))
  async list(
    @Query('category') category?: string,
    @Query('authenticity') authenticity?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const data = await this.service.findAll({
      category,
      authenticity,
      q,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return { success: true, data };
  }

  @Get('stats')
  @UseInterceptors(new CacheControlInterceptor(3600))
  async stats() {
    return { success: true, data: await this.service.getStats() };
  }

  @Get('by-ref')
  @UseInterceptors(new CacheControlInterceptor(3600))
  async byRef(@Query('ref') ref?: string) {
    if (!ref || ref.length > 32) {
      throw new BadRequestException('ref é obrigatório (máx. 32 caracteres)');
    }
    return { success: true, data: await this.service.findByRef(ref) };
  }

  @Get('near')
  @UseInterceptors(new CacheControlInterceptor(3600))
  async near(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string,
  ) {
    const latN = parseFloat(lat ?? '');
    const lngN = parseFloat(lng ?? '');
    if (isNaN(latN) || isNaN(lngN)) {
      throw new BadRequestException('lat e lng são obrigatórios');
    }
    const radiusN = radius ? parseFloat(radius) : 50;
    return {
      success: true,
      data: await this.service.findNearby(latN, lngN, radiusN),
    };
  }

  @Get(':slug')
  @UseInterceptors(new CacheControlInterceptor(3600))
  async detail(@Param('slug') slug: string) {
    const find = await this.service.findBySlug(slug);
    if (!find)
      throw new NotFoundException(`Descoberta '${slug}' não encontrada`);
    return { success: true, data: find };
  }
}
