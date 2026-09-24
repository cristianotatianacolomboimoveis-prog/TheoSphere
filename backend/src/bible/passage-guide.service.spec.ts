import { Test, TestingModule } from '@nestjs/testing';
import { PassageGuideService } from './passage-guide.service';
import { PrismaService } from '../prisma.service';
import { CrossReferencesService } from './cross-references.service';
import { LinguisticsService } from '../linguistics/linguistics.service';
import { ArchaeologyService } from '../archaeology/archaeology.service';

describe('PassageGuideService', () => {
  let service: PassageGuideService;
  const prisma = {
    bibleVerse: { findMany: jest.fn() },
    technicalCommentary: { findMany: jest.fn() },
    lexicalEntry: { findMany: jest.fn() },
  };
  const crossRefs = { list: jest.fn(), countsByRef: jest.fn() };
  const linguistics = { getInterlinearChapter: jest.fn() };
  const archaeology = { findByRef: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.bibleVerse.findMany.mockResolvedValue([
      { verse: 16, text: 'Porque Deus amou o mundo...' },
    ]);
    prisma.technicalCommentary.findMany.mockResolvedValue([]);
    prisma.lexicalEntry.findMany.mockResolvedValue([
      { strongId: 'G25', word: 'ἀγαπάω', language: 'GK', definition: 'amar' },
    ]);
    linguistics.getInterlinearChapter.mockResolvedValue({
      available: true,
      source: 'STEP Bible TAGNT',
      verses: { 16: [{ strongId: 'G25', word: 'ἠγάπησεν' }] },
    });
    archaeology.findByRef.mockResolvedValue([]);
    crossRefs.list.mockResolvedValue([
      { target: 'Rm 5:8', rank: 1, votes: 10 },
    ]);
    crossRefs.countsByRef.mockResolvedValue({ counts: { 'John 3:16': 12 } });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PassageGuideService,
        { provide: PrismaService, useValue: prisma },
        { provide: CrossReferencesService, useValue: crossRefs },
        { provide: LinguisticsService, useValue: linguistics },
        { provide: ArchaeologyService, useValue: archaeology },
      ],
    }).compile();
    service = module.get(PassageGuideService);
  });

  it('modo versículo: agrega todas as fontes com cross-refs listadas', async () => {
    const g = await service.getGuide('BLIVRE', 43, 3, 16);

    expect(g.reference.display).toBe('John 3:16');
    expect(g.verses).toHaveLength(1);
    expect(crossRefs.list).toHaveBeenCalledWith('John 3:16', 30);
    expect(g.crossReferences).toMatchObject({ mode: 'list' });
    // Interlinear focado no versículo
    expect((g.interlinear as { words: unknown[] }).words).toHaveLength(1);
    // Léxico derivado dos Strong's presentes
    expect(prisma.lexicalEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { strongId: { in: ['G25'] } },
      }),
    );
    expect(g.lexicon).toHaveLength(1);
  });

  it('modo capítulo: cross-refs viram contagens em lote', async () => {
    const g = await service.getGuide('BLIVRE', 43, 3);

    expect(crossRefs.list).not.toHaveBeenCalled();
    expect(crossRefs.countsByRef).toHaveBeenCalledWith(['John 3:16']);
    expect(g.crossReferences).toMatchObject({
      mode: 'counts',
      counts: { 'John 3:16': 12 },
    });
  });

  it('arqueologia: fallback do capítulo para o livro', async () => {
    archaeology.findByRef
      .mockResolvedValueOnce([]) // 'Jo 3' vazio
      .mockResolvedValueOnce([{ slug: 'piscina-de-betesda' }]);

    const g = await service.getGuide('BLIVRE', 43, 3, 16);

    expect(archaeology.findByRef).toHaveBeenNthCalledWith(1, 'Jo 3');
    expect(archaeology.findByRef).toHaveBeenNthCalledWith(2, 'Jo');
    expect(g.archaeology).toHaveLength(1);
  });

  it('degrada graciosamente quando fontes falham (interlinear/arch/xref)', async () => {
    linguistics.getInterlinearChapter.mockRejectedValue(new Error('down'));
    archaeology.findByRef.mockRejectedValue(new Error('down'));
    crossRefs.list.mockRejectedValue(new Error('down'));
    prisma.lexicalEntry.findMany.mockResolvedValue([]);

    const g = await service.getGuide('BLIVRE', 43, 3, 16);

    expect(g.verses).toHaveLength(1); // texto sempre chega
    expect((g.interlinear as { available: boolean }).available).toBe(false);
    expect(g.archaeology).toEqual([]);
    expect(g.crossReferences).toMatchObject({ mode: 'list', list: [] });
  });

  it('agrega comentários clássicos canônicos quando disponíveis no UserEmbedding', async () => {
    (prisma as any).$queryRawUnsafe = jest.fn().mockResolvedValue([
      {
        title: 'Commentary on Romans',
        author: 'John Calvin',
        content:
          'There is therefore now no condemnation to them which are in Christ Jesus, because the Spirit of life in Christ Jesus hath made me free from the law of sin and death. This is the great foundation of the believers assurance and perpetual peace with God.',
      },
    ]);

    const g = await service.getGuide('BLIVRE', 45, 8, 1);

    expect(g.commentaries).toHaveLength(1);
    expect(g.commentaries[0].author).toBe('John Calvin');
    expect(g.commentaries[0].source).toBe('Commentary on Romans');
    expect(g.commentaries[0].tags).toContain('clássico');
  });
});
