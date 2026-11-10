-- Índice compacto HNSW com quantização binária para "ResourceChunk"
-- Arquitetura Supabase Nano (512 MB RAM) - Etapa 5 do Plano Nano
--
-- Parâmetros:
--   - Tipo: bit(768) via binary_quantize(embedding)::bit(768)
--   - Classe de operadores: bit_hamming_ops
--   - HNSW: m=16, ef_construction=64
--   - Filtro: WHERE embedding IS NOT NULL
--   - Limite estrito de tamanho: <= 30 MB (estimado em ~18 MB para 45.092 chunks)

SET statement_timeout = '15min';
SET maintenance_work_mem = '32MB';

CREATE INDEX CONCURRENTLY IF NOT EXISTS "ResourceChunk_embedding_bq_hnsw_idx"
  ON "ResourceChunk"
  USING hnsw ((binary_quantize(embedding)::bit(768)) bit_hamming_ops)
  WHERE embedding IS NOT NULL;

-- Conferência de validade e tamanho
SELECT indisvalid, pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_index
WHERE indexrelid = '"ResourceChunk_embedding_bq_hnsw_idx"'::regclass;

