-- Índice parcial para aceleração da sondagem de versículos pendentes de embedding em "BibleVerse"
-- Arquitetura Supabase Nano (512 MB RAM) - Etapa 1 do Plano Nano
--
-- Histórico de índices em "BibleVerse":
--   O índice original "BibleVerse_embedding_hnsw_idx" (753 MB) foi criado pelas migrações:
--     - 20260507171358_hybrid_search_indexes
--     - 20260515120000_hnsw_bible_cache_standardize
--   (Essa referência é crítica para a remoção na Etapa 4).
--
-- Motivo deste índice parcial:
--   A contagem e a seleção de versículos com `embedding IS NULL` sem índice parcial
--   exigem Sequential Scan na tabela inteira (186k linhas vivas + 59k linhas mortas),
--   o que esgota o statement_timeout de 30s no compute Nano.
--   Este índice parcial B-Tree indexa SOMENTE os versículos ainda sem embedding,
--   ocupando frações mínimas de megabytes e mantendo a sondagem e a seleção de lote em < 10 ms.
--
-- Instruções de execução:
--   - Executar exclusivamente na janela noturna (entre 00:00 e 06:00 BRT).
--   - Conferir pg_stat_progress_vacuum antes da execução (não executar se houver vacuum ativo).
--   - Utilizar conexão direta (DIRECT_URL) via psql, uma instrução por vez.
--   - NÃO colocar em prisma/migrations/ pois CREATE INDEX CONCURRENTLY não pode rodar dentro de transação.

SET statement_timeout = 0;

-- 1. Criação concorrente
CREATE INDEX CONCURRENTLY IF NOT EXISTS "BibleVerse_embedding_pending_idx"
  ON "BibleVerse" (translation, "bookId", chapter, verse)
  WHERE embedding IS NULL;

-- 2. Conferência de validade e tamanho pós-criação
SELECT indisvalid, pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_index
WHERE indexrelid = '"BibleVerse_embedding_pending_idx"'::regclass;

-- 3. Caso indisvalid seja FALSE (falha de indexação concorrente):
-- DROP INDEX CONCURRENTLY "BibleVerse_embedding_pending_idx";
-- e recriar novamente.
