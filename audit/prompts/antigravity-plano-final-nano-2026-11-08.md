# Prompt: plano final do TheoSphere dentro do compute Nano do Supabase

> Cole este arquivo inteiro no Antigravity. Ele reúne **tudo o que falta**
> para fechar o projeto daqui para frente.
>
> **Como funciona:** você executa **uma etapa por vez**. Ao fim de cada etapa:
>
> 1. grava o relatório da etapa;
> 2. faz commit dele;
> 3. **para**.
>
> O dono leva o relatório ao Claude Code, que confere tudo de forma
> independente. Só então você recebe o "pode seguir" para a próxima etapa.
> **Não emende etapas.**

## LEIA PRIMEIRO

1. `AGENTS.md` inteiro, em especial a seção **3.1 Restrição de compute: Supabase Nano**.
   - Se ela ainda não estiver na `main`, está na branch `docs/restricao-compute-nano` (commit `f78286b`). A Etapa 0 faz o merge.
2. `audit/reports/incidente-vacuum-2026-11-08.md`, o seu relatório anterior, e a seção "CORREÇÕES DA AUDITORIA" abaixo.

## A RESTRIÇÃO QUE MANDA EM TUDO

O dono decidiu: **o TheoSphere funciona no compute Nano do Supabase**. Aumentar o compute **não** é uma opção, nem como sugestão no relatório.

| Recurso                        | Valor medido |
| ------------------------------ | ------------ |
| RAM                            | 512 MB       |
| `shared_buffers`               | 224 MB       |
| `maintenance_work_mem`         | 32 MB        |
| Disco depois do Disk IO Budget | 5 MB/s       |
| Banco                          | 2.620 MB     |

**Índices vetoriais hoje (2026-11-08, 20:25 BRT, medidos pelo Claude Code):**

| Índice                                  | Tamanho    | Problema                                                                                 |
| --------------------------------------- | ---------- | ---------------------------------------------------------------------------------------- |
| `BibleVerse_embedding_hnsw_idx`         | **753 MB** | Maior que a RAM. É a causa do incidente                                                  |
| `UserEmbedding_embedding_hnsw_idx`      | 176 MB     | Indexa 45.092 trechos de livros (`type = 'book_chunk'`) que **duplicam** `ResourceChunk` |
| `SemanticCacheEntry_embedding_hnsw_idx` | 344 kB     | ok                                                                                       |
| `TheologyEmbedding_embedding_hnsw_idx`  | 16 kB      | ok                                                                                       |
| `UserEmbedding_validated_qa_hnsw_idx`   | 16 kB      | ok                                                                                       |

**Situação da tabela `BibleVerse` agora:**

- `autovacuum_enabled=false`, com mais 4 opções gravadas no incidente: `threshold=10000`, `scale_factor=0.1`, `cost_delay=40` e `cost_limit` (o Claude Code leu `100`; o seu relatório diz `500`, então confira e registre);
- **59.361 linhas mortas** e 186.476 vivas;
- KJV com **17.035 de 31.112** versículos com embedding.

**Meta final:**

- índices vetoriais somando **menos de 150 MB**;
- autovacuum religado com os padrões do Postgres;
- busca em produção abaixo de 2 s com palavras novas;
- KJV completa.

## REGRAS (valem para todas as etapas)

- **Seção 3.1 do `AGENTS.md`:**
  - antes de qualquer escrita ou DDL, confira `pg_stat_progress_vacuum`;
  - índices só com `CONCURRENTLY`;
  - DDL e leituras grandes só **entre 00:00 e 06:00 BRT**;
  - uma conexão por script;
  - `SET statement_timeout` explícito em toda sessão.
- **Proibido:**
  - aumentar o compute;
  - rodar `VACUUM` em `BibleVerse` enquanto o índice de 753 MB existir;
  - rodar `povoar-embeddings-livres.ts`;
  - rodar `UPDATE`/`DELETE` em mais de 5.000 linhas por execução;
  - usar `git stash` (existe um `stash@{0}` alheio);
  - tirar segredos do `.env` (não imprima, não commite, não cole no relatório).
- **Fidelidade no relatório.** Cada número precisa ter saído de um comando que você rodou, com o comando e a saída colados.
  - **Nunca apresente cálculo feito à mão como se fosse saída de programa.** Se você calcular, escreva "calculado à mão".
  - "Normal", "ok" e "estável" só valem com o número ao lado e o critério da etapa.
