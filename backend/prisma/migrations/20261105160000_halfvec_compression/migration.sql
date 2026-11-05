-- Migração T0.3: Compressão de embeddings com halfvec(768)
-- AVISO: NÃO APLICAR EM PRODUÇÃO SEM AUTORIZAÇÃO DO DONO (DECISÃO D3)
-- Compatível com pgvector >= 0.7.0 (Supabase verificado em runtime: pgvector 0.8.0)

-- 1. BibleVerse: conversão para halfvec(768) e índice HNSW com halfvec_cosine_ops
ALTER TABLE "BibleVerse" ALTER COLUMN "embedding" TYPE halfvec(768);
DROP INDEX IF EXISTS "BibleVerse_embedding_hnsw_idx";
CREATE INDEX "BibleVerse_embedding_hnsw_idx" ON "BibleVerse" 
USING hnsw ("embedding" halfvec_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 2. UserEmbedding: conversão para halfvec(768) e índice HNSW com halfvec_cosine_ops
ALTER TABLE "UserEmbedding" ALTER COLUMN "embedding" TYPE halfvec(768);
DROP INDEX IF EXISTS "UserEmbedding_embedding_hnsw_idx";
CREATE INDEX "UserEmbedding_embedding_hnsw_idx" ON "UserEmbedding" 
USING hnsw ("embedding" halfvec_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 3. SemanticCacheEntry: conversão para halfvec(768)
ALTER TABLE "SemanticCacheEntry" ALTER COLUMN "embedding" TYPE halfvec(768);
DROP INDEX IF EXISTS "SemanticCacheEntry_embedding_hnsw_idx";
CREATE INDEX "SemanticCacheEntry_embedding_hnsw_idx" ON "SemanticCacheEntry" 
USING hnsw ("embedding" halfvec_cosine_ops)
WITH (m = 16, ef_construction = 64);
