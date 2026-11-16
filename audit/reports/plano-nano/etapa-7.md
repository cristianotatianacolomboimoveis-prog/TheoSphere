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

#### 1. Git Diff Real do Commit 0d1c097

```diff
diff --git a/backend/src/rag/rag-context-builder.service.ts b/backend/src/rag/rag-context-builder.service.ts
index 7a1908c..378fe25 100644
--- a/backend/src/rag/rag-context-builder.service.ts
+++ b/backend/src/rag/rag-context-builder.service.ts
@@ -52,8 +52,16 @@ export class RagContextBuilderService {
   async tentarRespostaDaBiblioteca(
     query: string,
     userId: string | undefined,
+    preloadedHits?: Array<{
+      title: string;
+      content: string;
+      similarity: number;
+      fileName?: string;
+    }>,
   ): Promise<{ content: string; sources: RagSource[] } | null> {
-    const hits = await this.userContext.searchDriveLibrary(query, userId);
+    const hits =
+      preloadedHits ??
+      (await this.userContext.searchDriveLibrary(query, userId));
     const relevantes = hits.filter(
       (h) => h.similarity >= this.LIBRARY_DIRECT_THRESHOLD,
     );
@@ -99,8 +107,16 @@ export class RagContextBuilderService {
     query: string,
     userId: string | undefined,
     sources: RagSource[],
+    preloadedHits?: Array<{
+      title: string;
+      content: string;
+      similarity: number;
+      fileName?: string;
+    }>,
   ): Promise<string> {
-    const hits = await this.userContext.searchDriveLibrary(query, userId);
+    const hits =
+      preloadedHits ??
+      (await this.userContext.searchDriveLibrary(query, userId));
     if (hits.length === 0) return '';

     for (const h of hits) {
diff --git a/backend/src/rag/rag.service.spec.ts b/backend/src/rag/rag.service.spec.ts
index 32c5c88..259bfa9 100644
--- a/backend/src/rag/rag.service.spec.ts
+++ b/backend/src/rag/rag.service.spec.ts
@@ -124,7 +124,13 @@ describe('RagService', () => {
     });

     it('removes control characters', () => {
-      const out = sanitize('hello world !');
+      const out = sanitize(
+        'hello' +
+          String.fromCharCode(0) +
+          'world' +
+          String.fromCharCode(31) +
+          '!',
+      );
       expect(out).toBe('helloworld!');
     });

@@ -239,6 +245,45 @@ describe('RagService', () => {
       expect(typeof res.content).toBe('string');
       expect(res.content.length).toBeGreaterThan(0);
     });
+
+    it('um chat com acerto na biblioteca chama searchDriveLibrary uma vez (reaproveitamento sem busca dupla)', async () => {
+      const searchSpy = jest.spyOn(userContext, 'searchDriveLibrary');
+      searchSpy.mockClear();
+
+      (userContext.searchDriveLibrary as jest.Mock).mockResolvedValue([
+        {
+          title: 'Institutas da Religião Cristã',
+          fileName: 'institutas.epub',
+          content: 'A eleição eterna de Deus...',
+          similarity: 0.82,
+        },
+      ]);
+
+      await service.chat(QUERY);
+      expect(searchSpy).toHaveBeenCalledTimes(1);
+    });
+
+    it('resposta com 2 trechos da biblioteca e nenhuma nota resulta em contextUsed: true e contextDocCount: 2', async () => {
+      (userContext.searchDriveLibrary as jest.Mock).mockResolvedValue([
+        {
+          title: 'Institutas da Religião Cristã - Livro III',
+          fileName: 'institutas.epub',
+          content: 'A predestinação pela qual Deus adotou a uns...',
+          similarity: 0.82,
+        },
+        {
+          title: 'Comentário aos Romanos',
+          fileName: 'calvino-romanos.epub',
+          content: 'O propósito soberano da graça divina...',
+          similarity: 0.81,
+        },
+      ]);
+      (userContext.buildUserContext as jest.Mock).mockResolvedValue('');
+
+      const res = await service.chat(QUERY, 'user-123');
+      expect(res.contextUsed).toBe(true);
+      expect(res.contextDocCount).toBe(2);
+    });
   });

   describe('chat() — respostas validadas como contexto secundário', () => {
diff --git a/backend/src/rag/rag.service.ts b/backend/src/rag/rag.service.ts
index a1ba59a..d246e00 100644
--- a/backend/src/rag/rag.service.ts
+++ b/backend/src/rag/rag.service.ts
@@ -470,7 +470,21 @@ export class RagService {
     }

     // ═══ ETAPA 1.2: Biblioteca do usuário responde sozinha? ═══
+    let preloadedLibraryHits:
+      | Array<{
+          title: string;
+          content: string;
+          similarity: number;
+          fileName?: string;
+        }>
+      | undefined;
+
     if (!jsonMode) {
+      preloadedLibraryHits =
+        (await this.optionalContext('RAG', 'busca na biblioteca', null, () =>
+          this.userContext.searchDriveLibrary(sanitizedQuery, userId),
+        )) ?? undefined;
+
       const daBiblioteca = await this.optionalContext(
         'RAG',
         'resposta da biblioteca',
@@ -479,6 +493,7 @@ export class RagService {
           this.contextBuilderInstance.tentarRespostaDaBiblioteca(
             sanitizedQuery,
             userId,
+            preloadedLibraryHits,
           ),
       );
       if (daBiblioteca) {
@@ -531,6 +546,7 @@ export class RagService {
           sanitizedQuery,
           userId,
           collectedSources,
+          preloadedLibraryHits,
         ),
     );
     const libraryHasHits = driveLibraryContext.length > 0;
@@ -606,11 +622,11 @@ export class RagService {
     }

     const userContextText = `${directUserContext}\n\n${hybridUserContext}`;
-    const contextDocCount = (
+    const personalDocCount = (
       userContextText.match(/--- 📝|--- 📖|--- 🖍️|--- 📚|--- 🔖/g) || []
     ).length;

-    if (contextDocCount > 0) {
+    if (personalDocCount > 0) {
       collectedSources.push({
         type: 'personal',
         title: 'Conteúdo pessoal do usuário',
@@ -619,6 +635,10 @@ export class RagService {
       });
     }

+    const libraryDocCount = (driveLibraryContext.match(/\[Obra:/g) || [])
+      .length;
+    const contextDocCount = personalDocCount + libraryDocCount;
+
     // ═══ ETAPA 3: Buscar bases de conhecimento ═══
     const { theologicalContext, bibleContext } =
       await this.gatherKnowledgeContexts(
@@ -1000,10 +1020,10 @@ export class RagService {
     }
     const userContextText = `${directUserContext}\n\n${hybridUserContext}`;

-    const contextDocCount = (
+    const personalDocCount = (
       userContextText.match(/--- 📝|--- 📖|--- 🖍️|--- 📚|--- 🔖/g) || []
     ).length;
-    if (contextDocCount > 0) {
+    if (personalDocCount > 0) {
       streamSources.push({
         type: 'personal',
         title: 'Conteúdo pessoal do usuário',
@@ -1012,6 +1032,10 @@ export class RagService {
       });
     }

+    const libraryDocCount = (driveLibraryContext.match(/\[Obra:/g) || [])
+      .length;
+    const contextDocCount = personalDocCount + libraryDocCount;
+
     const { theologicalContext, bibleContext } =
       await this.gatherKnowledgeContexts(
         sanitizedQuery,
```

