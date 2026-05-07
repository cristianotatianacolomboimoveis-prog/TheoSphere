-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: relations + pgvector semantic cache + Location field rename
-- ═══════════════════════════════════════════════════════════════════════════

-- Required extension (no-op if already installed)
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── 1. Standardize Location column names (PT → EN) ─────────────────────────
ALTER TABLE "Location" RENAME COLUMN "nome"      TO "name";
ALTER TABLE "Location" RENAME COLUMN "categoria" TO "category";
ALTER TABLE "Location" RENAME COLUMN "descricao" TO "description";

-- ─── 2. Foreign Keys + indexes for existing tables ──────────────────────────

-- User → Institution
CREATE INDEX IF NOT EXISTS "User_institutionId_idx" ON "User"("institutionId");
ALTER TABLE "User"
  ADD CONSTRAINT "User_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- UserEmbedding → User (cascade delete: removing a user wipes their embeddings)
ALTER TABLE "UserEmbedding"
  ADD CONSTRAINT "UserEmbedding_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ChatHistory → User (set null on user delete: keep audit trail)
ALTER TABLE "ChatHistory"
  ADD CONSTRAINT "ChatHistory_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Argument → Debate: drop old RESTRICT FK, replace with CASCADE
ALTER TABLE "Argument" DROP CONSTRAINT IF EXISTS "Argument_debateId_fkey";
CREATE INDEX IF NOT EXISTS "Argument_debateId_idx" ON "Argument"("debateId");
ALTER TABLE "Argument"
  ADD CONSTRAINT "Argument_debateId_fkey"
  FOREIGN KEY ("debateId") REFERENCES "Debate"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 3. SemanticCacheEntry (pgvector-backed semantic cache) ─────────────────
CREATE TABLE "SemanticCacheEntry" (
    "id"        TEXT NOT NULL,
    "scope"     TEXT NOT NULL,
    "userId"    TEXT,
    "tradition" TEXT,
    "queryText" TEXT NOT NULL,
    "response"  TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,
    "hitCount"  INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SemanticCacheEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SemanticCacheEntry_scope_idx"     ON "SemanticCacheEntry"("scope");
CREATE INDEX "SemanticCacheEntry_userId_idx"    ON "SemanticCacheEntry"("userId");
CREATE INDEX "SemanticCacheEntry_tradition_idx" ON "SemanticCacheEntry"("tradition");
CREATE INDEX "SemanticCacheEntry_expiresAt_idx" ON "SemanticCacheEntry"("expiresAt");

-- HNSW ANN index on cosine distance (pgvector ≥ 0.5).
-- m=16, ef_construction=64 are pgvector defaults — good balance of build time vs recall.
CREATE INDEX "SemanticCacheEntry_embedding_hnsw_idx"
  ON "SemanticCacheEntry"
  USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
