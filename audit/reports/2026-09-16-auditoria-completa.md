# Auditoria completa TheoSphere — 2026-09-16

Auditoria full-stack cobrindo desde o primeiro commit (2026-05-07) até HEAD
(2026-09-15). Executada via Claude Code / Cowork, sob as diretrizes do
`AGENTS.md` §4 (evidência numérica a cada afirmação; caminho de falha testado
tanto quanto o de sucesso; lacunas declaradas explicitamente).

## Sumário executivo

**Status geral: 🟡** — produção operante e testes verdes, mas dependências com
vulnerabilidades sérias e latência de busca 2-3× acima da meta declarada.

- ✅ **Suíte**: 145 testes backend + 49 frontend passando; typecheck 0; eslint
  0; `static-checks.mjs` 0 achados novos; `verificar:acervo` coerente
- ✅ **Produção**: 7 rotas críticas HTTP 200
  (`/health`, `/health/ai`, `/bible/versions`, `/search/verses`,
  `/cross-refs`, `/geo/locations`, `/rag/stats`)
- 🔴 **56 vulnerabilidades npm** somadas (28 backend + 28 frontend), incluindo
  **2 critical no frontend** (undici family)
- 🔴 **Token Railway no histórico do git** — corrigido no HEAD mas
  `0f404c6d-4b84-4225-ac0d-bbb0eae2577c` permanece no commit inicial
- 🟡 **Latência search/verses**: 0.46-0.59s warm, 2.26s cold — meta declarada
  no projeto é <200ms para buscas complexas; hoje está 2-3× acima warm,
  11× acima cold
- 🟡 **Embeddings incompletos** em 5 das 7 traduções: KJV 5.25%, TR 12.57%,
  WLC 2.22%, LXX 2.28%, WEB 1.64% (BLIVRE e NVA 100%)
- 🟡 **`rag.service.ts` god-service**: 2.357 linhas / 13 métodos ≈ 181
  linhas/método
- 🟢 Zero risco de SQL injection: 0 `$queryRawUnsafe`/`$executeRawUnsafe`;
  os 43 `queryRaw` usam tagged template parametrizado
- 🟢 Zero violação do padrão userId-from-JWT
- 🟢 Zero `TODO/FIXME/HACK/XXX` no código
- 🟢 Zero `console.log` em produção (2 hits: um em comentário do `logger.ts`,
  outro em bootstrap de worker legítimo)

## Escopo temporal

- **Primeiro commit**: 2026-05-07 15:18 BRT ("Initial enterprise audit",
  `d4359b5`) — ~4 meses de projeto
- **HEAD**: 2026-09-15 21:18 BRT (`d522036`, migração cross-tool para Claude)
- **145 commits** totais, 14.9 arquivos alterados/commit em média
- **Distribuição**: Mai 71, Jun 4, Jul 45, Ago 18, Set 7 — duas arrancadas
  fortes (fundação em maio, otimização Logos em julho) intercaladas por
  períodos de consolidação

## Escopo dimensional

- **1.000 arquivos** rastreados pelo git
- **Backend**: 15.292 linhas TS de código + 2.670 linhas de teste (17,5% —
  moderado)
- **Frontend v2**: 30.958 linhas TS/TSX
- **65 endpoints REST** em 13 controllers
- **10 migrations Prisma** ordenadas (extensions → pgvector → HNSW → FTS →
  RBAC → refresh tokens → cross_references → drift)
- **5 índices HNSW ativos** em produção (`BibleVerse`, `SemanticCacheEntry`,
  `TheologyEmbedding`, `UserEmbedding` × 2)

## Estado do banco de produção

Medido via `backend/scratch/diagnostico-embeddings.js` (read-only, sem cota).

| tradução | com embedding | total  | cobertura |
| -------- | ------------- | ------ | --------- |
| BLIVRE   | 31.102        | 31.102 | **100%**  |
| NVA      | 31.094        | 31.094 | **100%**  |
| KJV      | 1.600         | 30.470 | 5,25%     |
| TR       | 1.000         | 7.957  | 12,57%    |
| WLC      | 500           | 22.550 | 2,22%     |
| LXX      | 500           | 21.899 | 2,28%     |
| WEB      | 500           | 30.456 | 1,64%     |