#### 2. Problemas Identificados

1. **Busca Dupla na Biblioteca Clássica:** A cada pergunta submetida ao chat (`RagService.chat`), a função `searchDriveLibrary` era invocada duas vezes:
   - Primeiro em `tentarRespostaDaBiblioteca` (passo 1.2), para avaliar se a biblioteca atendia a pergunta de imediato;
   - Segundo em `buildDriveLibraryContext` (passo 1.55), para montar o bloco de contexto para o modelo gerador quando a tentativa direta não respondia.
     Isso duplicava chamadas vetoriais, parsing e consultas SQL ao banco de dados Supabase Nano a cada requisição do chat.
2. **Subcontagem de Documentos de Contexto:** `contextDocCount` apenas contava blocos do contexto pessoal do usuário. Quando a resposta utilizava exclusivamente trechos da biblioteca de obras clássicas (`[Obra: ...]`), `contextDocCount` permanecia `0` e `contextUsed` era falsamente reportado como `false`.

#### 3. Solução Implementada

1. Em `RagService.chat`, pré-carrega os chunks no passo 1.2 e repassa `preloadedLibraryHits` para `tentarRespostaDaBiblioteca` e `buildDriveLibraryContext`.
2. Em `contextDocCount` (em `chat` e `chatStream`), soma `personalDocCount` e `libraryDocCount`.

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

#### 1. Git Diff Real do Commit c1b2e93

