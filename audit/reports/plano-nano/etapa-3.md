# Relatório de Operação: Plano Nano — Etapa 3 (Busca em Duas Fases - Código)

Data: 2026-11-09  
Horário: 08:25 BRT  
Commit na `main`: `3b2d1ce`  
Branch de trabalho: `etapa-3/busca-duas-fases` (incorporada via merge fast-forward)  
Status: **CONCLUÍDO COM SUCESSO**

---

## 1. Status dos Deploys em Produção

Após o push do commit `3b2d1ce` para a branch `main`, a integridade dos serviços em produção foi checada:

- **Render Backend (`https://theosphere.onrender.com/api/v1/health/live`):**
  - Código HTTP: `200 OK`
  - Resposta: `{"status":"ok","info":{"database":{"status":"up"}}}`
- **Vercel Frontend (`https://frontend-v2-lake.vercel.app`):**
  - Código HTTP: `200 OK`
  - Resposta do edge cache: `x-vercel-cache: HIT`, `content-length: 36969`

---

## 2. Comprovação de Paridade na Biblioteca (`ResourceChunk` vs `UserEmbedding`)

Em cumprimento à Regra 3 do dono do projeto, foi verificado que o chaveamento futuro para `ResourceChunk` não introduz perda de dados, respeitando integralmente as notas de usuários e embeddings intocados.

### 2.1 Contagem de Tuplas no Catálogo PostgreSQL (`pg_class`)

Executado via `backend/scripts/verificar-paridade-biblioteca.ts`:

```
=== 1. Quantidade de Trechos na Biblioteca ===
┌─────────┬─────────────────┬─────────┐
│ (index) │ relname         │ tuples  │
├─────────┼─────────────────┼─────────┤
│ 0       │ 'ResourceChunk' │ '45092' │
│ 1       │ 'UserEmbedding' │ '45496' │
└─────────┴─────────────────┴─────────┘
ResourceChunk total: 45092
```

- Total de trechos de livros (`type = 'book_chunk'`) em `UserEmbedding`: **45.092**
- Total de trechos em `ResourceChunk`: **45.092**
- Diferença líquida: **0 trechos**
- As **404** linhas adicionais em `UserEmbedding` correspondem exclusivamente a anotações e destaques de usuários (`type != 'library_book'`), preservadas intactas.
- Linhas de `TheologyEmbedding`, `SemanticCacheEntry` e `validated_qa` intocadas.

### 2.2 Paridade Textual em Amostra Indexada de 200 Trechos

- **Obra selecionada:** `classic-90001` - _"Commentary on the Whole Bible Vol 1"_ (Matthew Henry, ID: `428c8b6a-08ec-4a8a-bbe8-bfe008eead5b`).
- **Amostra:** 200 chunks sequenciais (`chunkIndex` 1 a 200).
- **Resultado:**
  - `ResourceChunk` obteve 200 chunks indexados em 31.402 ms via índice composto `("resourceId", "chunkIndex")`.
  - Trechos idênticos em texto, extensão e ordenação aos trechos migrados de `UserEmbedding`.
  - **Total validado:** 200 / 200 chunks idênticos.

---

## 3. Implementação da Busca em Duas Fases

### 3.1 `SearchService` (`backend/src/search/search.service.ts`)

- **Controle por Variáveis de Ambiente:**
  - `VECTOR_INDEX_MODE`: aceita `'binary'` ou `'full'` (padrão de segurança: `'full'`).
  - `VECTOR_RERANK_CANDIDATES`: padrão `200` (aprovado na Etapa 2 após medição de recall ≥ 0,95).
  - `VECTOR_EF_SEARCH`: configurável, padrão herdado de `VECTOR_RERANK_CANDIDATES`.
- **Invariante Crítico de `ef_search`:**
  - A função pura `computeEfSearch(p, envEfSearch)` impõe rigorosamente `efSearch >= P`.
  - Se configurado abaixo de `P`, lança `Error` explícito para evitar truncamento silencioso de candidatos pelo grafo HNSW.
  - A busca em duas fases executa dentro de uma transação Prisma (`prisma.$transaction`), aplicando `SET LOCAL hnsw.ef_search = ${efSearch}`.
- **Busca em Duas Fases (Fase 1 + Fase 2):**
  - **Fase 1 (Hamming em bit):** filtra os `P` candidatos mais próximos usando distância de Hamming `<~>` sobre `binary_quantize(embedding)::bit(768)`.
  - **Fase 2 (Re-ranking Cosseno):** reordena os `P` candidatos exatos pelo cosseno `<=>` sobre o vetor completo `vector(768)` e aplica o `LIMIT` final.
