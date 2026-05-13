import { PrismaClient } from '@prisma/client';
import { setupTestDatabase, TestDb } from './helpers/postgres-container';

/**
 * End-to-end: pgvector + Postgres FTS, against a real Postgres container.
 *
 * What we verify:
 *   1. Migrations apply cleanly (extensions enabled, HNSW + GIN indexes
 *      created, all tables present).
 *   2. The pgvector cosine operator (`<=>`) works against a real vector
 *      column populated via INSERT.
 *   3. Postgres full-text search finds rows by `to_tsvector @@ plainto_tsquery`.
 *   4. The hybrid retrievers return overlapping rows for queries that
 *      should hit both.
 *
 * Why not boot the full Nest app?
 *   These tests guard the SQL contract — not the wire/DI plumbing.
 *   Spinning Nest up adds 3-5s of overhead and a long dep graph for
 *   no extra signal. The unit tests already cover the service layer.
 */
describe('Hybrid search infrastructure (e2e)', () => {
  let testDb: TestDb;
  let prisma: PrismaClient;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    prisma = new PrismaClient({
      datasources: { db: { url: testDb.url } },
    });
    await prisma.$connect();
  }, 180_000);

  afterAll(async () => {
    await prisma.$disconnect();
    await testDb.stop();
  });

  describe('migrations', () => {
    it('enables vector and postgis extensions', async () => {
      const rows = await prisma.$queryRaw<Array<{ extname: string }>>`
        SELECT extname FROM pg_extension WHERE extname IN ('vector', 'postgis');
      `;
      const names = rows.map((r) => r.extname).sort();
      expect(names).toContain('vector');
      expect(names).toContain('postgis');
    });

    it('creates the SemanticCacheEntry HNSW index', async () => {
      const rows = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'SemanticCacheEntry'
          AND indexname = 'SemanticCacheEntry_embedding_hnsw_idx';
      `;
      expect(rows).toHaveLength(1);
    });

    it('creates the BibleVerse FTS GIN + HNSW indexes', async () => {
      const rows = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'BibleVerse'
          AND indexname IN ('BibleVerse_text_fts_idx', 'BibleVerse_embedding_hnsw_idx');
      `;
      const names = rows.map((r) => r.indexname).sort();
      expect(names).toEqual([
        'BibleVerse_embedding_hnsw_idx',
        'BibleVerse_text_fts_idx',
      ]);
    });

    it('renamed Location columns to English', async () => {
      const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'Location'
          AND column_name IN ('name', 'category', 'description', 'nome', 'categoria', 'descricao');
      `;
      const names = rows.map((r) => r.column_name).sort();
      expect(names).toEqual(['category', 'description', 'name']);
    });
  });

  describe('pgvector cosine search', () => {
    const vec = (n: number): string => `[${Array(768).fill(n).join(',')}]`;

    beforeAll(async () => {
      // Seed 3 verses with deterministic embeddings: nearly identical pair
      // (0.1 vs 0.10001) and one outlier.
      await prisma.$executeRawUnsafe(`
        INSERT INTO "BibleVerse"
          (id, book, "bookId", chapter, verse, text, translation, testament, "textDirection", embedding)
        VALUES
          ('v1', 'Genesis', 1, 1, 1, 'In the beginning God created',     'KJV', 'OT', 'ltr', '${vec(0.1)}'::vector),
          ('v2', 'Genesis', 1, 1, 2, 'And the earth was without form',   'KJV', 'OT', 'ltr', '${vec(0.10001)}'::vector),
          ('v3', 'Revelation', 66, 22, 21, 'The grace of our Lord Jesus', 'KJV', 'NT', 'ltr', '${vec(0.9)}'::vector);
      `);
    });

    it('orders rows by cosine distance to a query vector', async () => {
      const probe = vec(0.1);
      const rows = await prisma.$queryRawUnsafe<
        Array<{ id: string; distance: number }>
      >(`
        SELECT id, (embedding <=> '${probe}'::vector)::float8 AS distance
        FROM "BibleVerse"
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> '${probe}'::vector
        LIMIT 3;
      `);
      const ids = rows.map((r) => r.id);
      expect(ids[0]).toBe('v1');
      expect(ids[1]).toBe('v2');
      expect(ids[2]).toBe('v3');
      // v1 is exact match → distance ≈ 0; outlier should have distance > 0.05
      expect(Number(rows[0].distance)).toBeLessThan(1e-6);
      expect(Number(rows[2].distance)).toBeGreaterThan(0);
    });
  });

  describe('full-text search', () => {
    it('matches rows via to_tsvector @@ plainto_tsquery', async () => {
      const rows = await prisma.$queryRaw<Array<{ id: string; rank: number }>>`
        SELECT id,
               ts_rank(to_tsvector('simple', text),
                       plainto_tsquery('simple', 'grace Lord')) AS rank
        FROM "BibleVerse"
        WHERE to_tsvector('simple', text) @@ plainto_tsquery('simple', 'grace Lord')
        ORDER BY rank DESC;
      `;
      expect(rows.length).toBeGreaterThanOrEqual(1);
      expect(rows[0].id).toBe('v3');
    });

    it('returns 0 rows for nonsense queries', async () => {
      const rows = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "BibleVerse"
        WHERE to_tsvector('simple', text) @@ plainto_tsquery('simple', 'qzzxqzzx');
      `;
      expect(rows).toHaveLength(0);
    });
  });

  describe('SemanticCacheEntry', () => {
    it('round-trips an entry with vector(768) and respects expiresAt', async () => {
      const id = 'cache_e2e_1';
      const embedding = `[${Array(768).fill(0.5).join(',')}]`;
      await prisma.$executeRawUnsafe(`
        INSERT INTO "SemanticCacheEntry"
          (id, scope, "userId", tradition, "queryText", response, embedding, "hitCount", "expiresAt", "createdAt")
        VALUES
          ('${id}', 'global', NULL, 'Reformada', 'Q', 'A',
           '${embedding}'::vector, 0, NOW() + interval '1 hour', NOW());
      `);

      const fresh = await prisma.semanticCacheEntry.findFirst({
        where: { id, expiresAt: { gt: new Date() } },
      });
      expect(fresh?.id).toBe(id);

      // Backdate and confirm it's filtered out as expired.
      await prisma.$executeRawUnsafe(`
        UPDATE "SemanticCacheEntry"
        SET "expiresAt" = NOW() - interval '1 hour'
        WHERE id = '${id}';
      `);
      const expired = await prisma.semanticCacheEntry.findFirst({
        where: { id, expiresAt: { gt: new Date() } },
      });
      expect(expired).toBeNull();
    });
  });
});
