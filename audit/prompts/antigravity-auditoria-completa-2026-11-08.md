# Prompt: auditoria completa do TheoSphere, do primeiro commit até hoje

> Cole este arquivo inteiro no Antigravity. Antes de começar, leia o
> `AGENTS.md` inteiro. Ele é a fonte de verdade das convenções, das armadilhas
> do ambiente e do estado declarado do projeto. Esta auditoria existe, em
> parte, para conferir se o que o `AGENTS.md` afirma é verdade.

## PAPEL

Você é o auditor independente do TheoSphere. O dono quer saber o estado real
do projeto, sem o que "parece estar funcionando". Sua tarefa é **examinar, medir
e relatar**. Você **não corrige nada** nesta tarefa: cada achado vira item do
relatório, com evidência, e o dono decide o que corrigir e em que ordem.

O escopo é o projeto inteiro:

- todo arquivo rastreado pelo git;
- o histórico desde o primeiro commit (`d4359b5`, 2026-05-07, "Initial enterprise audit"), com 286 commits na data deste prompt;
- o banco de produção, só em leitura;
- os serviços publicados: Render, Vercel e Supabase.

## ⚠️ ANTES DE QUALQUER COISA: o banco está sob carga

Em 2026-11-08, a regeneração dos embeddings da KJV disparou um autovacuum na
tabela `BibleVerse`. Esse autovacuum limpa o índice HNSW de 753 MB e já passou
de 4 horas. Durante esse período:

- o planejamento de uma consulta simples levou 5 s;
- buscas em `/api/v1/search/verses` passaram de 90 s;
- o pool chegou a recusar conexões.

O dono decidiu **esperar o vacuum terminar sozinho**.

Por isso:

1. **Não cancele o vacuum** (`pg_cancel_backend`, `pg_terminate_backend`) e
   não altere `autovacuum_*`. Se cancelado, ele recomeça do zero.
2. Antes de cada sessão de consultas ao banco, rode:
   ```sql
   SELECT p.phase, now() - a.query_start AS duracao
   FROM pg_stat_progress_vacuum p JOIN pg_stat_activity a USING (pid);
   ```
   Se ainda houver vacuum em `BibleVerse`, limite-se a consultas de catálogo
   (`pg_stat_*`, `information_schema`, `pg_indexes`). Deixe as contagens de
   tabelas grandes para depois.
3. **Não rode** `povoar-embeddings-livres.ts`, `full-rag-bootstrap.ts`, nenhuma
   ingestão e nenhum `UPDATE`/`INSERT`/`DELETE`. A KJV está com
   **17.035 de 31.112** versículos com embedding, de propósito, até o vacuum acabar.
4. Toda consulta sua começa com `SET statement_timeout = '60s'` e usa
   `DIRECT_URL`. Nunca use `EXPLAIN ANALYZE` em consulta que escreve.

## REGRAS INEGOCIÁVEIS

- **Somente leitura em produção.**
  - Nada de deploy, `prisma migrate`, `vercel --prod` ou mudança de variável no Render ou na Vercel.
  - Nada de escrita no Supabase.
  - O smoke de produção (`backend/scripts/smoke-teste-producao.mjs`) cria um usuário e um feedback e depois os apaga. **Não rode o smoke.** Use apenas `GET` em rotas públicas.
- **Git.**
  - Trabalhe numa branch `audit/auditoria-completa-2026-11-08`.
  - O único commit permitido é o do relatório e dos seus anexos.
  - **Não use `git stash`.** O stash desta máquina é compartilhado entre worktrees. Existe um `stash@{0}` ("lint-staged automatic backup (de7aef2)") que não pode ser aplicado nem apagado.
  - Não faça `push` para a `main`.
- **Segredos.**
  - Ao encontrar um, registre arquivo, linha, commit e tipo (ex.: "chave Gemini, 39 caracteres, prefixo `AIza`").
  - **Nunca copie o valor** para o relatório, o terminal ou um commit. Mascare tudo depois dos 4 primeiros caracteres.
  - O token do Railway em `scripts/check-production-health.ts` já é conhecido (D1). Não o reutilize nem o teste.