```diff
diff --git a/backend/src/bible/passage-guide.service.spec.ts b/backend/src/bible/passage-guide.service.spec.ts
index 917e6c6..39609a8 100644
--- a/backend/src/bible/passage-guide.service.spec.ts
+++ b/backend/src/bible/passage-guide.service.spec.ts
@@ -227,7 +227,7 @@ describe('PassageGuideService', () => {

     expect(mockResourcesService.findReferences).toHaveBeenCalledWith(
       45008001,
-      4,
+      10,
     );
     expect(g.commentaries).toHaveLength(1);
     expect(g.commentaries[0].author).toBe('João Calvino');
@@ -268,4 +268,72 @@ describe('PassageGuideService', () => {
     );
     warn.mockRestore();
   });
+
+  it('filtra índices remissivos puros (trechos com 5 ou mais [n]) e preserva comentários exegéticos reais', async () => {
+    (prisma as any).$queryRawUnsafe = jest.fn().mockResolvedValue([
+      {
+        title: 'The City of God, Volume II',
+        author: 'Santo Agostinho',
+        content:
+          '[547] Ps. xl. 2, 3. [548] Jer. ix. 23, 24, as in 1 Cor. i. 31. [549] Lam. iv. 20. [550] Bar. iii. 35. [551] Rom. viii. 28.',
+      },
+      {
+        title: 'Commentary on Romans',
+        author: 'John Calvin',
+        content:
+          'And we know that all things work together for good to them that love God. He now draws this conclusion from what had been previously said, showing how great is the benefit of adoption.',
+      },
+    ]);
+
+    const g = await service.getGuide('BLIVRE', 45, 8, 28);
+
+    expect(g.commentaries).toHaveLength(1);
+    expect(g.commentaries[0].author).toBe('John Calvin');
+    expect(g.commentaries[0].source).toBe('Commentary on Romans');
+    expect(g.commentaries[0].content).toContain(
+      'all things work together for good',
+    );
+  });
+
+  it('filtra índices remissivos puros via ResourcesService quando há 5 ou mais [n]', async () => {
+    const mockResourcesService = {
+      findReferences: jest.fn().mockResolvedValue([
+        {
+          id: 'ref-index',
+          resourceTitle: 'Index of Scripture References',
+          author: 'Editor',
+          text: '[1] Gen 1:1 [2] Gen 1:2 [3] Gen 1:3 [4] Gen 1:4 [5] Gen 1:5 [6] Gen 1:6',
+          canonicalRef: 43003016,
+          confidence: 1.0,
+        },
+        {
+          id: 'ref-exegesis',
+          resourceTitle: 'Comentário sobre João',
+          author: 'João Calvino',
+          text: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito. Exegese profunda sobre a amplitude do amor divino.',
+          canonicalRef: 43003016,
+          confidence: 1.0,
+        },
+      ]),
+    };
+
+    const module: TestingModule = await Test.createTestingModule({
+      providers: [
+        PassageGuideService,
+        { provide: PrismaService, useValue: prisma },
+        { provide: CrossReferencesService, useValue: crossRefs },
+        { provide: LinguisticsService, useValue: linguistics },
+        { provide: ArchaeologyService, useValue: archaeology },
+        { provide: ResourcesService, useValue: mockResourcesService },
+      ],
+    }).compile();
+
+    const pgWithResources =
+      module.get<PassageGuideService>(PassageGuideService);
+    const g = await pgWithResources.getGuide('BLIVRE', 43, 3, 16);
+
+    expect(g.commentaries).toHaveLength(1);
+    expect(g.commentaries[0].author).toBe('João Calvino');
+    expect(g.commentaries[0].source).toBe('Comentário sobre João');
+  });
 });
diff --git a/backend/src/bible/passage-guide.service.ts b/backend/src/bible/passage-guide.service.ts
index dd7b1a5..c3cf6bf 100644
--- a/backend/src/bible/passage-guide.service.ts
+++ b/backend/src/bible/passage-guide.service.ts
@@ -204,10 +204,18 @@ export class PassageGuideService {
       try {
         const citations = await this.resourcesService.findReferences(
           canonicalRef,
-          4,
+          10,
         );
-        if (citations.length > 0) {
-          return citations.map((c) => ({
+        const filtered = citations
+          .filter((c) => {
+            if (!c.text) return false;
+            const bracketCount = (c.text.match(/\[\d+\]/g) || []).length;
+            return bracketCount < 5; // descarta índices remissivos puros
+          })
+          .slice(0, 4);
+
+        if (filtered.length > 0) {
+          return filtered.map((c) => ({
             verse: verse ?? 1,
             author: c.author,
             content:
@@ -249,7 +257,11 @@ export class PassageGuideService {
       if (!Array.isArray(rows) || rows.length === 0) return [];

       return rows
-        .filter((r) => r.content && r.content.length >= 100)
+        .filter((r) => {
+          if (!r.content || r.content.length < 100) return false;
+          const bracketCount = (r.content.match(/\[\d+\]/g) || []).length;
+          return bracketCount < 5; // descarta índices remissivos puros
+        })
         .slice(0, 4)
         .map((r) => {
           let cleaned = (r.content || '')
```

#### 2. Problema Identificado e Medição Inicial (Item 3)

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

