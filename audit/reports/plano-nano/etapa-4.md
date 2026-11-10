# Relatório de Operação: Plano Nano — Etapa 4 (Índice Compacto e Redução de Disco da BibleVerse)

**Status:** CONCLUÍDA COM DESVIO DE ORDEM, CORRIGIDA  
**Data:** 2026-11-10  
**Horário de Início:** 11:01 UTC (08:01 BRT)  
**Horário de Conclusão e Estabilização:** 14:52 UTC (11:52 BRT)  
**Ambiente:** Supabase Nano (sa-east-1, São Paulo) & Render Production (`https://theosphere.onrender.com`)  
**Branch:** `main` (commits `945c9eb` e `c96e386`)

---

## 1. Autorização, Exceção de Horário e Pré-checagem

- **Exceção Concedida pelo Mantenedor:** O dono do projeto autorizou expressamente uma exceção pontual ao horário da Seção 3.1 do `AGENTS.md` exclusivamente para a execução da Etapa 4 hoje, com base no fato de não haver usuários simultâneos no sistema e do estado de saúde estável do banco de dados.
- **Janela Noturna Preservada para Manutenção Pesada:** Em estrito cumprimento à determinação do dono, o `VACUUM (VERBOSE, ANALYZE)` manual e o `RESET` dos parâmetros de autovacuum **não** foram executados nesta sessão diurna e permanecem agendados para a janela noturna (00:00 às 06:00 BRT).
- **Verificação de Vacuum Prévia:**

  ```sql
  SELECT p.phase, now() - a.query_start AS duracao
  FROM pg_stat_progress_vacuum p JOIN pg_stat_activity a USING (pid);
  ```

  - **Resultado:** 0 linhas (nenhum autovacuum ativo).

- **Verificação do Supabase Dashboard (Reports → Disk IO / Health / Observability):**
  - **Status:** Healthy
  - **Disk Usage (uso de armazenamento):** 44%
  - **Disk IO Balance (orçamento de I/O disponível):** 75% (recuperado e bem acima do piso mínimo de 30%)
  - **CPU:** 2% a 11%
  - **RAM:** 52%
  - **Conexões:** 9 / 60

---

## 2. Criação Concorrente do Índice Compacto

- **Instrução SQL Executada:**  
  Arquivo de documentação persistido em: `docs/architecture/sql/bibleverse_embedding_bq_hnsw_idx.sql`.
  ```sql
  SET statement_timeout = 0;
  SET maintenance_work_mem = '64MB';
  CREATE INDEX CONCURRENTLY IF NOT EXISTS "BibleVerse_embedding_bq_hnsw_idx"
    ON "BibleVerse"
    USING hnsw ((binary_quantize(embedding)::bit(768)) bit_hamming_ops)
    WHERE embedding IS NOT NULL;
  ```
- **Execução:** Conduzida com `caffeinate -i` via script controlado `backend/scripts/criar-indice-compacto-etapa4.ts`.
- **Aviso Emitido pelo PostgreSQL:**
  ```text
  [PG NOTICE] hnsw graph no longer fits into maintenance_work_mem after 80827 tuples
  ```
  _(Aviso registrado conforme previsto no protocolo; `maintenance_work_mem` mantido estritamente em 64 MB sem elevação)._
- **Tempo de Construção:** **150 segundos (2,5 minutos)**.
- **Validação de Integridade e Tamanho (`pg_index`):**
  - `indisvalid`: **`true`**
  - Tamanho físico: **62 MB (61,63 MB / 64.626.688 bytes)**
  - Teto aprovado: $\le 90$ MB (aprovado com folga de 28 MB).
- **Sondagem de Produção Durante a Criação:**
  - `GET https://theosphere.onrender.com/api/v1/search/verses?q=graca&limit=5`
  - Resposta: **HTTP 200 em 1.830 ms** | `meta.vectorArm: "ok"`.

---

## 3. Validação de Qualidade de Busca (Pré-Drop)

### 3.1 Recall@10 contra `validation_sample_30.json` (60 consultas)

O teste avaliou a capacidade de recuperação dos 10 vizinhos mais próximos exatos calculados em ponto flutuante total (cosseno) versus a recuperação via índice HNSW compacto de Hamming (`bit(768)`) reordenado por cosseno com $P = 200$ e `ef_search = 200`:

