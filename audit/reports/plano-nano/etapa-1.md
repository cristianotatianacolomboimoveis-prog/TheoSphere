# Relatório de Operação: Plano Nano — Etapa 1 (Sondagem da Ingestão Diária Barata)

Data: 2026-11-08  
Horário: 20:53 BRT  
Branch: `etapa-1/sondagem-ingestao-barata` (baseada na `main` em `f41aee6`)

---

## 1. Pré-Requisitos e Correções da Auditoria

### 1.1 Publicação da Etapa 0 e Verificação de Produção

- **Horário:** 20:48 BRT (2026-11-08)
- **Comando Shell (Push):**
  ```bash
  git push origin main
  ```
- **Saída:**
  - Testes pré-push aprovados: Backend 540 testes Jest (57 suítes); Frontend 69 testes Vitest (9 specs).
  - Push concluído com sucesso: `4995cd1..f41aee6  main -> main`.

- **Conferência de Deploy em Produção:**
  - **Render Backend (`https://theosphere.onrender.com/api/v1/health/live`):**
    ```bash
    curl -s -w "\nHTTP %{http_code} time: %{time_total}s\n" https://theosphere.onrender.com/api/v1/health/live
    ```
    Saída: `{"status":"ok"}`, `HTTP 200`, tempo: `0.478s`.
  - **Vercel Frontend (`https://frontend-v2-lake.vercel.app`):**
    ```bash
    curl -s -I -o /dev/null -w "HTTP %{http_code} time: %{time_total}s\n" https://frontend-v2-lake.vercel.app
    ```
    Saída: `HTTP 200`, tempo: `0.841s`.

### 1.2 Correção dos Achados da Auditoria da Etapa 0

1. **Registro da Falha de Conexão na Sondagem de `reloptions`:**
   No final da Etapa 0, uma tentativa de leitura via script node direto com pooler falhou com código de saída 1:
   ```text
   error: Failed to connect to database: authentication did not complete within 15000ms
   code: '08006' (severity: FATAL)
   ```
   Registrado formalmente: comandos locais pontuais com conexão direta/pooler no Nano sofrem com estrangulamento de timeout durante picos de concorrência.
2. **Correção de `autovacuum_vacuum_cost_limit`:**
   O valor real presente nas `reloptions` da tabela `BibleVerse` confirmado pela auditoria do Claude Code é:
   `autovacuum_vacuum_cost_limit=100` (e não `500` como constou por erro de digitação no relatório anterior).

---

## 2. Implementação de Código (Itens 1, 2 e 4)

### 2.1 Item 1: Ordem das Checagens e Early-Exit Barato

- **Problema:** A implementação anterior disparava `SELECT count(*)::int AS pending FROM "BibleVerse" WHERE ... AND embedding IS NULL` antes de avaliar o estado de saúde do banco e a folga de linhas mortas. No compute Nano (512 MB RAM), essa varredura sequencial estourou o statement timeout de 30s.
- **Solução Implementada (`backend/src/rag/daily-embedding-budget.ts` e `backend/scripts/ingestao-diaria-embeddings.ts`):**
  - Checagens baratas prioritárias:
    1. `vacuumRunning` em `pg_stat_progress_vacuum` (consulta de catálogo instantânea);
    2. `probeLatencyMs` (mediana de 3 leituras indexadas por chave primária);
    3. `headroom` (calculado via `pg_class.reltuples`, `pg_stat_user_tables.n_dead_tup` e opções da tabela).
  - Se qualquer uma dessas condições mandar adiar (ex.: `headroom <= 0`), o script **NÃO** executa nenhuma consulta de contagem na tabela e encerra com código 0 indicando o motivo da trava.

### 2.2 Item 2: Contagem Limitada (`prePlan.limit + 1`)

