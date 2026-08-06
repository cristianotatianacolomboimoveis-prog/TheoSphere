# AGENTS.md — TheoSphere

Instruções para agentes de IA que trabalham neste repositório. Arquivo cross-tool:
lido por Antigravity, Cursor, Claude Code e afins.

> **Antigravity:** este arquivo **não** é carregado automaticamente. Configure uma
> regra global (Settings → Rules) instruindo o agente a ler `AGENTS.md` na raiz do
> workspace, ou copie o conteúdo para `~/.gemini/GEMINI.md`.

---

## 0. COMECE AQUI — onde o trabalho parou

Última sessão: **2026-08-06**, encerrada no commit `0ea321e`. Repositório limpo,
`origin/main` sincronizado, suíte inteira passando (typecheck 0, 140 testes backend,
49 frontend, lint 0, build 0). Produção respondendo saudável.

Os próximos passos, em ordem de importância:

**1. Revogar o token do Railway.** Só o dono pode. Detalhe na seção 6. É o único
item de segurança em aberto.

**2. Povoar os embeddings da Bíblia em produção.** Diagnóstico já feito em
2026-08-06: **0 de 62.365 versículos têm embedding.** Confirmado no banco, não
inferido. Detalhe na seção 6.

O povoamento gasta cota do Gemini (`gemini-embedding-001`) proporcional ao volume.
Comece por **BLIVRE apenas** — 31.102 versículos — meça o custo real, e só depois
decida sobre as demais. Este projeto já estourou teto de gastos uma vez (29/07).

```bash
cd backend
node scratch/diagnostico-embeddings.js   # reconferir, somente leitura, custo zero
npx tsx scripts/full-rag-bootstrap.ts    # povoar — GASTA COTA
```

**3. Decidir sobre as traduções incompletas.** Cinco das sete versões oferecidas na
UI têm dezenas de versículos, não milhares. Ver seção 6. É decisão de produto, não
correção óbvia.

**4. Medir o `POST /rag/chat`.** Segue sem resposta: a IA devolve conteúdo real ou
texto enlatado, e a resposta chega inteira ou truncada? Nunca foi medido em
produção porque o ambiente de verificação anterior não fazia POST. Num IDE local
com o `.env` carregado, é direto.

**5. Tornar a falha visível.** A melhoria do `meta.vectorArm` na resposta de
`/search/verses`, descrita na seção 6. É a correção de fundo: falha silenciosa é o
defeito que este projeto mais paga caro.

---

## 1. O que é o projeto

Plataforma de pesquisa bíblica e teológica. O objetivo declarado é superar o Logos
Bible Software em performance, usabilidade e recursos de IA. Não é um CRUD — as
decisões de arquitetura devem assumir corpus grande (7 traduções × ~31k versículos),
busca morfológica no original e latência de milissegundos.

## 2. Stack

| Camada   | Tecnologia                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------ |
| Backend  | NestJS 11, Prisma 7, PostgreSQL (Supabase + pgvector), Redis opcional com fallback in-memory     |
| Frontend | Next.js 16 (App Router), React 19, TailwindCSS 4, Cesium, MapLibre GL, Deck.gl, Three.js, WebLLM |
| IA       | Gemini (primário), OpenAI (fallback), embedding local de hash-bucket como último recurso         |
| Monorepo | `backend/` + `frontend-v2/`                                                                      |

**Produção:** backend em Render (`https://theosphere.onrender.com`, free tier —
auto-sleep de 15 min, cold start de ~60 s); frontend em Vercel
(`https://frontend-v2-omega-seven.vercel.app`, deploy por `npx vercel --prod`, sem
repo Git conectado); banco em Supabase.

## 3. Convenções inegociáveis

- **Código em inglês. UI e comentários em PT-BR.**
- **`userId` sempre vem do JWT, nunca do body.** Sem exceção.
- `.env*` fica no `.gitignore`. Variáveis de produção moram no dashboard do
  Render/Vercel, não no repositório.
- `NEXT_PUBLIC_*` é build-time — mudar o valor exige novo build para ter efeito.
- CORS do backend aceita `frontend-v2*.vercel.app` por regex.
- **Nunca desabilite um teste ou uma regra de lint para "resolver" um erro.**
  Se não der para corrigir, documente como pendência.

## 4. Verificação — obrigatória a cada incremento

O dono do projeto exige evidência numérica a cada fragmento entregue, não só no fim.
Isso não é zelo excessivo: este repositório já teve guarda de OCR desligado, cache
envenenado, 21 botões sem `onClick` e um portão de licença que lia ausência de sinal
como aprovação. Todos passavam em "parece que está funcionando".