- **Falha:** pare a etapa, registre a saída integral e grave o relatório. Não improvise outro caminho.
- **Testes:** nunca desabilite teste nem lint. Todo código novo vem com teste do caminho de falha e um **teste de mutação** (quebre a lógica, mostre o teste falhando, reverta).
- **Verificação de código:** `cd backend && npm run verificar` (hoje são 540 testes em 57 suítes) e `node audit/scripts/static-checks.mjs`.
- **Branches.** Cada etapa com código usa a sua branch, `etapa-N/<nome>`. Merge na `main` só com a verificação verde.
  - O push na `main` dispara o deploy do Render (que roda `prisma migrate deploy`) e o da Vercel. Confira se os dois terminaram com sucesso e registre.

**Relatório de cada etapa:** `audit/reports/plano-nano/etapa-N.md`, com:

- horário (BRT) de cada passo;
- comando exato;
- saída;
- status: feito, falhou ou pulado (com o motivo);
- tamanho do banco e dos índices vetoriais **antes e depois**, quando a etapa mexe no banco;
- uma seção final **"O que não foi verificado"**.

---

## CORREÇÕES DA AUDITORIA DO SEU RELATÓRIO ANTERIOR

O Claude Code conferiu `audit/reports/incidente-vacuum-2026-11-08.md`:

1. **4.3/4.4:**
   - a contagem de pendentes estourou 30 s, o que faz o script sair com erro **antes** de calcular a decisão;
   - o texto "decisão: adiar…" não pode ter saído do script; foi calculado à mão;
   - a trava existe no código e tem testes, mas **não foi exercitada de ponta a ponta**. A Etapa 1 corrige a sondagem e repete o teste.
2. **1.5:** 16 s **não** é latência normal. Critério deste plano: abaixo de 2 s.
3. **1.3:** confira o valor real de `autovacuum_vacuum_cost_limit` (`SELECT reloptions FROM pg_class WHERE relname = 'BibleVerse'`).
4. **4.1:** os segredos **não** foram cadastrados, porque não havia acesso ao GitHub. Até isso ser feito, o workflow das 03:00 falha toda noite por falta de `SUPABASE_DIRECT_URL`. A falha não causa dano. Veja a Etapa 6.

---

## ETAPA 0: arrumar a base (sem banco)

1. Faça o merge de `docs/restricao-compute-nano` na `main` (a seção 3.1 do `AGENTS.md`).
2. Faça commit dos prompts que estão fora do git em `audit/prompts/`. Antes, confira com `grep` que nenhum contém segredo (`AIza`, `postgres://`, `postgresql://`, `eyJ`, `sk-`).
3. Rode `npm run verificar` e registre os números.
4. **Pare e grave o relatório.**

## ETAPA 1: sondagem da ingestão diária barata (código)

Problema: `backend/scripts/ingestao-diaria-embeddings.ts` começa contando os pendentes com `count(*) … WHERE embedding IS NULL`, o que varre a tabela. No Nano, isso estourou o tempo limite de 30 s.

1. **Ordem das checagens.** Faça primeiro as baratas: vacuum em andamento, latência e folga de linhas mortas (consultas de catálogo). Só depois conte os pendentes. Se uma checagem barata já mandar adiar, **não** conte.
2. **Contagem limitada:**
   ```sql
   SELECT count(*) FROM (
     SELECT 1 FROM "BibleVerse"
     WHERE translation = ANY($1) AND embedding IS NULL
     LIMIT <limite+1>
   ) s
   ```
   Quando passar do limite, o resumo deve mostrar "mais de N".
3. **Índice parcial para os pendentes**, à noite, via `psql` com `DIRECT_URL` e uma instrução por vez:

   ```sql
   SET statement_timeout = 0;
   CREATE INDEX CONCURRENTLY IF NOT EXISTS "BibleVerse_embedding_pending_idx"
     ON "BibleVerse" (translation, "bookId", chapter, verse)
     WHERE embedding IS NULL;
   ```

   - Grave o SQL em `docs/architecture/sql/bibleverse_embedding_pending_idx.sql`.
   - **Não** o ponha em `prisma/migrations/`, porque `CONCURRENTLY` não roda dentro de transação.
   - Veja como o `BibleVerse_embedding_hnsw_idx` atual foi declarado (migração ou SQL avulso) e siga o mesmo padrão de documentação.
   - Mostre `EXPLAIN (ANALYZE, BUFFERS)` da contagem limitada e da seleção do lote usando o índice novo.

