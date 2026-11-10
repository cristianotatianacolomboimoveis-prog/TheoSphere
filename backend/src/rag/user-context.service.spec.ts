import { Test, TestingModule } from '@nestjs/testing';
import { UserContextService } from './user-context.service';
import { EmbeddingService } from './embedding.service';
import { LibraryService } from './library.service';
import { PrismaService } from '../prisma.service';

describe('UserContextService (Etapa 3 - LIBRARY_VECTOR_SOURCE e Whitelist de Tipos)', () => {
  let service: UserContextService;
  let prisma: {
    $queryRaw: jest.Mock;
    $executeRaw: jest.Mock;
  };
  let embeddings: {
    createEmbedding: jest.Mock;
    cosineSimilarity: jest.Mock;
  };
  let libraryService: {
    searchResourceChunksVector: jest.Mock;
  };
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv };

    prisma = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    embeddings = {
      createEmbedding: jest.fn().mockResolvedValue(new Array(768).fill(0.05)),
      cosineSimilarity: jest.fn().mockReturnValue(0.9),
    };
    libraryService = {
      searchResourceChunksVector: jest.fn().mockResolvedValue([
        {
          text: 'Trecho canônico de Calvino...',
          title: 'Institutas da Religião Cristã',
          author: 'João Calvino',
          slug: 'institutas-calvino',
          chunkIndex: 1,
          distance: 0.15,
        },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserContextService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmbeddingService, useValue: embeddings },
        { provide: LibraryService, useValue: libraryService },
      ],
    }).compile();

    service = module.get(UserContextService);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('preservação de anotações do usuário (Regra 3 & Item 3g)', () => {
    it('searchUserContext consulta UserEmbedding usando lista permitida type IN ("note", "highlight") e nunca !=', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([
        {
          id: 'note-1',
          type: 'note',
          content: 'Minha anotação pessoal sobre graça',
          metadata: { reference: 'Efésios 2:8' },
          createdAt: new Date(),
          similarity: 0.85,
        },
      ]);

      const results = await service.searchUserContext(
        'user-1',
        'graça salvadora',
      );

      expect(results).toHaveLength(1);
      expect(results[0].document.content).toContain('Minha anotação');
      const sql = (
        prisma.$queryRaw.mock.calls[0][0].strings ||
        prisma.$queryRaw.mock.calls[0][0]
      ).join(' ');
      expect(sql).toContain('"UserEmbedding"');
      expect(sql).toContain(`type IN ('note', 'highlight')`);
      expect(sql).not.toContain(`type != 'library_book'`);
    });
  });

  describe('leitura da biblioteca em buildUserContext', () => {
    it('usa UserEmbedding com type = library_book por padrão', async () => {
      delete process.env.LIBRARY_VECTOR_SOURCE;

      prisma.$queryRaw
        .mockResolvedValueOnce([
          {
            id: 'note-1',
            type: 'note',
            content: 'Nota ativa',
            metadata: {},
            createdAt: new Date(),
            similarity: 0.8,
          },
        ]) // searchUserContext (tier 2 notes)
        .mockResolvedValueOnce([
          {
            content: 'Texto teológico do drive...',
            metadata: { fileName: 'MeuLivro.pdf' },
            similarity: 0.8,
          },
        ]);

      const context = await service.buildUserContext('user-1', 'predestinação');

      expect(context).toContain('Biblioteca Pessoal: MeuLivro.pdf');
      const libraryCall = prisma.$queryRaw.mock.calls[1];
      const sql = (libraryCall[0].strings || libraryCall[0]).join(' ');
      expect(sql).toContain('"UserEmbedding"');
      expect(sql).toContain(`type = 'library_book'`);
      expect(libraryService.searchResourceChunksVector).not.toHaveBeenCalled();
    });

    it('reaproveita searchResourceChunksVector de LibraryService quando LIBRARY_VECTOR_SOURCE = resource_chunk sem filtro por userId', async () => {
      process.env.LIBRARY_VECTOR_SOURCE = 'resource_chunk';

      prisma.$queryRaw.mockResolvedValueOnce([
        {
          id: 'note-1',
          type: 'note',
          content: 'Nota ativa',
          metadata: {},
          createdAt: new Date(),
          similarity: 0.8,
        },
      ]); // searchUserContext

      const context = await service.buildUserContext(
        'user-1',
        'soberania divina',
      );

      expect(context).toContain(
        'Biblioteca Pessoal: Institutas da Religião Cristã',
      );
      // Confere reaproveitamento da função de LibraryService
      expect(libraryService.searchResourceChunksVector).toHaveBeenCalledTimes(
        1,
      );
      // Acervo comum: não recebe userId
      expect(libraryService.searchResourceChunksVector).toHaveBeenCalledWith(
        expect.any(Array),
        3,
      );
    });

    it('searchDriveLibrary também reaproveita searchResourceChunksVector quando LIBRARY_VECTOR_SOURCE = resource_chunk', async () => {
      process.env.LIBRARY_VECTOR_SOURCE = 'resource_chunk';

      const logSpy = jest.spyOn((service as any).logger, 'log');

      const results = await service.searchDriveLibrary(
        'graça irresistível',
        'user-1',
        5,
      );

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Institutas da Religião Cristã');
      expect(libraryService.searchResourceChunksVector).toHaveBeenCalledWith(
        expect.any(Array),
        10,
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[Drive Library\] Fonte: resource_chunk \| Hits antes do filtro: 1 \| Hits após filtro: 1 \| Melhor similaridade: 0\.850/,
        ),
      );
    });

    it('erro na busca em searchDriveLibrary registra warn com a mensagem e não engole com debug', async () => {
      process.env.LIBRARY_VECTOR_SOURCE = 'resource_chunk';
      embeddings.createEmbedding.mockRejectedValueOnce(
        new Error('Conexão encerrada no pool'),
      );

      const warnSpy = jest.spyOn((service as any).logger, 'warn');
      const debugSpy = jest.spyOn((service as any).logger, 'debug');

      const results = await service.searchDriveLibrary('query com erro');

      expect(results).toEqual([]);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[Drive Library] Busca falhou: Conexão encerrada no pool',
        ),
      );
      expect(debugSpy).not.toHaveBeenCalled();
    });
  });
});