```bash
cd backend && npm run verificar          # build + typecheck + testes + lint
cd backend && npm run typecheck          # tsc --noEmit -p tsconfig.json (INCLUI os specs)
cd backend && npm run verificar:acervo   # coerência Drive × relatório × banco (exit 1 em erro)
node audit/scripts/static-checks.mjs     # handlers ausentes, rotas fantasma, falha silenciosa, Prisma sem adapter
```

> **Por que `typecheck` existe separado de `build`:** `nest build` usa
> `tsconfig.build.json`, que exclui `**/*spec.ts`. Durante meses os arquivos de teste
> **nunca passaram por type-check** — o Jest os executa sem checar tipos, então um
> erro TS2339 num spec ficava invisível para a suíte inteira. Descoberto em
> 2026-08-06 ao abrir o projeto num IDE, que apontou 15 erros que `npm run verificar`
> dava como limpo. Não remova o `typecheck` do `verificar`.

Três regras que vêm de cicatriz:

1. **Teste o caminho de falha, não só o de sucesso.** Verificador que nunca falha
   não verifica nada.
2. **Diga explicitamente o que NÃO foi verificado e por quê.** Silêncio sobre uma
   lacuna é pior que a lacuna.
3. **Escreva teste quando o defeito for do tipo que volta** (API que renomeia campo,
   por exemplo).

Não basta responder "está tudo certo" — mostre o número.

## 5. Armadilhas conhecidas do ambiente

- **Prisma 7 exige driver adapter.** 19 seeds/scripts já quebraram em runtime por
  instanciar `PrismaClient` sem adapter — fora da cobertura de lint e build. O
  `static-checks.mjs` tem uma categoria só para isso.
- **`prisma generate` precisa de rede** (`binaries.prisma.sh`). Em ambiente sem saída,
  rode `npx nest build` isolado — o client já gerado em `node_modules/.prisma/client`
  serve.
- **`next build` baixa fontes do Google** (`Inter`, `Literata`, `Outfit` via
  `next/font/google` em `src/app/layout.tsx`). Sem rede, use `tsc --noEmit` para
  cobrir o código de aplicação.
- **`next build` falha em pasta montada** com `EPERM: unlink '.next/BUILD_ID'`.
  Copie a árvore para local antes de buildar.
- **Lint pesado:** use `eslint --cache`. `--max-old-space-size` alto causa thrashing
  em máquina com pouca RAM; 3072 é suficiente.

## 6. Estado atual — pendências vivas

Atualize esta seção quando resolver um item. Ela é o principal motivo deste arquivo
existir: sem ela, o próximo agente rediagnostica tudo do zero.

### 🔴 Embeddings da Bíblia ausentes em produção

**Confirmado com o banco em 2026-08-06 — zero, não "poucos":**

| tradução          | com embedding | total  |
| ----------------- | ------------- | ------ |
| BLIVRE            | 0             | 31.102 |
| NVA               | 0             | 31.094 |
| ARA               | 0             | 88     |
| KJV               | 0             | 56     |
| NVIPT             | 0             | 24     |
| ara _(minúsculo)_ | 0             | 1      |

`BibleVerse.embedding` está NULL em **62.365 de 62.365 versículos**. Consequência:
**a busca híbrida roda com um braço só** — todo resultado vem de full-text puro, o
braço semântico não contribui. Buscar "perdão dos inimigos" não encontra "amai os
vossos inimigos". É exatamente o recurso que deveria diferenciar a plataforma do
Logos.

Os cinco índices HNSW existem, incluindo `BibleVerse_embedding_hnsw_idx`. A
infraestrutura está pronta e vazia — não é problema de schema nem de migração.

Rode `node backend/scratch/diagnostico-embeddings.js` para reconferir a qualquer
momento: é somente leitura e não gasta cota.

Ficou dois meses invisível por três camadas de silêncio empilhadas:
`hybridSearchVerses` engole a falha do braço vetorial num `logger.warn` e segue com
`[]`; a resposta HTTP não sinaliza que metade do ranking não participou
(`vectorRank: null` é indistinguível de "só casou por palavra-chave"); e
`triggerBatchEmbeddings` é chamado com `void`, fire-and-forget.

```bash
# 1. Confirmar antes de gastar cota
psql "$DATABASE_URL" -c 'SELECT translation, count(*) FILTER (WHERE embedding IS NOT NULL) AS com_embedding, count(*) AS total FROM "BibleVerse" GROUP BY translation;'

# 2. Se vier zero: povoar. Comece por UMA tradução (BLIVRE) para medir custo real.
cd backend && npx tsx scripts/full-rag-bootstrap.ts
```

