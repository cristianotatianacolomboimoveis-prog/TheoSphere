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

  /**
   * Drive the public method with synthetic retriever output by mocking
   * $queryRaw call-by-call. The first $queryRaw is vector, the second
   * is keyword (matching the order in hybridSearchVerses).
   * (Içado para o escopo externo na auditoria 2026-07-21 — também usado
   * pelas suítes de reference-detection e advancedSearch.)
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

  describe('RRF fusion', () => {
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

  describe('reference detection', () => {
    it('REGRESSÃO: "1 Corinthians 13" resolve como referência (nomes EN ordinais)', async () => {
      prisma.bibleVerse.findMany.mockResolvedValue([
        {
          id: 'v1',
          bookId: 46,
          chapter: 13,
          verse: 1,
          translation: 'KJV',
          text: 'Though I speak...',
        },
      ]);

      const out = await service.hybridSearchVerses('1 Corinthians 13');

      expect(prisma.bibleVerse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ bookId: 46, chapter: 13 }),
        }),
      );
      expect(out).toHaveLength(1);
      expect(out[0].score).toBe(1.0);
      // Nenhum retriever é acionado quando a referência resolve
      expect(embeddings.createEmbedding).not.toHaveBeenCalled();
    });

    it('referência PT com versículo filtra o versículo exato', async () => {
      prisma.bibleVerse.findMany.mockResolvedValue([
        {
          id: 'v1',
          bookId: 43,
          chapter: 3,
          verse: 16,
          translation: 'BLIVRE',
          text: 'Porque Deus amou o mundo...',
        },
      ]);

      await service.hybridSearchVerses('João 3:16');

      expect(prisma.bibleVerse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ bookId: 43, chapter: 3, verse: 16 }),
        }),
      );
    });

    it('livro desconhecido cai no pipeline híbrido', async () => {
      setRetrieverResults([], []);
      await service.hybridSearchVerses('Enoque 3');
      expect(prisma.bibleVerse.findMany).not.toHaveBeenCalled();
      expect(prisma.$queryRaw).toHaveBeenCalled(); // retriever keyword
    });
  });

  describe('advancedSearch — strong:/morph: (InterlinearWord)', () => {
    /**
     * Achata recursivamente a tagged-template do $queryRaw: fragmentos
     * Prisma.sql aninhados chegam como VALUES (não como strings do template
     * externo), então serializamos strings e values intercalados.
     */
    const flatten = (node: unknown): string => {
      if (node == null) return '';
      const maybe = node as { strings?: string[]; values?: unknown[] };
      if (Array.isArray(maybe.strings)) {
        const vals = maybe.values ?? [];
        return maybe.strings
          .map((s, i) => s + (i < vals.length ? flatten(vals[i]) : ''))
          .join('');
      }
      if (Array.isArray(node)) return node.map(flatten).join(' ');
      return typeof node === 'string' ? node : '?';
    };
    const sqlOf = (call: unknown[]): string => {
      const [strings, ...values] = call;
      return flatten({ strings, values });
    };

    it('strong:G26 executa caminho estruturado com EXISTS em InterlinearWord', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          id: 'v1',
          bookId: 43,
          chapter: 1,
          verse: 1,
          translation: 'TR',
          text: 'Ἐν ἀρχῇ...',
          rank: null,
        },
      ]);

      const { parsed, hits } = await service.advancedSearch('strong:G26');

      expect(parsed.strongId).toBe('G26');
      expect(parsed.hasStructure).toBe(true);
      // Não usa o pipeline híbrido (nenhum embedding)
      expect(embeddings.createEmbedding).not.toHaveBeenCalled();
      const sql = sqlOf(prisma.$queryRaw.mock.calls[0]);
      expect(sql).toContain('"InterlinearWord"');
      expect(sql).toContain('EXISTS');
      expect(hits).toHaveLength(1);
      expect(hits[0].keywordRank).toBe(1);
    });

    it('morph: gera comparação LIKE por prefixo', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const { parsed } = await service.advancedSearch('morph:V-AAI book:John');

      expect(parsed.morph).toBe('V-AAI');
      const sql = sqlOf(prisma.$queryRaw.mock.calls[0]);
      expect(sql).toContain('LIKE');
      expect(sql).toContain('"InterlinearWord"');
    });

    it('query sem estrutura cai no híbrido', async () => {
      setRetrieverResults([], []);
      const { parsed } = await service.advancedSearch('graça e paz');
      expect(parsed.hasStructure).toBe(false);
      expect(embeddings.createEmbedding).toHaveBeenCalled();
    });
  });
});
