# AGENTS.md — TheoSphere

Instruções para agentes de IA que trabalham neste repositório. Arquivo cross-tool:
lido por Antigravity, Cursor, Claude Code e afins.

> **Antigravity:** este arquivo **não** é carregado automaticamente. Configure uma
> regra global (Settings → Rules) instruindo o agente a ler `AGENTS.md` na raiz do
> workspace, ou copie o conteúdo para `~/.gemini/GEMINI.md`.

---

## 0. COMECE AQUI — onde o trabalho parou

Última sessão: **2026-11-18** (fechamento da Etapa 9: busca sem acento e correção de tsquery na busca avançada).

- **Backend:** 648 testes passando (65 specs Jest), lint 0, typecheck 0, static-checks 0.
- **Frontend:** 73 testes passando (10 specs Vitest), lint 0 erros, typecheck 0 (`tsc --noEmit`).
- **Produção frontend:** `https://frontend-v2-lake.vercel.app` (Vercel conectada ao Git: push na `main` publica).
- **Backend Render:** `https://theosphere.onrender.com`, deploy automático pela `main` **funcionando**. ⚠️ O backend NÃO tem `setGlobalPrefix`: cada controller declara `api/v1/...` (só o health também). Sonde sempre com `/api/v1/<rota>` e um método que a rota aceita — sondar `GET` numa rota `POST` dá 404 e já gerou um falso diagnóstico de "Render parado".
- **Banco Supabase:** 1.535 MB, plano Pro. **Gravável desde 2026-11-06** (`default_transaction_read_only=off`). As 24 migrações estão aplicadas (`prisma migrate status`: up to date). Smoke de produção `node backend/scripts/smoke-teste-producao.mjs`: 8/8 etapas ok (cadastro, login, anotação grava/lê, billing/usage, feedback, leitura bíblica).
- **Busca Textual sem Acento (FTS Normalizado) & Busca Avançada (Etapa 9):**
  - Função `public.theo_unaccent(text)` (IMMUTABLE PARALLEL SAFE STRICT) em ASCII puro.
  - Índice GIN `BibleVerse_text_fts_norm_idx` (18 MB, válido) em produção. O índice legado `BibleVerse_text_fts_idx` (37 MB) permanece ativo até 24/11/2026 por segurança operacional.
  - Destaque sem acento no leitor (`VerseRow.tsx` / `theo-unaccent.ts`).
  - `toTsQuery` em `query-parser.ts` trata termos multi-palavra (como os gerados por normalização de maqaf `־` ou pontuação) via proximidade `(w1 <-> w2 <-> ... <-> wN)`, aplicando `:*` apenas à última palavra em prefixos.
  - `searchAdvanced` passa `tsQ` diretamente para `to_tsquery('simple', ${tsQ})`, sem re-normalização redundante de operadores no SQL.
