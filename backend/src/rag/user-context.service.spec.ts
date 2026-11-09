import { Test, TestingModule } from '@nestjs/testing';
import { UserContextService } from './user-context.service';
import { EmbeddingService } from './embedding.service';
import { PrismaService } from '../prisma.service';

describe('UserContextService (Etapa 3 - LIBRARY_VECTOR_SOURCE)', () => {
  let service: UserContextService;
  let prisma: {
    $queryRaw: jest.Mock;
    $executeRaw: jest.Mock;
  };
  let embeddings: {
    createEmbedding: jest.Mock;
    cosineSimilarity: jest.Mock;
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserContextService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmbeddingService, useValue: embeddings },
      ],
    }).compile();

    service = module.get(UserContextService);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('preservação de anotações do usuário (Regra 3)', () => {
    it('searchUserContext consulta sempre UserEmbedding com type != library_book', async () => {
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
      expect(sql).toContain(`type != 'library_book'`);
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
      expect(sql).not.toContain('"ResourceChunk"');
    });

    it('usa ResourceChunk quando LIBRARY_VECTOR_SOURCE = resource_chunk', async () => {
      process.env.LIBRARY_VECTOR_SOURCE = 'resource_chunk';

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
            content: 'Trecho canônico de Calvino...',
            metadata: { fileName: 'Institutas da Religião Cristã' },
            similarity: 0.85,
          },
        ]);

      const context = await service.buildUserContext(
        'user-1',
        'soberania divina',
      );

      expect(context).toContain(
        'Biblioteca Pessoal: Institutas da Religião Cristã',
      );
      const libraryCall = prisma.$queryRaw.mock.calls[1];
      const sql = (libraryCall[0].strings || libraryCall[0]).join(' ');
      expect(sql).toContain('"ResourceChunk"');
      expect(sql).toContain('"Resource"');
      expect(sql).not.toContain('"UserEmbedding"');
    });
  });
});
