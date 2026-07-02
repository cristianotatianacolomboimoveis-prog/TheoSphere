# TheoSphere OS — Instrução de Projeto (Project Prompt)

Use este documento como instrução de sistema (System Prompt) ou instrução de projeto no Claude para dar contexto completo sobre o projeto TheoSphere.

---

## Identidade do Projeto

**TheoSphere OS** é uma plataforma de pesquisa teológica e exegese bíblica de nível acadêmico (PhD). É um monorepo full-stack com backend NestJS, frontend Next.js e um pipeline de IA (RAG) integrado com modelos Gemini do Google.

O projeto foi criado e é mantido por **Cristiano Colombo**.

---

## Stack Tecnológico

### Backend (`/backend`)

- **Framework:** NestJS 11 (Node.js 20+)
- **Linguagem:** TypeScript 6
- **ORM:** Prisma 7 com PostgreSQL (Supabase)
- **Testes:** Jest 30 + Supertest + Testcontainers
- **Lint:** ESLint 10 + Prettier
- **IA/LLM:** Google GenAI SDK (`@google/genai`) + OpenAI SDK (fallback)
- **Cache:** Redis (opcional, com fallback local automático)
- **Segurança:** Helmet, Throttler, JWT (Passport), Sentry, bcrypt
- **Monitoramento:** Sentry, filtros globais de exceção, auditoria interna
- **Porta padrão:** 3002

### Frontend (`/frontend-v2`)

- **Framework:** Next.js 16 (App Router)
- **Linguagem:** TypeScript 6
- **UI:** React 19, TailwindCSS 4, Framer Motion, Lucide React
- **Mapas/3D:** Cesium, MapLibre GL, Deck.gl, Leaflet, Three.js
- **IA Local:** WebLLM (`@mlc-ai/web-llm`), HuggingFace Transformers
- **Estado:** Zustand
- **i18n:** i18next
- **Testes:** Vitest 4 + Testing Library
- **Porta padrão:** 3000

### Infraestrutura

- **DB:** PostgreSQL via Supabase
- **Cache:** Redis (opcional — sistema tem fallback)
- **Deploy:** Render (backend) + Vercel (frontend) + Supabase (DB)
- **CI/CD:** Husky + lint-staged + Prettier (monorepo root)
- **Docker:** docker-compose.yml disponível

---

## Estrutura do Monorepo

```
TheoSphere/
├── backend/                # API NestJS
│   ├── src/
│   │   ├── rag/            # Pipeline RAG (rag.service, rag.controller, semantic-cache, user-context)
│   │   ├── auth/           # JWT, Guards, Roles
│   │   ├── audit/          # Serviço de auditoria
│   │   ├── bible/          # Cross-references controller
│   │   ├── geospatial/     # Atlas 4D (localizações bíblicas)
│   │   ├── search/         # Busca de versículos (keyword + vector)
│   │   └── ...
│   ├── prisma/             # Schema Prisma + seeds
│   ├── test/               # Testes e2e
│   └── .env                # Variáveis de ambiente (GEMINI_API_KEY, DATABASE_URL, etc.)
│
├── frontend-v2/            # UI Next.js
│   ├── src/
│   │   ├── app/            # App Router (layout, page, global-error)
│   │   ├── components/     # Sidebar, CesiumGlobe, StudyMode, ErrorBoundary, etc.
│   │   ├── hooks/          # useRAG, useTheoWorker, etc.
│   │   └── lib/            # config, geoWorker, transliteration, edge-ai
│   ├── .env.local          # Variáveis do frontend
│   └── next.config.ts      # Config Next.js + Turbopack
│
├── scripts/                # Scripts utilitários
│   ├── daily_verifier_agent.py   # Agente autônomo de testes diários (Google Antigravity SDK)
│   ├── run-audit.sh              # Script para auditoria semanal
│   ├── check-production-health.ts
│   └── ...
│
├── audit/                  # Relatórios de auditoria
│   ├── reports/
│   │   ├── daily/          # Relatórios diários gerados pelo agente autônomo
│   │   ├── baseline.md
│   │   └── latest.md
│   └── AGENT_SETUP.md      # Guia de configuração do agente autônomo
│
├── ai-service/             # Serviço de IA separado
├── cloudflare/             # Configurações Cloudflare
├── supabase-auth-app/      # App auxiliar de auth Supabase
└── docker-compose.yml
```

---

## Endpoints da API (Backend)

### Saúde

- `GET /api/v1/health` — Status do sistema (DB + Redis)
- `GET /api/v1/health/live` — Liveness probe
- `GET /api/v1/health/ready` — Readiness probe

### Bíblia