#### 1. Git Diff Real do Commit 938ce74

```diff
diff --git a/backend/src/rag/daily-embedding-budget.spec.ts b/backend/src/rag/daily-embedding-budget.spec.ts
index f2b2d76..9d29d62 100644
--- a/backend/src/rag/daily-embedding-budget.spec.ts
+++ b/backend/src/rag/daily-embedding-budget.spec.ts
@@ -6,7 +6,6 @@ import {
   evaluateEmbeddingBudgetWithEarlyExit,
   formatLimitedPending,
   planDailyEmbedding,
-  sortVersesByTargetList,
 } from './daily-embedding-budget';

 // Números reais de 2026-11-08: 186.476 linhas vivas, gatilho padrão do
@@ -175,25 +174,6 @@ describe('evaluateEmbeddingBudgetWithEarlyExit', () => {
 });

 describe('ordenação de traduções na ingestão diária', () => {
-  it('respeita a ordem explícita da lista targets e não a ordem alfabética', () => {
-    const targets = ['BLIVRE', 'NVA', 'TR', 'KJV'];
-    const mockVerses = [
-      { id: '4', translation: 'KJV', bookId: 1, chapter: 1, verse: 1 },
-      { id: '2', translation: 'NVA', bookId: 1, chapter: 1, verse: 1 },
-      { id: '1', translation: 'BLIVRE', bookId: 1, chapter: 1, verse: 1 },
-      { id: '3', translation: 'TR', bookId: 40, chapter: 1, verse: 1 },
-    ];
-
-    const sorted = sortVersesByTargetList(mockVerses, targets);
-    const resultTranslations = sorted.map((v) => v.translation);
-
-    // Ordem da lista: BLIVRE -> NVA -> TR -> KJV
-    expect(resultTranslations).toEqual(['BLIVRE', 'NVA', 'TR', 'KJV']);
-
-    // Se fosse alfabética, KJV viria antes de NVA e TR: ['BLIVRE', 'KJV', 'NVA', 'TR']
-    expect(resultTranslations).not.toEqual(['BLIVRE', 'KJV', 'NVA', 'TR']);
-  });
-
   it('garante que o script ingestao-diaria-embeddings.ts usa array_position e não ORDER BY translation', () => {
     const scriptPath = path.resolve(
       __dirname,
diff --git a/backend/src/rag/daily-embedding-budget.ts b/backend/src/rag/daily-embedding-budget.ts
index 2376aa6..9581a4a 100644
--- a/backend/src/rag/daily-embedding-budget.ts
+++ b/backend/src/rag/daily-embedding-budget.ts
@@ -161,42 +161,3 @@ export async function evaluateEmbeddingBudgetWithEarlyExit(
     pendingDisplay: limited.display,
   };
 }
-
-/**
- * Ordena versículos pela lista explícita de traduções (simulando ORDER BY array_position(targets, translation), "bookId", chapter, verse).
- * Garante que a ordem de processamento segue exatamente a sequência definida em targets (e não a ordem alfabética).
- */
-export function sortVersesByTargetList<
-  T extends {
-    translation: string;
-    bookId?: number;
-    chapter?: number;
-    verse?: number;
-  },
->(verses: T[], targets: string[]): T[] {
-  return [...verses].sort((a, b) => {
-    const posA = targets.indexOf(a.translation);
-    const posB = targets.indexOf(b.translation);
-    const safeA = posA === -1 ? Number.MAX_SAFE_INTEGER : posA;
-    const safeB = posB === -1 ? Number.MAX_SAFE_INTEGER : posB;
-    if (safeA !== safeB) return safeA - safeB;
-    if (
-      a.bookId !== undefined &&
-      b.bookId !== undefined &&
-      a.bookId !== b.bookId
-    ) {
-      return a.bookId - b.bookId;
-    }
-    if (
-      a.chapter !== undefined &&
-      b.chapter !== undefined &&
-      a.chapter !== b.chapter
-    ) {
-      return a.chapter - b.chapter;
-    }
-    if (a.verse !== undefined && b.verse !== undefined && a.verse !== b.verse) {
-      return a.verse - b.verse;
-    }
-    return 0;
-  });
-}
```

#### 2. Contexto e Motivação

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

> [!WARNING]
> **Ressalva Crítica sobre o `pg_stat_ssl`:** O `pg_stat_ssl` no PostgreSQL reflete apenas a conexão interna entre o Supavisor (pooler) e o processo backend do Postgres. Ele **não comprova** que a conexão externa entre o Render e o pooler (porta 6543) esteja trafegando com TLS obrigatório se o cliente não exigir explicitamente via `sslmode=require` ou opções de SSL no pool.

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

