import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SearchService } from '../../search/search.service';
import { EvidencePackService } from '../../rag/evidence-pack.service';
import { CrossReferencesService } from '../../bible/cross-references.service';
import { LinguisticsService } from '../../linguistics/linguistics.service';

@Injectable()
export class TheologyEngineService {
  private readonly logger = new Logger(TheologyEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
    private readonly evidencePacks: EvidencePackService,
    private readonly crossReferences: CrossReferencesService,
    private readonly linguistics: LinguisticsService,
  ) {}

  /** Pesquisa unificada: retrieval -> cross-references -> EvidencePack. */
  async research(query: string, limit = 12) {
    const normalized = query.trim();
    if (!normalized) return this.evidencePacks.build('', []);
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
    const hits = await this.search.hybridSearchVerses(normalized, {
      limit: safeLimit,
    });

    const bookIds = [...new Set(hits.map((hit) => hit.bookId))];
    const books = await this.prisma.book.findMany({
      where: { id: { in: bookIds } },
      select: { id: true, nameEn: true },
    });
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

    const crossReferenceItems = (
      await Promise.all(
        hits.map(async (hit) => {
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
              score:
                ref.votes != null
                  ? Math.min(Math.max(ref.votes / 100, 0), 10)
                  : undefined,
            },
            kind: 'cross_reference' as const,
            provenance: 'bible' as const,
            supports: [sourceRef],
          }));
        }),
      )
    ).flat();

    const chapterKeys = [
      ...new Set(hits.map((hit) => `${hit.bookId}:${hit.chapter}`)),
    ].slice(0, 4);
    const linguisticItems = (
      await Promise.all(
        chapterKeys.map(async (key) => {
          const [bookId, chapter] = key.split(':').map(Number);
          const chapterData = await this.linguistics.getInterlinearChapter(
            bookId,
            chapter,
          );
          return Object.values(chapterData.verses)
            .flat()
            .slice(0, 20)
            .map((word) => ({
              source: {
                type: 'theology' as const,
                title: `STEP Bible ${bookId < 40 ? 'TAHOT' : 'TAGNT'}`,
                reference: `${bookNames.get(bookId) ?? bookId} ${chapter}:${word.verse}`,
                snippet: [
                  word.word,
                  word.translit,
                  word.lemma ? `lemma=${word.lemma}` : '',
                  word.morph ? `morph=${word.morph}` : '',
                  `Strong=${word.strongId}`,
                ]
                  .filter(Boolean)
                  .join(' · '),
                score: 0.65,
              },
              kind: 'linguistic' as const,
              provenance: 'interlinear' as const,
              supports: [`${bookId}:${chapter}:${word.verse}`],
            }));
        }),
      )
    ).flat();

    const commentaryItems = (
      await this.prisma.technicalCommentary.findMany({
        where: {
          OR: hits.slice(0, 12).map((hit) => ({
            bookId: hit.bookId,
            chapter: hit.chapter,
            verse: hit.verse,
          })),
        },
        take: 24,
        orderBy: { createdAt: 'desc' },
      })
    ).map((entry) => ({
      source: {
        type: 'commentary' as const,
        title: `${entry.author} — ${entry.source}`,
        reference: `${bookNames.get(entry.bookId) ?? entry.bookId} ${entry.chapter}:${entry.verse}`,
        snippet: entry.content,
        score: 0.7,
      },
      kind: 'commentary' as const,
      provenance: 'commentary' as const,
      supports: [`${entry.bookId}:${entry.chapter}:${entry.verse}`],
    }));

    return this.evidencePacks.build(
      normalized,
      [
        ...primary,
        ...linguisticItems,
        ...commentaryItems,
        ...crossReferenceItems,
      ],
      Math.min(
        100,
        safeLimit +
          linguisticItems.length +
          commentaryItems.length +
          crossReferenceItems.length,
      ),
    );
  }

  async getWaypointContent(waypointId: string, language: string = 'pt-BR') {
    return this.prisma.theologicalContent.findMany({
      where: { waypointId, language },
    });
  }

  async getAdvancedExegesis(bookId: number, chapter: number, verse: number) {
    const [verseData, commentary] = await Promise.all([
      this.prisma.bibleVerse.findMany({ where: { bookId, chapter, verse } }),
      this.prisma.technicalCommentary.findMany({
        where: { bookId, chapter, verse },
      }),
    ]);
    return { verse: verseData, commentary };
  }
}
