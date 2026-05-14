import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class TheologyEngineService {
  private readonly logger = new Logger(TheologyEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca conteúdo teológico multicamadas para um waypoint.
   */
  async getWaypointContent(waypointId: string, language: string = 'pt-BR') {
    return this.prisma.theologicalContent.findMany({
      where: { waypointId, language }
    });
  }

  /**
   * Busca exegese avançada para uma referência bíblica.
   * Integra comentários técnicos e versículos.
   */
  async getAdvancedExegesis(bookId: number, chapter: number, verse: number) {
    const [verseData, commentary] = await Promise.all([
      this.prisma.bibleVerse.findMany({
        where: { bookId, chapter, verse }
      }),
      this.prisma.technicalCommentary.findMany({
        where: { bookId, chapter, verse }
      })
    ]);

    return {
      verse: verseData,
      commentary,
      // Aqui poderíamos adicionar parsing de hebraico/grego via LexicalEntry
    };
  }
}