- **IA em produção restabelecida (2026-11-07):** chave nova do Gemini no Render; `/health/ai` = `ok`, chat com `degraded: false` (conferido de forma independente). No Render, `GEMINI_MODEL=gemini-3.5-flash` sobrepõe o padrão do código (`gemini-3.8-flash`), que estourava o timeout de 30 s. Ao mudar o padrão no código, lembre que a variável do Render prevalece. `AI_CREDITS_FREE_MONTHLY=100` ativo (smoke: `limite: 100`). `LIBRARY_VECTOR_SOURCE=resource_chunk` ativo no Render para busca na biblioteca via índice compacto (`ResourceChunk_embedding_bq_hnsw_idx`, 17 MB).
- **Acervo e Índice de Recursos:** 88 obras distintas no `Resource` (89 entradas de catálogo), 45.092 chunks em `ResourceChunk` com embeddings `gemini:gemini-embedding-001:768` e índice compacto HNSW bit(768) de 17 MB; 140.286 referências em `ResourceReference` (31.912 `heading` + 108.374 `inline`); `UserEmbedding` higienizado e compacto (**40 linhas**, 20 `note` e 20 `highlight`, **296 kB**, medidas nesta sessão; cada smoke de produção cria usuário e anotação e não apaga; 0 `book_chunk`); índice compacto `BibleVerse_embedding_bq_hnsw_idx` com **65 MB**; soma total dos índices vetoriais no banco: **83,69 MB** (87.752.704 bytes; teto do Plano Nano < 150 MB atendido com ampla folga); catálogo canônico de 108 obras (`backend/src/bible/classic-catalog.ts`, sincronizado com `node scripts/sync-catalog.mjs`). Backup dos book_chunk preservado em `~/.theosphere_backups/user_embedding_book_chunks_20261111.jsonl.gz`.
- **Busca Vetorial Binária em Duas Fases (`VECTOR_INDEX_MODE=binary`, padrão):** Recuperação candidata de $P = 200$ versículos via índice binário compacto (`bit(768)` com Hamming `<~>`), com `ef_search = 200` e `iterative_scan = 'relaxed_order'`, reordenados no banco com o vetor completo `<=>` (LIMIT 20). Recall empírico medido na Etapa 7.4 contra o ground-truth exato de ponto flutuante: BLIVRE 97,3% (Recall@10) / 95,7% (Recall@20), KJV 94,0% (Recall@10) / 90,0% (Recall@20).
- **Plano Nano — Ingestão Diária KJV via GitHub Actions (2026-11-16):** Workflow `ingestao-diaria-embeddings.yml` configurado com cron `17 5 * * *` UTC (02:17 BRT), que dispara com cerca de 7 h de atraso na fila compartilhada. A rodada agendada `43877141434` (13:34 UTC) rodou após a rodada manual e não foi cancelada, totalizando 4.000 versículos gravados hoje. KJV atualmente com **26.605 versículos com vetor e 4.507 pendentes** (eram 6.507 pendentes no momento da medição da Etapa 7.4). Linhas mortas na `BibleVerse`: `n_dead_tup = 14.830`.
- **Workflow de Anulação de Vetores Anômalos:** `anular-vetores-anomalos.yml` configurado exclusivamente para disparo manual (`workflow_dispatch`), com `dry_run: true` ativo por padrão. Medição da Etapa 7.4 em 132.960 versículos: **0 anomalias** (< 0,20 ou > 0,85) em todas as traduções com vetor (`BLIVRE`, `WEB`, `LXX`, `WLC`, `KJV`).

> **Histórico de entregas anteriores (itens 1 a 47):** Foi migrado integralmente para [CHANGELOG.md](CHANGELOG.md).

### Correções de dados bíblicos (2026-11-08, Claude Code)

- **KJV com números de Strong no texto:** 30.459 de 30.470 versículos apareciam no leitor como "For1063 God2316 so3779…". A bolls.life manda `God<S>2316</S>` e o `stripHtml` antigo tirava só a tag. Corrigido no banco (backup em scratchpad, 0 versículos com dígito depois) e na origem: `src/bible/bolls-text.ts` (`cleanBollsText`, com spec), usado por `bible-ingestion.service.ts` e `scripts/mass-ingest-bibles.ts`. Os embeddings da KJV foram refeitos sobre o texto limpo.
- **Capítulos faltando:** Jó 19–42 não existia em KJV, WEB e WLC (642 vv. cada); o WLC também não tinha Joel 4 (21 vv.). Inseridos por `scripts/completar-capitulos-faltantes.ts` (idempotente, só insere). Inventário por `bookId` contra a NVA: 0 capítulos faltando.
- **Versificação LXX (Brenton) ↔ KJV:** a LXX de Brenton segue a ordem da Septuaginta. Medido por embeddings (LXX × WEB, Viterbi + sequências com deslocamento constante), havia 921 versículos em sequências desalinhadas (599 em Jeremias). Agora: `src/bible/lxx-alignment.data.ts` (gerado, com cópia idêntica no frontend; um teste exige a igualdade) tem prioridade sobre as regras em `mapLxxToKjv`/`mapKjvToLxx`. Depois: 0 sequências desalinhadas nos 39 livros; Jeremias passou de 44,8% para 92,8% de pares aceitáveis. Daniel 3:24-90 (sem paralelo na KJV) ancora em Dn 3:23. 409 versículos KJV não têm correspondente na LXX (o "minus" de Jeremias e de Êx 35–40) e apontam para o versículo anterior.
- **Regras KJV↔MT que faltavam** (afetavam também o WLC): 1 Cr 6:1-81 = MT 5:27–6:66; Zc 1:18-21 + 2:1-13 = MT 2:1-17. Achadas pela mesma auditoria (WLC × WEB), que depois deu 0 sequências desalinhadas.
- **Não verificado:** versículos curtos e repetitivos que o método não distingue (número não medido) (listas de Nm 1/26, títulos de salmos) continuam com o mapeamento por regra; a auditoria mostra a mesma taxa de "não top-1" que livros sem divergência (ruído do método, não erro sistemático).

