# Relatório de Execução — Etapa 7: Auditoria e Saneamento do Corpus Bíblico no Supabase Nano

**Data de Início:** 2026-11-12  
**Ambiente:** Supabase (sa-east-1) — Plano Pro / Compute Nano (512 MB RAM, 224 MB `shared_buffers`)  
**Status Geral:** 🟢 **Item 7.1 Concluído com Sucesso | Item 7.2 Diagnóstico Concluído | Item 7.3 Correções e Medições Concluídas**

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

1. Inferência de embedding e latência de rede da API Google Gemini (`createEmbedding`). O tempo medido em `vectorMs` inclui tanto o roundtrip da API do Gemini (cerca de 0,5 s) quanto a execução no banco.
2. Consulta de texto (`keywordSearch` via GIN Full-Text Search).
3. Consulta vetorial (`binaryVectorSearch` via HNSW binário quantizado vs `fullVectorSearch` sem índice).

> [!NOTE]
> Conforme diretrizes do Plano Nano, esta etapa foi **estritamente investigativa (read-only)**: nenhum índice foi criado e nenhuma escrita foi realizada no banco de dados.

---

### 1. Parâmetros e GUCs de Sessão Ativos no PostgreSQL

A inspeção da conexão ativa no Supabase revelou:

- **`hnsw.iterative_scan`**: `'relaxed_order'` (ativo globalmente no banco via pgvector 0.8.0, permitindo que a busca vetorial filtre por tradução durante a travessia dos grafos HNSW).
- **`hnsw.ef_search` em execução**: O código calcula `computeEfSearch(P)` onde $P = \max(200, \text{poolSize})$. Com $P = 200$, `computeEfSearch(200)` resulta em **`ef_search = 200`** aplicado via `SET LOCAL hnsw.ef_search = 200;` na transação do `binaryVectorSearch`.

---

### 2. Decomposição da Latência: Gemini API vs Banco de Dados

Medição isolada da chamada de embedding com o modelo `gemini:gemini-embedding-001` (768 dimensões):

| Consulta         | Latência Gemini API | Dimensões | Norma Vetorial |
| :--------------- | :-----------------: | :-------: | :------------: |
| `"amor de Deus"` |     **518 ms**      |    768    |     0,5907     |
| `"graca e paz"`  |     **540 ms**      |    768    |     0,5871     |

> **Achado do Piso de Rede/Inferência:** Cerca de **0,5 s** do tempo total da requisição e do `vectorMs` decorrem exclusivamente da latência de inferência e do round-trip de rede da API do Gemini (São Paulo ↔ Google Datacenter).

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

| Métrica                          | Caso 1: `q="amor de Deus"`, `BLIVRE` (`LIMIT 20`)      | Caso 2: `q="graca e paz"`, `NVA` (`LIMIT 20`)                          |
| :------------------------------- | :----------------------------------------------------- | :--------------------------------------------------------------------- |
| **Parâmetros**                   | `$1 = 'amor de Deus'`, `$2 = 'BLIVRE'`, `$3 = 20`      | `$1 = 'graca e paz'`, `$2 = 'NVA'`, `$3 = 20`                          |
| **Índice Usado**                 | `Bitmap Index Scan` em `BibleVerse_text_fts_idx` (GIN) | `Bitmap Index Scan` em `BibleVerse_text_fts_idx` (GIN)                 |
| **Linhas no Índice GIN**         | 66 linhas encontradas                                  | 0 linhas encontradas                                                   |
| **Linhas Retornadas**            | 27 retornadas, 39 descartadas por filtro de tradução   | **0 linhas retornadas** (o texto da NVA contém `"graça"`, com cedilha) |
| **Shared Buffers (Frio)**        | `shared hit=187`, `read=159`                           | `shared hit=258`, `read=6`                                             |
| **Tempo de Execução (Frio)**     | **233 ms**                                             | **18,32 ms**                                                           |
| **Shared Buffers (Aquecido)**    | `shared hit=343`, `read=0`                             | `shared hit=264`, `read=0`                                             |
| **Tempo de Execução (Aquecido)** | **4,8 ms**                                             | **3,57 ms**                                                            |