4. **Testes** no `daily-embedding-budget.spec.ts` ou num spec novo, para:
   - "checagem barata manda adiar → não conta pendentes";
   - "contagem limitada mostra mais de N".
5. **Teste de ponta a ponta real:** rode `npx tsx scripts/ingestao-diaria-embeddings.ts KJV 2000 --dry-run` e cole a saída integral.
   - Esperado: **"adiar: folga de linhas mortas esgotada"**, saindo do script com código 0.
6. **Pare e grave o relatório.**

## ETAPA 2: medir a qualidade do índice compacto (somente leitura, à noite)

Objetivo: decidir, com número, se um índice HNSW sobre `binary_quantize(embedding)::bit(768)` (cerca de 1 bit por dimensão, perto de 30 vezes menor), com reordenação pelo vetor completo, mantém a qualidade da busca.

1. **Exportar** `id, embedding` de **BLIVRE** (31.102) e **WEB** (30.456):
   - em páginas de 2.000 linhas, ordenadas pela chave, com 2 s de pausa entre páginas;
   - para arquivos em `backend/scratch/` (fora do git, cerca de 100 MB por tradução).
2. **Medir localmente, em Node, sem tocar no banco de novo:**
   - **Consultas:** 300 versículos sorteados de cada tradução (semente fixa, registrada) como vetor de consulta, excluindo o próprio versículo do resultado.
   - **Referência:** os 10 mais próximos por cosseno exato.
   - **Candidato:** os P mais próximos por distância de Hamming entre os vetores binarizados (bit 1 quando o valor é maior que 0, como o `binary_quantize` do pgvector), reordenados por cosseno exato, ficando com os 10 primeiros.
   - **Calcule `recall@10`**: a média de quantos dos 10 da referência aparecem no candidato. Faça para P = 40, 100 e 200.
3. **Portão de aprovação:** `recall@10 ≥ 0,95` com P ≤ 100 nas duas traduções.
   - **Se não passar:** pare. Registre a tabela P × recall e **não** siga para a Etapa 3. O dono e o Claude Code decidem o caminho.
4. **Estime o tamanho do índice:** crie o índice binário numa tabela temporária local com 5.000 vetores (num Postgres local com pgvector, se houver) ou calcule a partir do formato do pgvector. Diga qual dos dois métodos usou.
5. **Pare e grave o relatório**, com a tabela de recall e as sementes.

## ETAPA 3: busca em duas fases (código)

Só com a Etapa 2 aprovada.

1. **`backend/src/search/search.service.ts`** (consulta vetorial perto das linhas 395–410, `FROM "BibleVerse"`): crie o modo `VECTOR_INDEX_MODE=binary`.

   ```sql
   -- dentro de prisma.$transaction, para o SET LOCAL valer
   SET LOCAL hnsw.ef_search = <P>;   -- P aprovado na Etapa 2
   WITH candidatos AS (
     SELECT id, embedding FROM "BibleVerse"
     WHERE embedding IS NOT NULL AND translation = $t
     ORDER BY binary_quantize(embedding)::bit(768) <~> binary_quantize($q::vector)::bit(768)
     LIMIT <P>
   )
   SELECT id, embedding <=> $q::vector AS distance
   FROM candidatos ORDER BY distance LIMIT <k>;
   ```

   - A expressão no `ORDER BY` precisa ser **idêntica** à do índice, senão o índice não é usado.
   - O padrão do código continua sendo `full`, o comportamento atual. O modo é lido do ambiente.
   - Se a consulta binária falhar, o código registra `warn` e cai para `full`. **Nunca** devolva `[]` em silêncio. Mantenha `meta.vectorArm` coerente (`ok`, `empty` ou `failed`).

2. **Biblioteca.** `rag/library.service.ts` (perto da linha 115) e `rag/user-context.service.ts` (linhas perto de 250 e 315) buscam os livros em `"UserEmbedding" WHERE type = 'library_book'`.
   - Crie a leitura equivalente em `"ResourceChunk"`, com o mesmo modo binário, atrás de `LIBRARY_VECTOR_SOURCE=resource_chunk` (padrão `user_embedding`).
   - **Antes, prove a paridade** com uma consulta somente leitura: a mesma quantidade de trechos e os mesmos textos, por amostra de 200 ids sorteados. Registre o comando e a saída.
