# Prompt: incidente de vacuum no Supabase e ingestão diária de embeddings

> Cole este arquivo inteiro no Antigravity. Antes de começar, leia o
> `AGENTS.md`. Ao terminar, o Claude Code vai **auditar** cada passo
> de forma independente, só com leitura. Por isso, registre a saída exata de
> cada comando no relatório pedido no fim.

## CONTEXTO MEDIDO (2026-11-08, 20:02 BRT, Claude Code)

- **Projeto Supabase:** `chjywahtwktqqxqlthvc`, compute **Nano (512 MB de RAM)**, Postgres 17.6.
- **Tabela `public."BibleVerse"`:**
  - 186.476 linhas vivas e **59.361 linhas mortas**;
  - 6 índices, incluindo o HNSW `BibleVerse_embedding_hnsw_idx`, com **753 MB**.
- **O que aconteceu:**
  - um autovacuum em `BibleVerse` ficou mais de 6 horas preso na fase `vacuuming indexes`;
  - esse autovacuum sumiu por volta das 19:50 BRT, e não sabemos quem o cancelou;
  - às 19:53 começou outro (pid `567481`), que às 20:02 estava de novo na fase `vacuuming indexes`, com **5 de 6** índices prontos. Falta o HNSW.
- **Por que isso trava o banco:** o índice HNSW não cabe na RAM, e a limpeza dele lê o índice inteiro do disco. O painel mostra o aviso "about to deplete its Disk IO Budget" e CPU a 95%.
- **Efeito:** `GET /api/v1/search/verses` em produção passa de **60 s**. A leitura dos capítulos funciona, mas lenta (cerca de 4 s).
- **Causa original:** cerca de 17 mil UPDATEs de embedding da KJV numa só tarde. A KJV está com **17.035 de 31.112** versículos com embedding; faltam **14.077**.

## REGRAS

- **Não use `git stash`.** O stash é compartilhado entre worktrees e existe um `stash@{0}` que não é seu.
- **Não exponha segredos.**
  - Não imprima, não commite e não cole no relatório a URL do banco nem a chave do Gemini.
  - Segredos vão só para o painel do GitHub (Settings → Secrets and variables → Actions).
- **Billing é decisão do dono.**
  - **Não** altere o compute nem o plano do Supabase sem uma ordem explícita do dono nesta conversa.
  - Se ele não der essa ordem, pule a Fase 2 e registre "não autorizado".
- **Não gere embeddings** fora do workflow da Fase 4 e não rode `povoar-embeddings-livres.ts`.
- **Reporte falhas com fidelidade.** Se um passo falhar, pare a fase, registre a saída e siga para o relatório. Não improvise outro caminho.

---

## FASE 1: restabelecer o site (agora)

Rode no SQL Editor do Supabase ou pelo Supabase MCP (`execute_sql`).

**1.1 Estado atual:**

```sql
SELECT pid, now() - query_start AS duracao, query
FROM pg_stat_activity
WHERE query ILIKE 'autovacuum%' AND state = 'active';

SELECT relid::regclass, phase, indexes_total, indexes_processed
FROM pg_stat_progress_vacuum;
```

**1.2 Cancelar e desligar.** Rode as duas instruções **na mesma execução**: se ficar um intervalo entre elas, o Postgres relança o autovacuum em cerca de 1 minuto.

```sql
SELECT pid, pg_cancel_backend(pid) AS cancelado
FROM pg_stat_activity
WHERE query ILIKE 'autovacuum%' AND query ILIKE '%BibleVerse%';

ALTER TABLE public."BibleVerse" SET (autovacuum_enabled = false);
```

Se `pg_cancel_backend` devolver `false` ou der erro de permissão, registre a mensagem exata e rode o `ALTER TABLE` mesmo assim.

O `ALTER TABLE` precisa do mesmo tipo de lock que o vacuum (`SHARE UPDATE EXCLUSIVE`). Se o vacuum ainda estiver rodando, o Postgres **cancela o autovacuum sozinho**, cerca de 1 s depois, para liberar o `ALTER`, porque autovacuum comum cede a quem pede lock. Por isso o `ALTER` deve terminar em poucos segundos.