> **Causa do Comportamento Textual:**
>
> 1. `"amor de Deus"` a frio levou 233 ms com `read=159` blocos do disco porque o dicionário `'simple'` não remove a stopword `"de"`, obrigando o GIN a ler listas invertidas longas. A quente, responde em 4,8 ms.
> 2. `"graca e paz"` na NVA devolve **0 linhas** na busca textual porque a consulta foi feita sem acento (`"graca"`), enquanto o texto bíblico está grafado com `"graça"`. A configuração atual `'simple'` faz matching exato de caracteres e **não ignora acentos**.

---

### 4. Análise da Busca Vetorial (`binaryVectorSearch` vs `fullVectorSearch`)

#### A. Busca Vetorial Binária Real (`binaryVectorSearch`) — Modo Compacto (HNSW)

##### SQL Exato Executado:

```sql
-- Dentro de transação com SET LOCAL hnsw.ef_search = 200;
WITH candidatos AS (
  SELECT id, "bookId", chapter, verse, translation, text, embedding
  FROM "BibleVerse"
  WHERE embedding IS NOT NULL
    AND ($1::text IS NULL OR translation = $1)
  ORDER BY binary_quantize(embedding)::bit(768) <~> binary_quantize($2::vector)::bit(768)
  LIMIT $3
)
SELECT id, "bookId", chapter, verse, translation, text,
       (embedding <=> $2::vector) AS distance
FROM candidatos
ORDER BY distance
LIMIT $4;
```

##### Medição com `EXPLAIN (ANALYZE, BUFFERS)`:

| Métrica                          | Caso 1: `amor de Deus`, `BLIVRE` (`P=200`, `LIMIT 20`)     | Caso 2: `graca e paz`, `NVA` (`P=200`, `LIMIT 20`)         |
| :------------------------------- | :--------------------------------------------------------- | :--------------------------------------------------------- |
| **Parâmetros**                   | `$1 = 'BLIVRE'`, `$2 = vector(768)`, `$3 = 200`, `$4 = 20` | `$1 = 'NVA'`, `$2 = vector(768)`, `$3 = 200`, `$4 = 20`    |
| **Índice Usado**                 | `Index Scan using BibleVerse_embedding_bq_hnsw_idx` (HNSW) | `Index Scan using BibleVerse_embedding_bq_hnsw_idx` (HNSW) |
| **Shared Buffers (Frio)**        | `read=1296`                                                | `read=455`                                                 |
| **Tempo de Execução (Frio)**     | **3.479 ms** (~3,5 s)                                      | **1.390 ms** (~1,4 s)                                      |
| **Shared Buffers (Aquecido)**    | `read=0`                                                   | `read=0`                                                   |
| **Tempo de Execução (Aquecido)** | **10,9 ms**                                                | **10,3 ms**                                                |

> **Causa Raiz da Latência a Frio na Busca Vetorial:**
> A lentidão a frio decorre da **leitura aleatória de páginas fora do cache** do PostgreSQL (`shared_buffers`), com custo medido de cerca de **2,7 ms por página lida do disco** (ex.: $1.296 \text{ leituras} \times 2,7 \text{ ms} \approx 3,5 \text{ s}$). Não se trata de saturação da taxa contínua de transferência de disco (5 MB/s), mas do tempo de busca e acesso aleatório para carregar páginas esparsas do grafo HNSW na memória. Uma vez carregado no cache (`read=0`), o tempo de execução cai para **10,3 a 10,9 ms**.

---

#### B. Risco Crítico Sanado: Queda Calada para `fullVectorSearch`

Antes da correção, quando `VECTOR_INDEX_MODE` não estava configurado ou se `binaryVectorSearch` falhasse, o código caía silenciosamente no bloco `catch` e executava `fullVectorSearch`:

##### SQL do `fullVectorSearch`:

```sql
SELECT id, "bookId", chapter, verse, text, translation,
       1 - (embedding <=> $1::vector) as similarity
FROM "BibleVerse"
WHERE translation = $2
  AND embedding IS NOT NULL
ORDER BY similarity DESC
LIMIT $3;
```

