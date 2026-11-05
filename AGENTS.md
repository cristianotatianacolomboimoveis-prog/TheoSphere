# AGENTS.md — TheoSphere

Instruções para agentes de IA que trabalham neste repositório. Arquivo cross-tool:
lido por Antigravity, Cursor, Claude Code e afins.

> **Antigravity:** este arquivo **não** é carregado automaticamente. Configure uma
> regra global (Settings → Rules) instruindo o agente a ler `AGENTS.md` na raiz do
> workspace, ou copie o conteúdo para `~/.gemini/GEMINI.md`.

---

## 0. COMECE AQUI — onde o trabalho parou

Última sessão: **2026-11-05**. Repositório limpo, suíte inteira passando:

- **Backend:** 374 testes passando (42 specs Jest), lint 0, typecheck 0, static-checks 0, `verificar:acervo` coerente.
- **Frontend:** 49 testes passando (5 specs Vitest), lint 0, typecheck 0 (`tsc --noEmit`).
- **Produção frontend:** `https://frontend-v2-lake.vercel.app` respondendo **HTTP 200** (a URL legada `frontend-v2-omega-seven` é 404 e foi descontinuada).
- **Backend Render:** `https://theosphere.onrender.com` operante e medido (**HTTP 200** em `/api/v1/health/live`).
- **Banco de Dados Supabase:** 1.195 MB (1,195 GB) medidos em 2026-11-05 via `backend/scratch/medir-tamanho-banco.js`. Modo read-only de disco ativado pelo Supabase Free Tier por ultrapassar 1 GB.
- **Acervo Teológico Medido:** **45.114 chunks indexados** no `UserEmbedding` (88 obras clássicas com trechos ativos no banco). O catálogo canônico estruturado mapeia **108 obras** (`backend/src/bible/classic-catalog.ts`), sincronizado com o frontend via `node scripts/sync-catalog.mjs`.

