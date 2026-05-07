import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { EmbeddingService } from '../rag/embedding.service';
import { PrismaService } from '../prisma.service';

/**
 * Unit tests for SearchService.
 *
 * The two retrievers (vectorSearch, keywordSearch) are private and use
 * raw SQL we can't easily exercise without a live Postgres + pgvector;
 * those are best covered by an e2e against a containerized DB.
 *
 * What we DO cover here:
 *   - The pure RRF fusion algorithm (the one piece of business logic
 *     that has tricky edge cases: presence in one vs both retrievers,
 *     stable ordering, limit, k-smoothing).
 *   - The short-query guard.
 *   - Graceful degradation when both retrievers throw.
 */
describe('SearchService', () => {
  let service: SearchService;
  let prisma: { $queryRaw: jest.Mock };
  let embeddings: { createEmbedding: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn() };
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

  describe('input guard', () => {
    it('returns [] for empty query', async () => {
      expect(await service.hybridSearchVerses('')).toEqual([]);
      expect(await service.hybridSearchVerses('  ')).toEqual([]);
    });

    it('returns [] for 1-char query', async () => {
      expect(await service.hybridSearchVerses('a')).toEqual([]);
    });
  });

  describe('graceful degradation', () => {
    it('returns [] when both retrievers fail', async () => {
      embeddings.createEmbedding.mockRejectedValue(new Error('boom'));
      prisma.$queryRaw.mockRejectedValue(new Error('db down'));
      const out = await service.hybridSearchVerses('grace');
      expect(out).toEqual([]);
    });
  });

  describe('RRF fusion', () => {
    /**
     * Drive the public method with synthetic retriever output by mocking
     * $queryRaw call-by-call. The first $queryRaw is vector, the second
     * is keyword (matching the order in hybridSearchVerses).
     */
    const setRetrieverResults = (
      vec: Array<{ id: string; distance: number; text: string }>,
      kw: Array<{ id: string; rank: number; text: string }>,
    ) => {
      embeddings.createEmbedding.mockResolvedValue(new Array(768).fill(0.1));
      const vectorRows = vec.map((v) => ({
        id: v.id,
        bookId: 1,
        chapter: 1,
        verse: 1,
        translation: 'KJV',
        text: v.text,
        distance: v.distance,
      }));
      const keywordRows = kw.map((k) => ({
        id: k.id,
        bookId: 1,
        chapter: 1,
        verse: 1,
        translation: 'KJV',
        text: k.text,
        rank: k.rank,
      }));
      // Vector and keyword are racing under Promise.all; the keyword retriever
      // doesn't await an embedding so it can hit $queryRaw first. Dispatch by
      // inspecting the tagged-template SQL fragments instead of relying on order.
      prisma.$queryRaw.mockImplementation((strings: TemplateStringsArray) => {
        const sql = strings.join(' ');
        if (sql.includes('to_tsvector')) return Promise.resolve(keywordRows);
        return Promise.resolve(vectorRows);
      });
    };

    it('boosts documents that appear in BOTH retrievers above singletons', async () => {
      setRetrieverResults(
        [
          { id: 'A', distance: 0.1, text: 'shared' }, // vec rank 1
          { id: 'B', distance: 0.2, text: 'vec only' }, // vec rank 2
        ],
        [
          { id: 'A', rank: 0.9, text: 'shared' }, // kw rank 1
          { id: 'C', rank: 0.5, text: 'kw only' }, // kw rank 2
        ],
      );

      const out = await service.hybridSearchVerses('grace');

      // A appears in both → highest fused score
      expect(out[0].id).toBe('A');
      expect(out[0].vectorRank).toBe(1);
      expect(out[0].keywordRank).toBe(1);

      // B and C are singletons; B and C should both have score = 1 / (60 + 2)
      const b = out.find((h) => h.id === 'B')!;
      const c = out.find((h) => h.id === 'C')!;
      expect(b.score).toBeCloseTo(1 / 62, 10);
      expect(c.score).toBeCloseTo(1 / 62, 10);
      // A's score = 1/(60+1) + 1/(60+1) = 2/61 — strictly greater
      expect(out[0].score).toBeGreaterThan(b.score);
    });

    it('respects the limit parameter', async () => {
      const vec = Array.from({ length: 30 }, (_, i) => ({
        id: `V${i}`,
        distance: i * 0.01,
        text: 't',
      }));
      setRetrieverResults(vec, []);
      const out = await service.hybridSearchVerses('grace', { limit: 5 });
      expect(out).toHaveLength(5);
      // First result should be V0 (rank 1, smallest distance)
      expect(out[0].id).toBe('V0');
    });

    it('marks vectorRank null for keyword-only hits and vice-versa', async () => {
      setRetrieverResults(
        [{ id: 'V1', distance: 0.1, text: 'v' }],
        [{ id: 'K1', rank: 0.9, text: 'k' }],
      );
      const out = await service.hybridSearchVerses('grace');
      const v = out.find((h) => h.id === 'V1')!;
      const k = out.find((h) => h.id === 'K1')!;
      expect(v.vectorRank).toBe(1);
      expect(v.keywordRank).toBeNull();
      expect(k.vectorRank).toBeNull();
      expect(k.keywordRank).toBe(1);
    });

    it('returns [] when neither retriever finds anything', async () => {
      setRetrieverResults([], []);
      expect(await service.hybridSearchVerses('grace')).toEqual([]);
    });

    it('caps poolSize and limit to safe maxima', async () => {
      // limit > 100 should still produce ≤ 100 results
      const big = Array.from({ length: 250 }, (_, i) => ({
        id: `V${i}`,
        distance: i * 0.001,
        text: 't',
      }));
      setRetrieverResults(big.slice(0, 200), []);
      const out = await service.hybridSearchVerses('grace', {
        limit: 999,
        poolSize: 999,
      });
      expect(out.length).toBeLessThanOrEqual(100);
    });
  });
});