- **Plano de Execução:** `Bitmap Heap Scan` em `BibleVerse_translation_idx`.
- **Linhas Lidas:** **31.102 linhas inteiras carregadas da tabela**, calculando a distância de cosseno de 768 dimensões linha a linha na CPU.
- **Tempo Medido:** **13.426 ms a 14.462 ms** (13 a 14 segundos a frio) e **937 ms a 2.698 ms** a quente.
- **Correção Implementada:**
  1. O padrão no código foi alterado para `const mode = process.env.VECTOR_INDEX_MODE || 'binary';`.
  2. A queda silenciosa (`try/catch` engolindo erro de `binaryVectorSearch`) foi eliminada. Se o braço vetorial falhar, o erro propaga para `hybridSearchVerses`, que marca `vectorArm: 'failed'` e devolve os resultados da palavra-chave imediatamente, sem disparar scan sequencial de 31 mil versículos. `fullVectorSearch` só é acionado com `VECTOR_INDEX_MODE=full` explícito.

---

### 5. Pendências Registradas (sem implementação nesta etapa)

As pendências identificadas não devem ser implementadas de imediato e ficam registradas para execução planejada:

#### Pendência A — Tratamento de Acentos no Full-Text Search

A busca textual atual com dicionário `'simple'` falha quando o usuário pesquisa termos sem acento (ex.: `"graca"` não encontra `"graça"`).

- **Ação:** Recriar o índice `BibleVerse_text_fts_idx` utilizando `unaccent` ou dicionário `'portuguese'`.
- **Regra:** **Exige DDL**. Deve ser executado à noite com `CREATE INDEX CONCURRENTLY "BibleVerse_text_fts_unaccent_idx" ...`.
- **Estimativa no Nano:**
  - Tamanho atual do índice GIN: **37 MB** (38.477.824 bytes para 186.476 linhas).
  - O novo índice consumirá aproximadamente **35 a 40 MB** adicionais em disco durante a criação concorrente.
  - Tempo estimado no Nano (com `maintenance_work_mem = 32 MB`): **45 a 90 segundos**.
  - O índice antigo (`BibleVerse_text_fts_idx`) deve ser mantido intacto até o novo índice estar 100% criado e validado em produção.

#### Pendência B — Calibração de $P$ e $ef\_search = 100$

Avaliar a redução de $P$ (atualmente 200) e $ef\_search$ para 100, visando diminuir pela metade a leitura de páginas aleatórias a frio no HNSW.

- **Regra:** Só pode ser adotada após medição à noite do recall do Top-20 contra o cosseno exato (ground truth), utilizando uma bateria de teste com **30 perguntas reais**.

#### Pendência C — Extensões de Memória e Monitoramento do Cache

Inspeção executada no PostgreSQL Supabase via `pg_available_extensions` para `pg_buffercache` e `pg_prewarm` (estritamente leitura, sem instalar nada):

- `pg_buffercache`: disponível (versão 1.5), porém **não instalada** (`installed_version: null`).
- `pg_prewarm`: disponível (versão 1.2), porém **não instalada** (`installed_version: null`).
- Como a extensão `pg_buffercache` não está instalada no banco, não é possível inspecionar o número de páginas exatas do índice `BibleVerse_embedding_bq_hnsw_idx` atualmente residentes no `shared_buffers`. Nenhuma extensão foi instalada.

---

## 7.3. Correções de Código e Medições Arquiteturais

Conforme o planejamento, esta etapa foi dividida em três grupos de código isolados em branches próprias, com testes unitários, testes de mutação, validação completa da suíte (`npm run verificar`) e verificação estática (`node audit/scripts/static-checks.mjs`), além de 4 diagnósticos arquiteturais e de segurança em consultas de estrita leitura (`statement_timeout = 15s`).

---

### Grupo 1: Eliminação de Busca Dupla e Contagem de Documentos no RAG

- **Branch:** `fix/rag-biblioteca-contagem`
- **Commit:** `0d1c097` (`fix(rag): eliminate double searchDriveLibrary call and include library docs in contextDocCount`)

#### 1. Problemas Identificados

1. **Busca Dupla na Biblioteca Clássica:** A cada pergunta submetida ao chat (`RagService.chat`), a função `searchDriveLibrary` era invocada duas vezes:
   - Primeiro em `tentarRespostaDaBiblioteca` (passo 1.2), para avaliar se a biblioteca atendia a pergunta de imediato;
   - Segundo em `buildDriveLibraryContext` (passo 1.55), para montar o bloco de contexto para o modelo gerador quando a tentativa direta não respondia.
     Isso duplicava chamadas vetoriais, parsing e consultas SQL ao banco de dados Supabase Nano a cada requisição do chat.
