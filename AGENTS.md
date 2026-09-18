# AGENTS.md — TheoSphere

Instruções para agentes de IA que trabalham neste repositório. Arquivo cross-tool:
lido por Antigravity, Cursor, Claude Code e afins.

> **Antigravity:** este arquivo **não** é carregado automaticamente. Configure uma
> regra global (Settings → Rules) instruindo o agente a ler `AGENTS.md` na raiz do
> workspace, ou copie o conteúdo para `~/.gemini/GEMINI.md`.

---

## 0. COMECE AQUI — onde o trabalho parou

Última sessão: **2026-09-18**. Repositório limpo, suíte inteira passando
(**145 testes backend** — +4 sobre o baseline de 141, cobrindo `meta.vectorArm`;
49 frontend, lint 0, typecheck 0, static-checks 0, `verificar:acervo` coerente,
QA Fase 2: 100%, QA Fase 3: 100%).
Produção frontend (`https://frontend-v2-lake.vercel.app`) respondendo **HTTP 200**.
Backend Render (`https://theosphere.onrender.com`) operante e medido.

**Progresso das pendências e novas entregas (medido e verificado em 2026-09-11):**

1. **Agente Autônomo Diário de QA (Fases 2 e 3 Ativas na Nuvem):** Configurado em `.github/workflows/daily-qa.yml` para rodar todos os dias às 06:00 BRT (09:00 UTC). Suíte Fase 2 (14 testes) e Fase 3 (13 testes E2E com isolamento multi-tenant, leitura, anotações, interlinear e encerramento de sessão) validadas contra a produção com **100.0% de Health Score**.
2. **Povoamento Incremental de Embeddings & Suporte Unicode:** Corrigido bug crítico em `EmbeddingService.normalizeText` para suportar nativamente diacríticos e caracteres gregos/hebraicos (`\p{L}\p{N}\p{M}`). Povoamento com Gemini executado: **66.296 versículos com embeddings ativos** (BLIVRE 100%, NVA 100%, KJV 1.600, TR 1.000, WLC 500, LXX 500, WEB 500) e busca híbrida validada com `vectorArm: ok`.
3. **Pipeline de Ingestão do Acervo Clássico (Domínio Público):** Ingestão e indexação vetorial de **38 obras clássicas completas (18.790 chunks de 500 palavras)** no `UserEmbedding` com portão de licença fail-closed (Agostinho, Calvino, Lutero, Spurgeon, Edwards, Aquino, Bunyan, Comentários de Matthew Henry e Easton's Bible Dictionary), validado com citação precisa de 7 fontes pelo Copilot IA RAG.
4. **Sistema de Layouts Superior ao Logos:** Implementado `LayoutSwitcher.tsx` e `Workspace.tsx` com 5 layouts dinâmicos em 1 clique (Foco Único, Paralelo 50/50, Bancada Exegética Tríplice, Copilot IA e Grade Sinótica 2x2), além de maximização individual por painel e Link Set A automático.
5. **Speed Search & Busca Híbrida:** Implementado `TheoSphereCommandPalette.tsx` com atalho global `Cmd+K`/`Ctrl+K`, parser de referências canônicas (`bibleReference.ts`) e operadores booleanos do Logos (`AND`, `OR`, `NOT`, `book:`, `chapter:`).
6. **Painel Contextual de Ideias:** Criado `ContextualInsightsPanel.tsx` e botão `[💡 Ideias]` na toolbar da Bíblia, integrando comentários de domínio público (JFB, Matthew Henry, Calvino), referências TSK e Copilot IA RAG via `/rag/chat`.
7. **Factbook com Lentes e Atlas 3D:** Adicionadas lentes temáticas (_Tudo_, _Bíblico_, _Teológico_, _Geografia_, _Biblioteca_), galeria de tópicos populares e botão de 1 clique para plotar no globo 3D.
8. **Morfologia Interlinear de 1 Clique:** `VerseRow.tsx` enriquecido para que duplo-clique em qualquer palavra do versículo acione o `StrongOverlay.tsx` na posição do cursor.
9. **Deploy em Produção:** Backend sincronizado via Git push (`main ae4562d`) e frontend publicado com sucesso na Vercel (`https://frontend-v2-lake.vercel.app`).
10. **Limpeza e Normalização de Traduções (Concluído):** Normalizado `opts.translation` com `.toUpperCase().trim()` em `SearchService` (abrangendo detecção de referências, busca híbrida e avançada). No frontend (`BibleReader.tsx` e `TranslationPicker.tsx`), atualizado o catálogo com as 7 edições integrais canônicas de domínio público/licença livre (`BLIVRE`, `NVA`, `KJV`, `WEB`, `TR`, `WLC`, `LXX`) com badges estilizados para grego (`GR`) e hebraico (`HE`), e sinalização explícita de versões parciais/amostras (`isPartial: true`).

11. **Migração cross-tool para Claude Code (2026-09-15):** Removido o TheoSphere do workspace do Antigravity IDE — `storage.json` (2 refs), `state.vscdb` (5 chaves com `TheoSphere` limpas) e `workspaceStorage/d66ebd…c6bb/` deletado. Backups `.bak.<ts>` mantidos ao lado dos originais. `~/.gemini/GEMINI.md` global já é agnóstico (só instrui a ler AGENTS.md). `.agent/workflows/audit-weekly.md` reescrito para ser cross-tool. Repositório agora é operado exclusivamente pelo Claude Code / Cowork.
12. **Sinalização `meta.vectorArm` verificada, corrigida e coberta por teste (2026-09-15):** o item que estava listado em §6 como "melhoria sugerida, ainda não aplicada" tinha a instrumentação de saída aplicada (`search.controller.ts:38-40` expõe `meta: { vectorArm: (data as any).vectorStatus || 'ok' }` sobre a propriedade não-enumerável anexada em `search.service.ts:135-161`), mas o teste que escrevi para o cenário `gemini 429` — o que motivou a instrumentação — falhou revelando um bug: `vectorSearch` engolia o erro de `createEmbedding` no `try/catch` interno e devolvia `[]`, o que virava `vectorStatus='empty'` em vez de `'failed'`. Ou seja, teto de gastos do Gemini era indistinguível de "biblioteca sem embeddings povoados" — exatamente o tipo de falha silenciosa que a sinalização existe para tornar visível. **Corrigido**: removido o `try/catch` interno de `vectorSearch`, deixando o erro propagar para o outer `.catch` de `hybridSearchVerses` que já marca `'failed'`. **Testes**: adicionados 4 casos em `search.service.spec.ts` (`describe('meta.vectorArm exposure')`) cobrindo os estados `ok`, `empty`, `failed` (via `createEmbedding` rejeitado) e o invariante de não-enumerabilidade (para não vazar `vectorStatus` no `JSON.stringify` do array de hits, evitando duplicação com o `meta.vectorArm` que já vem no envelope). 18/18 do spec, 145/145 do backend, lint e typecheck limpos.

**Entregas MCP/autonomia na sessão de 2026-09-18:**

13. **Control-plane MCP expandido e governado:** tarefas persistentes, registro de agentes, permissões default-deny, locks Redis distribuídos com renew/heartbeat, receipts estruturados de execução e verificação independente. O fluxo de sucesso permanece bloqueado em `AUDITING` até um verificador independente mover a tarefa para `VERIFIED`.
14. **Persistência de tarefas corrigida:** snapshots de tarefas usam `latestByKeyPrefix()` no ProjectMemory, sem limite fixo de histórico, e atribuições também são persistidas. Há cobertura dedicada em `mcp.task.persistence.spec.ts`.
15. **MCP 2026-07-28 Tasks:** adicionada extensão `io.modelcontextprotocol/tasks` com capability negotiation em `server/discover`, task handles duráveis para `theosphere_answer`, polling `tasks/get` e cancelamento `tasks/cancel`. Tarefas são persistidas antes do handle ser devolvido; estados em andamento são carregados de forma conservadora no restart.
16. **CI:** o último run confirmado do commit `52c5acb` falhou apenas no lint do backend (2 `await` indevidos + validação de `agentVersion`), enquanto Prisma drift e frontend passaram e Security Audit passou. Esses 3 erros foram corrigidos em commits posteriores; a execução correspondente aos commits novos ainda não foi confirmada pela API de runs disponível nesta integração. Vercel continua acusando limite de builds do plano, não erro de compilação.
**Próximos passos:**

1. **Expansão Contínua do Acervo:** Adição e ingestão de novos volumes clássicos de domínio público conforme demanda exegética.

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
- **Acervo de Domínio Público:** **38 obras clássicas completas e 18.790 trechos** indexados no `UserEmbedding` com embeddings vetoriais (Agostinho, Calvino, Lutero, Spurgeon, Edwards, Matthew Henry, Aquino, Bunyan, Easton's Bible Dictionary). O Copilot IA cita diretamente as obras nos debates e exegeses. Atenção: `/rag/stats` reporta `totalDocuments` de um cache em memória do processo, que zera a cada restart do Render — use `scratch/diagnostico-embeddings.js` para medir o acervo persistente no PostgreSQL.

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
