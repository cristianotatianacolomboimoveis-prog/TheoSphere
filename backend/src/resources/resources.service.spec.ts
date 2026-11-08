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
    it('deve buscar citações diretas e intervalos [startRef, endRef] por referência canônica BBCCCVVV', async () => {
      // 45008028 = Romans 8:28
      prisma.resourceReference.findMany.mockResolvedValue([
        {
          id: 'ref-1',
          chunkId: 'chunk-1',
          canonicalRef: 45008028,
          startRef: 45008028,
          endRef: 45008028,
          kind: 'inline',
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
        where: {
          OR: [
            { canonicalRef: 45008028 },
            {
              startRef: { gte: 45000000, lte: 45008028 },
              endRef: { gte: 45008028, lte: 45999999 },
            },
          ],
        },
        include: {
          chunk: {
            include: {
              resource: true,
            },
          },
        },
        orderBy: [{ confidence: 'desc' }, { createdAt: 'asc' }],
        take: 60,
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
        startRef: 45008028,
        endRef: 45008028,
        kind: 'inline',
        confidence: 1.0,
        matchType: 'explicit_reference',
      });
    });

    it('deve encontrar referência quando o versículo pedido estiver dentro do intervalo [startRef, endRef] (ex: Jo 3:16 em 43003014..43003018)', async () => {
      prisma.resourceReference.findMany.mockResolvedValue([
        {
          id: 'ref-range-1',
          chunkId: 'chunk-henry-1846',
          canonicalRef: 43003014,
          startRef: 43003014,
          endRef: 43003018,
          kind: 'heading',
          confidence: 0.95,
          chunk: {
            id: 'chunk-henry-1846',
            chunkIndex: 1846,
            text: 'Christ here discourses of the great design of his own coming into the world, v. 14-18.',
            resource: {
              title: 'Commentary on the Whole Bible Vol 5',
              author: 'Matthew Henry',
              slug: 'classic-90005',
              year: 1710,
            },
          },
        },
      ]);
      prisma.resourceChunk.findMany.mockResolvedValue([]);

      const results = await service.findReferences(43003016, 10);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        resourceTitle: 'Commentary on the Whole Bible Vol 5',
        startRef: 43003014,
        endRef: 43003018,
        kind: 'heading',
        matchType: 'scoped_range',
      });
    });

    it('deve aceitar referências em string (ex: "Sl 51:1" ou "Romans 8:28")', async () => {
      prisma.resourceReference.findMany.mockResolvedValue([]);
      prisma.resourceChunk.findMany.mockResolvedValue([]);

      await service.findReferences('Romans 8:28');

      expect(prisma.resourceReference.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { canonicalRef: 45008028 },
              {
                startRef: { gte: 45000000, lte: 45008028 },
                endRef: { gte: 45008028, lte: 45999999 },
              },
            ],
          },
        }),
      );
    });

    it('deve incluir trechos cujo intervalo de abrangência em ResourceChunk cubra a referência', async () => {
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
          startRef: { gte: 45000000, lte: 45008028 },
          endRef: { gte: 45008028, lte: 45999999 },
        },
        include: {
          resource: true,
        },
        take: 20,
      });

      expect(results).toHaveLength(1);
      expect(results[0].author).toBe('Matthew Henry');
      expect(results[0].matchType).toBe('scoped_range');
      expect(results[0].startRef).toBe(45008001);
      expect(results[0].endRef).toBe(45008039);
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