### Release do teste fechado (2026-11-06)

- **Rotas fora de `/api/v1` (defeito em produção):** anotações, billing, syntax-diagram, textual-criticism e resources respondiam 404 para o frontend. Corrigido; `backend/src/common/route-prefix.spec.ts` barra controller novo sem prefixo.
- **Feedback real:** `POST /api/v1/feedback` (aceita visitante, `userId` só do JWT, 5/min) + modelo `Feedback`. Antes o modal só gravava no `localStorage` e fingia sucesso. Banco indisponível → 503 e o modal mantém o texto. Os relatos ficam na tabela `Feedback` (Supabase → Table Editor).
- **API sem Redis:** com Redis fora, o rate limit derrubava toda requisição com 500. `FallbackThrottlerStorage` cai para contador em memória.
- **Leitura com banco read-only:** `ingestChapter` descartava o capítulo baixado quando a gravação falhava e devolvia `[]` (ex.: SBLGNT). Agora serve o texto e registra `warn`.

### Fase 1 — Fundações de Exegese e Biblioteca (Concluída em 2026-11-08)

1. **Tarefa A — Septuaginta com texto grego flexionado real (branch `fix/lxx-texto-real`):**
   Substituída a sequência de lemas da `bolls.life` pela edição de Sir Lancelot C. L. Brenton (_The Septuagint Version of the Old Testament_, 1851, domínio público, fonte `eBible.org/ScriptureEarth` `grcbrent`, licença documentada em `docs/licenses/LXX-BRENTON.md`). Ingeridos **22.942 versículos** nos 39 livros do AT canônico protestante (com `0` livros de menos de 20 versículos e `0` ocorrências de lemas concatenados como `ἐκὁμολογέω`). Sl 9:2 (Rahlfs = Sl 9:1 KJV) exibe `"Ἐξομολογήσομαί σοι Κύριε ἐν ὅλῃ καρδίᾳ μου..."`.
2. **Tarefa B — Cobertura de embeddings em `BibleVerse` (branch `feat/embeddings-completos`):**
   Guarda de espaço vetorial (`assertPersistedBatchEmbeddings`) adicionado a `createBatchEmbeddings` e `povoar-embeddings-livres.ts`. Gerados **110.775 embeddings** (`gemini:gemini-embedding-001:768`), totalizando **176.571 / 176.571** versículos com embedding nas 7 traduções de busca (`BLIVRE`, `NVA`, `KJV`, `WEB`, `LXX`, `WLC`, `TR`; `faltam = 0`). `hnsw.iterative_scan = 'relaxed_order'` configurado no banco para varredura HNSW filtrada por tradução.
3. **Tarefa C / T1.1 / T1.5 — SBLGNT, morfologia e árvores sintáticas MACULA (branch `feat/t1.5-macula-lowfat`):**
   Ingeridos **7.958 versículos** da `SBLGNT` em `BibleVerse` (CC BY 4.0) e **137.741 palavras** morfológicas em `InterlinearWord` a partir do treebank MACULA Greek Lowfat XML (`Clear-Bible/macula-greek`, CC BY 4.0, commit `8423afe47b9e8f24b7772e808af45c7159a6fe7e`, `docs/licenses/MACULA-GREEK.md`). `SyntaxDiagramService` serve **7.943 versículos canônicos do NT** (**99,82%** dos 7.957 versículos de TR) com `method: 'macula-lowfat'`, `isAnnotatedTree: true` e IDs de palavra no formato MACULA `nBBCCCVVVWWW`. Os 14 versículos ausentes na edição crítica SBLGNT/Nestle 1904 (variantes textuais bizantinas como Mt 17:21, At 8:37) caem para `heuristic-clause-split` com `isAnnotatedTree: false`.
