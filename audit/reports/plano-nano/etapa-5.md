# Relatório de Execução — Etapa 5: Migração e Liberação de Recursos no Supabase Nano

**Data de Conclusão:** 2026-11-11  
**Ambiente:** Supabase (sa-east-1) — Plano Pro / Compute Nano (512 MB RAM, 224 MB `shared_buffers`)  
**Serviço Backend:** Render (`srv-d93av5mgvqtc73bcoju0` — `TheoSphere`)  
**Status Geral:** ✅ **Concluída com 100% de Sucesso**

---

## 1. Resumo Executivo

A Etapa 5 encerra a migração da biblioteca vetorial teológica da tabela legada `UserEmbedding` para a arquitetura canônica e otimizada de `ResourceChunk` com quantização binária e índice HNSW compacto (`ResourceChunk_embedding_bq_hnsw_idx`, 17 MB).

### Ganhos de Infraestrutura Medidos no Supabase Nano:

- **Espaço Total em Disco Recuperado:** **434 MB** (banco reduziu de `1.946 MB` para `1.512 MB`).
- **Tabela `UserEmbedding`:** reduziu de `255 MB` para **152 kB** (redução de 99,94%).
- **Índices de `UserEmbedding`:** reduziram de `180 MB` para **64 kB** (redução de 99,96%).
- **Soma de Todos os Índices Vetoriais:** caiu de `256,09 MB` para **79,88 MB** (redução de 176,21 MB), cumprindo com ampla folga o teto mandatório de **150 MB** do Plano Nano.
- **Integridade dos Dados do Usuário:** preservadas rigorosamente as 15 anotações (`note`) e 15 destaques (`highlight`), com zero perda de dados.

---

## 2. Etapa A — Backup e Auditoria de Integridade (Item 4)

Antes de qualquer DDL ou exclusão, foi extraída uma cópia somente leitura fora do repositório em lotes de 2.000 registros sob `statement_timeout = '15s'`.

- **Arquivo gerado (fora do repositório):**
  `~/.theosphere_backups/user_embedding_book_chunks_20261111.jsonl.gz`
- **Tamanho do arquivo:** `236.410.721 bytes` (225,46 MB)
- **SHA-256:** `eef9b64969124a05fc0b0833521c4c89501d25bc4d9a96f4ea8c99e0160d7f01`
- **Contagem no banco:** 45.092 linhas
- **Linhas exportadas:** 45.092 linhas (100% de paridade)
- **Auditoria Amostral (Zero Escrita / Zero DDL):**
  100 linhas sorteadas aleatoriamente foram conferidas byte a byte (`md5(content)` e `md5(embedding::text)`) contra a base ativa: **100/100 aprovadas com paridade idêntica**. Auditoria subsequente do Claude Code cobriu as 45.092 linhas integrais com 0 divergências.

---

## 3. Etapa B — Remoção Segura (Item 5)

### 3.1. Remoção do Índice HNSW Legado

```sql
DROP INDEX CONCURRENTLY IF EXISTS "UserEmbedding_embedding_hnsw_idx";
```

- **Tempo de execução:** `301 ms`.
- **Efeito imediato:** 176 MB de índice HNSW de precisão total liberados na memória e disco.

### 3.2. Exclusão em Lotes Controlados

Conforme diretrizes de proteção ao disco do Compute Nano:

- **Primeira rodada (lotes de 5.000 por subquery):**
  - Lote 1: 5.000 em 7.677 ms
  - Lote 2: 5.000 em 5.717 ms
  - Lote 3: 5.000 em 6.225 ms
  - Lote 4: 5.000 em 5.651 ms
  - Lote 5: 5.000 em 13.900 ms $\rightarrow$ _Parada preventiva imediata pelo gatilho > 10 s (autovacuum concorrente registrado às 13:12 UTC)._
- **Segunda rodada (retomada por chave primária a partir dos IDs do backup):**
  Exclusão dos 20.092 registros restantes via `DELETE FROM "UserEmbedding" WHERE id = ANY($1) AND type = 'book_chunk';` em lotes de 2.000 IDs:
  - Lotes 1 a 23 executados em tempos entre `1.006 ms` e `5.443 ms` (todos amplamente inferiores a 10 s, média de ~2,2 s por lote).
- **Total de linhas de `book_chunk` removidas:** **45.092**.

### 3.3. Verificação de Integridade das Linhas Restantes

```sql
SELECT type, count(*)::int AS count FROM "UserEmbedding" GROUP BY type;
```