2. **Subcontagem de Documentos de Contexto:** `contextDocCount` (linha 609 de `rag.service.ts`) apenas contava blocos `[Documento ...]`, correspondentes às notas e destaques do contexto pessoal do usuário. Quando a resposta utilizava exclusivamente trechos da biblioteca de obras clássicas (`[Obra: ...]`), `contextDocCount` permanecia `0` e `contextUsed` era falsamente reportado como `false`, impedindo o frontend de indicar que fontes clássicas foram consumidas na resposta.

#### 2. Solução Implementada

1. No método `RagService.chat`:
   - No passo 1.2, pré-carrega os chunks da biblioteca:
     `const preloadedLibraryHits = await this.driveRagService.searchDriveLibrary(prompt, 3, libraryFilter).catch(() => []);`
   - Repassa `preloadedLibraryHits` para `tentarRespostaDaBiblioteca(prompt, libraryFilter, preloadedLibraryHits)`;
   - Caso não haja resposta direta, no passo 1.55 repassa `preloadedLibraryHits` para `buildDriveLibraryContext(prompt, libraryFilter, preloadedLibraryHits)`, eliminando a segunda busca vetorial e SQL.
2. No cálculo de `contextDocCount` (em `chat` e `chatStream`):
   - Extrai e soma as citações de obras da biblioteca clássica:
     ```typescript
     const personalDocCount = (contextText.match(/\[Documento \d+\]/g) || [])
       .length;
     const libraryDocCount = (contextText.match(/\[Obra: [^\]]+\]/g) || [])
       .length;
     const contextDocCount = personalDocCount + libraryDocCount;
     const contextUsed = contextDocCount > 0;
     ```

#### 3. Testes Adicionados

Arquivo: `backend/src/rag/rag.service.spec.ts`

- `um chat com acerto na biblioteca chama searchDriveLibrary uma vez (reaproveitamento sem busca dupla)`:
  - Valida via `jest.spyOn(userContext, 'searchDriveLibrary')` que a função é invocada exatamente 1 vez (`toHaveBeenCalledTimes(1)`).
- `resposta com 2 trechos da biblioteca e nenhuma nota resulta em contextUsed: true e contextDocCount: 2`:
  - Valida que `contextUsed` é `true` e `contextDocCount` é `2` quando apenas a biblioteca fornece contexto.

#### 4. Testes de Mutação

- **Mutação 1 (Reintrodução da busca dupla):**
  - Mutação: omitir `preloadedLibraryHits` em `buildDriveLibraryContext(prompt, libraryFilter)`.
  - Resultado: `expect(searchSpy).toHaveBeenCalledTimes(1)` **falhou com exit code 1** (recebeu 2 chamadas).
- **Mutação 2 (Omissão da contagem da biblioteca):**
  - Mutação: manter `const contextDocCount = personalDocCount;`.
  - Resultado: `expect(res.contextUsed).toBe(true)` e `expect(res.contextDocCount).toBe(2)` **falharam com exit code 1** (recebeu `false` e `0`).

#### 5. Verificação da Suíte

- `npm run verificar`: 62 test suites, 620 testes passando, 0 erros TypeScript, 0 advertências de linter.
- `node audit/scripts/static-checks.mjs`: 0 erros encontrados.

---

### Grupo 2: Filtro de Índice Remissivo no Passage Guide

- **Branch:** `fix/passage-guide-indice-remissivo`
- **Commit:** `c1b2e93` (`fix(passage-guide): restore bracket ratio filter to discard pure index chunks`)

#### 1. Problema Identificado e Medição Inicial (Item 3)

Durante a migração para a tabela `ResourceReference` no commit `52bfb40`, o filtro de proporção de colchetes (`bracketCount >= 5`) que descartava páginas de índice remissivo puro havia sido perdido.
Como consequência, capítulos densamente referenciados recebiam tabelas de referências cruzadas ou sumários de versículos em vez de comentários exegéticos.

##### Medição Empírica (Item 3) no Banco Supabase:

A consulta de comentários exegéticos foi executada para 3 passagens canônicas (`Jo 3:16`, `Rm 8:28` e `Sl 23:1`), avaliando a presença de colchetes de citação (`[\d+]`) nos candidatos devolvidos:

| Passagem Canônica | Candidatos Devolvidos | Índices Remissivos Puros ($\ge 5$ colchetes) | Impacto no Top-4 sem o Filtro                                                                                                                                                                 |
| :---------------- | :-------------------: | :------------------------------------------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Jo 3:16**       |          10           |                    **0**                     | Nenhum (todos exegéticos)                                                                                                                                                                     |
| **Rm 8:28**       |          10           |                    **5**                     | **Crítico**: Os **4 primeiros candidatos** devolvidos eram índices remissivos de Agostinho (`[1]` com 26 colchetes, `[2]` com 39 colchetes, `[3]` com 99 colchetes e `[4]` com 40 colchetes). |
| **Sl 23:1**       |          10           |                    **0**                     | Nenhum (todos exegéticos)                                                                                                                                                                     |

> **Evidência do Defeito:** Para `Rm 8:28`, sem o filtro, o usuário recebia listas brutas de Agostinho contendo dezenas de marcações de versículos como `[1] [2] [3]...` em vez de análise bíblica.

#### 2. Solução Implementada

1. No arquivo `backend/src/bible/passage-guide.service.ts`:
   - Restaurado o filtro de colchetes em `getClassicCommentaries`:
     ```typescript
     const bracketCount = (r.content.match(/\[\d+\]/g) || []).length;
     if (bracketCount >= 5) return false;
     ```
   - Aplicado tanto nos candidatos recuperados via `ResourcesService.findReferences` quanto nos registros recuperados via consulta direta em `ResourceReference`.
   - Ampliado o pool bruto de consulta em `findReferences` de `limit` para `limit * 2` (10 itens), garantindo que após o descarte de índices ainda tenhamos 5 comentários exegéticos reais.
2. Com o filtro restaurado, para `Rm 8:28` os 4 trechos de índice puro de Agostinho são descartados e emergem os comentários reais de João Calvino (_Institutas da Religião Cristã_ Vol. II, _Comentário a Gênesis_, _Comentário a Jeremias_).

#### 3. Testes Adicionados

Arquivo: `backend/src/bible/passage-guide.service.spec.ts`

- `filtra índices remissivos puros (trechos com 5 ou mais [n]) e preserva comentários exegéticos reais`:
  - Valida que um chunk com 5 citações `[1]...[5]` é filtrado enquanto o comentário com 1 citação é preservado.
- `filtra índices remissivos puros via ResourcesService quando há 5 ou mais [n]`:
  - Valida o fluxo de `ResourcesService.findReferences` filtrando índices densos e mantendo o limite solicitado.

#### 4. Testes de Mutação

- **Mutação (Remoção do filtro de colchetes):**
  - Mutação: comentar a verificação de `bracketCount >= 5` em `passage-guide.service.ts`.
  - Resultado: `expect(g.commentaries).toHaveLength(1)` **falhou com exit code 1** (recebeu comprimento 2, mantendo o trecho anômalo).

#### 5. Verificação da Suíte

- `npm run verificar`: 62 test suites, 620 testes passando, 0 erros TypeScript, 0 advertências de linter.
- `node audit/scripts/static-checks.mjs`: 0 erros encontrados.

---

### Grupo 3: Remoção de Código Morto da Ingestão

- **Branch:** `chore/remover-codigo-morto-ingestao`
- **Commit:** `938ce74` (`chore(rag): remove dead sortVersesByTargetList helper and spec`)

#### 1. Contexto e Motivação

Na Etapa 7.1, a ordenação das traduções na ingestão diária (`ingestao-diaria-embeddings.ts`) foi delegada diretamente ao banco de dados via SQL:
`ORDER BY array_position(${targets}::text[], translation), "bookId", chapter, verse`
Com isso, a função em memória `sortVersesByTargetList` definida em `daily-embedding-budget.ts` tornou-se código morto não referenciado por nenhum módulo de produção.

#### 2. Solução Implementada

1. Removida a exportação da função `sortVersesByTargetList` de `backend/src/rag/daily-embedding-budget.ts` (39 linhas eliminadas).
2. Removido o teste unitário isolado em `backend/src/rag/daily-embedding-budget.spec.ts` (20 linhas eliminadas).
3. Preservado o teste de regressão em `backend/scripts/ingestao-diaria-embeddings.spec.ts` que garante a ordenação da query SQL via `array_position(...)` em vez da ordenação alfabética legada.

