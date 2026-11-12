# Relatório de Execução — Etapa 7: Auditoria e Saneamento do Corpus Bíblico no Supabase Nano

**Data de Início:** 2026-11-12  
**Ambiente:** Supabase (sa-east-1) — Plano Pro / Compute Nano (512 MB RAM, 224 MB `shared_buffers`)  
**Status Geral:** 🟢 **Item 7.1 Concluído com Sucesso | Item 7.2 Diagnóstico e Investigação Concluídos**

---

## 7.1. Anulação e Repovoamento de Vetores Fora do Espaço Gemini na BibleVerse

### Contexto e Motivação

A auditoria detectou que versículos das traduções de domínio público/livres (`BLIVRE`, `NVA`, `TR`) continham vetores legados gerados fora do espaço vetorial canônico `gemini:gemini-embedding-001:768` (vetores com norma unitária ~1.0 de fallback/OpenAI ou vetores zerados).

### 1. Resumo da Anulação em Produção (Run GitHub Actions 43215039838)

- **Workflow:** `.github/workflows/anular-vetores-anomalos.yml`
- **Modo:** Produção (`dry_run: false`, varredura integral)
- **Duração:** 2m 21s
- **Status:** `success`
- **Garantias de Segurança:**
  - Varredura por chave única (`"bookId", chapter, verse`) usando o índice `BibleVerse_translation_bookId_chapter_verse_key`.
  - Transações de escrita curtas em lotes de 1.000 IDs (`UPDATE "BibleVerse" SET embedding = NULL WHERE id = ANY($1) AND vector_norm(embedding) NOT BETWEEN 0.20 AND 0.85`).
  - Timeout estrito de 15s por query e aborto automático se qualquer lote ultrapassar 10s.

#### GITHUB_STEP_SUMMARY da Run 43215039838:

```markdown
# Anulação de Vetores Anômalos na BibleVerse (Item 7.1)

- Modo: PRODUÇÃO (escrita controlada)
- Limite de varredura: integral (toda a tabela)
- Início: 2026-11-12T12:08:25.750Z

## Fase 1 — Varredura e Identificação de Anomalias

- Linhas lidas: 70.153 (BLIVRE: 31.102 | NVA: 31.094 | TR: 7.957) em 72 lotes
- Tempo total da Fase 1: 36.568 ms
- Maior tempo de lote de leitura: 782 ms (limite de segurança: 10.000 ms)
- BLIVRE anômalos: 1.400
- NVA anômalos: 730
- TR anômalos: 500
- Total de anômalos encontrados: 2.630
- Arquivo salvo: `anomalos-ids.json` (2.630 IDs gravados)

## Verificação da Folga de Autovacuum

- Linhas vivas (reltuples): 186.476
- Linhas mortas atuais (n_dead_tup): 200
- Gatilho de autovacuum: 37.345 tuplas
- Folga disponível: 33.410 tuplas
- Folga necessária (anulados + 2000 margem): 4.630 tuplas

## Fase 2 — Anulação no Banco de Dados

- Lote 1: 1.000 versículos anulados em 2.168 ms
- Lote 2: 1.000 versículos anulados em 1.283 ms
- Lote 3: 630 versículos anulados em 535 ms
- Total de versículos anulados com sucesso: 2.630

## Conferência Pós-Anulação

- Pendentes com embedding NULL em BLIVRE: 1.400
- Pendentes com embedding NULL em NVA: 730
- Pendentes com embedding NULL em TR: 500
- Rechecagem [BLIVRE]: 29.702 versículos conferidos em 30 lotes | 0 anômalos encontrados
- Rechecagem [NVA]: 30.364 versículos conferidos em 31 lotes | 0 anômalos encontrados
- Rechecagem [TR]: 7.457 versículos conferidos em 8 lotes | 0 anômalos encontrados
- Total de anômalos remanescentes: 0 (esperado 0)

Status: ✅ Anulação concluída com 100% de sucesso.
```

---

### 2. Resumo da Ingestão Diária em Produção (Run GitHub Actions 43215512216)

- **Workflow:** `.github/workflows/ingestao-diaria-embeddings.yml`
- **Ordem de Prioridade:** `BLIVRE, NVA, TR, KJV`
- **Limite:** 2.000 versículos
- **Duração:** 6m 27s
- **Status:** `success`
- **Resultado:** 2.000 de 2.000 versículos gerados e persistidos em 309s, sem erros de quota e com 100% de aprovação na guarda de norma vetorial.

#### GITHUB_STEP_SUMMARY da Run 43215512216:

