# Relatório de Operação: Plano Nano — Etapa 4 (Índice Compacto e Redução de Disco da BibleVerse)

Data: 2026-11-10  
Horário de Execução: 11:01 UTC às 11:10 UTC (08:01 BRT às 08:10 BRT)  
Ambiente: Supabase Nano (sa-east-1, São Paulo) & Render Production (`https://theosphere.onrender.com`)  
Branch: `main`

---

## 1. Autorização e Exceção de Horário

- **Exceção Concedida pelo Mantenedor:** O dono do projeto autorizou expressamente uma exceção pontual ao horário da Seção 3.1 do `AGENTS.md` exclusivamente para a execução da Etapa 4 hoje, com base no fato de não haver usuários simultâneos no sistema e do estado de saúde estável do banco de dados.
- **Janela Noturna Preservada para Manutenção Pesada:** Em estrito cumprimento à determinação do dono, o `VACUUM (VERBOSE, ANALYZE)` manual e o `RESET` dos parâmetros de autovacuum **não** foram executados nesta sessão diurna e permanecem agendados para a janela noturna (00:00 às 06:00 BRT).
- **Verificação de Vacuum Prévia:**
  ```sql
  SELECT p.phase, now() - a.query_start AS duracao
  FROM pg_stat_progress_vacuum p JOIN pg_stat_activity a USING (pid);
  ```

  - **Resultado:** 0 linhas (nenhum autovacuum ativo).
- **Verificação do Supabase Dashboard (Reports → Disk IO / Health):**
  - Status: **Healthy**
  - Disk: **44%** (limiar mínimo exigido: > 30%)
  - CPU: **2%**
  - RAM: **52%**
  - Conexões: **9 / 60**

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

## 3. Validação de Qualidade de Busca

### 3.1 Recall@10 contra `validation_sample_30.json` (60 consultas)

O teste avaliou a capacidade de recuperação dos 10 vizinhos mais próximos exatos calculados em ponto flutuante total (cosseno) versus a recuperação via índice HNSW compacto de Hamming (`bit(768)`) reordenado por cosseno com $P = 200$ e `ef_search = 200`:

| Amostra de Validação | Consultas | Recall@10 Real Medido | Portão Mínimo | Status       |
| :------------------- | :-------- | :-------------------- | :------------ | :----------- |
| **BLIVRE**           | 30        | **96,00%**            | $\ge 95,00\%$ | **APROVADO** |
| **WEB**              | 30        | **98,67%**            | $\ge 95,00\%$ | **APROVADO** |
| **Média Geral**      | **60**    | **97,33%**            | $\ge 95,00\%$ | **APROVADO** |

> _Nota metodológica:_ Na geração do arquivo `validation_sample_30.json` (`medir-quantizacao-binaria.ts:237`), a própria consulta é excluída do ground truth (`if (i === qIdx) continue;`). A consulta no banco filtrou `id != queryId` para garantir que a consulta não consumisse a primeira posição dos 10 resultados com distância 0,0, reproduzindo exatamente o cálculo de recall validado na Etapa 2.

### 3.2 Comparação dos Modos FULL vs BINARY em 10 Buscas com Palavras Novas

Buscas vetoriais reais executadas contra o banco Supabase com geração de embeddings primários Gemini (`gemini-embedding-001`, 768d), incluindo os idiomas bíblicos originais (LXX grego, WLC hebraico, TR grego):

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

- **Ganho de Latência:** O modo binário com o índice compacto reduziu o tempo médio de consulta de 801 ms para 418 ms (redução de ~48% no tempo de busca).
- **Fidelidade de Ranking:** 93% dos versículos mais relevantes do modo Full foram recuperados no Top-10 binário.

---

## 4. Remoção do Índice Antigo (`BibleVerse_embedding_hnsw_idx`)

Com todas as validações de recall ($\ge 0,95$) e sobreposição aprovadas, procedeu-se à remoção concorrente do índice pesado:

```sql
DROP INDEX CONCURRENTLY IF EXISTS "BibleVerse_embedding_hnsw_idx";
```

- **Duração do DROP:** **159 ms**.
- **Rastreabilidade de Esquema:** O índice excluído tinha sido criado originalmente pelas migrações Prisma `20260507171358_hybrid_search_indexes` e `20260515120000_hnsw_bible_cache_standardize`. Nenhuma migração Prisma adicional foi introduzida no repositório para evitar que comandos futuros tentem recriá-lo automaticamente.

---

## 5. Medição de Disco e Inventário de Índices Vetoriais

### 5.1 Redução de Tamanho do Banco de Dados

- **Tamanho do banco antes da Etapa 4:** 2.682 MB
- **Tamanho do banco após o DROP:** **1.929 MB**
- **Espaço liberado:** **753 MB** de redução direta em disco.

### 5.2 Inventário de Índices Vetoriais Ativos

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

## 6. Verificação de Integridade da Aplicação e Produção

- **Suíte de Testes e Tipos (`npm run verificar`):**
  - Build: **0 erros**
  - Typecheck: **0 erros**
  - Testes unitários Jest: **60 test suites passaram, 572 testes passaram (0 falhas)**
  - ESLint: **0 erros**
- **Sondagem Final em Produção no Render:**
  - `curl -s "https://theosphere.onrender.com/api/v1/search/verses?q=graca&limit=5"`
  - Status: **HTTP 200 OK**
  - `meta.vectorArm`: **`"ok"`**
  - Tempo: 1.586 ms

---

## 7. Próximos Passos Agendados

1. **Janela Noturna (hoje, a partir das 00:00 BRT):**
   - Execução do `VACUUM (VERBOSE, ANALYZE) public."BibleVerse"` manual sem concorrência de escritas;
   - `RESET` das opções de autovacuum da tabela `BibleVerse`.
2. **Noite Seguinte:**
   - Execução do script de paridade de conteúdo `backend/scripts/verificar-paridade-biblioteca.ts` (Etapa 3a / 5) para liberação da remoção de `book_chunk` em `UserEmbedding`.
