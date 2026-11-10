-- Índice compacto HNSW com quantização binária para "BibleVerse"
-- Arquitetura Supabase Nano (512 MB RAM) - Etapa 4 do Plano Nano
--
-- Substitui o índice original "BibleVerse_embedding_hnsw_idx" (753 MB), criado pelas migrações:
--   - 20260507171358_hybrid_search_indexes
--   - 20260515120000_hnsw_bible_cache_standardize
--
-- Parâmetros:
--   - Tipo: bit(768) via binary_quantize(embedding)::bit(768)
--   - Classe de operadores: bit_hamming_ops
--   - HNSW: m=16, ef_construction=64
--   - Filtro: WHERE embedding IS NOT NULL
--   - Limite estrito de tamanho: <= 90 MB

SET statement_timeout = 0;
SET maintenance_work_mem = '64MB';

CREATE INDEX CONCURRENTLY IF NOT EXISTS "BibleVerse_embedding_bq_hnsw_idx"
  ON "BibleVerse"
  USING hnsw ((binary_quantize(embedding)::bit(768)) bit_hamming_ops)
  WHERE embedding IS NOT NULL;

-- Conferência de validade e tamanho
SELECT indisvalid, pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_index
WHERE indexrelid = '"BibleVerse_embedding_bq_hnsw_idx"'::regclass;