#### 3. Verificação da Suíte

- `npm run verificar`: 62 test suites, 617 testes passando, 0 erros TypeScript, 0 advertências de linter.
- `node audit/scripts/static-checks.mjs`: 0 erros encontrados.

---

### Diagnóstico 5: Conexão TLS do Pool do Prisma e `sslmode` no Render (Item 5)

#### 1. Inspeção no Banco de Dados Supabase (Leitura Estrita)

Executada consulta nas visões de estatísticas do PostgreSQL:

```sql
SELECT s.ssl, a.application_name, count(*)
FROM pg_stat_ssl s
JOIN pg_stat_activity a USING (pid)
WHERE a.datname = current_database()
GROUP BY 1, 2;
```

##### Resultado Obtido:

- Todas as conexões externas ativas reportam **`ssl: true`** (criptografia TLS v1.3 negociada automaticamente pela camada de rede do Supavisor / PostgreSQL).

#### 2. Análise de Configuração no Backend

- Inspecionados os arquivos de configuração de ambiente (`backend/.env` e `.env.example`).
- A `DATABASE_URL` (porta 6543 do pooler) e a `DIRECT_URL` (porta 5432) contêm os parâmetros do pool (`pgbouncer=true&connection_limit=20`), mas **não contêm o parâmetro `sslmode=require`**.
- O driver pg/Prisma estabelece TLS por padrão em conexões com hosts Supabase remotos, mas a falta de `sslmode=require` explícito nas variáveis de ambiente do Render e do repositório permite que o cliente aceite conexões não seguras em caso de falha de negociação.

#### 3. Recomendação

- Adicionar explicitamente `&sslmode=require` nas variáveis `DATABASE_URL` e `DIRECT_URL` nas configurações do Render e na documentação de ambiente.

---

### Diagnóstico 6: Gravação de `library_book` em `UserEmbedding` (Item 6)

#### 1. Localização no Código e Gatilhos de Invocação

A inserção de registros com `type: 'library_book'` em `UserEmbedding` ocorre em:

- `backend/src/rag/drive-rag.service.ts`:
  - Linha 330: método `ingestDocument` (gravação por chunk de livro).
  - Linha 644: método `ingestExternalBook` (processamento de ePub/PDF).
- **Gatilhos que acionam esse código:**
  - Endpoint `POST /api/v1/drive-library/ingest`
  - Endpoint `POST /api/v1/drive-library/ingest-url`
  - Cron job diário `handleDailySync` em `DriveRagService`
  - Scripts legados `backend/scripts/full-rag-bootstrap.ts` e `backend/scripts/trigger-ingest.ts`.

#### 2. Risco Crítico no Supabase Nano

- Na Etapa 5 do Plano Nano, a tabela `UserEmbedding` foi saneada de ~45.000 chunks duplicados de livros para apenas 30 linhas de anotações e destaques do usuário (**152 kB** no total).
- Se os endpoints de ingestão do `DriveRagService` forem executados, até **45.000 novos chunks de 768 dimensões** seriam inseridos em `UserEmbedding`.
- Isso reinflaria a tabela para ~250–350 MB, ultrapassaria o teto de 150 MB de índices vetoriais do Plano Nano, esgotaria os 512 MB de RAM do compute e deflagraria autovacuums prolongados com saturação de I/O de disco.

#### 3. Proposta de Arquitetura

1. Depreciar definitivamente o tipo `'library_book'` na tabela `UserEmbedding`.
2. Redirecionar todo o pipeline de livros e documentos institucionais para as tabelas `Resource` e `ResourceChunk`, que já operam com:
   - Índice vetorial compacto binário HNSW bit(768) de apenas **17 MB** (`ResourceChunk_embedding_bq_hnsw_idx`);
   - Mapeamento estruturado de referências canônicas (`ResourceReference`);
   - Chave de unicidade e isolamento de catálogo.
3. Manter `UserEmbedding` estritamente para dados pessoais voláteis do usuário (`type = 'note' | 'highlight'`).

---

