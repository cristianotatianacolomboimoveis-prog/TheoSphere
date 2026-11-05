import { Test, TestingModule } from '@nestjs/testing';
import { ResourcesService } from './resources.service';
import { PrismaService } from '../prisma.service';

describe('ResourcesService (T1.4)', () => {
  let service: ResourcesService;
  let prisma: {
    resourceReference: { findMany: jest.Mock };
    resourceChunk: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      resourceReference: { findMany: jest.fn() },
      resourceChunk: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourcesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ResourcesService>(ResourcesService);
  });

  describe('findReferences', () => {
    it('deve buscar citações diretas por referência canônica numérica BBCCCVVV', async () => {
      // 45008028 = Romans 8:28
      prisma.resourceReference.findMany.mockResolvedValue([
        {
          id: 'ref-1',
          chunkId: 'chunk-1',
          canonicalRef: 45008028,
          confidence: 1.0,
          chunk: {
            id: 'chunk-1',
            chunkIndex: 12,
            text: 'All things work together for good to them that love God.',
            resource: {
              title: 'Commentary on Romans',
              author: 'John Calvin',
              slug: 'classic-calvin-romans',
              year: 1540,
            },
          },
        },
      ]);
      prisma.resourceChunk.findMany.mockResolvedValue([]);

      const results = await service.findReferences(45008028, 10);

      expect(prisma.resourceReference.findMany).toHaveBeenCalledWith({
        where: { canonicalRef: 45008028 },
        include: {
          chunk: {
            include: {
              resource: true,
            },
          },
        },
        orderBy: [{ confidence: 'desc' }, { createdAt: 'asc' }],
        take: 10,
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        id: 'ref-1',
        resourceTitle: 'Commentary on Romans',
        author: 'John Calvin',
        resourceSlug: 'classic-calvin-romans',
        year: 1540,
        text: 'All things work together for good to them that love God.',
        chunkIndex: 12,
        canonicalRef: 45008028,
        confidence: 1.0,
        matchType: 'explicit_reference',
      });
    });

    it('deve aceitar referências em string (ex: "Sl 51:1" ou "Romans 8:28")', async () => {
      prisma.resourceReference.findMany.mockResolvedValue([]);
      prisma.resourceChunk.findMany.mockResolvedValue([]);

      await service.findReferences('Romans 8:28');

      expect(prisma.resourceReference.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { canonicalRef: 45008028 },
        }),
      );
    });

    it('deve incluir trechos cujo intervalo de abrangência cubra a referência', async () => {
      prisma.resourceReference.findMany.mockResolvedValue([]);
      prisma.resourceChunk.findMany.mockResolvedValue([
        {
          id: 'chunk-range-1',
          chunkIndex: 5,
          text: 'Comentário geral sobre o capítulo 8 de Romanos.',
          startRef: 45008001,
          endRef: 45008039,
          resource: {
            title: 'Exposição de Romanos',
            author: 'Matthew Henry',
            slug: 'classic-henry-romans',
            year: 1710,
          },
        },
      ]);

      const results = await service.findReferences(45008028);

      expect(prisma.resourceChunk.findMany).toHaveBeenCalledWith({
        where: {
          startRef: { lte: 45008028 },
          endRef: { gte: 45008028 },
        },
        include: {
          resource: true,
        },
        take: 20,
      });

      expect(results).toHaveLength(1);
      expect(results[0].author).toBe('Matthew Henry');
      expect(results[0].matchType).toBe('scoped_range');
    });

    it('deve retornar array vazio se string de referência for inválida', async () => {
      const results = await service.findReferences('Texto Inexistente');
      expect(results).toEqual([]);
      expect(prisma.resourceReference.findMany).not.toHaveBeenCalled();
    });

    it('deve tratar exceção de banco graciosamente sem lançar 500', async () => {
      prisma.resourceReference.findMany.mockRejectedValue(
        new Error('Connection failure'),
      );

      const results = await service.findReferences(45008028);
      expect(results).toEqual([]);
    });
  });
});
