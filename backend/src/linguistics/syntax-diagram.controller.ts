import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Header,
  NotFoundException,
} from '@nestjs/common';
import { SyntaxDiagramService } from './syntax-diagram.service';
import type {
  CanonicalDiagramSummary,
  SyntaxDiagramResponse,
} from './syntax-diagram.dto';

@Controller('syntax-diagram')
export class SyntaxDiagramController {
  constructor(private readonly syntaxDiagramService: SyntaxDiagramService) {}

  /**
   * Retorna o catálogo de passagens canônicas pré-diagramadas.
   */
  @Get('predefined')
  @Header('Cache-Control', 'public, max-age=86400')
  getPredefinedList(): CanonicalDiagramSummary[] {
    return this.syntaxDiagramService.getCanonicalDiagramsList();
  }

  /**
   * Retorna um diagrama canônico completo por ID ou chave de passagem.
   */
  @Get('canonical/:id')
  @Header('Cache-Control', 'public, max-age=86400')
  getCanonicalDiagram(@Param('id') id: string): SyntaxDiagramResponse {
    const diagram = this.syntaxDiagramService.getCanonicalDiagram(id);
    if (!diagram) {
      throw new NotFoundException(
        `Diagrama canônico com ID '${id}' não encontrado.`,
      );
    }
    return diagram;
  }

  /**
   * Analisa e retorna o diagrama sintático de cláusulas para um versículo arbitrário.
   */
  @Get('verse/:bookId/:chapter/:verse')
  @Header('Cache-Control', 'public, max-age=3600')
  async getVerseDiagram(
    @Param('bookId') bookId: string,
    @Param('chapter', ParseIntPipe) chapter: number,
    @Param('verse', ParseIntPipe) verse: number,
  ): Promise<SyntaxDiagramResponse> {
    return this.syntaxDiagramService.getVerseDiagram(bookId, chapter, verse);
  }
}
