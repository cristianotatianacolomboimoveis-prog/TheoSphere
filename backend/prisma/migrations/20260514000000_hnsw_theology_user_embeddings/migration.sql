-- HNSW indexes for the two pgvector columns that still relied on
-- sequential scans for similarity search.
--
-- Why now:
--   • RagService.fetchVectorContext (rag.service.ts ~line 317) executes
--       SELECT ... FROM "TheologyEmbedding" ORDER BY embedding <=> $1 LIMIT N
--     With no index, Postgres reverts to a Seq Scan whose cost grows
--     linearly with the table — the production audit flagged this as P-1.
--   • The same pattern is used for UserEmbedding via the per-user RAG
--     pipeline; without an index it caps the number of personal docs we
--     can index before query latency degrades.
--
-- Operator class:
--   `vector_cosine_ops` — matches the `<=>` cosine-distance operator used
--   in our queries. Switching to L2 (`<->`) would require also re-writing
--   the ORDER BY and changing the distance interpretation; not worth it.
--
-- Parameters (m, ef_construction):
--   Defaults are fine for our scale (≤ 1M rows expected). For larger
--   datasets, raise `ef_construction` (better recall, slower build) and
--   tune `hnsw.ef_search` at query time.
--
-- Build cost:
--   IF NOT EXISTS + CONCURRENTLY would be ideal, but pgvector's HNSW
--   builder does NOT support CONCURRENTLY pre-0.7. We accept the brief
--   lock during migration. On an empty/dev DB this is instant; in
--   production with ~100k rows it takes seconds to a minute.
--
-- Idempotency: IF NOT EXISTS keeps re-runs safe.

CREATE INDEX IF NOT EXISTS "TheologyEmbedding_embedding_hnsw_idx"
  ON "TheologyEmbedding"
  USING hnsw ("embedding" vector_cosine_ops);

CREATE INDEX IF NOT EXISTS "UserEmbedding_embedding_hnsw_idx"
  ON "UserEmbedding"
  USING hnsw ("embedding" vector_cosine_ops);
