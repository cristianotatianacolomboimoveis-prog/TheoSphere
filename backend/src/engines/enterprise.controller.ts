import { Controller, Get, Post, Body, Param, Query, NotFoundException } from '@nestjs/common';
import { GeoEngineService } from './geo/geo-engine.service';
import { TheologyEngineService } from './theo/theo-engine.service';
import { GraphEngineService } from './graph/graph-engine.service';
import { AIEngineService } from './ai/ai-engine.service';
import { ThreeEngineService } from './3d/three-engine.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { TranslateRequestDto } from './dto/translate-request.dto';

@Controller('api/v1/enterprise')
export class EnterpriseController {
  constructor(
    private readonly geo: GeoEngineService,
    private readonly theo: TheologyEngineService,
    private readonly graph: GraphEngineService,
    private readonly ai: AIEngineService,
    private readonly three: ThreeEngineService,
  ) {}

  @Get('routes')
  async getRoutes() {
    return { success: true, data: await this.geo.getRoutes() };
  }

  @Get('routes/:slug')
  async getRoute(@Param('slug') slug: string) {
    const data = await this.geo.getRouteBySlug(slug);
    if (!data) throw new NotFoundException('Route not found');
    return { success: true, data };
  }

  @Get('waypoints/:id')
  async getWaypoint(@Param('id') id: string) {
    // Implementar busca direta de waypoint se necessário
    return { success: true, data: { id } };
  }

  @Get('models/:id')
  async getModel(@Param('id') id: string) {
    const data = await this.three.getModelById(id);
    if (!data) throw new NotFoundException('Model not found');
    return { success: true, data };
  }

  @Post('ai/explain')
  async explain(@Body('query') query: string, @Body('userId') userId?: string) {
    const data = await this.ai.explainContext(query, userId);
    return { success: true, data };
  }

  @Post('ai/exegesis')
  async performExegesis(@Body() body: { book: string; chapter: number; userId?: string }) {
    const data = await this.ai.performExegesis(body.book, body.chapter, body.userId);
    return { success: true, data };
  }

  @Get('graph')
  async getGraph(@Query('q') q: string) {
    const data = await this.graph.getRelationalGraph(q);
    return { success: true, data };
  }

  @Post('ai/tts')
  async generateSpeech(@Body('text') text: string, @Body('voice') voice?: string) {
    const data = await this.ai.generateSpeech(text, voice);
    return { success: true, data };
  }

  @Post('ai/translate')
  async translate(@Body() dto: TranslateRequestDto) {
    const data = await this.ai.translateContent(dto.text, dto.targetLang);
    return { success: true, data };
  }

  @Get('search')
  async search(@Query() dto: SearchQueryDto) {
    // Busca semântica usando o RagService existente
    const data = await this.ai.explainContext(dto.q, dto.userId);
    return { success: true, data };
  }
}
