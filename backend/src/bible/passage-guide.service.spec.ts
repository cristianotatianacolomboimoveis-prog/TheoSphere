import { Test, TestingModule } from '@nestjs/testing';
import { PassageGuideService } from './passage-guide.service';
import { PrismaService } from '../prisma.service';
import { CrossReferencesService } from './cross-references.service';
import { LinguisticsService } from '../linguistics/linguistics.service';
import { ArchaeologyService } from '../archaeology/archaeology.service';
import { ResourcesService } from '../resources/resources.service';

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

  it('agrega comentários clássicos consultando ResourceReference sem ler UserEmbedding (Etapa 5)', async () => {
    (prisma as any).$queryRawUnsafe = jest.fn().mockResolvedValue([
      {
        title: 'Commentary on Romans',
        author: 'John Calvin',
        content:
          'There is therefore now no condemnation to them which are in Christ Jesus, because the Spirit of life in Christ Jesus hath made me free from the law of sin and death. This is the great foundation of the believers assurance and perpetual peace with God.',
      },
    ]);

    const g = await service.getGuide('BLIVRE', 45, 8, 1);

    expect((prisma as any).$queryRawUnsafe).toHaveBeenCalledTimes(1);
    const [sql, canonicalRef, bookMin, bookMax] = (prisma as any)
      .$queryRawUnsafe.mock.calls[0];

    // Exige que a consulta NÃO leia UserEmbedding e consulte ResourceReference -> ResourceChunk -> Resource
    expect(sql).not.toContain('UserEmbedding');
    expect(sql).toContain('"ResourceReference"');
    expect(sql).toContain('"ResourceChunk"');
    expect(sql).toContain('"Resource"');

    // Valida os parâmetros de referência canônica e limites do livro
    expect(canonicalRef).toBe(45008001);
    expect(bookMin).toBe(45000000);
    expect(bookMax).toBe(45999999);
    expect(sql).toContain('ref."startRef" BETWEEN $2 AND $1');
    expect(sql).toContain('ref."endRef" BETWEEN $1 AND $3');
    expect(sql).not.toMatch(/OR\s+TRUE/i);

    expect(g.commentaries).toHaveLength(1);
    expect(g.commentaries[0].author).toBe('John Calvin');
    expect(g.commentaries[0].source).toBe('Commentary on Romans');
    expect(g.commentaries[0].tags).toContain('clássico');
  });

  it('exige no SQL o filtro estrito de intervalo ("startRef" BETWEEN e "endRef" BETWEEN) sem cláusulas permissivas', async () => {
    (prisma as any).$queryRawUnsafe = jest.fn().mockResolvedValue([
      {
        title: 'Commentary on the Whole Bible',
        author: 'Matthew Henry',
        content:
          'Here is the great Gospel truth, that God so loved the world that He gave His only begotten Son...',
      },
    ]);

    await service.getGuide('BLIVRE', 43, 3, 16);

    expect((prisma as any).$queryRawUnsafe).toHaveBeenCalledTimes(1);
    const [sql, canonicalRef, bookMin, bookMax] = (prisma as any)
      .$queryRawUnsafe.mock.calls[0];

    expect(sql).not.toContain('UserEmbedding');
    expect(canonicalRef).toBe(43003016);
    expect(bookMin).toBe(43000000);
    expect(bookMax).toBe(43999999);
    expect(sql).toMatch(
      /WHERE\s+ref\."canonicalRef"\s*=\s*\$1\s+OR\s+\(ref\."startRef"\s+BETWEEN\s+\$2\s+AND\s+\$1\s+AND\s+ref\."endRef"\s+BETWEEN\s+\$1\s+AND\s+\$3\)/,
    );
    expect(sql).toContain('ref."startRef" BETWEEN $2 AND $1');
    expect(sql).toContain('ref."endRef" BETWEEN $1 AND $3');
    expect(sql).not.toMatch(/OR\s+TRUE/i);
  });

  it('o intervalo de referência na consulta cobre o versículo pedido e os limites do livro (ex: Jo 3:16)', async () => {
    (prisma as any).$queryRawUnsafe = jest.fn().mockResolvedValue([
      {
        title: 'Commentary on the Whole Bible',
        author: 'Matthew Henry',
        content:
          'Here is the great Gospel truth, that God so loved the world that He gave His only begotten Son...',
      },
    ]);

    await service.getGuide('BLIVRE', 43, 3, 16);

    expect((prisma as any).$queryRawUnsafe).toHaveBeenCalledTimes(1);
    const [sql, canonicalRef, bookMin, bookMax] = (prisma as any)
      .$queryRawUnsafe.mock.calls[0];

    expect(sql).not.toContain('UserEmbedding');
    expect(canonicalRef).toBe(43003016);
    expect(bookMin).toBe(43000000);
    expect(bookMax).toBe(43999999);
    expect(sql).toContain(
      'ref."startRef" BETWEEN $2 AND $1 AND ref."endRef" BETWEEN $1 AND $3',
    );
  });

  it('agrega comentários clássicos de ResourceReference quando disponíveis sem precisar de scan no UserEmbedding (T1.4)', async () => {
    const mockResourcesService = {
      findReferences: jest.fn().mockResolvedValue([
        {
          id: 'ref-1',
          resourceTitle: 'Institutas da Religião Cristã',
          author: 'João Calvino',
          text: 'A justificação pela fé é o principal gonzos sobre o qual gira a religião.',
          canonicalRef: 45008001,
          confidence: 1.0,
        },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PassageGuideService,
        { provide: PrismaService, useValue: prisma },
        { provide: CrossReferencesService, useValue: crossRefs },
        { provide: LinguisticsService, useValue: linguistics },
        { provide: ArchaeologyService, useValue: archaeology },
        {
          provide: ResourcesService,
          useValue: mockResourcesService,
        },
      ],
    }).compile();

    const pgWithResources =
      module.get<PassageGuideService>(PassageGuideService);
    const g = await pgWithResources.getGuide('BLIVRE', 45, 8, 1);

    expect(mockResourcesService.findReferences).toHaveBeenCalledWith(
      45008001,
      10,
    );
    expect(g.commentaries).toHaveLength(1);
    expect(g.commentaries[0].author).toBe('João Calvino');
    expect(g.commentaries[0].source).toBe('Institutas da Religião Cristã');
    expect(g.commentaries[0].tags).toContain('índice-canônico');
  });
  it('índice ResourceReference indisponível: registra warn e não derruba o guia', async () => {
    const { Logger } = await import('@nestjs/common');
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const failingResources = {
      findReferences: jest
        .fn()
        .mockRejectedValue(
          new Error('relation "ResourceReference" does not exist'),
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PassageGuideService,
        { provide: PrismaService, useValue: prisma },
        { provide: CrossReferencesService, useValue: crossRefs },
        { provide: LinguisticsService, useValue: linguistics },
        { provide: ArchaeologyService, useValue: archaeology },
        { provide: ResourcesService, useValue: failingResources },
      ],
    }).compile();

    const g = await module
      .get<PassageGuideService>(PassageGuideService)
      .getGuide('BLIVRE', 43, 3, 16);

    expect(g).toBeDefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Índice ResourceReference indisponível'),
    );
    warn.mockRestore();
  });

  it('filtra índices remissivos puros (trechos com 5 ou mais [n]) e preserva comentários exegéticos reais', async () => {
    (prisma as any).$queryRawUnsafe = jest.fn().mockResolvedValue([
      {
        title: 'The City of God, Volume II',
        author: 'Santo Agostinho',
        content:
          '[547] Ps. xl. 2, 3. [548] Jer. ix. 23, 24, as in 1 Cor. i. 31. [549] Lam. iv. 20. [550] Bar. iii. 35. [551] Rom. viii. 28.',
      },
      {
        title: 'Commentary on Romans',
        author: 'John Calvin',
        content:
          'And we know that all things work together for good to them that love God. He now draws this conclusion from what had been previously said, showing how great is the benefit of adoption.',
      },
    ]);

    const g = await service.getGuide('BLIVRE', 45, 8, 28);

    expect(g.commentaries).toHaveLength(1);
    expect(g.commentaries[0].author).toBe('John Calvin');
    expect(g.commentaries[0].source).toBe('Commentary on Romans');
    expect(g.commentaries[0].content).toContain(
      'all things work together for good',
    );
  });

  it('filtra índices remissivos puros via ResourcesService quando há 5 ou mais [n]', async () => {
    const mockResourcesService = {
      findReferences: jest.fn().mockResolvedValue([
        {
          id: 'ref-index',
          resourceTitle: 'Index of Scripture References',
          author: 'Editor',
          text: '[1] Gen 1:1 [2] Gen 1:2 [3] Gen 1:3 [4] Gen 1:4 [5] Gen 1:5 [6] Gen 1:6',
          canonicalRef: 43003016,
          confidence: 1.0,
        },
        {
          id: 'ref-exegesis',
          resourceTitle: 'Comentário sobre João',
          author: 'João Calvino',
          text: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito. Exegese profunda sobre a amplitude do amor divino.',
          canonicalRef: 43003016,
          confidence: 1.0,
        },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PassageGuideService,
        { provide: PrismaService, useValue: prisma },
        { provide: CrossReferencesService, useValue: crossRefs },
        { provide: LinguisticsService, useValue: linguistics },
        { provide: ArchaeologyService, useValue: archaeology },
        { provide: ResourcesService, useValue: mockResourcesService },
      ],
    }).compile();

    const pgWithResources =
      module.get<PassageGuideService>(PassageGuideService);
    const g = await pgWithResources.getGuide('BLIVRE', 43, 3, 16);

    expect(g.commentaries).toHaveLength(1);
    expect(g.commentaries[0].author).toBe('João Calvino');
    expect(g.commentaries[0].source).toBe('Comentário sobre João');
  });
});
