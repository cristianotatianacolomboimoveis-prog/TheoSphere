import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  Header,
  NotFoundException,
} from '@nestjs/common';
import { TextualCriticismService } from './textual-criticism.service';
import type {
  TextualCriticismSummary,
  TextualVariantItem,
} from './textual-criticism.dto';

@Controller('textual-criticism')
export class TextualCriticismController {
  constructor(
    private readonly textualCriticismService: TextualCriticismService,
  ) {}

  /**
   * Retorna a lista de variantes críticas e manuscritos de Qumran catalogados.
   */
  @Get('variants')
  @Header('Cache-Control', 'public, max-age=86400')
  getAllVariants(
    @Query('testament') testament?: 'OT' | 'NT',
    @Query('theologicalImpact')
    theologicalImpact?: 'high' | 'medium' | 'low' | 'none',
    @Query('searchQuery') searchQuery?: string,
  ): TextualCriticismSummary[] {
    return this.textualCriticismService.getAllVariants({
      testament,
      theologicalImpact,
      searchQuery,
    });
  }

  /**
   * Retorna uma variante textual específica com leituras dos códices e papiros.
   */
  @Get('variants/:id')
  @Header('Cache-Control', 'public, max-age=86400')
  getVariantById(@Param('id') id: string): TextualVariantItem {
    const variant = this.textualCriticismService.getVariantById(id);
    if (!variant) {
      throw new NotFoundException(
        `Variante textual com ID '${id}' não encontrada no catálogo de crítica textual.`,
      );
    }
    return variant;
  }

  /**
   * Retorna o aparato comparativo de testemunhas de manuscritos para um versículo.
   */
  @Get('apparatus/:bookId/:chapter/:verse')
  @Header('Cache-Control', 'public, max-age=3600')
  async getManuscriptApparatus(
    @Param('bookId') bookId: string,
    @Param('chapter', ParseIntPipe) chapter: number,
    @Param('verse', ParseIntPipe) verse: number,
  ) {
    return this.textualCriticismService.getManuscriptApparatus(
      bookId,
      chapter,
      verse,
    );
  }
}
