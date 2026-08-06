# Relatório Diário TheoSphere — 2026-08-06

## Status Geral: 🟡

**O achado do dia: a busca semântica nunca funcionou em produção.** Não é uma regressão de hoje — é uma metade da busca híbrida que está desligada desde sempre e ninguém tinha percebido, porque o endpoint responde 200 com resultados plausíveis. Detalhe e prova abaixo.

O resto passou. Pela primeira vez em três dias a suíte local rodou inteira, incluindo o `next build` do frontend, que morria por falta de disco desde 04/08.

## O que foi medido

Este relatório garante: backend passa lint, 140 testes e typecheck; frontend passa lint, 49 testes, typecheck **e `next build` completo (20 rotas geradas)**; nenhum botão sem handler, nenhuma rota de API inexistente, nenhum componente falhando em silêncio; os 12 endpoints de produção respondem com conteúdo real (verificado o corpo, não só o status).

Este relatório **não** garante: que o `POST /rag/chat` devolve resposta real e não enlatada, que a resposta chega completa, nem que a biblioteca do Drive tem acervo. As três continuam sem medição — motivo no fim.

| Componente          | Verificação                   | Status               | Corrigido?             |
| ------------------- | ----------------------------- | -------------------- | ---------------------- |
| Backend             | lint / test / build           | ✅ / ✅ (140) / ✅   | Nada a corrigir        |
| Frontend            | lint / test / build           | ✅ / ✅ (49) / ✅    | Nada a corrigir        |
| Comportamento       | handlers / rotas / silêncio   | ✅ 0 achados novos   | Nada a corrigir        |
| Produção            | 12 endpoints                  | ✅                   | N/A                    |
| IA                  | health/ai                     | ✅                   | N/A                    |
| **Busca semântica** | **braço vetorial contribui?** | **🔴 não contribui** | **N/A — dado ausente** |
| IA                  | resposta real (enlatada?)     | ⚪ não medido        | N/A                    |
| Resposta completa   | chat + Factbook               | ⚪ não medido        | N/A                    |
| Biblioteca          | trechos indexados             | ⚪ não medido        | N/A                    |

---

## 🔴 Busca híbrida rodando com um braço só

Ontem ficou anotado como "observação nova, não confirmada". Hoje está confirmada, e a causa está localizada.

**A prova, na aritmética do próprio retorno.** `GET /search/verses?q=luz&translation=BLIVRE` devolveu 20 resultados. Todos com `vectorRank: null`. E os `score` são exatamente `1/(60 + keywordRank)`:

| posição | score retornado      | 1/(60+rank) |
| ------- | -------------------- | ----------- |
| 1       | 0.016393442622950820 | 1/61        |
| 2       | 0.016129032258064516 | 1/62        |
| 20      | 0.0125               | 1/80        |

O RRF usa `k = 60` e soma `1/(k+vectorRank) + 1/(k+keywordRank)` quando um versículo aparece nos dois braços. Nenhum dos 20 tem soma de duas parcelas. **O conjunto `vectorHits` voltou vazio.**

**Por que isso não é falha da API de embeddings.** `EmbeddingService.createEmbedding` (`src/rag/embedding.service.ts:196`) nunca lança: se o Gemini falha, tenta OpenAI; se a OpenAI falha, devolve um vetor local de hash-bucket. Sempre retorna algo. Logo o `catch` de `vectorSearch` (`search.service.ts:287`) não foi acionado por embedding — o que voltou vazio foi a consulta SQL:

```sql
FROM "BibleVerse" WHERE embedding IS NOT NULL
```

**Conclusão: a coluna `BibleVerse.embedding` está NULL em produção.** O índice HNSW existe (migration `20260507171358_hybrid_search_indexes`), a coluna existe e é anulável no schema (`schema.prisma:231`), mas nada foi gravado nela. O povoamento depende de `massGenerateEmbeddings`, chamado só por `scripts/full-rag-bootstrap.ts` e pelo endpoint em `bible.controller.ts:263` — nenhum dos dois rodou contra o banco de produção com o corpus já carregado.

**Por que ficou dois meses invisível.** Três camadas de silêncio empilhadas:

1. `hybridSearchVerses` (linha 135) engole a falha do braço vetorial num `logger.warn` e segue com `[]` — degradação graciosa, mas muda.
2. A resposta HTTP não carrega nenhum sinal de que metade do ranking não participou. `success: true`, 20 resultados, `vectorRank: null` — que é indistinguível de "este versículo só casou por palavra-chave", o comportamento legítimo.
3. `triggerBatchEmbeddings` (`bible-ingestion.service.ts:363`) engole erro de gravação num `logger.error` e é chamado com `void` — fire-and-forget. Se falhou na ingestão, ninguém soube.

**O que o usuário perde.** Toda busca hoje é full-text puro. Perguntar "perdão dos inimigos" só acha versículos que contenham literalmente essas palavras — nada de "amai os vossos inimigos" por proximidade semântica. É exatamente o recurso que deveria diferenciar a plataforma do Logos.

**Caminho (precisa do Cristiano, roda no Mac com `DATABASE_URL` de produção):**

```bash
# 1. Confirmar o diagnóstico antes de gastar cota
psql "$DATABASE_URL" -c 'SELECT translation, count(*) FILTER (WHERE embedding IS NOT NULL) AS com_embedding, count(*) AS total FROM "BibleVerse" GROUP BY translation;'

# 2. Se vier zero: povoar (≈31k versículos por tradução — gasta cota do Gemini)
cd backend && npx tsx scripts/full-rag-bootstrap.ts
```

Comece por **uma** tradução (BLIVRE) para medir custo real antes de rodar as sete.

**Recomendação de código (não aplicada hoje):** o item 2 da lista acima é o problema de fundo — falha silenciosa é o pecado que esta auditoria existe para pegar, e aqui ela está no backend, fora do alcance do `static-checks.mjs`, que só varre o frontend. Sugiro incluir `meta: { vectorArm: "ok" | "empty" | "failed" }` na resposta de `/search/verses`. Não apliquei porque o contrato é consumido pelo frontend e eu não teria como validar a mudança contra produção daqui — é decisão sua, não correção óbvia.

---

## Correções aplicadas

Nenhuma no repositório. Não havia erro corrigível: lint, testes, typecheck e build passaram todos na primeira execução limpa. Nada foi alterado em código, allowlist ou testes.

O que mudou foi o **método de verificação**, e vale registrar porque desbloqueou o `next build`:

- **`NODE_OPTIONS=--max-old-space-size=6144` estava errado para este sandbox.** A VM tem 3.904 MB de RAM total. Pedir 6 GB de heap fazia o eslint entrar em thrashing e nunca terminar — sete minutos sem uma linha de saída, que foi o que se leu como "lint travado". Com **3072** o lint do backend termina em menos de 38 s, dentro do teto de uma chamada de bash. Sem `--fix` e com `--cache`.
- **Processos em background NÃO sobrevivem entre chamadas do bash**, nem com `setsid ... </dev/null & disown`. Testado hoje de forma isolada: um `sleep 60` lançado assim estava morto na chamada seguinte, sem deixar arquivo. A anotação em contrário no relatório de 05/08 está errada. O que funciona é caber em 38 s por chamada, usando cache de ferramenta para retomar.
- **Frontend build sem copiar a árvore inteira.** A cópia de 04–05/08 estourou o disco. Hoje copiei só `src` + `test` + configs (2,2 MB) para `/tmp/fe` e symlinkei `node_modules` e `public`. Com o stub de `next/font/google`, `turbopack.root` reapontado para a cópia e `typescript.ignoreBuildErrors`, o `next build --webpack` terminou em 23,3 s e gerou as 20 rotas. O `tsc --noEmit` rodou à parte, no repositório real, e passou.

## Erros não resolvidos

**Fase 4 continua sem medição — bloqueio de rede, não de disco.** Confirmado hoje por teste direto: o proxy do sandbox responde `403 X-Proxy-Error: blocked-by-allowlist` ao `CONNECT theosphere.onrender.com:443`. Nenhum `curl`, `node` ou `psql` sai daqui. A única saída é a ferramenta de fetch do agente, que é **somente GET** e ainda exige que a URL tenha aparecido literalmente numa mensagem — variações de query string são recusadas com "URL not in provenance set". Portanto:

- `POST /rag/chat` (resposta enlatada?) — impossível
- `scratch/check-prod-answer.js` e `check-factbook.js` (truncagem?) — impossíveis
- `scratch/inspect-library.js` (acervo do Drive?) — impossível, precisa de conexão direta ao Postgres