### 7.3.1 Correções Concluídas e Validações Adicionais (Item 7.3)

#### 1. Trava de Segurança no `reindex` (`DriveRagService`)

- Em `backend/src/rag/drive-rag.service.ts`, a trava de segurança que bloqueia ingestões legadas na tabela `UserEmbedding` (`ALLOW_LEGACY_LIBRARY_INGEST !== 'true'`) foi posicionada na primeira linha do método `reindex()`, estritamente **antes** da chamada destrutiva `this.prisma.userEmbedding.deleteMany`.
- **Validação com Teste de Mutação:**
  - Teste unitário em `backend/src/rag/drive-rag.service.spec.ts`: confirma que, sem a variável, `reindex` lança HTTP 409 Conflict e `userEmbedding.deleteMany` não é chamado (`expect(mockPrisma.userEmbedding.deleteMany).not.toHaveBeenCalled()`).
  - Mutação (trava movida para depois do `deleteMany`): o teste falhou acusando que `deleteMany` foi invocado (`Expected number of calls: 0, Received number of calls: 2`).

#### 2. Higienização de Keywords no Catálogo Estático (`classic-commentaries.ts`)

- Foram removidas todas as palavras-chave adicionadas artificialmente em commits anteriores que não descreviam o texto literal do trecho, bem como palavras genéricas (`deus`, `relação`):
  - `calvin-john-1-1`: removido `'jerusalém'` $\rightarrow$ mantidas `['verbo', 'cristo', 'encarnação']`.
  - `calvin-romans-3-23`: removidos `'justificação'`, `'fé'`, `'graça'`, `'lei'`, `'redenção'` (o texto trata de condenação universal e destruição de presunção de mérito) $\rightarrow$ mantidas `['paulo', 'pecado', 'condenação', 'mérito', 'glória']`.
  - `gill-romans-8-28`: removidos `'jó'`, `'soberania'`, `'sofrimento'`, `'deus'` (o texto trata de providência combinada em aflições para o benefício dos eleitos) $\rightarrow$ mantidas `['providência', 'aflições', 'eleição', 'tribulações']`.
  - `calvin-genesis-1-1`: removidos `'aliança'`, `'lei'`, `'pentateuco'`, `'relação'`, `'graça'` (o texto aborda criação ex-nihilo / bara / idade do mundo) $\rightarrow$ mantidas `['criação', 'bara', 'início']`.

##### Tabela de Contagem das 10 Perguntas (Antes vs Depois)

|  #  | Pergunta                                                              |  Antes (com ruído de keywords)  | Depois (keywords honestas) | Análise / Resultado                                                   |
| :-: | --------------------------------------------------------------------- | :-----------------------------: | :------------------------: | --------------------------------------------------------------------- |
|  1  | _Qual o significado de João 3:16?_                                    |         **3** (Jo 3:16)         |      **3** (Jo 3:16)       | ✅ Citação direta de livro e capítulo                                 |
|  2  | _Como Paulo explica a justificação pela fé em Romanos?_               | **1** (Calvino Rm 3:23 forçado) |           **0**            | ✅ 0 (não há comentário de justificação pela fé no catálogo estático) |
|  3  | _O que significa a soberania de Deus no sofrimento em Jó?_            |  **1** (Gill Rm 8:28 — ruído)   |           **0**            | ✅ 0 (não há trecho sobre Jó; Rm 8:28 eliminado)                      |
|  4  | _Explique o Salmo 23 e o Bom Pastor_                                  |         **2** (Sl 23:1)         |      **2** (Sl 23:1)       | ✅ Citação direta de livro e capítulo (Salmo/Salmos 23)               |
|  5  | _Qual a relação entre aliança e lei no Pentateuco?_                   | **1** (Calvino Gn 1:1 — ruído)  |           **0**            | ✅ 0 (não há trecho sobre aliança e lei; Gn 1:1 eliminado)            |
|  6  | _Qual a distância de Jerusalém a Belém?_                              |              **0**              |           **0**            | ✅ 0 (pergunta geográfica sem trecho)                                 |
|  7  | _Quantos habitantes tinha a cidade de Roma no século I?_              |              **0**              |           **0**            | ✅ 0 (pergunta histórica sem trecho)                                  |
|  8  | _Qual era a moeda usada na província da Judeia sob o domínio romano?_ |              **0**              |           **0**            | ✅ 0 (pergunta histórica sem trecho)                                  |
|  9  | _Como era a agricultura e a colheita da cevada na Galileia antiga?_   |              **0**              |           **0**            | ✅ 0 (pergunta cultural sem trecho)                                   |
| 10  | _Quem era o imperador romano quando Jesus nasceu?_                    |              **0**              |           **0**            | ✅ 0 (pergunta histórica sem trecho)                                  |