3. **Não mexa** em `TheologyEmbedding`, `SemanticCacheEntry`, nos `validated_qa` nem nas notas do usuário. São pequenos.
4. **Testes:**
   - o SQL do modo binário contém `binary_quantize` dos dois lados;
   - o modo `full` continua idêntico ao atual;
   - falha no modo binário cai para `full` com `warn`;
   - o `LIBRARY_VECTOR_SOURCE` escolhe a tabela certa;
   - teste de mutação em pelo menos 2 desses.
5. Faça o merge na `main` **com os dois modos no padrão antigo**. Confira os deploys do Render e da Vercel.
6. **Pare e grave o relatório.**

## ETAPA 4: trocar o índice dos versículos e limpar a tabela (produção, à noite)

Só com a Etapa 3 em produção.

1. **Criar o índice compacto**, via `psql`, uma instrução por vez:

   ```sql
   SET statement_timeout = 0;
   SET maintenance_work_mem = '64MB';
   CREATE INDEX CONCURRENTLY "BibleVerse_embedding_bq_hnsw_idx"
     ON "BibleVerse" USING hnsw ((binary_quantize(embedding)::bit(768)) bit_hamming_ops)
     WHERE embedding IS NOT NULL;
   ```

   - Pode demorar; não cancele.
   - Registre o tempo e `pg_relation_size`.
   - Se o tamanho passar de **60 MB**, pare e registre.
   - Grave o SQL em `docs/architecture/sql/`.

2. **Ligar no Render:** `VECTOR_INDEX_MODE=binary` (painel do Render → Environment) e aguarde o redeploy.
3. **Validar em produção:**
   - `EXPLAIN (ANALYZE, BUFFERS)` da consulta mostrando `BibleVerse_embedding_bq_hnsw_idx`;
   - 10 buscas com palavras **novas**, cada uma abaixo de 2 s;
   - `meta.vectorArm = "ok"`.

   Se falhar, volte a variável para `full`, registre e pare.

4. **Apagar o índice antigo** (só com o passo 3 aprovado):
   ```sql
   DROP INDEX CONCURRENTLY "BibleVerse_embedding_hnsw_idx";
   ```
   Se ele estiver declarado numa migração Prisma, registre isso. **Não** crie uma migração nova que o recrie.
5. **Limpar a tabela**, agora sem o índice grande:
   ```sql
   SET statement_timeout = 0;
   VACUUM (VERBOSE, ANALYZE) public."BibleVerse";
   ```
   Registre o resumo do `VERBOSE` e `n_dead_tup` depois.
6. **Religar o autovacuum com os padrões:**
   ```sql
   ALTER TABLE public."BibleVerse" RESET (
     autovacuum_enabled, autovacuum_vacuum_threshold, autovacuum_vacuum_scale_factor,
     autovacuum_vacuum_cost_delay, autovacuum_vacuum_cost_limit);
   SELECT reloptions FROM pg_class WHERE relname = 'BibleVerse';  -- esperado: NULL
   ```
7. **Medir:** tamanho do banco, soma dos índices vetoriais e 10 buscas novas.
8. **Pare e grave o relatório.**

## ETAPA 5: remover a duplicata dos livros (produção, à noite)

Só com a Etapa 4 aprovada e **apenas depois de a paridade da Etapa 3a atingir 200 de 200 por md5**.

1. **Ligar a biblioteca em `ResourceChunk`:**
   - crie o índice compacto em `"ResourceChunk"`, igual ao do passo 4.1 (`CONCURRENTLY`, limite de 30 MB);
   - ligue `LIBRARY_VECTOR_SOURCE=resource_chunk` no Render;
   - valide 10 perguntas ao Copilot sobre obras conhecidas (por exemplo, "Calvino sobre Romanos 9", "Spurgeon sobre o Salmo 23") e confira que as citações vêm de `ResourceChunk`;
   - fique de olho no consumo de cota do Gemini (cerca de 10 chamadas).
