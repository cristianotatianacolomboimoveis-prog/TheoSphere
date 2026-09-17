import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SearchService } from '../../search/search.service';
import { EvidencePackService } from '../../rag/evidence-pack.service';

@Injectable()
export class TheologyEngineService {
  private readonly logger = new Logger(TheologyEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
    private readonly evidencePacks: EvidencePackService,
  ) {}

  /**
   * Pesquisa teológica unificada: retrieval -> evidence pack.
   * O RAG pode consumir o mesmo EvidencePack sem repetir a recuperação.
   */
  async research(query: string, limit = 12) {
    const normalized = query.trim();
    if (!normalized) return this.evidencePacks.build({ query: '' });
    const hits = await this.search.hybridSearchVerses(normalized, { limit: Math.min(Math.max(Math.trunc(limit), 1), 50) });
    return this.evidencePacks.build({
      query: normalized,
      items: hits.map((hit) => ({
        kind: 'primary' as const,
        provenance: 'bible' as const,
        title: hit.translation,
        reference: `${hit.bookId}:${hit.chapter}:${hit.verse}`,
        snippet: hit.text,
        score: hit.score,
        rank: hit.vectorRank ?? hit.keywordRank ?? 0,
        supports: [hit.id],
      })),
      maxItems: limit,
    });
  }

  /**
   * Busca conteúdo teológico multicamadas para um waypoint.
   */
  async getWaypointContent(waypointId: string, language: string = 'pt-BR') {
    return this.prisma.theologicalContent.findMany({
      where: { waypointId, language },
    });
  }

  /**
   * Busca exegese avançada para uma referência bíblica.
   * Integra comentários técnicos e versículos.
   */
  async getAdvancedExegesis(bookId: number, chapter: number, verse: number) {
    const [verseData, commentary] = await Promise.all([
      this.prisma.bibleVerse.findMany({
        where: { bookId, chapter, verse },
      }),
      this.prisma.technicalCommentary.findMany({
        where: { bookId, chapter, verse },
      }),
    ]);

    return {
      verse: verseData,
      commentary,
      // Aqui poderíamos adicionar parsing de hebraico/grego via LexicalEntry
    };
  }
}