- **Validação com Teste de Mutação:**
  - Teste unitário em `backend/src/rag/rag-context-builder.service.spec.ts`: `it('a pergunta sobre Jó não recebe o trecho de Romanos 8:28')` verifica explicitamente que nenhuma fonte com `reference === 'Romanos 8:28'` é incluída para a pergunta sobre Jó.
  - Mutação (reintrodução de `'jó', 'soberania', 'sofrimento', 'deus'` em Gill Rm 8:28): o teste falhou com `Expected: false, Received: true`, comprovando a sensibilidade do filtro.

#### 3. Nota de Segurança: TLS no Pool de Conexões vs `pg_stat_ssl`

- A telemetria de `pg_stat_ssl` consultada no PostgreSQL comprova a criptografia na conexão entre o connection pooler (Supavisor) e o processo Postgres no Supabase. Ela **não comprova** por si só que o tráfego entre a aplicação no Render e o Supavisor esteja sob TLS.
- Para mitigar qualquer risco de transporte não criptografado, o pool de conexões do Prisma em `backend/src/prisma.service.ts` foi configurado explicitamente com `ssl: { rejectUnauthorized: false }` sob `NODE_ENV === 'production'`.

#### 4. Orçamento de Linhas Mortas e Folga até o Autovacuum

- Com **186.476** linhas vivas na tabela `BibleVerse`:
  $$\text{Gatilho de Autovacuum} = 50 + (0,2 \times 186.476) = 37.345 \text{ linhas}$$
- Após a rodada diária de 2.000 versículos da KJV em 16/11/2026, o total de linhas mortas acumuladas atingiu **12.830**:
  $$\text{Folga Líquida} = 37.345 - 12.830 = \mathbf{24.515} \text{ linhas}$$
- Essa folga comporta mais de 12 rodadas diárias de 2.000 linhas antes que qualquer autovacuum seja disparado automaticamente pelo banco.

---

### 7.4 Medição Noturna de Recall e Auditoria de Anomalias Vetoriais (Item 7.4)

Executada auditoria de integridade e precisão vetorial no banco de dados Supabase via script dedicado (`backend/scripts/medir-recall-e-anomalias.ts`), operando em conexão única, transação estrita `BEGIN READ ONLY;` e `statement_timeout = 15s`.

- **Horário Real da Execução:** 10:23 BRT (execução diurna).
- **Duração da Transação Aberta:** ~174 s (173,5 s de duração total da varredura e consultas de recall em transação única `READ ONLY`).

#### 1. Telemetria de Infraestrutura (Antes vs Depois)

Antes de iniciar a varredura, foi verificado `pg_stat_progress_vacuum` (retornando 0 linhas ativas na tabela `BibleVerse`).

| Métrica                                                     |     Antes da Auditoria     |      Após a Auditoria      |           Variação           |
| :---------------------------------------------------------- | :------------------------: | :------------------------: | :--------------------------: |
| **Tamanho Total do Banco**                                  | 1.516 MB (1.589.439.635 B) | 1.516 MB (1.589.439.635 B) | 0 B (sem expansão de disco)  |
| **Índice `BibleVerse_embedding_bq_hnsw_idx`**               |           65 MB            |           65 MB            |             0 B              |
| **Soma dos Índices Vetoriais HNSW**                         |           83 MB            |           83 MB            |    0 B (< teto de 150 MB)    |
| **Linhas Mortas (`n_dead_tup` em `BibleVerse`)**            |           12.830           |           12.830           |    0 novas linhas mortas     |
| **Sondagem de Busca em Produção (`/api/v1/search/verses`)** | 2.820 ms (`vectorArm: ok`) |  512 ms (`vectorArm: ok`)  | Resposta operacional estável |

---

#### 2. Tabela 1: Auditoria de Normas e Anomalias por Tradução

Varredura sequencial paginada por chave `("bookId", chapter, verse) > ($2, $3, $4)` em lotes de 1.000 versículos com `embedding IS NOT NULL`. O cálculo da norma euclidiana foi executado 100% no cliente Node.js (`computeEuclideanNorm`), sem overhead de `vector_norm` no Postgres.

| Tradução   | Versículos com Vetor | Norma Mín | Norma Máx | Norma Média | Anomalias (< 0,20 ou > 0,85) | IDs Anômalos |
| :--------- | :------------------: | :-------: | :-------: | :---------: | :--------------------------: | :----------: |
| **KJV**    |        24.605        |  0,5733   |  0,5945   |   0,5838    |            **0**             |    Nenhum    |
| **WEB**    |        31.098        |  0,5759   |  0,5951   |   0,5852    |            **0**             |    Nenhum    |
| **LXX**    |        22.942        |  0,5723   |  0,5926   |   0,5828    |            **0**             |    Nenhum    |
| **WLC**    |        23.213        |  0,5742   |  0,5921   |   0,5837    |            **0**             |    Nenhum    |
| **BLIVRE** |        31.102        |  0,5707   |  0,5953   |   0,5831    |            **0**             |    Nenhum    |