| Amostra de Validação | Consultas | Recall@10 Real Medido | Portão Mínimo | Status       |
| :------------------- | :-------- | :-------------------- | :------------ | :----------- |
| **BLIVRE**           | 30        | **96,00%**            | $\ge 95,00\%$ | **APROVADO** |
| **WEB**              | 30        | **98,67%**            | $\ge 95,00\%$ | **APROVADO** |
| **Média Geral**      | **60**    | **97,33%**            | $\ge 95,00\%$ | **APROVADO** |

> _Nota metodológica:_ Na geração do arquivo `validation_sample_30.json` (`medir-quantizacao-binaria.ts:237`), a própria consulta é excluída do ground truth (`if (i === qIdx) continue;`). A consulta no banco filtrou `id != queryId` para garantir que a consulta não consumisse a primeira posição dos 10 resultados com distância 0,0, reproduzindo exatamente o cálculo de recall validado na Etapa 2.

### 3.2 Comparação dos Modos FULL vs BINARY em 10 Buscas com Palavras Novas

Buscas vetoriais reais executadas contra o banco Supabase com geração de embeddings primários Gemini (`gemini-embedding-001`, 768d), cobrindo português, inglês e os originais grego e hebraico:

|  #  | Termo de Busca            | Tradução | Tempo Modo Full (ms) | Tempo Modo Binary (ms) | Sobreposição Top-10 | % Sobreposição |
| :-: | :------------------------ | :------: | :------------------: | :--------------------: | :-----------------: | :------------: |
|  1  | `misericórdia e justiça`  |  BLIVRE  |       1.162 ms       |         448 ms         |       10 / 10       |      100%      |
|  2  | `ressurreição dos mortos` |   NVA    |        816 ms        |         481 ms         |       10 / 10       |      100%      |
|  3  | `covenant of peace`       |   KJV    |       1.259 ms       |         586 ms         |       9 / 10        |      90%       |
|  4  | `everlasting kingdom`     |   WEB    |        832 ms        |         342 ms         |       10 / 10       |      100%      |
|  5  | `δικαιοσύνη`              |   LXX    |       1.052 ms       |         556 ms         |       10 / 10       |      100%      |
|  6  | `שָׁלוֹם`                 |   WLC    |        818 ms        |         466 ms         |       10 / 10       |      100%      |
|  7  | `λόγος`                   |    TR    |       1.235 ms       |         522 ms         |       8 / 10        |      80%       |
|  8  | `espírito e verdade`      |  BLIVRE  |        543 ms        |         279 ms         |       9 / 10        |      90%       |
|  9  | `tabernacle of David`     |   KJV    |        480 ms        |         248 ms         |       7 / 10        |      70%       |
| 10  | `χάρις καὶ ἀλήθεια`       |    TR    |        313 ms        |         254 ms         |       10 / 10       |      100%      |
|  —  | **Médias Gerais**         |    —     |      **801 ms**      |       **418 ms**       |    **9,3 / 10**     |   **93,0%**    |

- **Ganho de Latência:** O modo binário com o índice compacto reduziu o tempo médio de consulta de 801 ms para 418 ms (~48% mais rápido).
- **Fidelidade de Ranking:** 93% dos versículos mais relevantes do modo Full foram recuperados no Top-10 binário.

---

## 4. Remoção do Índice Antigo e Registro do Desvio de Ordem

### 4.1 Remoção do Índice (`BibleVerse_embedding_hnsw_idx`)

- **Instrução:** `DROP INDEX CONCURRENTLY IF EXISTS "BibleVerse_embedding_hnsw_idx";`
- **Horário do DROP:** 11:08 UTC (08:08 BRT).
- **Duração do DROP:** **159 ms**.
- **Rastreabilidade de Esquema:** Criado originalmente pelas migrações Prisma `20260507171358_hybrid_search_indexes` e `20260515120000_hnsw_bible_cache_standardize`. Nenhuma migração Prisma adicional foi criada.

### 4.2 Registro do Desvio de Ordem e Impacto em Produção