Total: **66.296 de 174.428 versículos com embedding (38%)**.

Acervo `UserEmbedding`: **18.790 `book_chunk`** (o acervo clássico de domínio
público de 1 owner técnico) + 3 highlights + 3 notes.

## Findings por severidade

### 🔴 Críticos

#### C1. 56 vulnerabilidades de dependência (2 critical, 37 high, 16 moderate, 1 low)

**Frontend** (`frontend-v2/`): 28 vulnerabilidades — 2 **critical** + 16 high

- 10 moderate. O principal ofensor é `undici` com 5 CVEs abertos: cache
  directive disclosure, CRLF injection via blob body, cookie attribute
  injection via domain, response desynchronization via retry interceptor,
  cross-user disclosure via whitespace-around-equals em Cache-Control.
  **Fix disponível via `npm audit fix` — sem breaking change.**

**Backend** (`backend/`): 28 vulnerabilidades — 21 high + 6 moderate + 1 low.
O principal ofensor visível é `valibot ≤1.4.1` (record() flatten crash).
**Fix disponível via `npm audit fix --force` — MAS instala `prisma@6.19.3`,
que é breaking downgrade do 7 atualmente em uso** (o `AGENTS.md` §2 registra
Prisma 7 explicitamente, e as migrations pressupõem driver adapter do 7).
Não aplicar sem avaliar cada advisory individualmente.

**Ação recomendada**:

1. `cd frontend-v2 && npm audit fix` — imediato, sem risco
2. Backend: revisar cada advisory manualmente antes de aceitar downgrade do
   Prisma

#### C2. RAILWAY_TOKEN no histórico do git

`scripts/check-production-health.ts` hoje lê `process.env.RAILWAY_TOKEN || ''`
(seguro no HEAD), mas o commit inicial contém o token em texto puro:

```
const RAILWAY_TOKEN = '0f404c6d-4b84-4225-ac0d-bbb0eae2577c';
```

O token permanece em qualquer clone do repositório, mesmo após a correção.
O script aponta para `theosphere-production.up.railway.app`, backend
desativado após migração para Render (código morto).

**Ação — exclusiva do dono**: revogar o token `0f404c6d-...` no painel do
Railway. Enquanto não for revogado, considere-o credencial vazada. Apagar o
arquivo do HEAD não resolve — o histórico é imutável.

### 🟡 Importantes

#### I1. Latência de busca 2-3× (warm) a 11× (cold) acima da meta

Meta declarada no prompt de projeto: "buscas complexas — como palavra X e Y
no mesmo versículo, no grego — respondendo em menos de 200ms".

Medição em produção:

| rota                                           | cold start | warm p50                                        |
| ---------------------------------------------- | ---------- | ----------------------------------------------- |
| `/health`                                      | 1,17s      | –                                               |
| `/health/ai`                                   | 0,24s      | –                                               |
| `/bible/versions`                              | 0,21s      | –                                               |
| `/search/verses?q=grace&limit=3`               | 2,26s      | **0,50s** (méd. de 3 shots: 0,59 / 0,50 / 0,46) |
| `/search/advanced?q=book:John+chapter:1+grace` | 0,54s      | **0,34s**                                       |
| `/cross-refs?ref=John+1:1`                     | 0,38s      | –                                               |
| `/geo/locations?era=NT`                        | 0,50s      | –                                               |
| `/rag/stats`                                   | 0,20s      | –                                               |

Hipóteses (não medidas ainda):

- **Render free tier**: auto-sleep de 15min gera cold start ~60s no primeiro
  request; requests subsequentes carregam runtime completo
- **Chamada de embedding ao Gemini** dentro do braço vetorial: latência de
  rede + provider adiciona ~200-400ms
- **Supabase pooler**: cada request paga overhead de handshake se o pool
  estiver frio
- **HNSW `ef_search`** (parâmetro de qualidade/velocidade) usando default

**Ação recomendada**:

1. Instrumentar `search/verses` com timing por braço (`vectorArm.ms`,
   `keywordArm.ms`, `fusion.ms`) — mesma linha da correção do `vectorArm`
   feita na sessão de 2026-09-15
