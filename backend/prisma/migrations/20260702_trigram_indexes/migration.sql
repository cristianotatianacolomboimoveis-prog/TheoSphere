-- Habilitar extensão pg_trgm para buscas ILIKE eficientes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índice trigram para buscas no léxico (usado pelo RAG em getLexicalContext)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "LexicalEntry_word_trgm_idx"
  ON "LexicalEntry" USING gin (word gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "LexicalEntry_definition_trgm_idx"
  ON "LexicalEntry" USING gin (definition gin_trgm_ops);

-- Índice trigram para comentários técnicos (usado pelo RAG em getTechnicalCommentaryContext)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TechnicalCommentary_content_trgm_idx"
  ON "TechnicalCommentary" USING gin (content gin_trgm_ops);