Isso não é contornável por engenhosidade minha. **As três perguntas mais importantes da suíte precisam rodar na máquina do Cristiano**, ou de uma URL de fetch pré-autorizada. Enquanto isso não muda, todo relatório diário vai ter esse buraco — e é justamente o buraco por onde passaram o texto enlatado sobre Calvinismo e a resposta cortada no meio da frase.

Uma verificação estática consegui fazer, e passou: `buildGeminiRequest` em `rag.service.ts:275` mantém `thinkingConfig: { thinkingBudget: 0 }` com `maxOutputTokens: 3000`. A configuração que causou a truncagem não regrediu no código — o que não prova que a resposta em produção chega inteira.

**Duas lacunas de conteúdo, ambas conhecidas, nenhuma medida hoje** (dependiam de `passage-guide` de João 3:16, URL fora da lista permitida): léxico com seed de amostra e comentários vazios desde a purga de 01/08.

## Produção

Commit mais recente: `aad399f` — _fix(acervo): portao de licenca no runtime da ingestao + idempotencia por fileId_. Nenhum 404 em endpoint existente.

| Endpoint                          | Resultado                                                                                                                                                                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/health`                         | ✅ `ok` — database up, redis up                                                                                                                                                                                                                                     |
| `/health/ai`                      | ✅ `provider: gemini`, `configured: true`, `lastFailure: null`, `hint: null`                                                                                                                                                                                        |
| `/bible/versions`                 | ✅ 7 versões com metadados de licença (BLIVRE/NVA livres; ARA/NVIPT `restricted`)                                                                                                                                                                                   |
| `/bible/books`                    | ✅ 66 livros                                                                                                                                                                                                                                                        |
| `/bible/chapter/BLIVRE/1/1`       | ✅ Gênesis 1, 31 versículos                                                                                                                                                                                                                                         |
| `/bible/passage-guide/BLIVRE/1/1` | ✅ 63 KB — corpo válido, truncado pela ferramenta de fetch, não pela API                                                                                                                                                                                            |
| `/search/verses?q=luz`            | ⚠️ 20 resultados com texto real — **mas todos só por palavra-chave** (ver seção 🔴)                                                                                                                                                                                 |
| `/cross-refs?ref=John 3:16`       | ⚠️ corpo não renderiza na ferramenta de fetch (mesmo comportamento de ontem). Ontem foi medido pelo vizinho `passage-guide` e a tabela estava populada com 12 referências; hoje o vizinho de João não estava na lista de URLs permitidas, então **não reconfirmei** |
| `/geo/locations`                  | ✅ 48 locais com coordenadas e descrição                                                                                                                                                                                                                            |
| `/archaeology/stats`              | ✅ 102 achados: 84 confirmados, 15 debatidos, 3 disputados                                                                                                                                                                                                          |
| `/linguistics/interlinear/1/1`    | ✅ 62 KB de payload                                                                                                                                                                                                                                                 |
| `/rag/stats`                      | ✅ responde — `totalDocuments: 0` é do cache em memória do processo, zera a cada restart do Render. **Não mede o acervo**                                                                                                                                           |

## IA e biblioteca

- **Provedor:** Gemini, configurado, `lastFailure: null`. Nenhum sinal de teto de gastos, cota estourada, chave inválida ou timeout.
- **Resposta real ou enlatada:** não medido (POST bloqueado).
- **Truncagem:** não medido em produção. Configuração correta preservada no código.
- **Tamanho do acervo:** não medido (precisa de acesso ao Postgres).
- **Embeddings da Bíblia:** ausentes em produção — ver seção 🔴. Distinto do acervo do Drive: são duas lacunas independentes, e esta afeta toda busca, não só as respostas da IA.

## Deploy pendente

**Sim — há trabalho pronto e não comitado no portão de licença.** `git status` mostra:

```
 M backend/src/rag/license-gate.ts        (-128 / +86 linhas)
 M backend/src/rag/drive-rag.service.ts
 M backend/src/rag/license-gate.spec.ts
 M backend/scratch/licencas.js
 D backend/scratch/licencas.json