- **Custo.**
  - Não chame a API do Gemini ou da OpenAI, exceto `GET /api/v1/health/ai`.
  - Não gere embeddings.
- **Testes e lint.** Não desabilite teste nem regra de lint, nem para medir alguma coisa.
- **Evidência.** Todo achado traz:
  - arquivo e linha, ou o comando exato;
  - a saída real (trecho);
  - a classificação **CONFIRMADO** (você reproduziu) ou **SUSPEITO** (indício, sem reprodução).
- **Lacunas.** Diga o que não conseguiu verificar e por quê, item por item. Silêncio sobre uma lacuna conta como falha da auditoria.

## ESCALA DE SEVERIDADE

| Nível          | Critério                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **S0 Crítico** | Vazamento de credencial ativa, acesso a dados de outro usuário, escalada de plano, perda de dados, execução de código remoto                |
| **S1 Alto**    | Funcionalidade principal quebrada em produção, falha silenciosa que esconde erro, violação de licença no acervo, afirmação falsa ao usuário |
| **S2 Médio**   | Defeito com contorno, teste que não testa nada, regressão provável, documentação que leva a erro operacional                                |
| **S3 Baixo**   | Higiene, código morto, inconsistência sem efeito no usuário                                                                                 |

Achado **S0**: pare, registre no topo do relatório na hora e continue. Não
tente corrigir.

## MÉTODO: cobertura de 100% dos arquivos, provada

"Desde a primeira linha" precisa ser verificável. Por isso o relatório inclui
um **manifesto de cobertura**:

```bash
git ls-files > audit/reports/auditoria-2026-11-08/arquivos-rastreados.txt
wc -l audit/reports/auditoria-2026-11-08/arquivos-rastreados.txt
```

Cada linha desse arquivo precisa aparecer em
`audit/reports/auditoria-2026-11-08/manifesto.csv` com as colunas
`arquivo,metodo,resultado,achados`:

- `metodo` assume um destes valores:
  - `leitura` (você leu o arquivo inteiro);
  - `ferramenta:<nome>` (lint, tsc, scanner de segredos, `npm audit`…);
  - `amostra` (só para dados gerados ou grandes; diga o critério);
  - `ignorado:<motivo>` (ex.: binário, lockfile).
- `resultado`: `ok`, `achado` ou `nao_verificado`.
- `achados`: os IDs dos achados ligados ao arquivo (ex.: `SEC-03;DOC-07`).

No fim, rode um script de conferência:

- todo arquivo de `arquivos-rastreados.txt` está no manifesto;
- nenhum arquivo `.ts`/`.tsx`/`.js`/`.mjs` de `backend/src`, `frontend-v2/src`, `backend/scripts` ou `.github` aparece com `ignorado`.

Publique a saída desse script no relatório.

Trabalhe por blocos, na ordem abaixo. Ao fim de cada bloco, registre os números
antes de seguir.

---

## BLOCO 0: inventário e linha de base

1. Contagens:
   - arquivos rastreados por pasta de topo;
   - linhas de código por linguagem (`cloc`, se houver, ou `wc -l`);
   - commits por mês;
   - autores.
2. Rode e registre a saída integral (sem rede, siga as armadilhas da seção 5 do `AGENTS.md`):
   ```bash
   cd backend && npm run verificar
   cd backend && npm run typecheck
   cd frontend-v2 && npx tsc --noEmit && npx vitest run && npx eslint --cache .
   node audit/scripts/static-checks.mjs
   ```
   O `AGENTS.md` declara 533 testes no backend e 69 no frontend (seções 0 e 8 do
   histórico recente). Confira se os números batem.
3. `npm audit --omit=dev` no backend e no frontend. Liste cada vulnerabilidade
   high ou critical e diga se o caminho vulnerável é alcançável no código.

## BLOCO 1: histórico do git, do primeiro commit até hoje

1. **Segredos no histórico inteiro:**
   - use `gitleaks detect --log-opts="--all"` ou `trufflehog git file://. --only-verified=false`, se disponíveis;
   - se não houver ferramenta, use `git log -p --all` com regex para `AIza`, `sk-`, `eyJ` (JWT), `postgres://`, `postgresql://`, `rk_`, `pk_live`, `ghp_` e `-----BEGIN`.
   - Para cada ocorrência, registre o commit, o arquivo e se o segredo ainda existe na árvore atual.
