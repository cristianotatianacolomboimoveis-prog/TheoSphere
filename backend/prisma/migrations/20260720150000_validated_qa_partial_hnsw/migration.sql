-- Índice HNSW PARCIAL para a coleção validated_qa (aprendizado contínuo).
--
-- Por quê:
--   • searchValidatedQa e promoteValidatedAnswer executam
--       SELECT ... FROM "UserEmbedding" WHERE type = 'validated_qa'
--       ORDER BY embedding <=> $1 LIMIT N
--     O índice HNSW cheio da tabela (UserEmbedding_embedding_hnsw_idx)
--     cobre a busca ANN global, mas um índice parcial dedicado mantém a
--     estrutura pequena e o recall alto quando a coleção crescer — as
--     Q&A validadas são uma fração minúscula da tabela dominada por
--     library_book, e o planner usa o índice parcial quando o predicado
--     WHERE bate exatamente.
--
-- Operator class: vector_cosine_ops — casa com o operador `<=>` usado
-- em todas as queries do serviço (mesma convenção das migrações
-- 20260514000000 e 20260515120000).
--
-- Idempotência: IF NOT EXISTS mantém re-execuções seguras.
-- Build: coleção nasce vazia — custo de criação ~zero.

CREATE INDEX IF NOT EXISTS "UserEmbedding_validated_qa_hnsw_idx"
  ON "UserEmbedding"
  USING hnsw ("embedding" vector_cosine_ops)
  WHERE type = 'validated_qa';
