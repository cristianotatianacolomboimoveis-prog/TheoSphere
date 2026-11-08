-- Índice parcial para aceleração da sondagem de versículos pendentes de embedding em "BibleVerse"
-- Arquitetura Supabase Nano (512 MB RAM) - Etapa 1 do Plano Nano
--
-- Motivo:
--   A contagem e a seleção de versículos com `embedding IS NULL` sem índice parcial
--   exigem Sequential Scan na tabela inteira (186k linhas vivas + 59k linhas mortas),
--   o que esgota o statement_timeout de 30s no compute Nano.
--   Este índice parcial B-Tree indexa SOMENTE os versículos ainda sem embedding,
--   ocupando frações mínimas de megabytes e mantendo a sondagem e a seleção de lote em < 10 ms.
--
-- Instruções de execução:
--   - Executar exclusivamente na janela noturna (entre 00:00 e 06:00 BRT).
--   - Utilizar conexão direta (DIRECT_URL) via psql, uma instrução por vez.
--   - NÃO colocar em prisma/migrations/ pois CREATE INDEX CONCURRENTLY não pode rodar dentro de bloco de transação.

SET statement_timeout = 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "BibleVerse_embedding_pending_idx"
  ON "BibleVerse" (translation, "bookId", chapter, verse)
  WHERE embedding IS NULL;