> **Histórico de entregas anteriores (itens 1 a 47):** Foi migrado integralmente para [CHANGELOG.md](file:///Users/cristianocolombo/Desktop/Theosphere%202026/CHANGELOG.md).

### Fase 0 — Bloqueadores (Concluída em 2026-11-05)

1. **T0.1 — Fechar auto-promoção de plano em `/billing/subscribe` (branch `fix/t0.1-billing-subscribe`):**
   `POST /billing/subscribe` responde 403 Forbidden para planos válidos e 400 BadRequest para inválidos. Mudança de plano é restrita a `BillingService.applyPaidPlan` via webhook autenticado e idempotente (`BillingEvent`). Frontend `/pricing` atualizado para lista de espera sem promessas de ativação imediata.
2. **T0.2 — Separar espaços vetoriais e isolar cache de embeddings (branch `fix/t0.2-vector-spaces`):**
   `createEmbedding` retorna `{ vector, provider, model, dimensions }` restrito exclusivamente ao modelo Gemini persistido (`gemini-embedding-001`, 768). Se indisponível, lança `EmbeddingUnavailableError`, propagando `meta.vectorArm = 'failed'`. Fallback hash e OpenAI isolados em `createEphemeralFallbackEmbedding` (somente em memória temporária). Diagnóstico no banco confirmou 0% de contaminação por vetores de hash na base persistente.
3. **T0.3 — Plano de gestão de disco do Supabase (branch `feat/t0.3-plano-disco-supabase`):**
   Medição detalhada por tabela e índice registrada. Extensão pgvector 0.8.0 suporta `halfvec(768)`. SQL de compressão preparado em `docs/architecture/sql/halfvec_compression.PENDENTE-D3.sql` (estimativa do agente: ~389 MB a menos nos índices HNSW; perda de qualidade não medida). Documentado em `docs/architecture/plano-disco-supabase.md`. Aguardando decisão D3 do mantenedor.
4. **T0.4 — Anotações e marca-texto persistidos no servidor (branch `feat/t0.4-server-annotations`):**
   Criado modelo Prisma `Annotation` com `userId`, formato canônico `BBCCCVVV`, Last-Write-Wins (LWW) e soft-delete (`deletedAt`). Endpoint `POST /annotations/sync` com fallback amigável caso o banco esteja em read-only. Sincronização em segundo plano no frontend com persistência local de 0ms.
5. **T0.5 — Correção de afirmações e restrição factual (branch `fix/t0.5-factual-claims`):**
   Removido `openTextCompliant: true` do diagrama sintático em favor do rótulo explícito "Segmentação aproximada (não é árvore sintática anotada)". O diff textual LCS de `BibleComparisonService` foi restrito a versões do mesmo idioma; versões de idiomas distintos exibem colunas paralelas sem diff indevido. Superlativos e termos não sustentados foram removidos da UI e código.
6. **T0.6 — Higiene de documentação (branch `feat/t0.6-docs-hygiene`):**
   Histórico extenso movido para `CHANGELOG.md`. URLs e métricas unificadas em `AGENTS.md`. Catálogo de obras sincronizado via script automatizado `scripts/sync-catalog.mjs`.
7. **T0.7 — Bloqueadores de deploy achados na revisão da Fase 0 (branch `fix/t0.7-deploy-blockers`):**
   - **Webhook aberto:** o `BillingModule` registrava o `FakePaymentProvider` em produção. A assinatura aceita (`'valid-test-signature'`) é pública no repositório, então qualquer pessoa, sem login, promovia qualquer conta. Agora o módulo usa `DisabledPaymentProvider`, que rejeita toda assinatura até existir gateway (D2). Um teste falha se o fake voltar a ser registrado; isso foi conferido religando o fake de propósito.
   - **Migração automática:** o `start` (package.json e Dockerfile) roda `prisma migrate deploy` a cada deploy. A migração de halfvec estava em `prisma/migrations/` e seria aplicada sem D3. Ela foi movida para `docs/architecture/sql/`. **Atenção:** `20261105154000_billing_events` e `20261105163000_annotations` continuam na pasta e precisam de banco gravável. Com o Supabase em read-only, `migrate deploy` falha e o novo backend não sobe.
   - **Regressão no RAG:** depois de T0.2, uma falha de embedding (ex.: 429 do Gemini) rejeitava o `Promise.all` e derrubava também os contextos bíblico, léxico e de comentários, com log só em `debug`. Agora `RagService.gatherKnowledgeContexts` usa `Promise.allSettled` e registra em `warn` cada base indisponível. Coberto em `rag.service.spec.ts`.

### Decisões Pendentes Exclusivas do Mantenedor (D1 a D6)

- **D1:** Revogar o token do Railway exposto em `scripts/check-production-health.ts` no painel do Railway.
- **D2:** Escolher e contratar gateway de pagamento (Mercado Pago, Asaas, Stripe) e configurar credenciais no dashboard do Render.
- **D3:** Decisão sobre o disco do Supabase: upgrade para plano Pro ($25/mês) OU aprovação da migração de compressão `halfvec` (T0.3).
- **D4:** Licenciamento comercial de traduções modernas brasileiras de púlpito (ARA/ARC/NAA — SBB; NVI — Biblica).
- **D5:** Orçamento mensal de infraestrutura (Render pago, Redis dedicado, CDN de assets).
- **D6:** Definição do público prioritário (pastoral/homilético vs seminarista/acadêmico) para ordenação de entregas da Fase 2.

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
(`https://frontend-v2-lake.vercel.app`, deploy por `npx vercel --prod`, sem
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

### 🟢 Embeddings da Bíblia em produção (Povoamento Ativo)

**Medição direta no banco PostgreSQL:**

| tradução | com embedding | total  | status              |
| -------- | ------------- | ------ | ------------------- |
| BLIVRE   | 31.102        | 31.102 | 100% Completo       |
| NVA      | 31.094        | 31.094 | 100% Completo       |
| KJV      | 1.600         | 30.470 | Povoamento em lotes |
| TR       | 1.000         | 7.957  | Grego NT Ativo      |
| WLC      | 500           | 22.550 | Hebraico AT Ativo   |
| LXX      | 500           | 21.899 | Grego AT Ativo      |
| WEB      | 500           | 30.456 | Inglês WEB Ativo    |

Total no banco: **66.296 versículos com embeddings ativos** indexados via HNSW (`BibleVerse_embedding_hnsw_idx`).
A busca híbrida em `/search/verses` opera com os dois braços (Full-Text + Vetorial) respondendo `meta.vectorArm: "ok"`.

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

**Sinalização `meta.vectorArm` aplicada e blindada (2026-09-15):**
`/search/verses` responde `meta: { vectorArm: "ok" | "empty" | "failed" }` —
implementado no `search.controller.ts` linhas 38-40 sobre a propriedade
não-enumerável `vectorStatus` anexada em `search.service.ts` linhas 135-161.
Coberto por `describe('meta.vectorArm exposure')` em `search.service.spec.ts`
com os 3 estados + o invariante de não-enumerabilidade (que evita duplicar a
chave dentro do array serializado ao lado do `meta` do envelope).

Bug lateral corrigido na mesma passada: o `try/catch` interno em `vectorSearch`
engolia falha de `createEmbedding` e retornava `[]`, o que virava `vectorStatus =
'empty'` em vez de `'failed'` — falha silenciosa clássica do tipo que o AGENTS
combate. O `catch` interno foi removido; o erro agora propaga para o outer
`.catch` de `hybridSearchVerses` que já marca `'failed'` corretamente. Efeito
prático: teto de gastos do Gemini deixa de aparecer indistinguível de
"biblioteca sem embeddings povoados" no cliente.

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

### 🟢 Traduções Canônicas e Normalização Case-Insensitive

A tabela `BibleVerse` contém 7 traduções integrais e canônicas de domínio público/licença livre: **BLIVRE (31.102), NVA (31.094), KJV (30.470), WEB (30.456), TR (7.957), WLC (22.550), LXX (21.899)**.

- A camada de busca (`SearchService`) normaliza qualquer entrada para uppercase trimmed (`translation?.toUpperCase().trim()`), eliminando divergências case-sensitive.
- A interface (`BibleReader.tsx` e `TranslationPicker.tsx`) mapeia todas as 7 edições integrais com identificação de idioma (PT, EN, GR, HE, LA) e sinaliza explicitamente qualquer amostra com a tag `Amostra` (`isPartial: true`).

### ⚪ Acervo Clássico e Biblioteca Teológica

- **Léxico** integrado com concordância Strong e léxico TAGNT grego/hebraico.
- **Acervo de Domínio Público Medido no PostgreSQL (2026-11-05):** **45.114 chunks ativos** indexados no `UserEmbedding` com embeddings vetoriais, distribuídos em 88 obras com trechos indexados (Agostinho, Calvino, Lutero, Spurgeon, Edwards, Matthew Henry, Aquino, Bunyan, Flávio Josefo, Foxe, etc.). O Copilot IA cita diretamente as obras nos debates e exegeses.
- **Catálogo Canônico Estruturado:** **108 obras** cadastradas em `backend/src/bible/classic-catalog.ts`, sincronizadas automaticamente com `frontend-v2/src/data/classicCatalog.ts` via `node scripts/sync-catalog.mjs`.
- Atenção: `/rag/stats` reporta `totalDocuments` de um cache em memória do processo, que zera a cada restart do Render — use `backend/scratch/medir-tamanho-banco.js` ou `backend/scratch/diagnostico-espacos-vetoriais.js` para medir o acervo persistente no PostgreSQL.

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