- **Desvio de Ordem:** O `DROP` do índice de precisão total (`BibleVerse_embedding_hnsw_idx`) foi executado às 08:08 BRT **antes** de o modo binário estar efetivamente configurado e ativo no ambiente de produção do Render (`VECTOR_INDEX_MODE=binary`).
- **Impacto em Produção:**
  - Entre o momento do DROP (08:08 BRT) e a ativação e correção das transações (~11:40 BRT), o backend no Render permaneceu no modo padrão `full`.
  - Como o índice de cosseno não existia mais, as consultas em modo full recaíram em Sequential Scan sobre os 176.571 registros de `BibleVerse`, gerando tempos de resposta de **20 a 56 segundos** e consumo excessivo de Disk IO Budget.

---

## 5. Incidente do Timeout da Transação e Correção (Commit `c96e386`)

### 5.1 Diagnóstico do Timeout de 5 s do Prisma

Assim que a variável `VECTOR_INDEX_MODE=binary` foi ativada no Render, a busca passou a usar o índice binário. No entanto, no compute Nano com disco frio, consultas filtradas por tradução (especialmente `BLIVRE`) levaram entre 5.024 ms e 5.959 ms para completar o CTE e o re-ranking.

O limite de timeout padrão do Prisma para transações interativas (`$transaction`) é de **5.000 ms (5 s)**. Ao exceder esse tempo, a transação era abortada pelo Prisma e capturada pelo bloco `catch`, registrando no log do Render:

```text
WARN [SearchService] binary vector search failed, falling back to full mode: Transaction API error: A commit cannot be executed on an expired transaction. The timeout for this transaction was 5000 ms, however 5959 ms passed
```

Ao cair no fallback para o modo `full`, a consulta executava o Sequential Scan sem índice, reintroduzindo a lentidão de 46 a 56 segundos.

### 5.2 Implementação da Correção

Na branch `fix/etapa-4-timeout-transacao`, foram configuradas explicitamente as opções `{ timeout: 15000, maxWait: 5000 }` nos dois pontos de busca binária:

1. `binaryVectorSearch` em [`backend/src/search/search.service.ts`](file:///Users/cristianocolombo/Desktop/Theosphere%202026/backend/src/search/search.service.ts)
2. `searchResourceChunksVector` em [`backend/src/rag/library.service.ts`](file:///Users/cristianocolombo/Desktop/Theosphere%202026/backend/src/rag/library.service.ts)

### 5.3 Testes Unitários e Mutações

- Adicionados testes específicos em `search.service.spec.ts` e `library.service.spec.ts` que inspecionam o segundo argumento recebido pelo mock do `$transaction`, assegurando `timeout: 15000` e `maxWait: 5000`.
- **Mutações executadas:**
  - Removidas as opções de `search.service.ts` $\rightarrow$ teste falhou com `Received: undefined`.
  - Removidas as opções de `library.service.ts` $\rightarrow$ teste falhou com `Received: undefined`.
  - Mutações desfeitas e integridade restaurada.
- **Validação de build e integridade:**
  - `npm run verificar`: 60 suítes, **574 testes passando (0 falhas)**, typecheck e lint limpos.
  - `node audit/scripts/static-checks.mjs`: 0 erros.
- **Publicação:** Merge linear realizado na `main` e enviado via push (commit `c96e386`).

---

## 6. Validação Pós-Deploy no Render (Passo 8)

Após o deploy do commit `c96e386` entrar em status **Live** no Render e a rota `/api/v1/health/live` responder `200 OK (0.26s)`, foram executadas 4 buscas em produção com termos inéditos via `curl -s -w "%{time_total}"`:

|  #  | Consulta                       | Tradução  | Tempo Total (s) | `vectorMs` (ms) | `keywordMs` (ms) | `vectorArm` |    Status    |
| :-: | :----------------------------- | :-------: | :-------------: | :-------------: | :--------------: | :---------: | :----------: |
|  1  | `pastor de ovelhas perdidas`   | _(geral)_ |     4,82 s      |  **4.613 ms**   |     1.243 ms     |    `ok`     | **APROVADO** |
|  2  | `muralhas de jerico caindo`    | _(geral)_ |     3,01 s      |  **2.672 ms**   |      132 ms      |    `ok`     | **APROVADO** |
|  3  | `semente de mostarda pequena`  | `BLIVRE`  |     5,29 s      |  **4.513 ms**   |      700 ms      |    `ok`     | **APROVADO** |
|  4  | `talentos enterrados no campo` | `BLIVRE`  |     2,66 s      |  **2.469 ms**   |      144 ms      |    `ok`     | **APROVADO** |

- **Critério de Aprovação:** Todas as 4 consultas apresentaram `vectorMs` abaixo de 8 segundos (máximo medido: 4.613 ms) e `vectorArm` igual a `"ok"` (sem fallback e sem timeout de transação).

---

## 7. Medição de Disco e Inventário de Índices Vetoriais

### 7.1 Redução de Tamanho do Banco de Dados

- **Tamanho do banco antes da Etapa 4:** 2.682 MB
- **Tamanho do banco após o DROP do índice antigo:** **1.929 MB**
- **Espaço liberado:** **753 MB** de redução líquida em disco.

### 7.2 Inventário de Índices Vetoriais Ativos

```sql
SELECT c.relname AS index_name,
       pg_size_pretty(pg_relation_size(c.oid)) AS size,
       pg_relation_size(c.oid) AS bytes
FROM pg_am a
JOIN pg_class c ON c.relam = a.oid
WHERE a.amname IN ('hnsw', 'ivfflat');
```

| Índice                                  | Tabela               | Tamanho    | Observações                                         |
| :-------------------------------------- | :------------------- | :--------- | :-------------------------------------------------- |
| `BibleVerse_embedding_bq_hnsw_idx`      | `BibleVerse`         | **62 MB**  | Novo índice compacto quantizado (`bit_hamming_ops`) |
| `SemanticCacheEntry_embedding_hnsw_idx` | `SemanticCacheEntry` | **344 kB** | Cache semântico                                     |
| `TheologyEmbedding_embedding_hnsw_idx`  | `TheologyEmbedding`  | **16 kB**  | Embeddings teológicos                               |
| `UserEmbedding_validated_qa_hnsw_idx`   | `UserEmbedding`      | **16 kB**  | Q&A validado                                        |
| `UserEmbedding_embedding_hnsw_idx`      | `UserEmbedding`      | **176 MB** | Alvo da Etapa 5 (migração para `ResourceChunk`)     |

- **Subtotal dos índices vetoriais de Bíblia e suporte:** 62,37 MB.
- **Soma total atual de índices vetoriais no banco:** 238,22 MB.  
  _(A soma cairá para < 70 MB após a conclusão da Etapa 5 com a remoção de `UserEmbedding_embedding_hnsw_idx` de 176 MB, atendendo com folga o teto de 150 MB)._

---

## 8. Fechamento (diurno, autorizado)

Em 2026-11-10 às 16:53 BRT (19:53 UTC), o dono autorizou expressamente uma exceção diurna para o fechamento definitivo da Etapa 4, com base na ausência de usuários simultâneos no sistema e em uma única conexão direta.

### 8.1 Pré-checagens Obrigatórias

- **`pg_stat_progress_vacuum`:** **0 linhas** (nenhum vacuum ou autovacuum concorrente em andamento).
- **Disk IO balance:** **99%** (verificado diretamente no painel de Observabilidade do Supabase, muito acima do limiar de 50%).
- **Disk usage (armazenamento ocupado):** **36%** (confirmando a redução de disco obtida com o DROP do índice antigo).

### 8.2 Métricas Antes do Fechamento

- **Tuplas (`BibleVerse`):**
  - `n_live_tup`: **186.476**
  - `n_dead_tup`: **59.361**
- **`reloptions` da `BibleVerse`:**
  - `autovacuum_enabled=false`
  - `autovacuum_vacuum_threshold=10000`
  - `autovacuum_vacuum_scale_factor=0.1`
  - `autovacuum_vacuum_cost_delay=40`
  - `autovacuum_vacuum_cost_limit=100`
- **Tamanhos físicos da tabela e índices:**
  - Tabela `BibleVerse`: **72 MB** (75.505.664 bytes)
  - `BibleVerse_embedding_bq_hnsw_idx`: **62 MB** (64.626.688 bytes)
  - `BibleVerse_text_fts_idx`: **37 MB** (38.477.824 bytes)
  - `BibleVerse_pkey`: **12 MB** (12.615.680 bytes)
  - `BibleVerse_translation_bookId_chapter_verse_key`: **11 MB** (11.288.576 bytes)
  - `BibleVerse_translation_idx`: **3.320 kB** (3.399.680 bytes)
  - `BibleVerse_bookId_chapter_idx`: **2.056 kB** (2.105.344 bytes)
  - `BibleVerse_embedding_pending_idx`: **768 kB** (786.432 bytes)
- **Tamanho total do banco de dados:** **1.929 MB** (2.022.935.699 bytes)

### 8.3 Execução do VACUUM e Reset do Autovacuum

1. **Configuração de Sessão:** `SET statement_timeout = '60min';` (exceção à regra 8 autorizada pelo dono para manutenção).
2. **Execução:**
   ```sql
   VACUUM (VERBOSE, ANALYZE) "BibleVerse";
   ```

   - **Duração:** **53,88 segundos (53.880 ms)**.
   - **Resumo do log VERBOSE emitido pelo PostgreSQL:**
     - `index scan needed: 3323 pages from table (36.05% of total) had 59361 dead item identifiers removed`
     - `pg_toast_141925`: `5876 pages had 23442 dead item identifiers removed`
     - `scanned 9217 of 9217 pages, containing 186476 live rows and 0 dead rows; 30000 rows in sample, 186476 estimated total rows`
3. **Reset das opções de autovacuum:**
   ```sql
   ALTER TABLE "BibleVerse" RESET (
     autovacuum_enabled,
     autovacuum_vacuum_threshold,
     autovacuum_vacuum_scale_factor,
     autovacuum_vacuum_cost_delay,
     autovacuum_vacuum_cost_limit
   );
   ```

### 8.4 Métricas Depois do Fechamento

- **Tuplas (`BibleVerse`):**
  - `n_live_tup`: **186.476**
  - `n_dead_tup`: **0** (eliminação completa das 59.361 linhas mortas)
  - `last_vacuum`: `2026-11-10T19:53:14.424Z`
- **`reloptions`:** **`null`** (tabela restaurada integralmente para as regras de autovacuum nativas do PostgreSQL).
- **Tamanhos físicos da tabela e índices:**
  - Tabela `BibleVerse`: **72 MB** (75.505.664 bytes)
  - `BibleVerse_embedding_bq_hnsw_idx`: **62 MB** (64.626.688 bytes)
  - Demais índices inalterados.
- **Tamanho total do banco de dados:** **1.929 MB** (2.022.960.275 bytes).

### 8.5 Duas Buscas de Produção com Palavras Novas

Executadas via HTTP contra o servidor de produção do Render (`https://theosphere.onrender.com/api/v1/search/verses`):

|  #  | Consulta                     | Tradução  | Tempo Total (s) | `vectorMs` (ms) | `keywordMs` (ms) | `vectorArm` | Qtd Resultados |
| :-: | :--------------------------- | :-------: | :-------------: | :-------------: | :--------------: | :---------: | :------------: |
|  1  | `estrela da manha reluzente` | _(geral)_ |     6,77 s      |  **6.277 ms**   |     1.428 ms     |    `ok`     |       5        |
|  2  | `aguas vivas do santuario`   | `BLIVRE`  |     3,79 s      |  **3.336 ms**   |      148 ms      |    `ok`     |       5        |

Ambas as buscas completaram com sucesso, `vectorArm: ok`, tempos vetoriais abaixo do teto de 8 s e sem qualquer recaída em timeout.

---

## 9. Próximos Passos Agendados

1. **Etapa 4 Concluída:** A limpeza de tabela, restauração de autovacuum e validação vetorial da `BibleVerse` estão 100% finalizadas e fechadas.
2. **Noite Seguinte (Janela Noturna, 00:00 às 06:00 BRT):**
   - Execução do script `backend/scripts/verificar-paridade-biblioteca.ts` (Etapa 3a / 5) para validação do acervo e posterior liberação da remoção de `book_chunk` em `UserEmbedding`.