2. **Arquivos sensíveis que já foram commitados:** `git log --all --diff-filter=A --name-only` cruzado com `*.env*`, `*.pem`, `*.key`, `credentials*`, `*.sqlite`, dumps `.sql`.
   - O `TheoSphere.env` na raiz está ignorado hoje (`.gitignore:53`). Confira se ele já entrou em algum commit.
3. **Arquivos grandes no histórico:** maiores que 5 MB, com o comando `git rev-list --objects --all | git cat-file --batch-check`.
4. **Commits que removeram testes, verificações ou guardas:**
   - procure no histórico `.skip(`, `xit(`, `it.only`, `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `--passWithNoTests` e `|| true` em scripts;
   - diga quais ainda estão no código.
5. **Linha do tempo das regressões conhecidas.** O `AGENTS.md` cita estes casos:
   - guarda de OCR desligada;
   - cache envenenado;
   - 21 botões sem `onClick`;
   - portão de licença fail-open;
   - `FakePaymentProvider` em produção;
   - rotas fora de `/api/v1`.

   Para cada um, ache o commit que introduziu o defeito e o que o corrigiu, e diga se existe teste que impede a volta.

## BLOCO 2: segurança

Para cada controller em `backend/src`, preencha uma tabela com:

| rota | método | guard | de onde vem o `userId` | rate limit | validação do body (DTO/pipe) | dono do recurso conferido? |
| ---- | ------ | ----- | ---------------------- | ---------- | ---------------------------- | -------------------------- |

Em seguida, cubra:

1. **`userId` só do JWT.** Procure `body.userId`, `query.userId`, `params.userId` e `dto.userId`. Qualquer ocorrência é S0 até prova em contrário.
2. **IDOR:** toda leitura ou escrita de `Annotation`, `Feedback`, `UserEmbedding`, notas, coleções e billing filtra por `userId` do token?
3. **SQL bruto:**
   - liste todo `$queryRawUnsafe` e `$executeRawUnsafe` e diga se algum valor vindo do usuário entra sem parâmetro;
   - liste todo `Prisma.raw(`.
4. **Billing:**
   - `POST /billing/subscribe` deve responder 403/400;
   - o webhook só pode aceitar o `DisabledPaymentProvider`;
   - confira o teste que impede o `FakePaymentProvider` de voltar.
5. **Auth:**
   - algoritmo e segredo do JWT (de onde vem e se há valor padrão no código);
   - expiração;
   - hash de senha (algoritmo e custo);
   - fluxo de reset;
   - enumeração de usuário no login e no cadastro.
6. **CORS:** a regex `frontend-v2*.vercel.app` aceita domínios de terceiros (ex.: `frontend-v2-atacante.vercel.app`)? Teste a regex com casos.
7. **Frontend:**
   - procure `dangerouslySetInnerHTML`, `innerHTML` e `eval`;
   - liste os `NEXT_PUBLIC_*` e diga se algum expõe segredo;
   - verifique tokens em `localStorage` e headers de segurança (`next.config`, `vercel.json`).
8. **SSRF e ingestão:** onde o backend busca uma URL externa (bolls.life, Drive, eBible…), a URL pode vir do usuário?
9. **IA:**
   - injeção de prompt vinda do acervo ou das notas do usuário;
   - o system prompt vaza?
   - o limite `AI_CREDITS_FREE_MONTHLY` é aplicado no servidor ou só na interface?
10. **GitHub Actions** (`.github/workflows/*.yml`, 9 arquivos):
    - `permissions`;
    - uso de `pull_request_target`;
    - secrets impressos em log;
    - actions sem versão fixada;
    - o que `auto-fix-pr.mjs` e `audit-schedule.yml` podem escrever no repositório.
11. **Arquivos soltos com cara de credencial ou acesso direto ao banco:**
    - `backend/test-gemini.js` está rastreado: leia o arquivo e diga se contém segredo;
    - `backend/check-db.js`, `test-db*.ts`, `test-gemini-config.js` e `clear-cache.js`.

## BLOCO 3: backend, módulo por módulo

Módulos em `backend/src`:

- `annotations`
- `archaeology`
- `audit`
- `auth`
- `bible` (incluindo `bible-ingestion.service.ts` e `bible.controller.ts` na raiz)
- `billing`
- `collaboration`
- `common`
- `engines`
- `events`
- `feedback`
- `geospatial`
- `health`
- `linguistics`
- `mcp`
- `observability`
- `orchestrator.service.ts`
- `prisma`
- `rag`
- `resources`
- `search`

Para cada módulo:

1. O que ele promete (nome, comentários, rotas) e o que ele faz de fato.
2. **Falha silenciosa:** todo `catch` que devolve `[]`, `null`, `{}` ou valor padrão sem `warn`/`error`, e todo `void promise` sem tratamento. Esse é o defeito mais recorrente deste repositório (ver o histórico do `vectorArm` no `AGENTS.md`).
3. **Fallback que finge sucesso:** a resposta diz ao cliente que degradou?
4. **Código morto:** rotas que o frontend nunca chama, serviços que nenhum módulo importa.
5. **Testes do módulo:**
   - existem?
   - testam o caminho de falha?
   - Faça **teste de mutação manual** em pelo menos 1 teste por módulo crítico (`auth`, `billing`, `annotations`, `search`, `rag`, `bible`): quebre a lógica de propósito, rode o teste, confirme que ele falha e **reverta**. Registre o diff da mutação e a saída.
6. **Performance:** consultas N+1, `findMany` sem `take`, e consultas sem índice (cruze com o `schema.prisma`).

Atenção especial:

- **`bible/versification.ts` e `bible/lxx-alignment.data.ts`:**
  - os dados de alinhamento foram gerados por embeddings em 2026-11-08 (commit `ae4078b`);
  - confira 20 pares escolhidos ao acaso fora dos testes, lendo o grego da LXX e o inglês da WEB no banco;
  - informe a semente do sorteio.
- **`search`:**
  - a busca por palavra usa `to_tsvector('simple', text)` sem a coluna gerada;
  - meça o `EXPLAIN` **depois** do vacuum e diga se a ordenação por `ts_rank` escala para palavras frequentes (`God`, `Senhor`).

## BLOCO 4: banco de dados (leitura, depois do vacuum)

1. **Deriva do esquema:**
   - `prisma migrate status`;
   - `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url ...`, se houver banco sombra local; sem ele, compare manualmente `information_schema.columns` com o `schema.prisma`.
2. **Tamanhos:** cada tabela e índice (`pg_total_relation_size`), índices nunca usados (`idx_scan = 0`) e bloat estimado.
3. **Recontagem de cada número do `AGENTS.md`:**
   - versículos por tradução;
   - embeddings por tradução;
   - `InterlinearWord`;
   - `Resource`;
   - `ResourceChunk`;
   - `ResourceReference` por `kind`;
   - `UserEmbedding` por tipo;
   - `CrossReference`.

   Monte uma tabela "declarado × medido".

4. **Integridade:**
   - capítulos faltando por tradução, com a NVA como referência por `bookId` (o Claude Code completou Jó e Joel 4 em 2026-11-08; confira);
   - texto com resíduo de marcação (`<`, `>`, dígitos colados em palavras na KJV/WEB);
   - versículos vazios;
   - duplicatas;
   - embeddings de dimensão errada;
   - vetores de hash no espaço persistido.
5. **Dimensionamento:**
   - os índices HNSW somam quanto e cabem na RAM da instância Supabase atual?
   - O incidente de 2026-11-08 sugere que não. Relacione com a decisão pendente D3 (`halfvec`).
6. **Segurança do banco:**
   - RLS ligado nas tabelas expostas pela API do Supabase (PostgREST)?
   - Quais papéis têm acesso?
   - A `anon key` permite ler `User`, `Annotation` ou `Feedback` diretamente? (Teste só com `GET` e só se a `anon key` já estiver publicada no frontend.)

## BLOCO 5: frontend (`frontend-v2`)

Rotas em `src/app/(app)`:

- `admin`
- `atlas`
- `encyclopedia`
- `exegesis`
- `factbook`
- `graph`
- `library`
- `login`
- `notes`
- `privacidade`
- `settings`
- `sobre`
- `study`
- `termos`
- `page.tsx` (início)

Para cada rota:

1. Todo botão, link e formulário tem efeito real? Registre a contagem de elementos interativos e de elementos sem handler.
2. Toda chamada ao backend usa `/api/v1/...` e um método aceito pela rota? Cruze com a tabela do Bloco 2 e liste as **rotas fantasma**.
3. **Estado de erro:**
   - o que o usuário vê com o backend em cold start (cerca de 60 s no Render free) e com o backend fora?
   - Existe sucesso falso (gravar em `localStorage` e dizer "salvo no servidor")?
4. **Textos:**
   - afirmações factuais ou de marketing na interface ("o maior", "100%", "anotado") sem sustentação;
   - o `AGENTS.md`, item T0.5, já removeu algumas: veja se voltaram.
5. **Licença:** toda tradução e obra exibida tem a atribuição exigida (CC BY 4.0 para SBLGNT e MACULA)? Onde ela aparece na tela?
6. **`/admin`:** quem consegue abrir? A proteção existe no servidor ou só no cliente?
7. Se houver navegador disponível (Playwright já está em `audit/scripts`), percorra cada rota em produção (`https://frontend-v2-lake.vercel.app`) e registre os erros do console e as requisições com 4xx/5xx.
   - **Não crie conta.**
   - Se a busca ainda estiver lenta por causa do vacuum, registre o fato e não conte como defeito do frontend.

## BLOCO 6: acervo e licenças

1. Para cada tradução em `BibleVerse` e cada obra em `Resource`, liste:
   - origem;
   - licença declarada;
   - documento de licença em `docs/licenses/`;
   - **tradução moderna protegida?**

   Lembre a regra do `AGENTS.md`: original em domínio público não torna a tradução livre, e nome de arquivo não é verificação.

2. O portão de licença é fail-closed?
   - Leia o código e escreva um teste mental de "ausência de sinal".
   - Diga se existe teste automatizado desse caso.
3. Confira se `CATALOGO-DOMINIO-PUBLICO.md`, `FILA-INGESTAO-DOMINIO-PUBLICO.md`, `ACERVO-GLOBAL-DOMINIO-PUBLICO.md`, `backend/src/bible/classic-catalog.ts` (108 obras) e o banco (88 obras distintas) concordam entre si.
4. A pasta `acervo-traduzido/` (4 arquivos rastreados): qual a licença de cada tradução?

## BLOCO 7: IA, RAG e custo

1. Mapeie cada chamada a Gemini e OpenAI: onde fica, modelo, `maxOutputTokens`, `thinkingBudget`, timeout, retry e cache.
2. Onde o custo pode explodir: loop sem teto, retry sem backoff, embedding por requisição sem cache, rota pública sem rate limit que chama a IA.
3. **Cache semântico:** existe risco de cache envenenado, ou seja, resposta de um usuário servida a outro, ou resposta degradada cacheada como boa?
4. **Fallbacks:** o `RagService` degrada sem 500 quando o embedding falha (`optionalContext`, commit `50e78d2`)? Confira os testes.
5. **Fidelidade:** as respostas citam versículo e obra que existem no banco? Leia o código de montagem de citações. Não chame a IA para testar.

## BLOCO 8: build, CI, deploy e operação

1. **CI:**
   - `.github/workflows/*.yml`: cada workflow roda o quê, em que gatilho, e está passando? Use `gh run list --limit 50` se o `gh` estiver autenticado.
   - Liste os workflows que falham há mais de 7 dias.
2. **Configuração de deploy:**
   - `backend/Dockerfile`, `render.yaml`, `Procfile` e `railway.json` (Railway está desativado: código morto?);
   - `docker-compose*.yml` e a pasta `valhalla_data/`.
3. **Deploy:**
   - o `start` roda `prisma migrate deploy`: alguma migração em `prisma/migrations/` precisa de decisão do dono ou de banco gravável?
   - `keep-alive.yml`: ainda faz sentido e usa qual URL?
4. **Divergências da documentação.** Exemplos já conhecidos:
   - o `AGENTS.md` diz, na seção 0, que a Vercel está conectada ao Git, e na seção 2, que o deploy é por `npx vercel --prod`, sem Git. Qual está certa?
   - `DEPLOY.md` × `DEPLOY_RENDER.md` × `README.md`: ainda apontam para Railway?
5. **Observabilidade:**
   - o que é logado;
   - se há dados pessoais (e-mail, texto de nota) nos logs;
   - existe alerta?
6. **Incidente de 2026-11-08 (vacuum):**
   - descreva a causa;
   - diga se algum script de escrita em massa verifica `pg_stat_progress_vacuum` ou limita a vazão;
   - recomende uma salvaguarda.

## BLOCO 9: documentação e higiene

1. Para cada afirmação numérica do `AGENTS.md`, seção 0, marque: **conferida (valor medido)**, **divergente (declarado × medido)** ou **não conferível**.
2. Arquivos na raiz do `backend/` e do repositório que parecem sobra:
   - `check-db.*`, `scratch-check.*`, `test-*.ts`, `trigger-ingest.ts`, `seed.ts`, `backend/scratch/` e `tutorials/`;
   - `TheoSphere-Arquitetura-IDX.pdf`, `CLAUDE_PROJECT_PROMPT.md`;
   - `audit/brains-antigravity/`.

   Para cada um, diga se é usado, se está rastreado e se contém segredo ou dado pessoal.

3. **Artefatos de build rastreados por engano:** `dist/`, `.js.map`, `.d.ts` gerados e `*.tsbuildinfo`.

---

## ENTREGÁVEL

Pasta `audit/reports/auditoria-2026-11-08/`:

1. **`RELATORIO.md`**, nesta ordem:
   1. **Resumo executivo** (até 15 linhas, para o dono, sem jargão): o projeto está pronto para ampliar o teste fechado? Quais são os 5 maiores riscos?
   2. **Achados S0**, se houver, primeiro e destacados.
   3. **Tabela de achados:** `ID | severidade | bloco | título | arquivo:linha | CONFIRMADO/SUSPEITO | esforço estimado (P/M/G)`. IDs por bloco: `HIST-`, `SEC-`, `BE-`, `DB-`, `FE-`, `LIC-`, `IA-`, `OPS-`, `DOC-`.
   4. **Detalhe de cada achado:** descrição, evidência (comando e saída), impacto para o usuário e correção sugerida (sem aplicar).
   5. **Tabela "declarado × medido"** (Bloco 4.3 e Bloco 9.1).
   6. **Resultados dos testes de mutação** (Bloco 3.5).
   7. **O que NÃO foi verificado**, item por item, com o motivo.
   8. **Plano de correção sugerido**, em ondas: S0 → S1 → S2, agrupado por arquivo, para reduzir conflitos.
2. **`manifesto.csv`** e **`arquivos-rastreados.txt`** (ver MÉTODO).
3. **`conferencia-manifesto.txt`**: saída do script de conferência da cobertura.
4. **`comandos.log`**: todos os comandos que você rodou, em ordem, com horário.

Faça o commit só dessa pasta, na branch `audit/auditoria-completa-2026-11-08`, e
avise o dono. Não abra PR para a `main` sem pedido dele.

## CRITÉRIO DE ACEITE

A auditoria só está concluída quando:

- [ ] o manifesto cobre 100% de `git ls-files`, comprovado pela conferência;
- [ ] os Blocos 0 a 9 têm números registrados ou uma lacuna explicada;
- [ ] todo achado tem evidência e a marca CONFIRMADO ou SUSPEITO;
- [ ] há pelo menos 6 testes de mutação, com diff e saída;
- [ ] nenhum segredo aparece em claro em nenhum arquivo entregue (rode o scanner de segredos sobre a própria pasta do relatório e anexe a saída);
- [ ] nada foi escrito no banco, no Render, na Vercel ou na `main`.