- **Solução Implementada:**
  Quando as checagens baratas aprovam a execução, a contagem de versículos pendentes é limitada ao teto da rodada planejado mais um:
  ```sql
  SELECT count(*)::int AS count FROM (
    SELECT 1 FROM "BibleVerse"
    WHERE translation = ANY($1) AND embedding IS NULL
    LIMIT <limite+1>
  ) s
  ```

  - Se a contagem ultrapassar `<limite>`, a função `formatLimitedPending` formata a exibição como `"mais de N"`.
  - Se for menor ou igual, exibe a contagem exata (ex.: `"350"`).

### 2.3 Item 3 (Preparação de Código): Arquivo SQL de Índice Parcial

- **Arquivo Criado:** `docs/architecture/sql/bibleverse_embedding_pending_idx.sql`
- **Conteúdo:**

  ```sql
  SET statement_timeout = 0;

  CREATE INDEX CONCURRENTLY IF NOT EXISTS "BibleVerse_embedding_pending_idx"
    ON "BibleVerse" (translation, "bookId", chapter, verse)
    WHERE embedding IS NULL;
  ```

- **Conformidade:** O arquivo não foi incluído em `prisma/migrations/` porque `CREATE INDEX CONCURRENTLY` não pode rodar dentro de transações do Prisma Migrate.

### 2.4 Item 4: Testes Unitários e Teste de Mutação

- **Arquivo de Testes:** `backend/src/rag/daily-embedding-budget.spec.ts`
- **Novos Testes Adicionados:**
  - `formatLimitedPending`:
    - `"contagem limitada mostra mais de N"`
    - `"mostra número exato quando abaixo ou igual ao limite"`
  - `evaluateEmbeddingBudgetWithEarlyExit`:
    - `"checagem barata manda adiar → não conta pendentes (folga esgotada)"`
    - `"checagem barata manda adiar → não conta pendentes (vacuum em andamento)"`
    - `"checagem barata manda adiar → não conta pendentes (banco lento)"`
    - `"checagem barata aprova e contagem limitada mostra mais de N"`
    - `"checagem barata aprova mas contagem retorna 0 (nada pendente)"`
- **Resultado do Jest:** 15 testes passando em `daily-embedding-budget.spec.ts`.
- **Teste de Mutação Executado:**
  - _Mutação:_ Inserida chamada incondicional `await countPendingFn(999);` antes da validação de `prePlan.run` em `evaluateEmbeddingBudgetWithEarlyExit`.
  - _Detecção:_ A suíte de testes falhou imediatamente com 3 erros (`expect(jest.fn()).not.toHaveBeenCalled()`, Expected calls: 0, Received: 1).
  - _Restauração:_ Mutação revertida e suíte 100% verde restabelecida.

### 2.5 Verificação Geral da Suíte

- **Comando:** `cd backend && npm run verificar`
- **Resultados Medidos:**
  - `prisma generate`: Sucesso (v7.10.0)
  - `nest build`: Sucesso (0 erros)
  - `tsc --noEmit -p tsconfig.json`: 0 erros
  - `jest`: **548 testes passando** em **57 suítes** (+8 testes novos)
  - `eslint`: 0 erros
  - `node audit/scripts/static-checks.mjs`: 0 elementos sem handler, 0 rotas fantasma, 0 falhas silenciosas, 0 PrismaClient sem adapter.

---

## 3. O que NÃO foi Verificado (Bloqueado até a Janela Noturna 00:00 - 06:00 BRT)

Conforme instrução expressa do usuário e determinação da Seção 3.1 do `AGENTS.md` ("DDL e leituras grandes só entre 00:00 e 06:00 BRT"):

1. **Criação do Índice Parcial no Supabase (Item 3):**
   A execução de `CREATE INDEX CONCURRENTLY "BibleVerse_embedding_pending_idx"` no banco de produção não foi executada. O script SQL está preparado e aguarda a janela autorizada entre 00:00 e 06:00 BRT.
2. **Teste de Ponta a Ponta Real (Item 5):**
   A execução de `npx tsx scripts/ingestao-diaria-embeddings.ts KJV 2000 --dry-run` contra o banco em produção está agendada para o mesmo período noturno.
