# Relatório de Operação: Plano Nano — Etapa 3 (Busca em Duas Fases - Código)

Data: 2026-11-09  
Horário: 14:55 BRT  
Branch de trabalho: `fix/etapa-3-correcoes-busca-paridade` (sem merge na `main`, aguardando auditoria)  
Status: **REPROVADA (Auditoria Independente)** → **CORRIGIDA**

---

## 1. Incidente Operacional e Diagnóstico de Poolers (Item 1)

### 1.1 Diagnóstico no Servidor PostgreSQL (`pg_stat_activity`)

- **Conexão:** Conexão direta ao banco via host de porta 5432 (`db.chjywahtwktqqxqlthvc.supabase.co`), usuário `postgres`, contornando os poolers do Supavisor e aplicando `statement_timeout`.
- **Estado Encontrado:** Não foram encontradas consultas zumbis ativas referenciando `ResourceChunk`, `UserEmbedding`, `count` ou `paridade` (já haviam finalizado). Nenhum lock pendente (`pg_locks WHERE NOT granted`). Processos de autovacuum e conexões legítimas foram preservados.
- **Processos no Mac:** Processos de background órfãos inspecionados via `ps -ef | grep node` e finalizados.
- **Causa dos Poolers:** **A causa exata do esgotamento temporário dos poolers não foi identificada.**

### 1.2 Medição de Busca em Produção (`/api/v1/search/verses`)

Após estabilização do banco e liberação das sessões, medições foram realizadas:

- **Busca 1 (`q=principio&limit=5`):** HTTP 200, **3.58 s** total (`vectorArm: "ok"`, `vectorMs: 3291`, `keywordMs: 763`).
- **Busca 2 (`q=amor&limit=5`):** HTTP 200, **3.58 s** total (`vectorArm: "ok"`, `vectorMs: 2863`, `keywordMs: 481`).
- **Auditoria Independente do Claude Code:** confirmou buscas com palavras novas em **3,1 s** e **6,4 s**, com `meta.vectorArm: "ok"`.

---

## 2. Regra Nova no `AGENTS.md` (Item 2)

Acrescentada a regra 8 à seção **3.1 Restrição de compute: Supabase Nano** do `AGENTS.md`:

> **8. Statement timeout obrigatório em scripts:** todo script que conecta ao banco define `statement_timeout` de no máximo 15 s durante o dia, para o próprio servidor abortar a consulta. Matar o processo local não cancela a consulta no Postgres. Consulta pesada só à noite.

---

## 3. Correções Estruturais e Paridade da Biblioteca (Item 3)

### 3.1 Paridade Rigorosa de Textos (`backend/scripts/verificar-paridade-biblioteca.ts`)

- **Registro da Falha Anterior:** A versão inicial do relatório baseou-se em `reltuples` aproximados de `pg_class` e inspecionou apenas a tabela `ResourceChunk` sem confrontar diretamente com `UserEmbedding`, emitindo indevidamente mensagem fixa de sucesso.
- **Nova Implementação:**
  - Script preparado para rodar sob a janela noturna (00:00–06:00 BRT) com `statement_timeout: 60000ms` (ou 15000ms durante o dia).
  - Executa a contagem real: `SELECT type, count(*)::bigint AS total FROM "UserEmbedding" GROUP BY type ORDER BY type` e `SELECT count(*)::bigint AS total FROM "ResourceChunk"`.
  - Sorteia 200 trechos via PRNG determinístico Mulberry32 (`seed: 20261109`) balanceados entre todas as obras.
  - Compara `md5(rc.text)` contra `md5(ue.content)` utilizando o mapeamento canônico de migração:
    - `Resource.metadata->>'gid' = UserEmbedding.metadata->>'gutenbergId'`
    - `Resource.title = UserEmbedding.metadata->>'title'`
    - `ResourceChunk.chunkIndex = idx` em ordenação `(metadata->>'chunkIndex')::int NULLS LAST, "createdAt" ASC, id ASC`.
  - A confirmação direta na amostra de teste (ex.: `classic-90001` chunk 10) comprovou paridade exata (`rc_md5: 19b2def58524049c14ac2eaa5c0692d9 == ue_md5`).
  - O script foi blindado: removeu-se qualquer string fixa de aprovação; o status final depende exclusivamente do cômputo `matches === 200 && mismatches === 0 && missing === 0`. Se houver divergência, sai com `process.exit(1)`.

### 3.2 Descoberta de Tipos em Produção e Whitelist de Anotações (Item 3g)

- **Diagnóstico do Catálogo:** Em produção, a coluna `UserEmbedding.type` possui apenas `book_chunk` (99,95%), `note` e `highlight`. Não existe `library_book`.
- **Impacto Identificado:** `library.service.ts:219/280` e `user-context.service.ts:278/340` filtravam por `type = 'library_book'`, devolvendo zero trechos em silêncio. A solução definitiva é a transição para `ResourceChunk`, que será ligada em produção após a criação do índice compacto na Etapa 5.
- **Ingestão Drive:** O tipo `library_book` em `drive-rag.service.ts` não foi alterado nesta etapa (registrado como pendência para a Etapa 7).
- **Correção da Etapa 5 no Plano:** Atualizado `audit/prompts/antigravity-plano-final-nano-2026-11-08.md` para especificar que o alvo de remoção na Etapa 5 é `type = 'book_chunk'`, preservando estritamente `note` e `highlight`, e que a remoção só ocorrerá após a paridade de 200/200 por MD5.
- **Whitelist Estrita em `user-context.service.ts`:**
  - Substituído `type != 'library_book'` por lista permitida:
    ```sql
    WHERE "userId" = ${userId} AND type IN ('note', 'highlight')
    ```