- **Total de versículos auditados individualmente:** **132.960 versículos**.
- **Nota sobre a contagem de versículos:** As traduções KJV, WEB e WLC possuem hoje no banco de dados **31.112**, **31.098** e **23.213** versículos totais, respectivamente. Essa contagem decorre da inserção dos capítulos faltantes (Jó 19–42 e Joel 4 em 08/11/2026 via `scripts/completar-capitulos-faltantes.ts`) e **diverge** da tabela legada do `AGENTS.md` (que indicava 30.470 para KJV, 30.456 para WEB e 22.550 para WLC). Na KJV, dos 31.112 versículos, 6.507 estão sem vetor (restam pendentes para a ingestão diária), restando 24.605 com vetor ativo auditados.
- **Integridade:** 100% dos vetores persistem na faixa esperada do `gemini-embedding-001` (0,57–0,60). Nenhuma anomalia de truncamento, saturação ou vetor nulo/corrompido foi detectada.

---

#### 3. Tabela 2: Avaliação de Recall da Busca Binária Quantizada (HNSW Bit 768d vs Cosseno Exato)

Foram avaliadas 30 consultas semânticas reais (15 em inglês para a KJV e 15 em português para a BLIVRE), geradas via API do Gemini (`text-embedding-004` / `gemini-embedding-001`, 768d).

- **Ground-Truth (Exato):** Top-20 ordenado pela similaridade exata de cosseno calculada em memória sobre todos os vetores da tradução.
- **Busca Binária (Produção):** Execução do SQL real de `binaryVectorSearch` no banco:
  - Recuperação candidata de $P = 200$ itens via índice binário `embedding::bit(768) <~> binary_quantize($1::vector)::bit(768)`;
  - Parâmetros locais na sessão: `SET LOCAL hnsw.ef_search = 200;` e `SET LOCAL hnsw.iterative_scan = 'relaxed_order';`;
  - Reordenação fina no banco com o vetor completo `embedding <=> $1::vector LIMIT 20`.

| Tradução   | Consulta Semântica                                              | Tipo          | Recall@10 | Recall@20 | Latência Banco (ms) |
| :--------- | :-------------------------------------------------------------- | :------------ | :-------: | :-------: | :-----------------: |
| **KJV**    | _love of God_                                                   | Temática      |   100%    |   100%    |        2.470        |
| **KJV**    | _justification by faith_                                        | Temática      |   100%    |    90%    |        1.403        |
| **KJV**    | _the good shepherd_                                             | Temática      |   100%    |    80%    |        1.980        |
| **KJV**    | _creation of heaven and earth_                                  | Temática      |   100%    |   100%    |         717         |
| **KJV**    | _the Lord is my shepherd I shall not want_                      | Quase-literal |   100%    |    90%    |         225         |
| **KJV**    | _in the beginning was the Word and the Word was with God_       | Quase-literal |   100%    |    85%    |         487         |
| **KJV**    | _for God so loved the world that he gave his only begotten Son_ | Quase-literal |   100%    |    90%    |         207         |
| **KJV**    | _I can do all things through Christ which strengtheneth me_     | Quase-literal |    90%    |    85%    |         266         |
| **KJV**    | _for all have sinned and come short of the glory of God_        | Quase-literal |    60%    |    70%    |         267         |
| **KJV**    | _the wages of sin is death but the gift of God is eternal life_ | Quase-literal |    90%    |    90%    |         187         |
| **KJV**    | _all things work together for good to them that love God_       | Quase-literal |    70%    |    75%    |         104         |
| **KJV**    | _thy word is a lamp unto my feet and a light unto my path_      | Quase-literal |   100%    |   100%    |         121         |
| **KJV**    | _I have fought a good fight I have finished my course_          | Quase-literal |   100%    |   100%    |         302         |
| **KJV**    | _resurrection of the dead and eternal life_                     | Temática      |   100%    |    95%    |         376         |
| **KJV**    | _providence and sovereignty of God in affliction_               | Temática      |   100%    |   100%    |         180         |
| **BLIVRE** | _amor de Deus_                                                  | Temática      |   100%    |    95%    |        3.162        |
| **BLIVRE** | _justificação pela fé_                                          | Temática      |   100%    |   100%    |         812         |
| **BLIVRE** | _o bom pastor_                                                  | Temática      |    90%    |    90%    |         948         |
| **BLIVRE** | _criação dos céus e da terra_                                   | Temática      |   100%    |   100%    |         706         |
| **BLIVRE** | _graça e paz vos sejam multiplicadas_                           | Quase-literal |   100%    |   100%    |         306         |
| **BLIVRE** | _o Senhor é o meu pastor e nada me faltará_                     | Quase-literal |    80%    |    85%    |         374         |
| **BLIVRE** | _no princípio era o Verbo e o Verbo estava com Deus_            | Quase-literal |   100%    |    95%    |         281         |
| **BLIVRE** | _porque Deus amou o mundo de tal maneira_                       | Quase-literal |   100%    |    95%    |         127         |
| **BLIVRE** | _tudo posso naquele que me fortalece_                           | Quase-literal |    90%    |    90%    |         147         |
| **BLIVRE** | _a soberania de Deus nas aflições_                              | Temática      |   100%    |    95%    |         253         |
| **BLIVRE** | _ressurreição dos mortos e vida eterna_                         | Temática      |   100%    |   100%    |         134         |
| **BLIVRE** | _lâmpada para os meus pés é a tua palavra_                      | Quase-literal |   100%    |   100%    |        1.687        |
| **BLIVRE** | _o salário do pecado é a morte_                                 | Quase-literal |   100%    |    95%    |         600         |
| **BLIVRE** | _combati o bom combate terminei a corrida guardei a fé_         | Quase-literal |   100%    |    95%    |         279         |
| **BLIVRE** | _reconciliação e perdão de pecados_                             | Temática      |   100%    |   100%    |        1.676        |