4. **T1.2 — Versificação:** KJV ↔ MT ↔ LXX. A LXX do banco segue numeração Rahlfs/Brenton (título = v.1 nos Salmos, capitulação dos Salmos 9–147 deslocada, capitulação do MT fora dos Salmos). KJV→LXX passa pelo MT em `VersificationService`.
5. **Tarefa D / T1.3 / T1.4 — Referência numérica `BBCCCVVV` e Índice de Recursos (branch `feat/t1.4-indice-referencias`):**
   - `CrossReference`: backfill concluído em **262 / 262** linhas (`sourceNumRef` e `targetNumRef`, `0` não parseáveis).
   - `ResourceReference`: migração aditiva com `startRef`, `endRef`, `kind` (`'heading' | 'inline'`) e índice composto `@@index([startRef, endRef])`.
   - Extrator estrutural PT+EN+romanos (`backend/src/resources/reference-extractor.ts`): mapeia `Jn` → João (`43`), rejeita palavras comuns (`is`, `at`, `am`, `ex`, `ne`, `os`, `ed`, `et`, `na`, `ag`, `cl`) como abreviação isolada, propaga contexto de cabeçalho de perícope para resolver `"v. 16"` / `"Verses 16-18"`.
   - Migração de `UserEmbedding` → `Resource` (**89 entradas / 88 obras distintas**), `ResourceChunk` (**45.092 chunks** com vetores 768d copiados em SQL, `diff = 0`, 0 chamadas de API) e `ResourceReference` (**140.286 referências**: `31.912` `heading` + `108.374` `inline`).
   - Auditoria de 50 trechos (`seed = 20261108`): **193 / 195** verdadeiros positivos (**precisão de 98,97%**, **recall de 93,69%**). `EXPLAIN (ANALYZE, BUFFERS)` para `43003016` (Jo 3:16): **11,33 ms** via `BitmapOr` (`ResourceReference_canonicalRef_idx` + `ResourceReference_startRef_endRef_idx`).

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

### Decisões Pendentes Exclusivas do Mantenedor (D1 a D6, Decisão C)

- **D1:** Revogar o token do Railway exposto em `scripts/check-production-health.ts` no painel do Railway.
- **D2:** Escolher e contratar gateway de pagamento (Mercado Pago, Asaas, Stripe) e configurar credenciais no dashboard do Render.
- **D3 (SUPERADA / DESCARTADA):** Decisão sobre compressão de disco via `halfvec(768)` no Supabase. Superada pelo índice binário quantizado bit(768) de 65 MB (`BibleVerse_embedding_bq_hnsw_idx`), que estabilizou o banco em 1.516 MB e o consumo de memória sem alteração de schema. O script SQL correspondente foi preservado e renomeado para `docs/architecture/sql/halfvec_compression.DESCARTADO-substituido-por-binary-quantize.sql`.
- **D4:** Licenciamento comercial de traduções modernas brasileiras de púlpito (ARA/ARC/NAA — SBB; NVI — Biblica).
- **D5:** Orçamento mensal de infraestrutura (Render pago, Redis dedicado, CDN de assets).
- **D6:** Definição do público prioritário (pastoral/homilético vs seminarista/acadêmico) para ordenação de entregas da Fase 2.
- **Decisão A:** Resolvida na Etapa 9 (2026-11-17/18): theo_unaccent e índice GIN de 18 MB; ver CHANGELOG.
- **Decisão C (Nova):** Instalação e governança de extensões no PostgreSQL Supabase (a solução dispensou extensão, mas a governança continua em aberto).
- **Pendência conhecida de latência:** Latência com cache frio (cerca de 2,5 a 3,5 s na primeira consulta vetorial aleatória após período ocioso), causada pela leitura de páginas fora do buffer cache do Supabase Nano (~2,7 ms por página lida de disco), estabilizando para 10–20 ms no banco a quente; resposta completa soma cerca de 0,5 s do Gemini.

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
(`https://frontend-v2-lake.vercel.app`, deploy automático pelo push na `main`); banco em Supabase.

### 2.1 Variáveis de Ambiente e Segredos de Infraestrutura

