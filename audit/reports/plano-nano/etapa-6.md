# Relatório de Execução — Etapa 6: Ingestão Diária de Embeddings da KJV no Supabase Nano

**Data de Conclusão:** 2026-11-11  
**Ambiente:** Supabase (sa-east-1) — Plano Pro / Compute Nano (512 MB RAM, 224 MB `shared_buffers`)  
**Pipeline:** GitHub Actions (`.github/workflows/ingestao-diaria-embeddings.yml`)  
**Status Geral:** ✅ **Concluída com 100% de Sucesso**

---

## 1. Configuração Segura dos Segredos no GitHub

Os segredos foram configurados via stdin pipe com o GitHub CLI (`gh secret set`), sem flags `--body`, sem `echo` de valores, sem arquivos temporários intermediários e sem `set -x`:

```bash
cd backend
grep '^DIRECT_URL=' .env | cut -d= -f2- | tr -d '"\n' | gh secret set SUPABASE_DIRECT_URL
grep '^GEMINI_API_KEY=' .env | cut -d= -f2- | tr -d '"\n' | gh secret set GEMINI_API_KEY
gh secret list
```

### Saída de `gh secret list` (somente nomes e datas):

```text
NAME                   UPDATED
CLOUDFLARE_ACCOUNT_ID  about 5 months ago
CLOUDFLARE_API_TOKEN   about 5 months ago
FLY                    about 5 months ago
GEMINI_API_KEY         less than a minute ago
SUPABASE_DIRECT_URL    less than a minute ago
VERCEL                 about 5 months ago
```

---

## 2. Rodada de Teste (Dry Run)

- **Comando disparado:**
  ```bash
  gh workflow run ingestao-diaria-embeddings.yml -f translations=KJV -f limit=2000 -f dry_run=true
  ```
- **ID da execução:** `43032396084`
- **Duração total:** 1m 23s
- **Status:** `success`

### Resumo do passo "Rodada do dia" (Workflow Run 43032396084):

```text
## Ingestão diária de embeddings (KJV)
- pendentes: mais de 2000
- vacuum em andamento: não
- latência da sondagem (mediana de 3): 126 ms
- linhas mortas: 0 · folga até o gatilho: 33610
- decisão: rodar 2000 (dry-run)
```

O teste confirmou que o ambiente estava plenamente apto para execução (sem vacuum concorrente, latência de sondagem baixa em 126 ms, 0 linhas mortas e ampla folga de 33.610 até o autovacuum).

---

## 3. Rodada Real Pequena (200 versículos)

### 3.1. Pré-condição Obrigatória

Antes do disparo, foi verificado `pg_stat_progress_vacuum`:

```sql
SELECT * FROM pg_stat_progress_vacuum;
-- Resultado: 0 linhas (nenhum vacuum em andamento)
```

### 3.2. Disparo da Ingestão

- **Comando disparado:**
  ```bash
  gh workflow run ingestao-diaria-embeddings.yml -f translations=KJV -f limit=200 -f dry_run=false
  ```
- **ID da execução:** `43032765462`
- **Duração total:** 1m 30s
- **Status:** `success`

### Resumo do passo "Rodada do dia" (Workflow Run 43032765462):

```text
## Ingestão diária de embeddings (KJV)
- pendentes: mais de 200
- vacuum em andamento: não
- latência da sondagem (mediana de 3): 162 ms
- linhas mortas: 0 · folga até o gatilho: 33610
- decisão: rodar 200
- gravados: 200 de 200 em 36 s
- parada: concluído
- pendentes antes da rodada: mais de 200
```

Gravados exatamente **200 de 200 versículos em 36 segundos**, com parada limpa.

---

## 4. Medições Pós-Rodada no Banco e em Produção

### 4.1. Versículos Pendentes da KJV

Consulta executada com `statement_timeout = '15s'`:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM "BibleVerse"
WHERE translation = 'KJV' AND embedding IS NULL;
```

**Plano e Execução:**

```text
Aggregate  (cost=89.01..89.02 rows=1 width=8) (actual time=9.757..9.758 rows=1 loops=1)
  Buffers: shared hit=92 dirtied=1
  ->  Index Only Scan using "BibleVerse_embedding_pending_idx" on "BibleVerse"  (cost=0.29..80.12 rows=3556 width=0) (actual time=0.948..8.760 rows=13877 loops=1)
        Index Cond: (translation = 'KJV'::text)
        Heap Fetches: 236
        Buffers: shared hit=92 dirtied=1
Planning Time: 4.675 ms
Execution Time: 10.678 ms
```

- **Versículos pendentes:** **13.877** (exatamente `14.077 - 200 = 13.877`).
- **Uso do índice:** `Index Only Scan` via `BibleVerse_embedding_pending_idx` em **10,68 ms** com apenas 92 buffers lidos em memória.

### 4.2. Tamanho do Índice Compacto `BibleVerse_embedding_bq_hnsw_idx`

```sql
SELECT pg_size_pretty(pg_relation_size('"BibleVerse_embedding_bq_hnsw_idx"')),
       pg_relation_size('"BibleVerse_embedding_bq_hnsw_idx"');
```

- **Tamanho:** **64.700.416 bytes** (`62 MB` / 61,70 MB). Índice estável dentro da margem esperada.

### 4.3. Linhas Mortas (`n_dead_tup`) em `BibleVerse`

```sql
SELECT relname, n_dead_tup, n_live_tup, last_vacuum, last_autovacuum
FROM pg_stat_user_tables WHERE relname = 'BibleVerse';
```

- **`n_dead_tup`:** **200** (exatamente as 200 tuplas atualizadas na rodada).
- **Folga até o autovacuum:** > 33.400 linhas mortas (limiar muito distante do gatilho).

### 4.4. Validação da Busca Híbrida em Produção (Render)

Requisição HTTP real ao endpoint de busca:

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\nTIME_TOTAL:%{time_total}s\n" \
  "https://theosphere.onrender.com/api/v1/search/verses?q=love&translation=KJV&limit=5"
```

**Resultado:**

- **Status HTTP:** `200 OK`
- **Tempo Total:** `4.41 s` (tempo de rede + 4055 ms no servidor Render)
- **`meta.vectorArm`:** `"ok"`
- **Detalhamento do timing interno:**
  - `vectorMs`: 4054 ms
  - `keywordMs`: 1127 ms
  - `fusionMs`: 1 ms
  - `totalMs`: 4055 ms
- **Retorno:** 5 versículos da KJV perfeitamente ranqueados por Reciprocal Rank Fusion com `vectorRank` e `keywordRank` preenchidos.

---

## 5. Diretriz Operacional para o Restante

Conforme aprovado e instruído pelo dono e pelo Claude Code:

- **Nenhuma outra rodada manual será disparada.**
- O restante dos 13.877 versículos da KJV será processado gradualmente de forma 100% autônoma pelo agendamento noturno do GitHub Actions (`0 6 * * *` UTC = 03:00 BRT), respeitando os limites estritos de I/O do Supabase Nano e o gatilho de autovacuum.
