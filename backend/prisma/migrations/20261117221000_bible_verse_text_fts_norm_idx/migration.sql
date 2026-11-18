-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: bible_verse_text_fts_norm_idx
-- Adds:
--  - GIN full-text index over public.theo_unaccent(text)
--  - Safe lock_timeout = 5s to prevent deployment deadlock if ingestion is running.
--  - CREATE INDEX IF NOT EXISTS is a 0ms no-op in production because the index
--    was already provisioned concurrently via out-of-band script.
-- ═══════════════════════════════════════════════════════════════════════════

SET lock_timeout = '5s';

CREATE INDEX IF NOT EXISTS "BibleVerse_text_fts_norm_idx"
  ON "BibleVerse"
  USING GIN (to_tsvector('simple', public.theo_unaccent(text)));

