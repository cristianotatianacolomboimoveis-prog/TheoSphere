# Relatório Diário TheoSphere — 2026-08-03

## Status Geral: 🔴

Duas coisas quebradas, uma delas corrigida agora.

**1. Oito seeds e scripts estavam mortos desde a migração para o Prisma 7 — corrigido nesta run.** O `npm run db:seed:tsk` que pedi ontem falhou com `PrismaClientInitializationError`. A causa: o Prisma 7 exige um driver adapter explícito no constructor, e `prisma/seed-tsk.ts` ainda fazia `new PrismaClient()` sem argumento. Não era só ele — 19 arquivos no total. Todos corrigidos, com uma guarda nova na fase 2 para isso não acontecer de novo.

**2. `/api/v1/cross-refs` responde 200 com `count: 0` — a tabela está vazia.** Consequência direta do item 1: o seed nunca conseguiu rodar. Você confirmou literalmente: `{"success":true,"data":{"source":"John 3:16","count":0,"refs":[]}}`. Os badges "🔗 N" do `BibleReader` nunca aparecem e o painel de referências cruzadas abre vazio na Bíblia inteira. **Agora que o seed funciona, isso se resolve com um comando** (abaixo).

**3. A biblioteca RAG está com zero trechos** — `inspect-library.js` confirmou: nenhuma obra indexada, tabela `UserEmbedding` vazia. Toda pergunta custa chamada de IA e nenhuma resposta usa o seu acervo.

A notícia boa: a IA está respondendo de verdade, inteira, e o Factbook está íntegro.

## O que fazer agora

```bash
cd ~/Downloads/TheoSphere/backend
npm run db:seed:tsk
curl -s "https://theosphere.onrender.com/api/v1/cross-refs?ref=John+3:16" | head -c 300
```

Esperado: 31 fontes / 292 cross-refs inseridos, e `count` maior que zero na resposta. O seed é idempotente (upsert por `sourceRef+targetRef`), então re-rodar é seguro.

Depois, se quiser o corpus completo do openbible.info (~340k linhas, CC-BY 4.0): baixar o ZIP e rodar `npm run tsk:import cross-references.txt` — esse script também estava quebrado e foi corrigido junto.

## O que foi medido

Hoje a cobertura foi completa: as três perguntas da fase 4 finalmente foram respondidas, com os scripts rodados por você no Mac. Este relatório dá garantia sobre compilação, testes, comportamento estático, saúde dos 12 endpoints, e sobre a IA responder de verdade, inteira e com ou sem acervo.

| Componente        | Verificação                   | Status                         | Corrigido?           |
| ----------------- | ----------------------------- | ------------------------------ | -------------------- |
| Backend           | lint / test / build           | ✅ / ✅ (128) / ✅             | —                    |
| Frontend          | lint / test / build           | ✅ / ✅ (49) / ✅              | —                    |
| Comportamento     | handlers / rotas / silêncio   | ✅ 0 achados                   | —                    |
| Comportamento     | **prisma sem adapter (novo)** | 🔴 19 achados                  | ✅ todos corrigidos  |
| Produção          | 12 endpoints                  | 🔴 1 sem dados (`/cross-refs`) | Precisa rodar o seed |
| IA                | health/ai + resposta real     | ✅ real, não enlatada          | N/A                  |
| Resposta completa | chat + Factbook               | ✅ ambos íntegros              | N/A                  |
| Biblioteca        | trechos indexados             | 🟡 **zero**                    | N/A                  |

## Correções aplicadas

**Prisma 7 sem driver adapter — 19 ocorrências em 19 arquivos.** `new PrismaClient()` sem argumento continua sendo TypeScript perfeitamente válido; o erro só aparece em runtime. Todos passaram a construir o pool `pg` e o `PrismaPg` adapter, no mesmo padrão que `src/prisma.service.ts` e os seis seeds que já tinham sido migrados corretamente.

