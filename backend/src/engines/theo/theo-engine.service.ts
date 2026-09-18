import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SearchService } from '../../search/search.service';
import { EvidencePackService } from '../../rag/evidence-pack.service';
import { CrossReferencesService } from '../../bible/cross-references.service';

@Injectable()
export class TheologyEngineService {
  private readonly logger = new Logger(TheologyEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
    private readonly evidencePacks: EvidencePackService,
    private readonly crossReferences: CrossReferencesService,
  ) {}

  /** Pesquisa unificada: retrieval -> cross-references -> EvidencePack. */
  async research(query: string, limit = 12) {
    const normalized = query.trim();
    if (!normalized) return this.evidencePacks.build('', []);
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
    const hits = await this.search.hybridSearchVerses(normalized, { limit: safeLimit });

    const bookIds = [...new Set(hits.map((hit) => hit.bookId))];
    const books = await this.prisma.book.findMany({ where: { id: { in: bookIds } }, select: { id: true, nameEn: true } });
    const bookNames = new Map(books.map((book) => [book.id, book.nameEn]));

    const primary = hits.map((hit) => ({
      source: {
        type: 'bible' as const,
        title: hit.translation,
        reference: `${bookNames.get(hit.bookId) ?? hit.bookId} ${hit.chapter}:${hit.verse}`,
        snippet: hit.text,
        score: hit.score,
      },
      kind: 'primary' as const,
      provenance: 'bible' as const,
      supports: [hit.id],
    }));

    const crossReferenceItems = (await Promise.all(hits.map(async (hit) => {
      const bookName = bookNames.get(hit.bookId);
      if (!bookName) return [];
      const sourceRef = `${bookName} ${hit.chapter}:${hit.verse}`;
      const refs = await this.crossReferences.list(sourceRef, 8);
      return refs.map((ref) => ({
        source: {
          type: 'bible' as const,
          title: 'Treasury of Scripture Knowledge',
          reference: ref.target,
          snippet: `Cross-reference from ${sourceRef}`,
          score: ref.votes != null ? Math.min(Math.max(ref.votes / 100, 0), 10) : undefined,
        },
        kind: 'cross_reference' as const,
        provenance: 'bible' as const,
        supports: [sourceRef],
      }));
    }))).flat();

    return this.evidencePacks.build(normalized, [...primary, ...crossReferenceItems], Math.min(100, safeLimit + crossReferenceItems.length));
  }

  async getWaypointContent(waypointId: string, language: string = 'pt-BR') {
    return this.prisma.theologicalContent.findMany({ where: { waypointId, language } });
  }

  async getAdvancedExegesis(bookId: number, chapter: number, verse: number) {
    const [verseData, commentary] = await Promise.all([
      this.prisma.bibleVerse.findMany({ where: { bookId, chapter, verse } }),
      this.prisma.technicalCommentary.findMany({ where: { bookId, chapter, verse } }),
    ]);
    return { verse: verseData, commentary };
  }
}