import { Test, TestingModule } from '@nestjs/testing';
import { LibraryService } from './library.service';
import { EmbeddingService } from './embedding.service';
import { PrismaService } from '../prisma.service';

describe('LibraryService (Etapa 3 - LIBRARY_VECTOR_SOURCE)', () => {
  let service: LibraryService;
  let prisma: {
    $queryRaw: jest.Mock;
    $transaction: jest.Mock;
    $executeRawUnsafe: jest.Mock;
  };
  let embeddings: { createEmbedding: jest.Mock };
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv };

    prisma = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      $transaction: jest.fn().mockImplementation(async (fn: any) => fn(prisma)),
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
    };
    embeddings = {
      createEmbedding: jest.fn().mockResolvedValue(new Array(768).fill(0.05)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibraryService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmbeddingService, useValue: embeddings },
      ],
    }).compile();

    service = module.get(LibraryService);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('com LIBRARY_VECTOR_SOURCE = user_embedding (padrão legado)', () => {
    it('executa vectorSearch e fulltextSearch em UserEmbedding com type = library_book', async () => {
      delete process.env.LIBRARY_VECTOR_SOURCE;

      prisma.$queryRaw
        .mockResolvedValueOnce([
          {
            content: 'Texto calvinista...',
            metadata: { fileName: 'Institutas', chunkIndex: 1 },
            distance: 0.1,
          },
        ])
        .mockResolvedValueOnce([
          {
            content: 'Texto com graça...',
            metadata: { fileName: 'Institutas', chunkIndex: 2 },
          },
        ]);

      const hits = await service.lookup('user-123', 'graça soberana', {
        limit: 10,
      });

      expect(hits.length).toBeGreaterThan(0);
      const calls = prisma.$queryRaw.mock.calls;
      expect(calls.length).toBe(2);

      const vectorSql = (calls[0][0].strings || calls[0][0]).join(' ');
      expect(vectorSql).toContain('"UserEmbedding"');
      expect(vectorSql).toContain(`type = 'library_book'`);
      expect(vectorSql).not.toContain('"ResourceChunk"');

      const fulltextSql = (calls[1][0].strings || calls[1][0]).join(' ');
      expect(fulltextSql).toContain('"UserEmbedding"');
      expect(fulltextSql).toContain(`type = 'library_book'`);
      expect(fulltextSql).not.toContain('"ResourceChunk"');
    });
  });

  describe('com LIBRARY_VECTOR_SOURCE = resource_chunk', () => {
    it('executa vectorSearch em ResourceChunk no modo full por padrão', async () => {
      process.env.LIBRARY_VECTOR_SOURCE = 'resource_chunk';
      delete process.env.VECTOR_INDEX_MODE;

      prisma.$queryRaw
        .mockResolvedValueOnce([
          {
            text: 'Texto de teologia clássica...',
            title: 'Institutas da Religião Cristã',
            author: 'João Calvino',
            slug: 'institutas-calvino',
            chunkIndex: 10,
            distance: 0.12,
          },
        ])
        .mockResolvedValueOnce([]); // fulltext

      const hits = await service.lookup('user-123', 'justificação pela fé', {
        limit: 10,
      });

      expect(hits).toHaveLength(1);
      expect(hits[0].fileName).toBe('Institutas da Religião Cristã');
      expect(hits[0].fileId).toBe('institutas-calvino');

      const vectorSql = (
        prisma.$queryRaw.mock.calls[0][0].strings ||
        prisma.$queryRaw.mock.calls[0][0]
      ).join(' ');
      expect(vectorSql).toContain('"ResourceChunk"');
      expect(vectorSql).toContain('"Resource"');
      expect(vectorSql).not.toContain('binary_quantize');
      expect(vectorSql).not.toContain('"UserEmbedding"');
    });

    it('executa vectorSearch em ResourceChunk no modo binary com transação e binary_quantize', async () => {
      process.env.LIBRARY_VECTOR_SOURCE = 'resource_chunk';
      process.env.VECTOR_INDEX_MODE = 'binary';
      process.env.VECTOR_RERANK_CANDIDATES = '150';

      prisma.$queryRaw.mockImplementation(async (queryParam: any) => {
        const sql = (queryParam.strings || queryParam).join(' ');
        if (sql.includes('binary_quantize')) {
          return [
            {
              text: 'Texto binarizado...',
              title: 'Comentário aos Romanos',
              author: 'Martinho Lutero',
              slug: 'romanos-lutero',
              chunkIndex: 5,
              distance: 0.08,
            },
          ];
        }
        return [];
      });

      const hits = await service.lookup('user-123', 'lei e evangelho', {
        limit: 10,
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('SET LOCAL hnsw.ef_search = 150'),
      );

      const vectorCall = prisma.$queryRaw.mock.calls.find((call: any) => {
        const sql = (call[0].strings || call[0]).join(' ');
        return sql.includes('binary_quantize');
      });
      expect(vectorCall).toBeDefined();
      const vectorSql = (vectorCall[0].strings || vectorCall[0]).join(' ');
      expect(vectorSql).toContain('"ResourceChunk"');
      expect(vectorSql).toContain(
        'binary_quantize(rc.embedding)::bit(768) <~> binary_quantize(',
      );
      expect(vectorSql).toContain('<~>');
      expect(hits).toHaveLength(1);
    });

    it('no modo binary, passa { timeout: 15000, maxWait: 5000 } ao $transaction (padrão do Prisma é 5 s)', async () => {
      process.env.LIBRARY_VECTOR_SOURCE = 'resource_chunk';
      process.env.VECTOR_INDEX_MODE = 'binary';
      process.env.VECTOR_RERANK_CANDIDATES = '200';

      prisma.$queryRaw.mockResolvedValue([]);

      await service.lookup('user-123', 'timeout da transação binária', {
        limit: 10,
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const options = prisma.$transaction.mock.calls[0][1];
      expect(options).toBeDefined();
      expect(options.timeout).toBe(15000);
      expect(options.maxWait).toBe(5000);
    });

    it('ajusta P para ser no mínimo o limit pedido quando VECTOR_RERANK_CANDIDATES for menor', async () => {
      process.env.LIBRARY_VECTOR_SOURCE = 'resource_chunk';
      process.env.VECTOR_INDEX_MODE = 'binary';
      process.env.VECTOR_RERANK_CANDIDATES = '10';

      prisma.$queryRaw.mockResolvedValue([]);

      // limit 25 é maior que baseP 10
      await service.lookup('user-123', 'termo qualquer', { limit: 25 });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('SET LOCAL hnsw.ef_search = 25'),
      );
      const vectorCall = prisma.$queryRaw.mock.calls.find((call: any) => {
        const sql = (call[0].strings || call[0]).join(' ');
        return sql.includes('binary_quantize');
      });
      expect(vectorCall).toBeDefined();
      const sql = (vectorCall[0].strings || vectorCall[0]).join(' ');
      expect(sql).toContain(
        'binary_quantize(rc.embedding)::bit(768) <~> binary_quantize(',
      );
      expect(vectorCall.slice(1)).toContain(25);
    });

    it('não executa ILIKE sem índice em ResourceChunk quando LIBRARY_VECTOR_SOURCE = resource_chunk', async () => {
      process.env.LIBRARY_VECTOR_SOURCE = 'resource_chunk';
      delete process.env.VECTOR_INDEX_MODE;

      prisma.$queryRaw.mockResolvedValue([]);

      await service.lookup('user-123', 'termo sem índice', { limit: 10 });

      const allQueries = prisma.$queryRaw.mock.calls.map((call: any) =>
        (call[0].strings || call[0]).join(' '),
      );
      // Nenhuma query deve conter 'ILIKE' sobre ResourceChunk
      const ilikeQuery = allQueries.find(
        (q) => q.includes('"ResourceChunk"') && q.includes('ILIKE'),
      );
      expect(ilikeQuery).toBeUndefined();
    });

    it('no modo binary, cai para o modo full se a busca binária em ResourceChunk lançar erro', async () => {
      process.env.LIBRARY_VECTOR_SOURCE = 'resource_chunk';
      process.env.VECTOR_INDEX_MODE = 'binary';

      prisma.$transaction.mockRejectedValueOnce(
        new Error('binary operator missing'),
      );
      prisma.$queryRaw.mockImplementation(async (queryParam: any) => {
        const sql = (queryParam.strings || queryParam).join(' ');
        if (sql.includes('"ResourceChunk"') && !sql.includes('ILIKE')) {
          return [
            {
              text: 'Fallback do ResourceChunk...',
              title: 'Ortodoxia',
              author: 'G. K. Chesterton',
              slug: 'ortodoxia',
              chunkIndex: 2,
              distance: 0.15,
            },
          ];
        }
        return [];
      });

      const hits = await service.lookup('user-123', 'paradoxos cristãos', {
        limit: 10,
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(hits).toHaveLength(1);
      expect(hits[0].content).toBe('Fallback do ResourceChunk...');
    });
  });
});
