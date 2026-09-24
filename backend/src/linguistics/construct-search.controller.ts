import { Controller, Get, Post, Body, Header } from '@nestjs/common';
import { ConstructSearchService } from './construct-search.service';
import { ConstructSearchQueryDto } from './construct-search.dto';

@Controller('api/v1/construct-search')
export class ConstructSearchController {
  constructor(private readonly constructService: ConstructSearchService) {}

  @Get('presets')
  @Header('Cache-Control', 'public, max-age=86400')
  getPresets() {
    return {
      presets: this.constructService.getPresets(),
    };
  }

  @Post('query')
  async executeQuery(@Body() query: ConstructSearchQueryDto) {
    return this.constructService.executeQuery(query);
  }
}
