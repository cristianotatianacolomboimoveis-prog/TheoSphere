-- HNSW indexes for BibleVerse and SemanticCacheEntry.
-- Standardizing vector search performance across all pgvector-backed models.

-- BibleVerse: This is the largest table in the system (31k verses per translation).
-- Performing semantic similarity search via sequential scan on 31k-100k vectors
-- is a major performance bottleneck. HNSW provides sub-millisecond retrieval.
CREATE INDEX IF NOT EXISTS "BibleVerse_embedding_hnsw_idx"
  ON "BibleVerse"
  USING hnsw ("embedding" vector_cosine_ops);

-- SemanticCacheEntry: Accelerates the AI response cache lookup.
-- Native vector indexing ensures that as the cache grows, the lookup remains fast.
CREATE INDEX IF NOT EXISTS "SemanticCacheEntry_embedding_hnsw_idx"
  ON "SemanticCacheEntry"
  USING hnsw ("embedding" vector_cosine_ops);