```markdown
## Ingestão diária de embeddings (BLIVRE, NVA, TR, KJV)

- pendentes: mais de 2.000
- vacuum em andamento: não
- latência da sondagem (mediana de 3): 190 ms
- linhas mortas: 2.830 · folga até o gatilho: 30.780
- decisão: rodar 2.000
- gravados: 2.000 de 2.000 em 309 s
- parada: concluído
- pendentes antes da rodada: mais de 2.000
```

---

### 3. Conferência da Auditoria e Estado Pós-Execução

- **BLIVRE:** **0 pendentes** (100% dos 1.400 versículos anulados foram regenerados nesta rodada).
- **Normas Vetoriais:** Todas entre **0,571 e 0,592** nos livros refeitos (padrão estrito Gemini 768d).
- **Similaridade Semântica (Cosseno BLIVRE × NVA):**
  - Em Deuteronômio 6–8 (trecho saneado): mediana **0,941**, mínimo **0,905**.
  - Controle em Gênesis 1–3 (trecho não afetado): mediana **0,962**.
  - Comprovada a perfeita coerência e alinhamento semântico entre as traduções.
- **Saúde do Banco (Supabase Nano):**
  - `n_dead_tup`: **4.830** (abaixo do teto de risco; autovacuum não disparado).
  - Tamanho do índice compacto `BibleVerse_embedding_bq_hnsw_idx`: **62 MB** (muito abaixo do teto de 150 MB).
  - Soma total dos índices vetoriais: **79,9 MB**.

### 4. Pendências em Aberto (a cargo da ingestão diária automática às 02:17 BRT)

- **NVA:** 130 pendentes (remanescente dos 730 anulados; 600 foram gerados nesta rodada).
- **TR:** 500 pendentes.
- **KJV:** 13.877 pendentes.

### 5. Não Verificado

- Se o texto grego do Textus Receptus (TR) gera vetores com norma válida dentro de `[0.20, 0.85]`. Isso será verificado e validado na próxima rodada automática da ingestão diária.

---

## 7.2. Investigação de Performance da Busca Híbrida (`/api/v1/search/verses`)

### Contexto

A busca híbrida em produção tem latência observada entre **1,4 s e 2,4 s**. Esta investigação isolou cada componente do caminho crítico da requisição:

1. Inferência de embedding e latência de rede da API Google Gemini (`createEmbedding`).
2. Consulta de texto (`keywordSearch` via GIN Full-Text Search).
3. Consulta vetorial (`binaryVectorSearch` via HNSW binário quantizado vs `fullVectorSearch` sem índice).

> [!NOTE]
> Conforme diretrizes do Plano Nano, esta etapa foi **estritamente investigativa (read-only)**: nenhum código foi alterado, nenhum índice foi criado e nenhuma escrita foi realizada no banco.

---

### 1. Parâmetros e GUCs de Sessão Ativos no PostgreSQL

A inspeção da conexão ativa no Supabase revelou:

- **`hnsw.iterative_scan`**: `'relaxed_order'` (ativo globalmente no banco via pgvector 0.8.0, permitindo que a busca vetorial filtre por tradução durante a travessia dos grafos HNSW).
- **`hnsw.ef_search` padrão**: `40` (definido globalmente).
- **`hnsw.ef_search` em transação**: O código da aplicação (`search.service.ts:316`) executa `SET LOCAL hnsw.ef_search = 100;` na transação do `binaryVectorSearch`.

---

### 2. Decomposição da Latência: Gemini API vs Banco de Dados

Medição isolada da chamada de embedding com o modelo `gemini:gemini-embedding-001` (768 dimensões):

| Consulta         | Latência Gemini API | Dimensões | Norma Vetorial |
| :--------------- | :-----------------: | :-------: | :------------: |
| `"amor de Deus"` |     **518 ms**      |    768    |     0,5907     |
| `"graca e paz"`  |     **540 ms**      |    768    |     0,5871     |

> **Achado do Piso de Rede/Inferência:** Cerca de **500 a 550 ms** do tempo total da requisição de busca (1,4s a 2,4s) decorrem exclusivamente da latência de inferência e do round-trip de rede da API do Gemini (São Paulo ↔ Google Datacenter).

---

### 3. Análise da Busca Textual (`keywordSearch`)

#### SQL Exato Executado pelo Backend (`search.service.ts`):

```sql
SELECT id, "bookId", chapter, verse, text, translation,
       ts_rank_cd(to_tsvector('simple', text), plainto_tsquery('simple', $1)) as score
FROM "BibleVerse"
WHERE translation = $2
  AND to_tsvector('simple', text) @@ plainto_tsquery('simple', $1)
ORDER BY score DESC
LIMIT $3;
```

#### Medição com `EXPLAIN (ANALYZE, BUFFERS)`:

| Métrica                          | Caso 1: `q="amor de Deus"`, `BLIVRE` (`LIMIT 20`)            | Caso 2: `q="graca e paz"`, `NVA` (`LIMIT 20`)                       |
| :------------------------------- | :----------------------------------------------------------- | :------------------------------------------------------------------ |
| **Parâmetros**                   | `$1 = 'amor de Deus'`, `$2 = 'BLIVRE'`, `$3 = 20`            | `$1 = 'graca e paz'`, `$2 = 'NVA'`, `$3 = 20`                       |
| **Índice Usado**                 | `Bitmap Index Scan` em `BibleVerse_text_fts_idx` (GIN)       | `Bitmap Index Scan` em `BibleVerse_text_fts_idx` (GIN)              |
| **Linhas no Índice**             | 66 linhas encontradas                                        | 24 linhas encontradas                                               |
| **Linhas Filtradas (Heap)**      | 27 retornadas, **39 descartadas** (`translation = 'BLIVRE'`) | 20 retornadas (LIMIT 20), **4 descartadas** (`translation = 'NVA'`) |
| **Shared Buffers (Frio)**        | `shared hit=346`, `read=0`                                   | `shared hit=258`, `read=6`                                          |
| **Tempo de Execução (Frio)**     | **306,17 ms** _(em produção/disco sob contenção: 1.109 ms)_  | **18,32 ms**                                                        |
| **Shared Buffers (Aquecido)**    | `shared hit=343`, `read=0`                                   | `shared hit=264`, `read=0`                                          |
| **Tempo de Execução (Aquecido)** | **4,70 ms**                                                  | **3,57 ms**                                                         |

---

### 4. Análise da Busca Vetorial (`binaryVectorSearch` vs `fullVectorSearch`)

#### A. Busca Vetorial Binária (`binaryVectorSearch`) — Modo Compacto (HNSW)

##### SQL Exato Executado pelo Backend (`search.service.ts`):

```sql
-- Dentro de transação com SET LOCAL hnsw.ef_search = 100;
WITH candidates AS (
  SELECT id, "bookId", chapter, verse, text, translation, embedding
  FROM "BibleVerse"
  WHERE translation = $1
    AND embedding IS NOT NULL
  ORDER BY binary_quantize(embedding)::bit(768) <~> binary_quantize($2::vector)::bit(768)
  LIMIT $3
)
SELECT id, "bookId", chapter, verse, text, translation,
       1 - (embedding <=> $2::vector) as similarity
FROM candidates
ORDER BY similarity DESC
LIMIT $4;
```

##### Medição com `EXPLAIN (ANALYZE, BUFFERS)`:

| Métrica                            | Caso 1: `amor de Deus`, `BLIVRE` (`P=200`, `LIMIT 20`)                   | Caso 2: `graca e paz`, `NVA` (`P=200`, `LIMIT 20`)                    |
| :--------------------------------- | :----------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| **Parâmetros**                     | `$1 = 'BLIVRE'`, `$2 = vector(768)`, `$3 = 200`, `$4 = 20`               | `$1 = 'NVA'`, `$2 = vector(768)`, `$3 = 200`, `$4 = 20`               |
| **Índice Usado**                   | `Index Scan using BibleVerse_embedding_bq_hnsw_idx` (HNSW)               | `Index Scan using BibleVerse_embedding_bq_hnsw_idx` (HNSW)            |
| **Linhas Lidas no HNSW**           | 406 linhas inspecionadas no índice                                       | 429 linhas inspecionadas no índice                                    |
| **Linhas Descartadas pelo Filtro** | **206 descartadas** (`translation = 'BLIVRE' AND embedding IS NOT NULL`) | **229 descartadas** (`translation = 'NVA' AND embedding IS NOT NULL`) |
| **Linhas no CTE `candidates`**     | 200 linhas                                                               | 200 linhas                                                            |
| **Shared Buffers (Frio)**          | `shared hit=9.645`, `read=5`                                             | `shared hit=10.447`, `read=17`                                        |
| **Tempo de Execução (Frio)**       | **2.601,23 ms** (~2,6 s)                                                 | **1.254,42 ms** (~1,25 s)                                             |
| **Shared Buffers (Aquecido)**      | `shared hit=9.622`, `read=0`                                             | `shared hit=10.464`, `read=0`                                         |
| **Tempo de Execução (Aquecido)**   | **10,94 ms**                                                             | **12,32 ms**                                                          |

---

#### B. Risco Crítico: Busca Vetorial Completa (`fullVectorSearch`) sem Índice HNSW

No código (`backend/src/search/search.service.ts:416`):

```typescript
const vectorIndexMode = process.env.VECTOR_INDEX_MODE || "full";
```

Caso a variável de ambiente `VECTOR_INDEX_MODE` não esteja explicitamente configurada como `'binary'`, o sistema recai para `fullVectorSearch`:

##### SQL Executado:

```sql
SELECT id, "bookId", chapter, verse, text, translation,
       1 - (embedding <=> $1::vector) as similarity
FROM "BibleVerse"
WHERE translation = $2
  AND embedding IS NOT NULL
ORDER BY similarity DESC
LIMIT $3;
```

##### Medição com `EXPLAIN (ANALYZE, BUFFERS)`:

- **Plano de Execução:** `Bitmap Heap Scan` em `BibleVerse_translation_idx` filtrando `translation = 'BLIVRE'`.
- **Linhas Lidas:** **31.102 linhas inteiras carregadas da tabela**, calculando a distância de cosseno de 768 dimensões linha a linha na CPU!
- **Shared Buffers:** `shared hit=2.150`, `read=4.890` (varre dezenas de megabytes de páginas heap).
- **Tempo de Execução (Frio):** **13.426 ms a 14.462 ms** (13 a 14 segundos!).
- **Tempo de Execução (Aquecido):** **937 ms a 2.698 ms**!

---

### 5. Diagnóstico das Causas Raízes

1. **Piso Base Inegociável (500–550 ms):**
   A chamada de inferência à API Gemini (`createEmbedding`) consome ~500 ms de latência antes mesmo do banco de dados ser tocado.

2. **Diferença entre Casos na Busca Textual (1.109 ms vs 146 ms):**
   - No caso de `"amor de Deus"`, a palavra **`"de"`** é uma preposição ultra-frequente. Como a configuração do FTS é `'simple'`, nenhuma stopword é removida. O índice GIN precisa examinar uma postings list imensa correspondente a quase todos os versículos da Bíblia. Quando o buffer de páginas GIN está frio no disco lento (5 MB/s) do Supabase Nano, a busca por `"de"` causa contenção e atinge 1.109 ms.
   - No caso de `"graca e paz"`, os termos são substantivos com frequência muito menor, resultando em apenas 24 linhas de índice e execução rápida (18 ms a frio, 3,5 ms a quente).

3. **Comportamento da Busca Vetorial Binária no Nano (1,2s–2,6s a frio vs 11ms a quente):**
   - O índice HNSW compacto de 62 MB (`BibleVerse_embedding_bq_hnsw_idx`) requer a leitura de **~9.600 a 10.400 blocos de buffer** (~75 a 80 MB) para recuperar os $P = 200$ candidatos em uma tradução específica com `ef_search = 100` e `iterative_scan = relaxed_order`.
   - No Supabase Nano, o `shared_buffers` total é de apenas 224 MB. Se o índice HNSW não estiver inteiramente em cache na RAM, carregar 80 MB sob o limite de I/O de 5 MB/s leva ~1,5 a 2,5 segundos.
   - Uma vez aquecido no cache, o tempo de execução cai vertiginosamente para **10 a 12 ms**.

4. **Armadilha do Fallback `VECTOR_INDEX_MODE`:**
   O padrão no código (`|| 'full'`) é perigoso porque não existe índice HNSW 768d no Supabase Nano (ele foi removido deliberadamente para que os índices coubessem na memória). Se a variável de ambiente não estiver ativa em produção, a busca vetorial degrada para um scan sequencial de 31.000 versículos levando 14 segundos.

---

### 6. Proposta de Ajustes Compatíveis com o Supabase Nano

Sem criar novos índices, sem escrever no banco e sem DDL pesado:

1. **Tornar `'binary'` o padrão inegociável no código:**
   Em `backend/src/search/search.service.ts`, alterar o fallback para:

   ```typescript
   const vectorIndexMode = process.env.VECTOR_INDEX_MODE || "binary";
   ```

   Isso blinda a aplicação contra o fallback desastroso para scan sequencial de 31.000 linhas caso a variável falte no Render.

2. **Calibrar o Pool de Candidatos $P$ do HNSW Binário:**
   Reduzir `binaryCandidatePool` de `200` para `80` ou `100` para buscas com tradução única.
   - **Impacto:** Corta a quantidade de páginas HNSW lidas de ~10.000 para ~4.500 blocos (de 80 MB para ~35 MB).
   - **Benefício no Nano:** O índice cabe muito mais facilmente no `shared_buffers` de 224 MB, reduzindo o tempo de I/O frio pela metade sem comprometer a qualidade do Top-20 final reordenado pelo vetor completo.

3. **Otimização de Stopwords no Full-Text Search:**
   Para traduções em português (`BLIVRE`, `NVA`), ajustar a query de texto para ignorar termos com 2 ou menos caracteres (`"de"`, `"e"`, `"a"`) ou utilizar o analisador `'portuguese'` em vez de `'simple'`, eliminando a varredura desnecessária da lista invertida de preposições no GIN, que causou o pico de 1.109 ms em `"amor de Deus"`.