?? backend/src/rag/license-manifest.ts    (arquivo novo)
```

É a refatoração que tira o manifesto de licenças do JSON em disco e o compila junto com o serviço, para o portão não ter como falhar por motivo de ambiente — motivação boa, dado o histórico. **Passa lint, os 140 testes (incluindo `license-gate.spec.ts`) e o typecheck.** Está pronto para commit; produção ainda roda a versão que lê o JSON.

Não commito nem faço deploy daqui — o sandbox não consegue escrever em `.git`. Comandos para você:

```bash
cd ~/Downloads/TheoSphere
git add backend/src/rag/license-gate.ts backend/src/rag/license-manifest.ts \
        backend/src/rag/drive-rag.service.ts backend/src/rag/license-gate.spec.ts \
        backend/scratch/licencas.js
git rm --cached backend/scratch/licencas.json
git commit -m "refactor(licenca): manifesto compilado em license-manifest.ts, sem I/O de disco"
```

---

# Segunda passagem — 12:37–12:45 (re-execução da task após retomada)

A task foi retomada e a suíte inteira rodou de novo, do zero. **Nada regrediu.** Nenhuma correção foi necessária, nenhum arquivo foi alterado — o `git status` no fim da segunda passagem é idêntico ao do começo (os 6 arquivos do portão de licença, ainda não comitados).

| Componente | Comando              | Status                                     | Corrigido?            |
| ---------- | -------------------- | ------------------------------------------ | --------------------- |
| Backend    | `npm run lint`       | ✅ 0 erros, 0 warnings                     | N/A                   |
| Backend    | `npm run test`       | ✅ 12 suítes, 140 testes, 6,9 s            | N/A                   |
| Backend    | `npm run build`      | ✅ compila (`nest build` limpo)            | N/A — ver nota Prisma |
| Frontend   | `npm run lint`       | ✅ 0 erros, 1 warning conhecido            | N/A                   |
| Frontend   | `npm run test`       | ✅ 5 arquivos, 49 testes, 7,0 s            | N/A                   |
| Frontend   | `npm run build`      | ⚠️ typecheck ✅, bundle bloqueado por rede | N/A — ver nota fontes |
| Produção   | `GET /api/v1/health` | ✅ `status: ok`, database up, redis up     | N/A                   |

## As duas ressalvas — ambas do sandbox, nenhuma do código

**Prisma.** `npm run build` do backend é `prisma generate && nest build`. O `prisma generate` morre em `403 Forbidden` ao baixar o schema-engine de `binaries.prisma.sh` — o sandbox não tem essa saída de rede. `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1` não resolve, porque a falha não é no checksum e sim no download do binário em si. O client já está gerado em `node_modules/.prisma/client`, então rodei `npx nest build` isolado: **compila limpo, exit 0**. O que isso mede: o TypeScript do backend está são. O que não mede: se o schema do Prisma mudou desde a última geração, essa mudança não foi validada aqui. No Render o `prisma generate` roda com rede e cobre isso.

**Fontes do Google.** O `next build` falha em três pontos — `Inter`, `Literata` e `Outfit` via `next/font/google` em `src/app/layout.tsx`. `fonts.googleapis.com` também está fora do sandbox. Rodei `tsc --noEmit` no projeto inteiro: **exit 0**. O build chegou até a etapa de fontes, ou seja, todo o código de aplicação já tinha sido resolvido. Na Vercel, com rede, esse passo passa.

Vale registrar uma armadilha do ambiente, porque vai reaparecer: o `next build` **não roda na pasta montada** — falha em `EPERM: unlink '.next/BUILD_ID'`, o mount bloqueia unlink. Copiar a árvore para `/tmp` resolve, **mas o `node_modules` precisa ser copiado de verdade, não symlinkado** — o Turbopack recusa symlink que aponta para fora da raiz do projeto (`Symlink [project]/fe-build/node_modules is invalid`). São 1,9 GB de cópia e o disco fica em 77%. Anotado para as próximas execuções não repetirem as duas tentativas perdidas.

## O que continua em aberto

Nada novo. As pendências são as da primeira passagem, sem mudança:

- 🔴 **Embeddings da Bíblia ausentes em produção** — busca híbrida com um braço só. Este é o item que importa.
- ⚪ POST bloqueado no sandbox: `rag/chat` (resposta real vs. enlatada) e truncagem seguem sem medição.
- ⚪ Tamanho do acervo do Drive segue sem medição (precisa de Postgres).
- 📦 Refatoração do portão de licença pronta e testada, **não comitada**. Comandos na seção anterior.

Produção respondeu saudável nos dois momentos do dia — database e redis `up`.

---

# Terceira passagem — 12:45–12:52 (task retomada de novo)

Suíte inteira re-executada do zero. **Nada regrediu, nada novo apareceu.** Uma única alteração no repositório, descrita abaixo.

| Componente    | Comando                           | Status                                                                                     | Corrigido?                                                   |
| ------------- | --------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Backend       | lint (`eslint --cache`)           | ✅ 0 erros, 0 warnings                                                                     | N/A                                                          |
| Backend       | test (`jest`)                     | ✅ 12 suítes, 140 testes, 7,1 s                                                            | N/A                                                          |
| Backend       | build (`nest build`)              | ✅ exit 0                                                                                  | N/A — `prisma generate` segue bloqueado por rede             |
| Frontend      | lint (`eslint src --cache`)       | ✅ 0 erros, 1 warning conhecido (`BibleReader.tsx:276`, React Compiler + TanStack Virtual) | N/A                                                          |
| Frontend      | test (`vitest`)                   | ✅ 5 arquivos, 49 testes, 7,5 s                                                            | N/A                                                          |
| Frontend      | typecheck (`tsc --noEmit`)        | ✅ exit 0                                                                                  | N/A — bundle `next build` segue bloqueado (fontes do Google) |
| Comportamento | `audit/scripts/static-checks.mjs` | ✅ 0 achados novos nas 4 categorias                                                        | N/A                                                          |
| Produção      | `GET /api/v1/health`              | ✅ `status: ok`, database up, redis up                                                     | N/A                                                          |

`static-checks` confirmou: 0 elementos interativos sem handler (+2 na allowlist), 0 chamadas de API sem rota, 0 componentes falhando em silêncio (+4 na allowlist), 0 `PrismaClient` sem driver adapter.

## Correção aplicada

**`.gitignore` — `.eslintcache` não estava ignorado.** Rodar o lint com `--cache` (a técnica que desbloqueou o lint neste sandbox, ver primeira passagem) gera `backend/.eslintcache` e `frontend-v2/.eslintcache`, e ambos apareciam como arquivos novos no `git status`. São artefatos de máquina, específicos do caminho absoluto de quem rodou — commitá-los polui o repositório e gera conflito em toda execução. Adicionada a linha `.eslintcache` ao `.gitignore` da raiz. **Re-teste:** `git status --porcelain | grep -c eslintcache` → `0`.

## Ressalvas do sandbox (inalteradas)

- `/health/ai` e os demais 11 endpoints **não foram reconfirmados nesta passagem**: só `…/api/v1/health` estava na lista de URLs permitidas para fetch. Os resultados válidos são os da primeira passagem, 4 horas atrás.
- `prisma generate` → 403 em `binaries.prisma.sh`. `nest build` isolado compila limpo.
- `next build` → fontes do Google fora da allowlist de rede. `tsc --noEmit` cobre o código de aplicação.

## O que continua em aberto — sem mudança

- 🔴 **Embeddings da Bíblia ausentes em produção.** Segue sendo o único item vermelho e o único que muda a experiência do usuário hoje. Precisa das duas linhas de `psql`/`tsx` da primeira passagem, rodadas no seu Mac.
- ⚪ POST bloqueado: `rag/chat` (enlatada?) e truncagem sem medição.
- ⚪ Acervo do Drive sem medição (precisa de Postgres).
- 📦 Refatoração do portão de licença **ainda não comitada** — 6 arquivos, passa lint/140 testes/typecheck. Comandos na primeira passagem. Some a esses o `.gitignore` alterado hoje.

---

# Quarta passagem — 15:00 (migracao para o Antigravity)

Projeto preparado e aberto no Antigravity IDE. Abrir num IDE real revelou dois
defeitos que a suite dava como limpos.

## Achado 1: os specs nunca passaram por type-check

O painel Problems do IDE mostrou 15 erros de TypeScript num repositorio que
`npm run verificar` reportava sem problema. Causa: `nest build` usa
`tsconfig.build.json`, que exclui `**/*spec.ts`. O Jest executa os specs sem checar
tipos. Resultado: **os arquivos de teste ficaram fora de qualquer verificacao de
tipo**.

O erro concreto: `rag.service.spec.ts` faz cast do metodo privado
`buildGeminiRequest` para um tipo escrito a mao que declarava so
`{ systemInstruction, maxOutputTokens }`. A assercao de `thinkingConfig` — o teste
que guarda justamente a correcao da truncagem de 30/07 — acessava propriedade fora
do tipo. **O teste passava em runtime e guardava de verdade**; o tipo é que estava
incompleto. Nao era teste vazio, mas era erro real e invisivel.

Corrigido em `402cecd`:

- tipo do cast completado com `thinkingConfig`
- `npm run typecheck` = `tsc --noEmit -p tsconfig.json` (inclui specs)
- `verificar` passou a ser `build && typecheck && test && lint`

Caminho de falha testado: erro injetado num spec faz o typecheck sair 2; revertido,
sai 0. Suite completa depois da mudanca: typecheck 0, 140 testes, lint 0, nest build 0.

## Achado 2: token do Railway em codigo versionado

`scripts/check-production-health.ts` tem `const RAILWAY_TOKEN = '...'` literal,
commitado em `c3462e7` e ja no GitHub. O script aponta para o backend antigo do
Railway, desativado na migracao para o Render — codigo morto.

Arquivo mantido por decisao do dono. Apagar nao resolveria: o token segue no
historico do git. **Acao necessaria: revogar o token no painel do Railway.** Pendente.

## Preparacao para o Antigravity

- `AGENTS.md` na raiz — stack, convencoes, armadilhas, pendencias vivas
- `~/.gemini/GEMINI.md` — regra global que manda ler o AGENTS.md do workspace
- `.antigravityignore` + `.geminiignore` — excluem node_modules (3,2 GB),
  valhalla_data (116 MB), artefatos de build e `.env`
- `theosphere.zip` (1,1 GB) deletado da raiz
- Antigravity IDE ja estava instalado; TheoSphere ja era pasta confiavel

Commits: `f948c4b`, `4cf8c13`, `2b10e42`, `402cecd` — todos em `origin/main`.

---

# Quinta passagem — 16:45 (diagnóstico do banco de produção)

Com acesso real ao Postgres, as perguntas que estavam sem medição há dias foram
respondidas. Script criado: `backend/scratch/diagnostico-embeddings.js` — somente
leitura, custo zero, reexecutável.

## Embeddings: confirmado, e o número é zero

| tradução          | com embedding | total  |
| ----------------- | ------------- | ------ |
| BLIVRE            | 0             | 31.102 |
| NVA               | 0             | 31.094 |
| ARA               | 0             | 88     |
| KJV               | 0             | 56     |
| NVIPT             | 0             | 24     |
| ara _(minúsculo)_ | 0             | 1      |

**0 de 62.365.** O diagnóstico por aritmética do RRF, feito na primeira passagem,
estava certo — e agora está confirmado na fonte, não inferido. Os cinco índices HNSW
existem, incluindo `BibleVerse_embedding_hnsw_idx`: a infraestrutura está pronta e
vazia. Não é problema de schema nem de migração, é povoamento que nunca rodou.

## Achado novo: só 2 das 7 traduções existem de verdade

`/bible/versions` devolve 7 versões com metadados de licença. A tabela `BibleVerse`
conta outra história: BLIVRE e NVA são Bíblias completas (~31 mil versículos cada), e
**ARA (88), KJV (56) e NVIPT (24) são amostras** — dezenas de versículos. Uma sétima
não tem nenhuma linha.

A interface oferece traduções que o usuário não consegue ler além de alguns
versículos, sem sinalizar isso em lugar nenhum. É o mesmo padrão dos outros defeitos
deste projeto: o sistema responde com sucesso e o vazio passa por conteúdo.

Sujeira de dados junto: `'ara'` minúsculo e `'ARA'` maiúsculo coexistem como
traduções distintas (1 e 88 versículos).

## Acervo do Drive: 170 trechos, 2 donos

Não está vazio — a anotação anterior de "0 trechos" está superada. Mas 170 é pouco,
coerente com as poucas obras reingeridas depois da purga de 01/08, que removeu
27.887 trechos. Confirmado também que `/rag/stats` não serve para medir isso:
reporta cache em memória do processo.

## O que segue sem medição

`POST /rag/chat` — resposta real ou enlatada, e truncagem. Não medido nesta
passagem. **Não há mais bloqueio técnico**; é só não ter sido feito ainda. Essa
distinção importa: nos relatórios anteriores era impossível, agora é pendente.
