-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tabela principal de Chunks Exegéticos
-- Otimizada para buscas híbridas (Semântica + Filtros)
CREATE TABLE IF NOT EXISTS "ExegeticalChunk" (
    "id" TEXT PRIMARY KEY, -- Ex: "ara_mat_13_1" ou "bdag_word_123"
    "content" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL, -- Dimensão padrão Google Gemini text-embedding-004
    "metadata" JSONB NOT NULL DEFAULT '{}', -- Metadados: livro, capitulo, verso, tipo, author
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Índices de Performance
-- HNSW para busca vetorial de alta performance (Silicon Valley Standard)
-- Eficaz para datasets grandes, superando o IVFFlat em tempo de resposta.
CREATE INDEX IF NOT EXISTS "idx_chunk_embedding_hnsw" 
ON "ExegeticalChunk" 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- GIN para buscas rápidas dentro do JSONB de metadados
CREATE INDEX IF NOT EXISTS "idx_chunk_metadata_gin" 
ON "ExegeticalChunk" 
USING gin (metadata);

-- Índices B-Tree para filtros comuns (Opcional, mas recomendado)
CREATE INDEX IF NOT EXISTS "idx_chunk_metadata_type" ON "ExegeticalChunk" ((metadata->>'type'));
CREATE INDEX IF NOT EXISTS "idx_chunk_metadata_book" ON "ExegeticalChunk" ((metadata->>'book'));
