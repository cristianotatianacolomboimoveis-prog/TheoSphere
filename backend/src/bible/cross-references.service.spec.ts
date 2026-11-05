import { Test, TestingModule } from '@nestjs/testing';
import { CrossReferencesService } from './cross-references.service';
import { PrismaService } from '../prisma.service';

describe('CrossReferencesService', () => {
  let service: CrossReferencesService;
  let prisma: {
    crossReference: {
      findMany: jest.Mock;
      groupBy: jest.Mock;
    };
    bibleVerse: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      crossReference: {
        findMany: jest.fn(),
        groupBy: jest.fn(),
      },
      bibleVerse: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrossReferencesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CrossReferencesService>(CrossReferencesService);
  });

  describe('list', () => {
    it('deve listar referências cruzadas e enriquecer com o texto bíblico na tradução solicitada', async () => {
      prisma.crossReference.findMany.mockResolvedValue([
        { targetRef: 'Romans 5:8', rank: 1, votes: 42 },
        { targetRef: '1 John 4:9', rank: 2, votes: 35 },
      ]);

      prisma.bibleVerse.findMany.mockResolvedValue([
        {
          bookId: 45, // Romans
          chapter: 5,
          verse: 8,
          text: 'Mas Deus prova o seu próprio amor para conosco pelo fato de Cristo ter morrido por nós.',
        },
        {
          bookId: 62, // 1 John
          chapter: 4,
          verse: 9,
          text: 'Nisto se manifestou o amor de Deus em nós: em haver Deus enviado o seu Filho unigênito.',
        },
      ]);

      const result = await service.list('John 3:16', 10, 'BLIVRE', true);

      expect(prisma.crossReference.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { sourceRef: 'John 3:16' },
              { sourceRef: 'John 3:16' },
              { sourceNumRef: 43003016 },
            ],
          },
        }),
      );

      expect(prisma.bibleVerse.findMany).toHaveBeenCalledWith({
        where: {
          translation: 'BLIVRE',
          OR: [
            { bookId: 45, chapter: 5, verse: 8 },
            { bookId: 62, chapter: 4, verse: 9 },
          ],
        },
        select: {
          bookId: true,
          chapter: true,
          verse: true,
          text: true,
        },
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        target: 'Romans 5:8',
        rank: 1,
        votes: 42,
        text: 'Mas Deus prova o seu próprio amor para conosco pelo fato de Cristo ter morrido por nós.',
        bookNamePt: 'Romanos',
      });
      expect(result[1]).toEqual({
        target: '1 John 4:9',
        rank: 2,
        votes: 35,
        text: 'Nisto se manifestou o amor de Deus em nós: em haver Deus enviado o seu Filho unigênito.',
        bookNamePt: '1 João',
      });
    });

    it('deve normalizar sourceRef em português para o canônico em inglês e calcular sourceNumRef', async () => {
      prisma.crossReference.findMany.mockResolvedValue([]);

      await service.list('João 3:16');

      expect(prisma.crossReference.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { sourceRef: 'João 3:16' },
              { sourceRef: 'John 3:16' },
              { sourceNumRef: 43003016 },
            ],
          },
        }),
      );
    });

    it('deve retornar array vazio se não houver registros no banco', async () => {
      prisma.crossReference.findMany.mockResolvedValue([]);

      const result = await service.list('Obadiah 1:21');
      expect(result).toEqual([]);
      expect(prisma.bibleVerse.findMany).not.toHaveBeenCalled();
    });
  });

  describe('listByNumericRange', () => {
    it('deve consultar por intervalo numérico [startRef, endRef]', async () => {
      prisma.crossReference.findMany.mockResolvedValue([
        {
          targetRef: 'Romans 5:8',
          targetNumRef: 45005008,
          rank: 1,
          votes: 10,
        },
      ]);
      prisma.bibleVerse.findMany.mockResolvedValue([
        {
          bookId: 45,
          chapter: 5,
          verse: 8,
          text: 'Mas Deus prova o seu próprio amor...',
        },
      ]);

      const res = await service.listByNumericRange(
        43003001,
        43003016,
        25,
        'BLIVRE',
        true,
      );

      expect(prisma.crossReference.findMany).toHaveBeenCalledWith({
        where: {
          sourceNumRef: {
            gte: 43003001,
            lte: 43003016,
          },
        },
        orderBy: [{ rank: { sort: 'asc', nulls: 'last' } }, { votes: 'desc' }],
        take: 25,
        select: {
          targetRef: true,
          targetNumRef: true,
          rank: true,
          votes: true,
        },
      });

      expect(res).toHaveLength(1);
      expect(res[0].target).toBe('Romans 5:8');
      expect(res[0].bookNamePt).toBe('Romanos');
    });

    it('deve inverter limites se startRef > endRef', async () => {
      prisma.crossReference.findMany.mockResolvedValue([]);
      await service.listByNumericRange(43003036, 43003001);

      expect(prisma.crossReference.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sourceNumRef: {
              gte: 43003001,
              lte: 43003036,
            },
          },
        }),
      );
    });
  });

  describe('countsByRef', () => {
    it('deve realizar contagem agrupada e mapear tanto para EN quanto para PT', async () => {
      prisma.crossReference.groupBy.mockResolvedValue([
        { sourceRef: 'John 3:16', _count: { _all: 12 } },
        { sourceRef: 'Romans 8:28', _count: { _all: 8 } },
      ]);

      const result = await service.countsByRef(['João 3:16', 'Romans 8:28']);

      expect(result.counts['John 3:16']).toBe(12);
      expect(result.counts['João 3:16']).toBe(12);
      expect(result.counts['Romans 8:28']).toBe(8);
    });

    it('deve retornar mapa vazio se lista de referências for vazia', async () => {
      const result = await service.countsByRef([]);
      expect(result).toEqual({ counts: {} });
      expect(prisma.crossReference.groupBy).not.toHaveBeenCalled();
    });
  });
});
