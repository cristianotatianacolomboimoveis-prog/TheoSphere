import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SynopsisService } from './synopsis.service';
import { PrismaService } from '../prisma.service';

describe('SynopsisService', () => {
  let service: SynopsisService;
  let prisma: {
    bibleVerse: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      bibleVerse: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SynopsisService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SynopsisService>(SynopsisService);
  });

  describe('listPericopes & getSections', () => {
    it('deve listar todas as perícopas catalogadas com participatingGospels', () => {
      const pericopes = service.listPericopes();
      expect(pericopes.length).toBeGreaterThanOrEqual(30);
      expect(pericopes[0]).toHaveProperty('participatingGospels');
      expect(Array.isArray(pericopes[0].participatingGospels)).toBe(true);
    });

    it('deve filtrar perícopas por seção temática', () => {
      const miracles = service.listPericopes({ section: 'miracles' });
      expect(miracles.length).toBeGreaterThan(0);
      expect(miracles.every((m) => m.section === 'miracles')).toBe(true);
    });

    it('deve filtrar perícopas por parallelType (quadruple)', () => {
      const quadruple = service.listPericopes({ parallelType: 'quadruple' });
      expect(quadruple.length).toBeGreaterThan(0);
      expect(quadruple.every((q) => q.parallelType === 'quadruple')).toBe(true);
    });

    it('deve realizar busca textual no título e referências', () => {
      const feeding = service.listPericopes({ search: 'Cinco Mil' });
      expect(feeding.length).toBeGreaterThan(0);
      expect(feeding[0].id).toBe('feeding-of-the-five-thousand');
    });

    it('deve retornar a lista de seções da vida de Cristo', () => {
      const sections = service.getSections();
      expect(sections.length).toBeGreaterThan(5);
      expect(sections.some((s) => s.key === 'miracles')).toBe(true);
    });
  });

  describe('findPericopeByReference', () => {
    it('deve encontrar a perícopa da Alimentação dos 5000 a partir de Mt 14:15', () => {
      const found = service.findPericopeByReference(40, 14, 15);
      expect(found).not.toBeNull();
      expect(found?.id).toBe('feeding-of-the-five-thousand');
    });

    it('deve encontrar a perícopa a partir de João 6:5', () => {
      const found = service.findPericopeByReference(43, 6, 5);
      expect(found).not.toBeNull();
      expect(found?.id).toBe('feeding-of-the-five-thousand');
    });

    it('deve retornar null para livro fora dos evangelhos (ex: Gênesis = 1)', () => {
      const found = service.findPericopeByReference(1, 1, 1);
      expect(found).toBeNull();
    });

    it('deve retornar null para capítulo sem perícopa catalogada', () => {
      const found = service.findPericopeByReference(40, 99, 1);
      expect(found).toBeNull();
    });
  });

  describe('getSynopsis', () => {
    it('deve lançar NotFoundException se a perícopa não existir', async () => {
      await expect(
        service.getSynopsis('pericopa-inexistente-12345'),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve carregar os versículos, diffs e matriz de concordância para a Alimentação dos 5000', async () => {
      prisma.bibleVerse.findMany.mockImplementation((args: any) => {
        const bookId = args.where.bookId;
        if (bookId === 40) {
          return Promise.resolve([
            {
              verse: 13,
              text: 'Jesus partiu dali num barco para um lugar deserto.',
            },
            {
              verse: 14,
              text: 'Ao desembarcar, viu uma grande multidão e curou os enfermos.',
            },
          ]);
        }
        if (bookId === 41) {
          return Promise.resolve([
            {
              verse: 30,
              text: 'Os apóstolos se reuniram com Jesus e relataram tudo.',
            },
            {
              verse: 31,
              text: 'Jesus partiu dali num barco para um lugar deserto.',
            },
          ]);
        }
        if (bookId === 42) {
          return Promise.resolve([
            {
              verse: 10,
              text: 'Ao regressarem, os apóstolos contaram tudo o que tinham feito.',
            },
          ]);
        }
        if (bookId === 43) {
          return Promise.resolve([
            {
              verse: 1,
              text: 'Depois disso Jesus foi para o outro lado do mar da Galileia.',
            },
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await service.getSynopsis(
        'feeding-of-the-five-thousand',
        'BLIVRE',
        'mark',
      );

      expect(result).toBeDefined();
      expect(result.pericope.id).toBe('feeding-of-the-five-thousand');
      expect(result.translation).toBe('BLIVRE');
      expect(result.baseGospel).toBe('mark');

      // Verifica colunas
      expect(result.gospels.matthew).toBeDefined();
      expect(result.gospels.mark).toBeDefined();
      expect(result.gospels.luke).toBeDefined();
      expect(result.gospels.john).toBeDefined();

      expect(result.gospels.mark?.diffWithBase?.similarity).toBe(100);
      expect(result.gospels.matthew?.diffWithBase?.similarity).toBeGreaterThan(
        0,
      );

      // Verifica Matriz de Concordância
      expect(result.agreementMatrix.length).toBeGreaterThan(0);
      const pairMtMc = result.agreementMatrix.find(
        (p) =>
          (p.gospelA === 'matthew' && p.gospelB === 'mark') ||
          (p.gospelA === 'mark' && p.gospelB === 'matthew'),
      );
      expect(pairMtMc).toBeDefined();
    });

    it('deve usar fallback para BLIVRE se tradução não for permitida', async () => {
      prisma.bibleVerse.findMany.mockResolvedValue([]);

      const result = await service.getSynopsis(
        'feeding-of-the-five-thousand',
        'TRADUCAO_INVALIDA',
      );

      expect(result.translation).toBe('BLIVRE');
    });
  });
});