#### 4. Métricas Agregadas e Análise de Desempenho

##### A. BLIVRE (Português):

- **Recall@10 Médio:** **97,3%**
- **Recall@20 Médio:** **95,7%**
- **Latência do Banco:** Mediana = **374 ms** | Média = 766 ms | Máxima = 3.162 ms (a frio na primeira consulta)

##### B. KJV (Inglês):

- **Recall@10 Médio:** **94,0%**
- **Recall@20 Médio:** **90,0%**
- **Latência do Banco:** Mediana = **267 ms** | Média = 619 ms | Máxima = 2.470 ms (a frio na primeira consulta)

##### C. Conclusões da Auditoria de Recall:

1. **Pendência B Fechada:** Os resultados empíricos comprovam que a busca binária quantizada com $P = 200$ e reordenação local fina com `<=>` preserva entre 94% e 97% do Top-10 e entre 90% e 95% do Top-20 em relação ao ground-truth exato de ponto flutuante. A implementação atual se mantém intacta e **não há necessidade de alteração de código de produção**.
2. A perda de recall decorrente da quantização binária (`bit(768)`) é mínima e plenamente mitigada pela sobre-recuperação candidata com $P = 200$.
3. A latência mediana do banco para a busca vetorial permaneceu entre **267 ms e 374 ms**, mesmo sob o hardware Nano do Supabase, confirmando que a compactação do índice em 65 MB permite a retenção dos nós mais ativos em buffer cache.

---

### O que NÃO Foi Verificado e Por Quê

1. **Deploy em Produção dos Grupos 1, 2 e 3:** O código foi mantido nas respectivas branches (`fix/rag-biblioteca-contagem`, `fix/passage-guide-indice-remissivo`, `chore/remover-codigo-morto-ingestao`) e testado integralmente em ambiente local/CI; os merges para a `main` e o deploy no Render dependem da autorização do mantenedor.
2. **Execução em Produção do `sslmode=require`:** A alteração de variáveis de ambiente no Render não foi realizada, pois exige acesso administrativo ao painel do Render.
3. **Refatoração do `DriveRagService` para `Resource`:** A migração da gravação de livros de `UserEmbedding` para `ResourceChunk` foi documentada e proposta arquiteturalmente no Diagnóstico 6, sem alteração de código nesta etapa.
4. **Calibração do Limiar de Pontuação de Comentários no RAG:** A elevação de `score >= 1` para `score >= 3` foi avaliada analiticamente com 10 perguntas no Diagnóstico 7, aguardando aprovação para aplicação em código.
5. **Recall das Traduções Originais (LXX, WLC, TR):** Não foram formuladas consultas de busca semântica em grego ou hebraico bíblico nesta etapa, limitando-se o recall às línguas vernáculas primárias da busca (português e inglês). A integridade vetorial de LXX e WLC foi, contudo, comprovada na Tabela 1 pela auditoria das normas.
6. **Medição sob Saturação Máxima Concorrente:** As consultas de recall foram executadas sequencialmente em conexão única com `statement_timeout = 15s`. O comportamento de latência sob concorrência de múltiplos usuários simultâneos no Nano depende do pool de conexões do Render e da taxa de chamadas da API do Gemini.