Se ele ficar esperando mais de 2 minutos, é sinal de que o vacuum em curso é o obrigatório contra estouro de IDs, que não cede. Nesse caso, cancele o `ALTER`, registre e pare a fase:

```sql
SELECT pid, query, now() - query_start FROM pg_stat_activity
WHERE query ILIKE '%wraparound%' OR query ILIKE 'autovacuum%';
```

**1.3 Confirmar:**

```sql
SELECT relname, reloptions FROM pg_class WHERE relname = 'BibleVerse';
-- esperado: {autovacuum_enabled=false}
```

**1.4 Esperar 2 minutos e conferir:**

```sql
SELECT pid, now() - query_start AS duracao, state, left(query, 80) AS query
FROM pg_stat_activity
WHERE state <> 'idle'
ORDER BY duracao DESC NULLS LAST
LIMIT 10;
```

Esperado: nenhum `autovacuum: VACUUM ANALYZE public.BibleVerse`.

**1.5 Medir em produção**, com palavras **novas** a cada chamada, porque o backend guarda buscas em cache por 10 minutos:

```bash
for q in "living%20water" "bread%20of%20life" "light%20of%20the%20world"; do
  curl -s -m 60 -o /dev/null -w "$q %{http_code} %{time_total}s\n" \
    "https://theosphere.onrender.com/api/v1/search/verses?q=$q&translation=KJV&limit=5"
done
```

Registre os três tempos e a CPU do painel do Supabase (Reports → Database), antes e depois.

> ⚠️ **Não reabilite o autovacuum nesta fase.** A tabela tem cerca de 59 mil linhas mortas. Qualquer gatilho que você configure agora (inclusive `threshold = 10000`, `scale_factor = 0.1`, que dá cerca de 28,6 mil) já está ultrapassado, e o vacuum recomeçaria na hora. `cost_delay` e `cost_limit` mais lentos não ajudam no Nano: o vacuum anterior já era limitado pelo disco (cerca de 7 blocos/s), e eles só o fazem durar mais.

O Postgres continua rodando o vacuum obrigatório contra estouro de IDs de transação mesmo com `autovacuum_enabled = false`. Por isso, deixar desligado por algumas semanas é seguro.

## FASE 2: compute (só com ordem do dono)

Mostre ao dono o compute atual e os preços das opções **Small (2 GB)** e **Medium (4 GB)**, como aparecem em Project Settings → Compute and Disk.

Só mude se ele mandar. A troca reinicia o banco por alguns minutos.

Depois da troca, registre:

```sql
SHOW shared_buffers;
SHOW maintenance_work_mem;
SHOW effective_cache_size;
```

## FASE 3: limpeza controlada (só depois da Fase 2 concluída)

Se o compute **não** foi aumentado, **pule esta fase** e deixe o autovacuum desligado. Rodar um vacuum no Nano reproduz o incidente.

Se foi aumentado:

1. Faça num horário sem usuários.
2. Rode, **sem** cancelar no meio. Pode levar de minutos a horas.
   - **Não use o SQL Editor do Supabase.** Ele manda várias instruções como um bloco só, e o `VACUUM` falha com "cannot run inside a transaction block". Além disso, o editor tem tempo limite.
   - Use `psql` no terminal, com a `DIRECT_URL` do `backend/.env` (pooler em modo sessão, que mantém o `SET` e aceita comandos longos).
   - Envie **uma instrução por vez**:
   ```bash
   psql "$DIRECT_URL"
   ```
   ```sql
   SET statement_timeout = 0;
   SET maintenance_work_mem = '256MB';
   VACUUM (VERBOSE, ANALYZE) public."BibleVerse";
   ```
   Se a conexão cair no meio, o vacuum é desfeito sem dano. Registre e tente de novo uma vez.
3. Registre a saída final do `VERBOSE`: linhas removidas e tempo por índice.
4. Confira:
   ```sql
   SELECT n_dead_tup, n_live_tup, last_vacuum FROM pg_stat_user_tables WHERE relname = 'BibleVerse';
   ```
5. Só então religue, voltando aos padrões do Postgres:
   ```sql
   ALTER TABLE public."BibleVerse" RESET (autovacuum_enabled);
   SELECT relname, reloptions FROM pg_class WHERE relname = 'BibleVerse';
   ```

## FASE 4: ingestão diária de embeddings

