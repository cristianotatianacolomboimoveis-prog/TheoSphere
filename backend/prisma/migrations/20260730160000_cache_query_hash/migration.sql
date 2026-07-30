-- Match exato no cache semântico, antes de gastar uma chamada de embedding.
--
-- Até 30/07/2026 todo lookup começava com createEmbedding(query) — inclusive
-- quando a pergunta era idêntica a uma já respondida. Isso fazia cada pergunta
-- custar DUAS requisições faturadas à API (embedding + geração), consumindo a
-- cota diária no dobro da velocidade.
--
-- Com o hash indexado, pergunta repetida é resolvida por uma consulta de banco:
-- custo zero de API.
--
-- Coluna anulável de propósito: entradas antigas simplesmente não casam por
-- hash e continuam sendo encontradas pela busca vetorial.

ALTER TABLE "SemanticCacheEntry" ADD COLUMN IF NOT EXISTS "queryHash" TEXT;

-- Índices parciais: só as linhas com hash interessam, e a busca sempre filtra
-- por escopo e validade.
CREATE INDEX IF NOT EXISTS "SemanticCacheEntry_scope_queryHash_idx"
  ON "SemanticCacheEntry" ("scope", "queryHash")
  WHERE "queryHash" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "SemanticCacheEntry_user_queryHash_idx"
  ON "SemanticCacheEntry" ("userId", "queryHash")
  WHERE "queryHash" IS NOT NULL AND "userId" IS NOT NULL;