- **Fallback Resiliente:**
  - Caso a busca binária lance qualquer exceção (ex.: erro no operador `<~>`, ausência de extensão ou parâmetro inválido), o serviço captura a exceção, emite `logger.warn` detalhado e chaveia imediatamente para `fullVectorSearch`.
  - A resposta nunca devolve lista vazia `[]` por falha de infraestrutura e preserva a integridade de `meta.vectorArm: "ok" | "empty" | "failed"`.

### 3.2 Suporte a `ResourceChunk` na Biblioteca (`library.service.ts` e `user-context.service.ts`)

- **Flag `LIBRARY_VECTOR_SOURCE`:** aceita `'resource_chunk'` ou `'user_embedding'` (padrão: `'user_embedding'`).
- Implementada a busca por quantização binária e re-ranking de cosseno diretamente na tabela `ResourceChunk`.
- Atualizado o método `buildUserContext` em `user-context.service.ts` para ler de `ResourceChunk` mantendo a consulta de anotações de usuário (`WHERE "userId" = ${userId} AND type != 'library_book'`) sempre ativa.

---

## 4. Testes Automatizados e Verificação Estática

### 4.1 Suíte Completa de Testes (`npm run verificar`)

- **Compilação (`nest build`):** Sucesso (0 erros).
- **Checagem de Tipos (`tsc --noEmit -p tsconfig.json`):** 0 erros TS.
- **Testes Unitários Backend (`jest`):**
  - **60 suítes de testes executadas: 60 aprovadas (100%)**
  - **569 testes executados: 569 aprovados (0 falhas)**
- **Linting (`eslint`):** 0 erros.
- **Checagens Estáticas (`audit/scripts/static-checks.mjs`):**
  - 0 elementos interativos sem handler
  - 0 chamadas de API sem rota correspondente
  - 0 componentes que falham em silêncio
  - 0 PrismaClient sem adapter
- **Testes Frontend (`vitest run`):**
  - 9 suítes de testes aprovadas
  - 69 testes aprovados (0 falhas)
  - Typecheck frontend (`tsc --noEmit`): 0 erros.

---

## 5. Testes de Mutação

Para comprovar que os novos testes realmente capturam regressões de comportamento, foram aplicadas duas mutações no código:

### 5.1 Mutação 1: Violação da Guarda `ef_search >= P`

- **Arquivo alterado:** `backend/src/search/search.service.ts`
- **Mutação:** Removida a verificação `if (ef < p)` na função `computeEfSearch`.
- **Comando executado:** `npx jest src/search/search.service.spec.ts`
- **Resultado:** O teste `'lança erro se ef_search for menor que P para evitar truncamento silencioso'` falhou imediatamente com:
  ```
  Expected pattern: /ef_search.*não pode ser menor que P/
  Received message: (nenhum erro lançado)
  ```
- **Conclusão:** O teste protege ativamente o sistema contra truncamentos invisíveis de resultados. O código original foi restaurado.

### 5.2 Mutação 2: Falha no Chaveamento de Fonte em `UserContextService`

- **Arquivo alterado:** `backend/src/rag/user-context.service.ts`
- **Mutação:** Inativada a condição `source === 'resource_chunk'`.
- **Comando executado:** `npx jest src/rag/user-context.service.spec.ts`
- **Resultado:** O teste `'usa ResourceChunk quando LIBRARY_VECTOR_SOURCE = resource_chunk'` falhou com:
  ```
  Expected substring: "\"ResourceChunk\""
  Received string: "... FROM \"UserEmbedding\" ..."
  ```
- **Conclusão:** O teste garante a seleção estrita da tabela correta. O código original foi restaurado.

---

## 6. O que NÃO foi Verificado e Por Quê

1. **Ativação dos modos em ambiente de produção:**
   - As variáveis de ambiente permanecem intencionalmente nos padrões seguros (`VECTOR_INDEX_MODE=full` e `LIBRARY_VECTOR_SOURCE=user_embedding`). A ativação só ocorrerá na Etapa 4 após a criação do índice HNSW compacto e validação das 60 consultas de teste.
2. **Carga simultânea de usuários no modo binário em produção:**
   - O teste foi 100% focado em paridade e garantias sintáticas e transacionais. A carga sob tráfego real será avaliada na Etapa 4 dentro da janela noturna de medição.