- `GET /api/v1/bible/versions` — Lista traduções (ARA, KJV, TR, WLC, NVIPT)
- `GET /api/v1/bible/books` — Lista livros
- `GET /api/v1/bible/chapter/:translation/:bookId/:chapter` — Capítulo completo
- `GET /api/v1/bible/lexicon/:strongId` — Léxico Strong's (grego/hebraico)

### RAG / IA

- `POST /api/v1/rag/chat` — Chat com IA (body: `{ query, tradition?, history?, jsonMode? }`)
  - `userId` vem do JWT, não do body
  - Sem autenticação = `public-guest`
- `GET /api/v1/rag/stats` — Estatísticas do sistema RAG
- `GET /api/v1/rag/graph?q=` — Grafo de conhecimento
- `POST /api/v1/rag/dictate` — Transcrição de sermão
- `POST /api/v1/rag/index` — Indexar documentos (requer JWT)
- `POST /api/v1/rag/sync` — Sincronizar contexto do usuário (requer JWT)

### Busca

- `GET /api/v1/search/verses?q=&translation=` — Busca por versículos
- `GET /api/v1/search/advanced` — Busca avançada

### Referências Cruzadas

- `GET /api/v1/cross-refs?ref=John+1:1` — Referências cruzadas por referência textual

### Geolocalização (Atlas 4D)

- `GET /api/v1/geo/locations?era=` — Locais bíblicos por era
- `GET /api/v1/geo/nearby` — Locais próximos
- `GET /api/v1/geo/routes` — Rotas bíblicas

### Autenticação

- `POST /api/v1/auth/register` — Registro
- `POST /api/v1/auth/login` — Login
- `POST /api/v1/auth/refresh` — Refresh token
- `POST /api/v1/auth/logout` — Logout

---

## Agente Autônomo de Testes Diários

Criamos um agente autônomo em Python usando o **Google Antigravity SDK** que:

1. **Executa automaticamente** lint, testes unitários e build do backend e frontend
2. **Analisa erros** usando IA (Gemini) para diagnosticar a causa raiz
3. **Corrige erros autonomamente** editando arquivos de código e re-executando os testes
4. **Gera relatórios** em `audit/reports/daily/YYYY-MM-DD_daily_report.md`

### Arquivos do Agente

- **Script:** `scripts/daily_verifier_agent.py`
- **Documentação:** `audit/AGENT_SETUP.md`
- **Ambiente Virtual:** `.venv/` (Python 3.11 via `uv`)
- **Dependência:** `google-antigravity` (requer Python ≥ 3.10)

### Como rodar

```bash
# Execução única
.venv/bin/python3 scripts/daily_verifier_agent.py --once

# Modo daemon (a cada 24h)
.venv/bin/python3 scripts/daily_verifier_agent.py --daemon
```

### Correções aplicadas pelo agente (2026-07-02)

O agente já corrigiu autonomamente:

- **Build do frontend falhando** devido a `useContext` null no `_global-error` do Next.js
- **Criou** `frontend-v2/src/app/global-error.tsx` (handler dinâmico de erro global)
- **Corrigiu** `frontend-v2/next.config.ts` (adicionou `turbopack.root` para isolar o workspace)
- **Corrigiu** `frontend-v2/package.json` (prefixou `NODE_ENV=production` no script de build)
- **Corrigiu** `frontend-v2/src/app/layout.tsx` (unificou meta tags duplicadas na API de `metadata` do Next.js)

---

## Variáveis de Ambiente Necessárias

### Backend (`.env`)

```
DATABASE_URL=postgresql://...
GEMINI_API_KEY=...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
REDIS_URL=redis://localhost:6379  # opcional
SENTRY_DSN=...                     # opcional
NODE_ENV=development
PORT=3002
```

### Frontend (`.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:3002
```

---

## Comandos Úteis

```bash
# Backend
cd backend
npm run start:dev      # Dev server (porta 3002)
npm run build          # Build de produção
npm run test           # Testes unitários
npm run test:e2e       # Testes end-to-end
npm run lint           # Lint
npm run db:migrate     # Migrações Prisma
npm run db:seed:enterprise  # Seed completo

# Frontend
cd frontend-v2
npm run dev            # Dev server (porta 3000)
npm run build          # Build de produção
npm run test           # Testes (Vitest)
npm run lint           # Lint
```

---

## Convenções e Regras

1. **Idioma do código:** Inglês (nomes de variáveis, classes, funções)
2. **Idioma da UI e comentários:** Português brasileiro
3. **API prefixo:** Todos os endpoints usam `/api/v1/`
4. **Segurança:** `userId` NUNCA vem do body — sempre do JWT (`req.user`)
5. **Resiliência:** Sistema funciona sem Redis (fallback automático)
6. **Auditorias:** Relatórios semanais em `audit/reports/` + diários pelo agente autônomo
7. **Git hooks:** Husky + lint-staged + Prettier na raiz do monorepo
