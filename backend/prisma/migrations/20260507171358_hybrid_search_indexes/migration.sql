-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: hybrid-search support
-- Adds:
--  - GIN full-text index over BibleVerse.text (keyword retriever)
--  - HNSW ANN index over BibleVerse.embedding (vector retriever)
-- ═══════════════════════════════════════════════════════════════════════════

-- Full-text search: GIN over to_tsvector('simple', text).
-- 'simple' avoids language-specific stemming because the corpus is multilingual
-- (PT, EN, GR, HE) — keep matching predictable.
CREATE INDEX IF NOT EXISTS "BibleVerse_text_fts_idx"
  ON "BibleVerse"
  USING GIN (to_tsvector('simple', text));

-- Vector ANN: HNSW with cosine ops on the optional `embedding` column.
-- pgvector skips NULLs automatically, no partial index needed.
CREATE INDEX IF NOT EXISTS "BibleVerse_embedding_hnsw_idx"
  ON "BibleVerse"
  USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