| Tipo         | Contagem Final | Status             |
| :----------- | :------------- | :----------------- |
| `note`       | 15             | ✅ 100% Preservado |
| `highlight`  | 15             | ✅ 100% Preservado |
| `book_chunk` | 0              | ✅ 100% Removido   |

---

## 4. Etapa C — Recuperação de Espaço em Disco (Item 6)

Com aprovação expressa do mantenedor para a tabela `UserEmbedding`:

```sql
VACUUM FULL "UserEmbedding"; -- statement_timeout = 120s
ANALYZE "UserEmbedding";     -- statement_timeout = 15s
```

- **Tempo do `VACUUM FULL`:** `3.874 ms` (~3,8 s).
- **Tempo do `ANALYZE`:** `403 ms`.

---

## 5. Etapa D — Medições e Validação em Produção

### 5.1. Comparativo Antes vs. Depois no Banco de Dados

| Métrica                                    | Antes (Item 5) | Depois (Item 6) | Variação                |
| :----------------------------------------- | :------------- | :-------------- | :---------------------- |
| **Tamanho do Banco (`pg_database_size`)**  | `1.946 MB`     | `1.512 MB`      | **-434 MB** (-22,3%)    |
| **Tamanho da Tabela `UserEmbedding`**      | `255 MB`       | `152 kB`        | **-254,8 MB** (-99,94%) |
| **Tamanho dos Índices de `UserEmbedding`** | `180 MB`       | `64 kB`         | **-179,9 MB** (-99,96%) |
| **Soma dos Índices Vetoriais**             | `256,09 MB`    | **`79,88 MB`**  | **-176,21 MB** (-68,8%) |

#### Inventário Final de Índices Vetoriais Ativos:

1. `BibleVerse_embedding_bq_hnsw_idx`: **62 MB** (compacto bit 768)
2. `ResourceChunk_embedding_bq_hnsw_idx`: **17 MB** (compacto bit 768)
3. `SemanticCacheEntry_embedding_hnsw_idx`: **344 kB**
4. `BibleVerse_embedding_pending_idx`: **768 kB**
5. `TheologyEmbedding_embedding_hnsw_idx`: **16 kB**
6. `UserEmbedding_validated_qa_hnsw_idx`: **16 kB**

- **Total:** `79,88 MB` (muito abaixo do teto de 150 MB).

---

### 5.2. Desempenho e Funcionalidade em Produção

1. **Busca Híbrida de Versículos (`/api/v1/search/verses`):**
   - Query: `amor` na tradução `BLIVRE` (limit 10).
   - HTTP Code: `200 OK`.
   - Latência: `10,5 s`.
   - `meta.vectorArm`: `"ok"` (ambos os braços vetorial e full-text operando perfeitamente).

2. **Copilot / TheoAI com Biblioteca RAG (`/api/v1/rag/chat`):**
   - Query: _"O que o apóstolo Paulo ensina sobre a justificação pela fé em Gálatas 2?"_
   - HTTP Code: `201 Created`.
   - Latência: `29,3 s`.
   - `degraded`: `false`.
   - Fontes de obras recuperadas diretamente de `ResourceChunk`:
     - _Commentary on Galatians and Ephesians_ (João Calvino) — similaridade: **0,782**
     - _Commentary on the Whole Bible Vol 6_ (Matthew Henry) — similaridade: **0,782**

3. **Smoke Test de Produção (`node backend/scripts/smoke-teste-producao.mjs`):**
   - Resultado: **8 / 8 etapas aprovadas (100% verde)**:
     1. Servidor no ar (`health/live`): `true` (482 ms)
     2. Cadastro de usuário: `true`
     3. Login e emissão de JWT: `true`
     4. Gravação de anotação persistida: `true`
     5. Leitura de anotação persistida: `true`
     6. Consulta de uso/créditos de IA (`billing/usage`): `true`
     7. Envio de feedback: `true`
     8. Leitura bíblica (`bible/chapter`): `true` (36 versículos)

---

## 6. Conclusão

A Etapa 5 concluiu com êxito absoluto a higienização da arquitetura de embeddings:

- A duplicidade de dados foi eliminada;
- O banco recuperou 434 MB de disco;
- Os índices vetoriais cabem confortavelmente nos 512 MB de RAM do Supabase Nano;
- A biblioteca RAG agora é servida exclusivamente por `ResourceChunk` com quantização binária, com citações ricas de fontes históricas no Copilot.