### 3.3 Reuso da Busca Binária e Decisão de Acervo Global (Item 3c)

- **Decisão do Dono:** O acervo de `ResourceChunk` é comum a todos os usuários. Não há filtro por `userId` nessa tabela.
- **Reaproveitamento de Código:**
  - `LibraryService` agora expõe o método público `searchResourceChunksVector(queryEmbeddingOrLiteral, limit)`.
  - `UserContextService` (em `buildUserContext` e `searchDriveLibrary`) quando `LIBRARY_VECTOR_SOURCE === 'resource_chunk'` chama diretamente `libraryService.searchResourceChunksVector`, eliminando duplicação de SQL.

### 3.4 Busca Textual em `ResourceChunk` e Respeito à Regra 3 (Item 3d)

- **Auditoria de Índices:** `ResourceChunk` possui índices em `("resourceId", "chunkIndex")` e `("startRef", "endRef")`, mas **não possui índice textual (GIN/trigram)** na coluna `text`.
- **Plano de Execução (`EXPLAIN`):**
  ```
  Limit (cost=0.00..10672.23 rows=5 width=1168)
    -> Nested Loop (cost=0.00..10672.23 rows=5 width=1168)
          -> Seq Scan on "Resource" res (cost=0.00..4.89 rows=89 width=101)
          -> Materialize (cost=0.00..10660.67 rows=5 width=1141)
                -> Seq Scan on "ResourceChunk" rc (cost=0.00..10660.65 rows=5 width=1141)
                      Filter: (text ~~* '%termo%'::text)
  ```
- **Medição com ANALYZE:** `EXPLAIN (ANALYZE, BUFFERS)` estourou o `statement_timeout` de 10s devido ao Seq Scan em 140 MB com limite de I/O de 5 MB/s.
- **Adequação:** Em cumprimento estrito à Regra 3, `fulltextSearch` em `ResourceChunk` não executa consulta `ILIKE` sem índice no request path. A busca opera via braço vetorial indexado (`searchResourceChunksVector`). A criação de índice textual concorrente fica para planejamento noturno futuro.

### 3.5 Ajuste Dinâmico de P para Evitar Truncamento (Item 3e)

- Em `SearchService` e `LibraryService`, `P` é agora ajustado dinamicamente:
  ```typescript
  const P = Math.max(baseP, poolSize); // ou Math.max(baseP, limit)
  const efSearch = computeEfSearch(P, process.env.HNSW_EF_SEARCH);
  ```
  Isso garante que `P` nunca seja inferior ao total de resultados solicitados.

---

## 4. Testes Automatizados e Testes de Mutação (Item 3b e 3g)

### 4.1 Expressões Exatas Validadas

Os testes unitários agora checam textualmente a expressão completa:

- Busca de versículos: `binary_quantize(embedding)::bit(768) <~> binary_quantize(`
- Biblioteca: `binary_quantize(rc.embedding)::bit(768) <~> binary_quantize(`

### 4.2 Três Testes de Mutação Executados com Sucesso

1. **Mutação 1 (Busca de Versículos):**
   - _Alteração:_ remoção de `binary_quantize` da coluna `embedding` no SQL de `search.service.ts`.
   - _Execução:_ `npx jest src/search/search.service.spec.ts`.
   - _Resultado:_ Falha imediata no teste `'no modo binary, executa transação com SET LOCAL hnsw.ef_search e binary_quantize'`.
   - _Reversão:_ Código restaurado e teste verde.

2. **Mutação 2 (Biblioteca):**
   - _Alteração:_ remoção de `binary_quantize` de `rc.embedding` no SQL de `library.service.ts`.
   - _Execução:_ `npx jest src/rag/library.service.spec.ts`.
   - _Resultado:_ Falha imediata no teste `'executa vectorSearch em ResourceChunk no modo binary com transação e binary_quantize'`.
   - _Reversão:_ Código restaurado e teste verde.

3. **Mutação 3 (Anotações do Usuário):**
   - _Alteração:_ substituição de `type IN ('note', 'highlight')` por `type != 'library_book'` em `user-context.service.ts:171`.
   - _Execução:_ `npx jest src/rag/user-context.service.spec.ts`.
   - _Resultado:_ Falha imediata no teste `'searchUserContext consulta UserEmbedding usando lista permitida type IN ("note", "highlight") e nunca !='`.
   - _Reversão:_ Código restaurado e teste verde.

### 4.3 Suíte Completa de Verificação (`npm run verificar`)

- **Nest build:** 0 erros.
- **Typecheck (`tsc --noEmit`):** 0 erros.
- **Testes Unitários:** **60 suítes aprovadas, 572 testes aprovados (0 falhas)**.
- **Lint (`eslint`):** 0 erros.
- **Static checks (`static-checks.mjs`):** 0 novos achados.

---

## 5. O que NÃO foi Verificado e Por Quê

1. **Execução completa do script de paridade de 200 trechos em produção:**
   - Em conformidade com a nova Regra 8 do `AGENTS.md` e a instrução do dono ("à noite, com statement_timeout de 60 s"), a varredura das 200 queries contra produção deve ser disparada exclusivamente na janela noturna (00:00–06:00 BRT). O script está pronto e testado localmente.
2. **Merge para a branch `main`:**
   - As alterações permanecem isoladas na branch `fix/etapa-3-correcoes-busca-paridade`, aguardando a auditoria independente do Claude Code antes de qualquer merge.