| Variável / Segredo            | Onde é definida                                                     | Efeito / Comportamento                                                                                                                                                                                                                                                                                  |
| :---------------------------- | :------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VECTOR_INDEX_MODE`           | código (padrões acima); o Render pode sobrescrever (não confirmado) | Modo de busca vetorial: padrão `binary` na Bíblia (`search.service.ts:416`) para busca em duas fases (candidatos via índice bit(768) + reordenação fina com `<=>`); e padrão `full` na biblioteca (`library.service.ts:91`).                                                                            |
| `LIBRARY_VECTOR_SOURCE`       | Render (Dashboard)                                                  | Fonte vetorial do acervo clássico: sem padrão. Sem o valor `resource_chunk`, a biblioteca cai no `UserEmbedding` `library_book`, que está vazio. Quando configurada com `resource_chunk`, busca nos 45.092 chunks de `ResourceChunk` via índice compacto `ResourceChunk_embedding_bq_hnsw_idx` (17 MB). |
| `GEMINI_MODEL`                | Render (Dashboard)                                                  | Sobrescrita do modelo Gemini para geração/chat (ex.: `gemini-3.5-flash`), evitando timeout de 30 s do Render. Prevalece sobre o código.                                                                                                                                                                 |
| `AI_CREDITS_FREE_MONTHLY`     | Render (Dashboard)                                                  | Cota mensal de créditos de IA para contas no plano gratuito (ex.: `100`).                                                                                                                                                                                                                               |
| `ALLOW_LEGACY_LIBRARY_INGEST` | não definida (a ausência trava)                                     | Trava de segurança fail-closed: não definida; a ausência trava qualquer tentativa de escrita/deleção em `UserEmbedding` (`ingest`, `ingest-url`, `reindex`, cron) com HTTP 409 Conflict.                                                                                                                |
| `SUPABASE_DIRECT_URL`         | GitHub Actions (Secrets)                                            | Segredo com a URL de conexão direta (porta 5432) do Supabase: só para os workflows.                                                                                                                                                                                                                     |
| `GEMINI_API_KEY`              | Render & GitHub Actions (Secrets)                                   | Chave de API do Google Gemini para embeddings primários (768 dims) e modelos de linguagem generativos.                                                                                                                                                                                                  |

## 3. Convenções inegociáveis

- **Código em inglês. UI e comentários em PT-BR.**
- **`userId` sempre vem do JWT, nunca do body.** Sem exceção.
- `.env*` fica no `.gitignore`. Variáveis de produção moram no dashboard do
  Render/Vercel, não no repositório.
- `NEXT_PUBLIC_*` é build-time — mudar o valor exige novo build para ter efeito.
- CORS do backend aceita `frontend-v2*.vercel.app` por regex.
- **Nunca desabilite um teste ou uma regra de lint para "resolver" um erro.**
  Se não der para corrigir, documente como pendência.

### 3.1 Restrição de compute: Supabase Nano (decisão do dono, 2026-11-08)

Tudo o que for escrito precisa funcionar no compute **Nano** do Supabase. Isso vale para código, scripts, migrações, SQL e prompts. **Aumentar o compute não é solução aceita.**

Os limites medidos:

- **512 MB de RAM**;
- **`shared_buffers` = 224 MB**;
- **`maintenance_work_mem` = 32 MB**;
- disco limitado a **5 MB/s** quando o _Disk IO Budget_ acaba.

Motivo: em 2026-11-08, o índice HNSW de precisão total da `BibleVerse` (753 MB, maior que a RAM) mais cerca de 17 mil UPDATEs de embedding numa tarde dispararam um autovacuum de mais de 6 horas. Ele esgotou o _Disk IO Budget_ e deixou a busca em produção acima de 60 s.

Regras:

1. **Índices vetoriais precisam caber na memória.**
   - Não crie HNSW de precisão total (`vector(768)`) em tabela com mais de cerca de 20 mil linhas.
   - Use índice compacto (`binary_quantize(...)::bit(768)` ou `halfvec`) e reordene os candidatos com o vetor completo.
   - A soma de todos os índices vetoriais fica abaixo de **150 MB**. Confira com `pg_relation_size` antes e depois.
2. **Escrita em massa só pela ingestão diária** (`backend/scripts/ingestao-diaria-embeddings.ts`, com o orçamento de `backend/src/rag/daily-embedding-budget.ts`).
   - Cada rodada fica abaixo do gatilho do autovacuum, não roda com vacuum em andamento e para no primeiro erro ou na primeira gravação lenta.
   - Nunca rode UPDATE em milhares de linhas de uma tabela com índice vetorial numa só rodada.
   - Para dado novo, prefira `INSERT` já com o embedding. Linha inserida não deixa linha morta.
3. **Toda consulta nova em caminho de requisição:**
   - usa índice;
   - tem `LIMIT`;
   - não faz `count(*)` sobre tabela grande;
   - vem com `EXPLAIN (ANALYZE, BUFFERS)` registrado na entrega. Leitura de disco (`read=`) alta numa consulta frequente é defeito.
4. **DDL em tabela grande:**
   - índice só com `CREATE INDEX CONCURRENTLY`, à noite;
   - nada de `ALTER COLUMN TYPE` ou outra operação que reescreva a tabela sem plano aprovado pelo dono;
   - `VACUUM` manual em tabela com HNSW grande só depois que o índice for compactado.
5. **Antes de qualquer escrita ou DDL no banco**, confira `pg_stat_progress_vacuum`. Se houver vacuum na tabela, não comece.
6. **Conexões:** o pool do Prisma usa `max: 20` em produção (`prisma.service.ts`). Não abra pools paralelos em scripts. Use uma conexão por script.
7. **Medição:** toda entrega que mexe no banco informa o tamanho do banco, dos índices vetoriais e o tempo da busca em produção, antes e depois.
8. **Statement timeout obrigatório em scripts:** todo script que conecta ao banco define `statement_timeout` de no máximo 15 s durante o dia, para o próprio servidor abortar a consulta. Matar o processo local não cancela a consulta no Postgres. Consulta pesada só à noite.

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

### 🟢 Embeddings da Bíblia em produção (Medição — 2026-11-16)

**Medição direta no banco PostgreSQL:**

| tradução | com embedding | total  | faltam | status                                                                                                           |
| -------- | ------------- | ------ | ------ | ---------------------------------------------------------------------------------------------------------------- |
| BLIVRE   | 31.102        | 31.102 | 0      | Completo                                                                                                         |
| NVA      | 31.094        | 31.094 | 0      | Completo                                                                                                         |
| KJV      | 26.605        | 31.112 | 4.507  | Em andamento (ingestão diária; 4.000 versículos gravados hoje após rodada agendada 43877141434; 4.507 pendentes) |
| WEB      | 31.098        | 31.098 | 0      | Completo                                                                                                         |
| LXX      | 22.942        | 22.942 | 0      | Completo (Brenton LXX)                                                                                           |
| WLC      | 23.213        | 23.213 | 0      | Completo                                                                                                         |
| TR       | 7.957         | 7.957  | 0      | Completo                                                                                                         |
| SBLGNT   | 0             | 7.958  | 7.958  | Sem embedding (não entra na busca textual/semântica; reservada à morfologia e árvore sintática)                  |

Total de versículos no banco: **186.476 versículos** (KJV, WEB e WLC refletem a inserção de capítulos que estavam faltando: Jó 19–42 e Joel 4, inseridos por `scripts/completar-capitulos-faltantes.ts`). A KJV possui pendências cobertas pela ingestão diária via GitHub Actions (com 14.830 linhas mortas na tabela `BibleVerse`).
O índice vetorial da Bíblia opera em formato binário quantizado de 65 MB (`BibleVerse_embedding_bq_hnsw_idx`, bit(768)), com soma total de índices vetoriais HNSW em 83,69 MB no banco total de 1.516 MB.
A busca híbrida em `/api/v1/search/verses` opera em duas fases com os dois braços (Full-Text + Vetorial Binário P=200) respondendo `meta.vectorArm: "ok"`.

Rode `node backend/scratch/diagnostico-embeddings.js` para reconferir a qualquer momento: é somente leitura e não gasta cota.

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

A tabela `BibleVerse` contém 8 edições canônicas de domínio público/licença livre: **BLIVRE (31.102), NVA (31.094), KJV (31.112), WEB (31.098), TR (7.957), SBLGNT (7.958, CC BY 4.0), WLC (23.213), LXX (22.942, Brenton)**.

- A camada de busca (`SearchService`) normaliza qualquer entrada para uppercase trimmed (`translation?.toUpperCase().trim()`), eliminando divergências case-sensitive.
- A interface (`BibleReader.tsx` e `TranslationPicker.tsx`) mapeia as edições integrais com identificação de idioma (PT, EN, GR, HE, LA) e sinaliza explicitamente qualquer amostra com a tag `Amostra` (`isPartial: true`).
- **Limitação conhecida (Hebraico):** prefixos (ה, ל, ו, ב, מ, כ, ש) contam como palavra distinta; אלהים sozinho = 623 versículos, com qualquer prefixo = 1.071. Depende de morfologia (Fase 2).

### 📅 Pendência com data

- **24/11/2026:** DROP INDEX CONCURRENTLY "BibleVerse_text_fts_idx" (37 MB), à noite, depois de confirmar com `pg_stat_user_indexes.idx_scan` que o índice antigo não foi mais usado desde 18/11.

### 🟢 Acervo Clássico, Biblioteca Teológica e Índice de Referências (`Resource`)

- **Léxico e Morfologia:** integrado com concordância Strong, léxico TAGNT grego/hebraico, **137.741 palavras** em `InterlinearWord` (`SBLGNT` via MACULA Greek) e **7.943 árvores sintáticas anotadas** (`macula-lowfat`).
- **Acervo de Domínio Público Medido no PostgreSQL (2026-11-16):** **45.092 chunks de livros** migrados para `ResourceChunk` (em **89 entradas de catálogo / 88 obras distintas** em `Resource`) com embeddings vetoriais `gemini:gemini-embedding-001:768` e **140.286 referências bíblicas** em `ResourceReference` (`31.912` `heading` + `108.374` `inline`).
- **Tabela `UserEmbedding`:** higienizada e compacta com **40 linhas** (20 `note` e 20 `highlight`), **296 kB**, medidas nesta sessão. Cada smoke de produção cria usuário e anotação e não apaga; **0 `book_chunk`** (backup preservado em `~/.theosphere_backups/`). A ingestão legada de livros (`cron`, `ingest`, `ingest-url`, `reindex`) permanece bloqueada por padrão sem `ALLOW_LEGACY_LIBRARY_INGEST=true`, rejeitando com HTTP 409 Conflict antes de qualquer deleção ou escrita.
- **Catálogo Canônico Estruturado:** **108 obras** cadastradas em `backend/src/bible/classic-catalog.ts`, sincronizadas automaticamente com `frontend-v2/src/data/classicCatalog.ts` via `node scripts/sync-catalog.mjs`.
- Atenção: `/rag/stats` reporta `totalDocuments` de um cache em memória do processo, que zera a cada restart do Render — use `backend/scratch/medir-tamanho-banco.js` para medir o acervo persistente no PostgreSQL.

### 🔒 Conexão TLS no Pool do Prisma

- O pool de conexões do Prisma (`backend/src/prisma.service.ts`) utiliza explicitamente `ssl: { rejectUnauthorized: false }` sob `NODE_ENV === 'production'`.
- **Ressalva de Verificação:** A telemetria de `pg_stat_ssl` reflete apenas a conexão interna entre o Supavisor (pooler) e o processo backend do Postgres no Supabase. A integridade TLS de ponta a ponta entre a instância do Render e o pooler não foi auditada externamente (verificação de ponta a ponta pendente; decisão do dono).

### ⚠️ Hardcoded userId em drive-rag.service.ts (handleDailySync)

- **Arquivo:** `backend/src/rag/drive-rag.service.ts:63`
- **Problema:** O cron de sincronização diária (`handleDailySync`) possui um UUID fixo de usuário (`userId = 'e850cb80-d129-4810-957b-bc94d1fe2aee' // Usuário principal/admin`).
- **Estado:** O cron agora está protegido e inoperante por padrão pela trava de ingestão legada (`ALLOW_LEGACY_LIBRARY_INGEST !== 'true'`), mas o `userId` hardcoded precisa ser parametrizado via variável de ambiente (`SYSTEM_ADMIN_USER_ID`) ou associado a um usuário de sistema quando a migração para `Resource` for concluída.

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
