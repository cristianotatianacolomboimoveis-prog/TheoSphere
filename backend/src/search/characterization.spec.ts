import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { EmbeddingService } from '../rag/embedding.service';
import { PrismaService } from '../prisma.service';

describe('SearchService Characterization Test (Retrofit 0.3)', () => {
  let service: SearchService;
  let prisma: {
    $queryRaw: jest.Mock;
    bibleVerse: { findMany: jest.Mock };
  };
  let embeddings: { createEmbedding: jest.Mock };

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn(),
      bibleVerse: { findMany: jest.fn().mockResolvedValue([]) },
    };
    embeddings = { createEmbedding: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmbeddingService, useValue: embeddings },
      ],
    }).compile();

    service = module.get(SearchService);
  });

  it('deve congelar o comportamento RFF com vectorRank null para resultados apenas de palavra-chave', async () => {
    // Configura o mock do gerador de embeddings para a busca vetorial
    embeddings.createEmbedding.mockResolvedValue(new Array(768).fill(0.1));

    // O braço vetorial retorna vazio (cenário real de produção sem embeddings)
    // O braço de palavra-chave retorna 1 item com rank 0.8
    prisma.$queryRaw.mockImplementation((strings: TemplateStringsArray) => {
      const sql = strings.join(' ');
      if (sql.includes('to_tsvector')) {
        return Promise.resolve([
          {
            id: 'verse-id-1',
            bookId: 1,
            chapter: 1,
            verse: 1,
            translation: 'BLIVRE',
            text: 'No princípio, criou Deus os céus e a terra.',
            rank: 0.8,
          },
        ]);
      }
      return Promise.resolve([]); // Braço vetorial vazio
    });

    const out = await service.hybridSearchVerses('Deus');

    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('verse-id-1');
    expect(out[0].vectorRank).toBeNull(); // Caracterização: o braço vetorial deve ser null
    expect(out[0].keywordRank).toBe(1); // Foi o primeiro do braço de palavras-chave
    expect(out[0].score).toBeCloseTo(1 / (60 + 1), 10); // Fórmula RRF com k=60 e rank=1
  });
});