O Claude Code já escreveu e testou o código na branch `feat/ingestao-diaria-embeddings` (commit `af64c6a`). São três arquivos novos:

| Arquivo                                            | O que faz                                 |
| -------------------------------------------------- | ----------------------------------------- |
| `backend/src/rag/daily-embedding-budget.ts`        | Decide se roda e quanto                   |
| `backend/src/rag/daily-embedding-budget.spec.ts`   | 7 testes, com teste de mutação feito      |
| `backend/scripts/ingestao-diaria-embeddings.ts`    | A rodada em si                            |
| `.github/workflows/ingestao-diaria-embeddings.yml` | Agenda 03:00 BRT e permite disparo manual |

O script **só roda** quando:

- não há vacuum em `BibleVerse`;
- a sondagem do banco responde em até 2 s;
- a rodada não leva as linhas mortas ao gatilho do autovacuum (com margem de 10%).

Ele grava 25 versículos por vez, com 2 s de pausa, até 2.000 por dia. Para no primeiro erro de gravação, na primeira gravação acima de 10 s ou ao atingir 30 minutos.

Passos:

1. **Segredos no GitHub:**
   - **`SUPABASE_DIRECT_URL`:** a mesma `DIRECT_URL` do `backend/.env`. Não copie para nenhum arquivo.
   - **`GEMINI_API_KEY`:** já existe no repositório, mas pode ser a chave **antiga**, de antes da troca de 2026-11-07. Atualize com a chave atual, a mesma que está no Render.
2. **Verificar e mesclar:**

   ```bash
   git fetch origin && git checkout feat/ingestao-diaria-embeddings
   cd backend && npm run verificar      # esperado: 540 testes, 57 suítes
   ```

   Se passar, mescle na `main` e faça o push. O agendamento do GitHub só vale na branch padrão.

   > ⚠️ O push na `main` dispara o deploy automático do Render, e o `start` roda `prisma migrate deploy` contra o banco. **Só faça o push depois que a Fase 1.5 mostrar a busca respondendo em menos de 5 s.** Com o banco ainda travado, o deploy pode falhar. O Render mantém a versão anterior no ar, mas o deploy fica vermelho. Depois do push, confira se o deploy do Render terminou com sucesso e registre.

3. **Sondagem sem gravar:**
   - Actions → "Ingestão diária de embeddings" → Run workflow, com `dry_run = true`;
   - copie o resumo da execução (Summary) para o relatório.
4. **O que esperar:** enquanto a tabela tiver cerca de 59 mil linhas mortas, a decisão esperada é **"adiar: folga de linhas mortas esgotada"**. Isso é o comportamento correto, não um defeito. A ingestão só vai rodar depois da Fase 3.
   - Se a decisão for "rodar" com mais de 33 mil linhas mortas, **pare** e registre: a trava falhou.
5. **Uma rodada real pequena**, só se a Fase 3 tiver sido concluída e o dry-run disser "rodar":
   - Run workflow com `limit = 200` e `dry_run = false`;
   - registre o resumo e a busca da Fase 1.5 logo depois.

---

## RELATÓRIO PARA AUDITORIA

Salve em `audit/reports/incidente-vacuum-2026-11-08.md` e faça commit **só** desse arquivo.

Para cada passo (1.1, 1.2, 1.3, 1.4, 1.5, 2, 3.2, 3.4, 3.5, 4.1 a 4.5), registre:

- **horário** (BRT);
- **comando exato** (SQL ou shell; segredos mascarados);
- **saída integral**, ou o trecho relevante quando for muito longa;
- **status:** feito, falhou (com a mensagem) ou pulado (com o motivo).

No fim, liste o que você **não** conseguiu verificar.

### O que o Claude Code vai conferir depois

O Claude Code vai conferir de forma independente, com consultas somente de leitura:

- `reloptions` de `BibleVerse` e se há vacuum em andamento;
- `n_dead_tup`, `last_vacuum` e `last_autovacuum`;
- tamanho do HNSW e `shared_buffers` (para confirmar o compute);
- tempo da busca em produção, com palavras novas;
- versículos KJV com embedding, para comparar com o resumo do workflow;
- que a `main` contém `af64c6a` e que o workflow aparece no Actions;
- que nenhum segredo entrou no git (`git log -p` do seu commit).