- `prisma/`: `seed-tsk`, `seed-3d`, `seed-geo`, `seed-graph`, `seed-phd`
- `scripts/`: `import-tsk-full`, `mass-ingest-bibles`, `chained-full-sync`
- `scratch/`: `audit-lexicon`, `check-db`, `check-count`, `check_ingestion`, `check-ingested-books`, `check-users`, `debug-verse`, `fix-db-accents`, `test-db`, `test-notes`, `verify-genesis`

Também corrigi a doc do `seed-tsk.ts`, que mandava rodar `npm run seed:tsk` — o script real chama-se `db:seed:tsk`. Detalhe pequeno, mas é o tipo de coisa que faz alguém desistir de rodar o seed.

**Nova checagem na fase 2: `PRISMA`.** Varre todo o `backend/` atrás de `new PrismaClient()` sem adapter. Verifiquei que ela falha quando deve: reintroduzi o bug em `seed-tsk.ts`, a checagem acusou 1 achado e saiu com código 1; restaurado, voltou a 0. Um detalhe divertido: a primeira versão se autodenunciou, porque o comentário que explica o problema contém a própria expressão `new PrismaClient()`. Passei a mascarar comentários antes de casar o padrão, preservando o comprimento do arquivo para os números de linha continuarem corretos.

## Por que nada disso apareceu antes

Este é o ponto que mais importa, porque a suíte estava verde enquanto oito scripts estavam mortos.

`prisma/seed-*.ts`, `scripts/**` e `scratch/**` estão **explicitamente na lista de `ignores` do `eslint.config.mjs`**, com justificativa escrita e legítima (o `projectService` do typescript-eslint não os encontra). O `tsconfig.build.json` também exclui `prisma` e `scripts`. Ou seja: as três dobras da fase 1 — lint, teste e build — passam sem nunca olhar para esses arquivos.

E mesmo se olhassem, não adiantaria: **nenhum typecheck pegaria isso**, porque `new PrismaClient()` é válido em tipos. Só um teste de runtime ou uma checagem sintática pega. Daí a guarda ter ido para a fase 2, e não para a fase 1 — foi a escolha proporcional, em vez de brigar com o `projectService`.

Vale registrar o padrão: **toda migração de major version de ORM tem essa cara** — o código de aplicação é migrado com cuidado e os utilitários de manutenção ficam para trás, sem ninguém perceber, até o dia em que alguém precisa rodar um seed.

## Erros não resolvidos

Nenhum erro de código. Dois warnings pré-existentes e benignos:

- `react-hooks/incompatible-library` em `BibleReader.tsx:276` — `useVirtualizer()` do TanStack não é memoizável pelo React Compiler.
- `Critical dependency` do `@duckdb/duckdb-wasm` no build do frontend.

## Produção

Último commit: `926d5b5 feat(acervo): portao de licenca (dominio publico) na ingestao + purga`. **Nenhum deploy pendente** — nenhum endpoint que existe no código devolveu 404.

| Endpoint                          | Resultado                                           |
| --------------------------------- | --------------------------------------------------- |
| `/health`                         | ✅ `ok`, database up, redis up                      |
| `/health/ai`                      | ✅ `ok`, provider `gemini`, `lastFailure: null`     |
| `/bible/versions`                 | ✅ 7 versões, metadados de licença íntegros         |
| `/bible/books`                    | ✅ 66 livros                                        |
| `/bible/chapter/BLIVRE/1/1`       | ✅ 31 versículos                                    |
| `/bible/passage-guide/BLIVRE/1/1` | ✅ ~63 KB de JSON                                   |
| `/search/verses?q=luz`            | ✅ 20 resultados com score                          |
| `/cross-refs?ref=John 3:16`       | 🔴 **200, `count: 0`** — tabela vazia               |
| `/geo/locations`                  | ✅ 48 locais                                        |
| `/archaeology/stats`              | ✅ 102 achados categorizados                        |
| `/linguistics/interlinear/1/1`    | ✅ ~62 KB de JSON                                   |
| `/rag/stats`                      | ✅ responde — mas é cache in-memory, não é o acervo |

### O `/cross-refs` e as três semanas perdidas

Durante três semanas este endpoint ficou anotado como "falso alarme: a ferramenta de fetch esconde o status". **Metade era verdade, e a metade errada custou caro.**