### Diagnóstico 7: Avaliação dos Trechos Fixos de Calvino e Henry (Item 7)

#### 1. Contexto do Código

Em `backend/src/rag/rag-context-builder.service.ts` (linhas 373-384), a função `searchCommentaries` busca comentários clássicos de Calvino e Matthew Henry com base em referências canônicas e em uma pontuação textual baseada em palavras-chave. Qualquer comentário com `score >= 1` é incluído no contexto do prompt do LLM.

#### 2. Medição com 10 Perguntas (Simulação Isolada sem Chamada ao Gemini)

##### A. 5 Perguntas Teológicas / Exegéticas:

1. _"Qual o significado de João 3:16?"_
   - Resultado: Calvino sobre João e Henry sobre João incluídos (score 16). Relevância: **Alta**.
2. _"Como Paulo explica a justificação pela fé em Romanos?"_
   - Resultado: Calvino sobre Romanos incluído (score 8). Relevância: **Alta**.
3. _"O que significa a soberania de Deus no sofrimento em Jó?"_
   - Resultado: Calvino/Henry incluídos (score 4). Relevância: **Boa**.
4. _"Explique o Salmo 23 e o Bom Pastor"_
   - Resultado: Calvino sobre Salmos incluído (score 6). Relevância: **Alta**.
5. _"Qual a relação entre aliança e lei no Pentateuco?"_
   - Resultado: Calvino sobre Deuteronômio incluído (score 2). Relevância: **Moderada/Média**.

##### B. 5 Perguntas Não-Teológicas (Históricas / Geográficas / Culturais):

1. _"Qual a distância de Jerusalém a Belém?"_
   - Resultado: Calvino sobre João retornado (score 1 por coincidir a palavra "Jerusalém"). Relevância: **Zero / Ruído puro**.
2. _"Quantos habitantes tinha a cidade de Roma no século I?"_
   - Resultado: Calvino sobre Romanos retornado (score 2 por coincidir "Roma"). Relevância: **Zero / Ruído puro**.
3. _"Qual era a moeda usada na província da Judeia sob o domínio romano?"_
   - Resultado: Matthew Henry e Calvino retornados (score 1 por coincidir "Judeia"). Relevância: **Zero / Ruído puro**.
4. _"Como era a agricultura e a colheita da cevada na Galileia antiga?"_
   - Resultado: Nenhum comentário retornado (score 0). Relevância: **Correto**.
5. _"Quem era o imperador romano quando Jesus nasceu?"_
   - Resultado: Nenhum comentário retornado (score 0). Relevância: **Correto**.

#### 3. Conclusão e Proposta

- Em **3 das 5 perguntas não-teológicas (60%)**, o builder injetou comentários teológicos clássicos irrelevantes no contexto da IA apenas pela presença incidental de topônimos como "Jerusalém" ou "Roma".
- **Proposta:**
  1. Elevar o limiar de inclusão de comentários heurísticos de `score >= 1` para `score >= 3`.
  2. Exigir que a pontuação provenha de menção canônica explícita (`bookId` / capítulo) ou casamento de múltiplos termos contextuais para evitar a poluição do contexto do modelo gerador com teologia sistemática em perguntas puramente históricas ou geográficas.

---

### O que NÃO Foi Verificado e Por Quê

1. **Deploy em Produção dos Grupos 1, 2 e 3:** O código foi mantido nas respectivas branches (`fix/rag-biblioteca-contagem`, `fix/passage-guide-indice-remissivo`, `chore/remover-codigo-morto-ingestao`) e testado integralmente em ambiente local/CI; os merges para a `main` e o deploy no Render dependem da autorização do mantenedor.
2. **Execução em Produção do `sslmode=require`:** A alteração de variáveis de ambiente no Render não foi realizada, pois exige acesso administrativo ao painel do Render.
3. **Refatoração do `DriveRagService` para `Resource`:** A migração da gravação de livros de `UserEmbedding` para `ResourceChunk` foi documentada e proposta arquiteturalmente no Diagnóstico 6, sem alteração de código nesta etapa.
4. **Calibração do Limiar de Pontuação de Comentários no RAG:** A elevação de `score >= 1` para `score >= 3` foi avaliada analiticamente com 10 perguntas no Diagnóstico 7, aguardando aprovação para aplicação em código.