2. **Backup:**
   - confirme no painel do Supabase (Database → Backups) que existe backup de hoje;
   - sem acesso, exporte `id, "userId", type, metadata` das linhas `book_chunk` para `backend/scratch/` e registre a contagem.
3. **Apagar:**
   ```sql
   DROP INDEX CONCURRENTLY "UserEmbedding_embedding_hnsw_idx";
   ```
   Depois apague as linhas `type = 'book_chunk'` (preservando estritamente `note` e `highlight`) em lotes de **5.000 por execução**, com pausa de 1 minuto entre lotes e checagem de `pg_stat_progress_vacuum` antes de cada lote. Registre a contagem antes, a de cada lote e a de depois.
4. **Limpar e conferir:**
   - `VACUUM (VERBOSE, ANALYZE) public."UserEmbedding";`
   - as notas e marcações dos usuários (`type IN ('note', 'highlight')`, preservando anotações) continuam lá, com a mesma contagem. **Não** recrie índice vetorial para elas: são poucas, e a leitura sequencial é barata.
5. **Medir:** tamanho do banco (meta: cerca de 2,0 GB ou menos), soma dos índices vetoriais (meta: menos de 150 MB) e a busca.
6. **Pare e grave o relatório.**

## ETAPA 6: completar a KJV pela ingestão diária

1. **Segredos no GitHub** (Settings → Secrets and variables → Actions):
   - **`SUPABASE_DIRECT_URL`:** igual à `DIRECT_URL` do `backend/.env`;
   - **`GEMINI_API_KEY`:** a chave atual, a mesma do Render.

   Se você não tiver acesso ao painel do GitHub, **diga isso no relatório e entregue ao dono o passo a passo exato** (onde clicar e o nome de cada segredo). Não escreva os valores em lugar nenhum.

2. **Disparo manual com `dry_run = true`:** cole o resumo da execução. Esperado: "rodar 2000", porque a folga voltou depois da Etapa 4.
3. **Disparo manual real com `limit = 200`:** cole o resumo, a busca na KJV e o tamanho do índice compacto antes e depois.
4. A partir daí, a rodada agendada (03:00 BRT) completa os cerca de 14 mil restantes em cerca de 7 noites. **Não acelere.**
5. **Pare e grave o relatório.** Ao fim das noites, registre a cobertura final da KJV (`31.112 / 31.112`).

## ETAPA 7: auditoria completa

Execute `audit/prompts/antigravity-auditoria-completa-2026-11-08.md`, com estes ajustes:

- **Nano:** as contagens grandes do Bloco 4 só à noite, com `statement_timeout = '120s'`. Use `pg_class.reltuples` para estimar o que não precisar de número exato.
- **Ignore** o aviso daquele prompt sobre o vacuum em andamento. Ele foi resolvido nas Etapas 4 e 5.
- Inclua no Bloco 4 a conferência de que **todo** o banco cumpre a seção 3.1 do `AGENTS.md`:
  - índices vetoriais abaixo de 150 MB;
  - nenhuma consulta frequente com `read=` alto no `EXPLAIN`;
  - autovacuum ligado.

## ETAPA 8: documentação

Atualize o `AGENTS.md`, seções 0 e 6, e o `CHANGELOG.md` com:

- os índices novos e os tamanhos;
- o autovacuum religado;
- a cobertura da KJV;
- o fim da duplicata em `UserEmbedding`;
- as variáveis `VECTOR_INDEX_MODE` e `LIBRARY_VECTOR_SOURCE`.

Marque a decisão **D3 (halfvec)** como **substituída** pela quantização binária, porque o dono fixou o compute Nano. Mova `docs/architecture/sql/halfvec_compression.PENDENTE-D3.sql` para um nome que indique "descartado", sem apagar.

---

## FORA DO ESCOPO: só o dono decide

Não execute e não sugira como solução:

- **D1:** revogar o token do Railway exposto em `scripts/check-production-health.ts`.
- **D2:** gateway de pagamento.
- **D4:** licenças ARA/ARC/NAA/NVI.
- **D5:** orçamento (Render pago, Redis).
- **D6:** público prioritário.
- **Aumentar o compute do Supabase**, recusado pelo dono.
- **O plano gratuito do Render** hiberna após 15 minutos parado e leva cerca de 60 s para voltar. **Registre** o efeito disso nas medições, mas não mude o plano.