A parte verdadeira: o `web_fetch` do sandbox realmente não renderiza o corpo dessa rota — confirmei chamando `/api/v1/cross-refs` **sem** o parâmetro `ref`, caso em que o `class-validator` obriga um 400 com corpo, e veio vazio igual. "Corpo vazio no sandbox" nunca significou nada.

A parte errada: disso se concluiu que o endpoint estava saudável. O `curl -si` mostrou `etag: W/"42-9I3JHLuprawhB1b7GrZsYZfSXKw"`, e o Express monta o ETag como `"<tamanho do corpo em HEX>-<hash>"`. `0x42` = 66 bytes = exatamente o tamanho de uma resposta com `count: 0`. A análise anterior leu o `42` como decimal e concluiu "corpo não-vazio, logo saudável" — e a hipótese certa, "tabela `CrossReference` ausente ou vazia", chegou a estar escrita naquela mesma nota antes de ser descartada.

Técnica que fica para as próximas runs: **quando a ferramenta de fetch não mostrar o corpo, o `etag` ainda entrega o tamanho da resposta, e tamanho já distingue "tem dado" de "está vazio".** E a regra de método: "a ferramenta não mostra o corpo" justifica _indeterminado_, nunca _saudável_.

## IA e biblioteca

**Provedor:** Gemini, configurado, `lastFailure: null`.

**Resposta real, não enlatada** ✅ — a pergunta sobre Nínive voltou com `cached: false`, `degraded: false`, 320 caracteres, terminando em "…exemplo bíblico de juízo divino sobre uma nação poderosa e corrupta." É resposta sobre Nínive, não o ensaio pré-escrito de `fallback-responses.ts`.

**Resposta completa** ✅ — sem truncagem no texto livre nem no caminho estruturado. O Factbook de Melquisedeque voltou com 5.678 caracteres, JSON válido, 7 seções e 6 referências (Gênesis 14:18-20, Salmos 110:4, Hebreus 5:6, 5:10, 6:20, 7:1-28). A configuração `thinkingConfig: { thinkingBudget: 0 }` com teto 3000 segue intacta em `rag.service.ts:275,282`.

**Biblioteca: zero trechos** 🟡 — `UserEmbedding` vazia, nenhuma obra em `library_book`. Isso significa que a plataforma responde **só com conhecimento geral da IA**, sem usar nenhuma das suas obras, e que toda pergunta gasta cota. Vale lembrar que a purga do portão de licença de 01/08 removeu 10 obras / 27.887 trechos — o acervo atual estar zerado é consistente com aquilo, mas confirma que a reingestão do material de domínio público ainda não aconteceu. Ela precisa de você: `bash audit/scripts/ingest-drive-library.sh` (pede senha).

## Deploy pendente

Nenhum. Mas as correções desta run estão **não commitadas** — não consigo commitar do sandbox. Sugestão de commit:

```bash
cd ~/Downloads/TheoSphere
git add audit/scripts/static-checks.mjs backend/prisma backend/scripts backend/scratch
git commit -m "fix(prisma): driver adapter obrigatorio em 19 seeds/scripts + guarda na fase 2

Prisma 7 exige adapter no constructor; new PrismaClient() sem argumento
compila mas morre em runtime. Oito seeds e scripts estavam quebrados desde
a migracao, entre eles o db:seed:tsk — por isso /cross-refs respondia 200
com count 0. Adiciona checagem PRISMA ao static-checks para nao repetir."
```

---

### Nota de método

Perdi tempo hoje com uma armadilha do sandbox que vale registrar: cada chamada de bash roda em um PID namespace isolado, então `nohup ... &` numa chamada e polling na seguinte **não funciona** — o processo morre junto com a chamada, o log congela no banner do npm e `pgrep -f eslint` ainda responde "RUNNING" porque casa com a própria linha de comando do processo pai. Passei minutos achando que lint e testes rodavam quando nunca tinham começado; `uptime` com load 0.02 foi o que denunciou. Rodando síncrono, a suíte inteira leva menos de 90 segundos. Registrado na memória do projeto.