2. Medir se o gargalo é embedding call (então cachear queries repetidas em
   `SemanticCacheEntry`) ou o SQL do vetor
3. Avaliar Render paid tier (elimina cold start) — comparar custo vs impacto
   percebido

#### I2. Embeddings incompletos em 5 traduções

BLIVRE e NVA (as duas traduções PT-BR canônicas do produto) estão 100%
vetorizadas. As outras 5 estão em cobertura muito baixa (1,64% a 12,57%).

**Impacto operacional**: uma busca híbrida contra traduções não-BLIVRE/NVA
depende quase inteiramente do braço full-text (keyword). O `vectorArm`
volta `"ok"` apenas se a query casar com os poucos versículos indexados
naquela tradução — na maioria dos casos casa 0 versículos e o rank vetorial
não contribui.

**Ação — próximo passo já declarado no `AGENTS.md` §0**: povoamento
incremental via `backend/scripts/full-rag-bootstrap.ts`, com atenção à
cota do Gemini (o `AGENTS.md` §7 avisa que teto de gastos já estourou uma
vez em 2026-07-29). Priorizar KJV (30.470 versículos, 5,25% hoje) pela
maior densidade de uso internacional.

#### I3. `rag.service.ts` é god-service

2.357 linhas, 13 métodos → média de **181 linhas por método**. É um dos
"arquivos grandes reais" do projeto (excluindo bundle Cesium). Concentra
demais responsabilidades num único arquivo:

- Chat com LLM
- Cache semântico
- Citação de fontes
- Sync de contexto do usuário
- Rota-específica
- Fallbacks entre provedores

Sinal de risco: dificulta ter cobertura de teste focada (o `spec.ts` já
tem 543 linhas para tentar cobrir tudo), e mudanças pontuais têm alto raio
de blast.

**Ação recomendada**: refatoração em serviços coesos menores
(`RAGSearchService`, `RAGCitationService`, `RAGCacheService`,
`RAGChatOrchestrator`), guardando invariante de contrato via testes
existentes antes de mover código.

#### I4. Estado do repo — 3 commits à frente do origin, 65 uncommitted

- **3 commits só locais** (`e01b4aa` fix vectorArm, `0fe23cb` migração
  brains fase 1, `d522036` migração fase 2). Nenhum foi feito push.
  Consequência prática: **o fix da falha silenciosa em `vectorSearch` não
  está em produção ainda** — o `meta.vectorArm: "ok"` visto acima é a
  instrumentação anterior, correta para o cenário atual (Gemini
  saudável), mas cega para o cenário de falha do provedor até o push.
- **5 arquivos `M`** de sessões anteriores não commitados
  (`.github/workflows/daily-qa.yml`, `audit/scripts/qa-phase2-suite.mjs`,
  `backend/src/rag/embedding.service.ts`,
  `frontend-v2/src/components/BibleReader.tsx`,
  `frontend-v2/src/components/reader/TranslationPicker.tsx`) — todos
  batem com itens 1-10 do `§0` do `AGENTS.md`
- **60 arquivos `??` untracked**, quase todos EPUBs em
  `acervo-traduzido/` (o corpus do acervo clássico já indexado no banco).
  Também alguns scratches em `backend/scratch/*.ts` (diagnostico,
  massive-scale-ingest, purge-restricted, translation-norm test)

**Ação recomendada**:

1. Revisar e commitar os 5 `M` como fechamento retroativo das entregas
   1-10 do `§0`
2. Decidir política sobre `acervo-traduzido/*.epub`: incluir no repo
   (repo cresce ~200 MB) ou adicionar ao `.gitignore` (mantém o corpus só
   no disco, já que está indexado no banco). Recomendação:
   `.gitignore` — o banco é a fonte de verdade
3. `git push` dos 3 commits desta sessão (dispara deploy Render automático)

### 🟢 Bons sinais estruturais

- **Segurança de queries**: zero `$queryRawUnsafe` / `$executeRawUnsafe`. Os
  43 `queryRaw` usam tagged template parametrizado (safe contra SQLi).