**Melhoria sugerida, ainda não aplicada:** incluir `meta: { vectorArm: "ok" | "empty" | "failed" }`
na resposta de `/search/verses`. Falha silenciosa é o problema de fundo, e aqui ela
está no backend, fora do alcance do `static-checks.mjs` (que só varre o frontend).

### 🔑 Token do Railway exposto no repositório

`scripts/check-production-health.ts` tem um token do Railway escrito direto no
código (`const RAILWAY_TOKEN = '...'`), commitado desde `c3462e7` e já publicado no
GitHub. O script aponta para `theosphere-production.up.railway.app` — o backend
antigo, desativado na migração para o Render. É código morto.

O arquivo foi mantido por decisão do dono. **Apagar o arquivo não resolveria de
qualquer forma**: o token permanece no histórico do git e em qualquer clone. A única
ação que efetivamente fecha isso é **revogar o token no painel do Railway**, o que
só o dono pode fazer. Enquanto não for revogado, trate como credencial vazada.

Nenhum agente deve reutilizar esse token nem escrever segredos novos em código.
Chaves vão para `.env` (que está no `.gitignore`) ou para o dashboard do provedor.

### 🟠 Só 2 das 7 traduções existem de fato

`GET /bible/versions` devolve 7 versões com metadados de licença, mas a tabela
`BibleVerse` conta outra história (medido em 2026-08-06): **BLIVRE (31.102) e NVA
(31.094) são Bíblias completas; ARA (88), KJV (56) e NVIPT (24) são amostras** —
dezenas de versículos, não milhares. Uma sétima não tem nenhuma linha.

Ou seja, a interface oferece traduções que o usuário não consegue ler além de alguns
versículos. Isso não é o portão de licença agindo (BLIVRE e NVA são as livres; ARA e
NVIPT são `restricted` por licença e provavelmente nunca deveriam ter sido
carregadas). Vale decidir explicitamente: ou some da lista de versões, ou sinaliza
como parcial na UI. Hoje falha em silêncio, que é o padrão que este projeto combate.

Há também sujeira de dados: `'ara'` minúsculo e `'ARA'` maiúsculo coexistem como
traduções distintas (1 e 88 versículos). Normalizar.

### ⚪ Lacunas de conteúdo

- **Léxico** roda com seed de amostra, não com o dataset completo.
- **Comentários vazios** desde a purga de licença de 2026-08-01 (10 obras,
  27.887 trechos removidos).
- **Acervo do Drive: 170 trechos, 2 donos** (medido em 2026-08-06). Não está vazio,
  mas é pequeno — coerente com as poucas obras reingeridas depois da purga. Atenção:
  `/rag/stats` reporta `totalDocuments` de um cache em memória do processo, que zera
  a cada restart do Render — **não mede o acervo**. Use o script de diagnóstico.

### ⚖️ Portão de licença

O acervo aceita **apenas domínio público**. O portão é fail-closed por design: na
dúvida, rejeita. Não afrouxe essa lógica sem decisão explícita do dono — já houve
uma purga por causa disso.

Cuidado com traduções: uma obra em domínio público pode ter **tradução moderna
protegida por direito autoral**. Westminster (1647) e Agostinho (~400 d.C.) são
domínio público no original; a tradução para o português pode não ser. Nome de
arquivo dizendo "dominio publico" é uma afirmação, não uma verificação.

## 7. Custo de IA

Existe controle de custo desde 2026-07-29, depois de um episódio de teto de gastos
estourado no Gemini com cache envenenado. Não gere embeddings fora do lote diário
sem necessidade. `GET /health/ai` foi criado justamente para tornar visível quando o
provedor degrada — use antes de concluir que "a IA está quebrada".

Nota sobre `thinkingConfig`: o raciocínio do Gemini consome o `maxOutputTokens`. O
teto é limite total, não reserva — já causou resposta truncada no meio da frase. A
configuração atual (`thinkingBudget: 0`, `maxOutputTokens: 3000`) existe por isso.

## 8. Onde olhar

- `audit/reports/daily/` — relatórios diários da auditoria automatizada. O mais
  recente é o retrato mais fiel do estado real.
- `audit/scripts/static-checks.mjs` — verificador de comportamento, com allowlist.
- `CATALOGO-DOMINIO-PUBLICO.md` e `FILA-INGESTAO-DOMINIO-PUBLICO.md` — acervo.
- `DEPLOY_RENDER.md` — deploy do backend.