- **Padrão de autenticação**: zero ocorrência de `userId` vindo de `body`.
  O `JwtAuthGuard` só faz bypass em ambiente de teste, guardado pela
  conjunção `NODE_ENV === 'test' && JEST_WORKER_ID !== undefined` — Jest
  seta o segundo automaticamente, então não vaza para produção.
- **Dívida técnica anotada**: 0 `TODO/FIXME/HACK/XXX` no código. Raro em
  projetos de 4 meses.
- **Logs de produção**: apenas 2 `console.log` em `.ts/.tsx` de src, ambos
  legítimos (um está dentro de um comentário JSDoc de `logger.ts`
  explicando por que não usar `console.log`, e o outro é bootstrap de
  worker em `geoWorker.ts:1`).
- **Densidade de `:any`**: 106 usos em ~46.000 linhas TS/TSX ≈ 0,23%.
  Baixo.
- **`static-checks.mjs`**: verificador de comportamento (handlers, rotas
  fantasma, silent-fail, Prisma sem adapter) retorna 0 achados novos com
  allowlist mínima (2 interativos, 4 silent). Efetivo.
- **`verificar:acervo`**: coerência Drive × relatório × banco confirmada.
  Também mediu o `fila.md`: 85 elegíveis ainda não indexadas + 45
  aprovadas — insumo direto para I2 acima.
- **Sem `.env` no repo**: `.gitignore` cobre `.env` e `.env.*`, com
  allowlist para os `.env.example` docs.

## Próximas ações priorizadas

Ordenadas por (severidade × urgência × custo de execução):

1. **[SEGURANÇA — agora, ~5min]** Revogar `RAILWAY_TOKEN 0f404c6d-...` no
   painel do Railway. Só o dono faz.
2. **[SEGURANÇA — hoje, ~2min]** `cd frontend-v2 && npm audit fix`. Elimina
   os 2 critical + 16 high do frontend sem breaking change. Rodar suíte
   depois para confirmar zero regressão.
3. **[DEPLOY — hoje, ~1min]** `git push origin main`. Leva o fix do
   `vectorArm=failed` a produção. Render deploya automaticamente no push.
4. **[HIGIENE — hoje, ~15min]** Revisar os 5 arquivos `M` da sessão
   anterior; commitar como fechamento retroativo do `§0`. Depois decidir
   `.gitignore` para `acervo-traduzido/*.epub`.
5. **[PERFORMANCE — esta semana, ~2h]** Instrumentar `search/verses` com
   timing por braço (`vectorArm.ms`, `keywordArm.ms`, `fusion.ms`), no
   mesmo esquema do `vectorArm` estado. Publicar métrica em `/health/ai`
   ou novo `/health/search`. Medir 3 dias e decidir se meta 200ms é
   viável no free tier ou se precisa upgrade Render.
6. **[COBERTURA — próximas 2 semanas]** Povoamento incremental de
   embeddings nas 5 traduções em déficit. Começar por KJV (maior densidade
   de uso). Rodar `full-rag-bootstrap.ts` em lotes controlados,
   monitorando `/health/ai` para evitar teto de gastos Gemini
   (histórico de 2026-07-29 documentado).
7. **[QUALIDADE — este mês, ~1 dia]** Refatorar `rag.service.ts` em serviços
   menores. Escrever características (`characterization.spec.ts`) para
   travar o comportamento atual antes de mover código.
8. **[HIGIENE — este mês, ~1h]** Reavaliar cada advisory do backend `npm
audit` individualmente. O `--force` derruba Prisma 7→6 e quebra o
   projeto (o `AGENTS.md` §5 tem uma armadilha específica sobre driver
   adapter do Prisma 7); precisa ser cirúrgico.

---

Auditoria gerada em **2026-09-16** via Claude Code / Cowork, cobrindo
o repositório do primeiro commit ao HEAD. Números coletados de: `git log`,
`git ls-files`, `git shortlog`, Jest, Vitest, TypeScript compiler, ESLint,
`audit/scripts/static-checks.mjs`, `backend/scratch/verifica-portao.js`,
`backend/scratch/diagnostico-embeddings.js`, `curl` contra o backend Render
em produção, `npm audit` em backend e frontend.
