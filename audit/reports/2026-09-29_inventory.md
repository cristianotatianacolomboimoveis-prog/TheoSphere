# TheoSphere QA — Inventário de Funcionalidades

**Gerado em:** 2026-09-29T21:54:37.845Z  
**Total de FUNC-IDs:** 132

## Resumo

| Categoria        | Qtd |
| ---------------- | --- |
| Páginas          | 16  |
| Endpoints de API | 102 |
| Componentes UI   | 0   |
| Jornadas E2E     | 6   |
| Bugs conhecidos  | 8   |

## Módulo: ACERVO

| ID       | Categoria     | Label                           | Criticidade | Status  | Rota/Fonte                                     |
| -------- | ------------- | ------------------------------- | ----------- | ------- | ---------------------------------------------- |
| FUNC-004 | página        | Enciclopédia Teológica          | 🟡 Médio    | pending | /encyclopedia                                  |
| FUNC-008 | página        | Biblioteca / Acervo             | 🟡 Médio    | passou  | /library → probe: ✅ 401 (170ms)               |
| FUNC-100 | endpoint      | Sincronização Google Drive      | 🟡 Médio    | pending | /api/v1/drive-library/ingest                   |
| FUNC-101 | endpoint      | Sincronização Google Drive      | 🟡 Médio    | pending | /api/v1/drive-library/ingest-url               |
| FUNC-102 | endpoint      | Sincronização Google Drive      | 🟡 Médio    | pending | /api/v1/drive-library/reindex                  |
| FUNC-104 | endpoint      | Busca na biblioteca teológica   | 🟠 Alto     | passou  | /api/v1/library/lookup → probe: ✅ 401 (170ms) |
| FUNC-128 | bug-conhecido | URL syncDrive sem /api/v1 → 404 | 🔴 Crítico  | aberto  | varredura-historica                            |

## Módulo: ADMIN

| ID       | Categoria | Label                   | Criticidade | Status  | Rota/Fonte                   |
| -------- | --------- | ----------------------- | ----------- | ------- | ---------------------------- |
| FUNC-107 | endpoint  | QA validado (moderação) | 🟡 Médio    | pending | /api/v1/rag/validated-qa     |
| FUNC-114 | endpoint  | QA validado (moderação) | 🟡 Médio    | pending | /api/v1/rag/validated-qa/:id |

## Módulo: ARQUEOLOGIA

| ID       | Categoria | Label                       | Criticidade | Status | Rota/Fonte                                        |
| -------- | --------- | --------------------------- | ----------- | ------ | ------------------------------------------------- |
| FUNC-022 | endpoint  | Estatísticas de arqueologia | 🔵 Baixo    | passou | /api/v1/archaeology/stats → probe: ✅ 200 (306ms) |

## Módulo: AUTH

| ID       | Categoria     | Label                                            | Criticidade | Status  | Rota/Fonte            |
| -------- | ------------- | ------------------------------------------------ | ----------- | ------- | --------------------- |
| FUNC-009 | página        | Login / Autenticação                             | 🔴 Crítico  | pending | /login                |
| FUNC-027 | endpoint      | Registro de usuário                              | 🔴 Crítico  | pending | /api/v1/auth/register |
| FUNC-028 | endpoint      | Login                                            | 🔴 Crítico  | pending | /api/v1/auth/login    |
| FUNC-029 | endpoint      | Refresh de token JWT                             | 🔴 Crítico  | pending | /api/v1/auth/refresh  |
| FUNC-030 | endpoint      | Logout                                           | 🔴 Crítico  | pending | /api/v1/auth/logout   |
| FUNC-125 | bug-conhecido | Botões sem onClick: SettingsPage 'Sair da Conta' | 🔴 Crítico  | aberto  | varredura-historica   |
| FUNC-132 | bug-conhecido | Login case-sensitive (401 com senha certa)       | 🔴 Crítico  | aberto  | varredura-historica   |

## Módulo: BACKEND

| ID       | Categoria | Label                                                    | Criticidade | Status  | Rota/Fonte                                           |
| -------- | --------- | -------------------------------------------------------- | ----------- | ------- | ---------------------------------------------------- |
| FUNC-017 | endpoint  | GET /                                                    | 🟡 Médio    | pending | /                                                    |
| FUNC-018 | endpoint  | GET /api/v1/ai/locations                                 | 🟡 Médio    | pending | /api/v1/ai/locations                                 |
| FUNC-019 | endpoint  | GET /                                                    | 🟡 Médio    | pending | /                                                    |
| FUNC-020 | endpoint  | POST /api/v1/ai/compare                                  | 🟡 Médio    | pending | /api/v1/ai/compare                                   |
| FUNC-021 | endpoint  | GET /api/v1/archaeology/                                 | 🟡 Médio    | pending | /api/v1/archaeology/                                 |
| FUNC-023 | endpoint  | GET /api/v1/archaeology/by-ref                           | 🟡 Médio    | pending | /api/v1/archaeology/by-ref                           |
| FUNC-024 | endpoint  | GET /api/v1/archaeology/near                             | 🟡 Médio    | pending | /api/v1/archaeology/near                             |
| FUNC-025 | endpoint  | GET /api/v1/archaeology/:slug                            | 🟡 Médio    | pending | /api/v1/archaeology/:slug                            |
| FUNC-026 | endpoint  | GET /api/v1/archaeology                                  | 🟡 Médio    | pending | /api/v1/archaeology                                  |
| FUNC-034 | endpoint  | GET /api/v1/homiletics/outline/:bookId/:chapter          | 🟡 Médio    | pending | /api/v1/homiletics/outline/:bookId/:chapter          |
| FUNC-035 | endpoint  | POST /api/v1/homiletics/outline                          | 🟡 Médio    | pending | /api/v1/homiletics/outline                           |
| FUNC-036 | endpoint  | GET /api/v1/synopsis/sections                            | 🟡 Médio    | pending | /api/v1/synopsis/sections                            |
| FUNC-037 | endpoint  | GET /api/v1/synopsis/pericopes                           | 🟡 Médio    | pending | /api/v1/synopsis/pericopes                           |
| FUNC-038 | endpoint  | GET /api/v1/synopsis/find                                | 🟡 Médio    | pending | /api/v1/synopsis/find                                |
| FUNC-039 | endpoint  | GET /api/v1/synopsis/pericopes/:id                       | 🟡 Médio    | pending | /api/v1/synopsis/pericopes/:id                       |
| FUNC-040 | endpoint  | GET /api/v1/timeline/eras                                | 🟡 Médio    | pending | /api/v1/timeline/eras                                |
| FUNC-041 | endpoint  | GET /api/v1/timeline/events                              | 🟡 Médio    | pending | /api/v1/timeline/events                              |
| FUNC-042 | endpoint  | GET /api/v1/timeline/for-passage                         | 🟡 Médio    | pending | /api/v1/timeline/for-passage                         |
| FUNC-043 | endpoint  | GET /api/v1/timeline/events/:id                          | 🟡 Médio    | pending | /api/v1/timeline/events/:id                          |
| FUNC-045 | endpoint  | GET /api/v1/bible/compare/:bookId/:chapter               | 🟡 Médio    | pending | /api/v1/bible/compare/:bookId/:chapter               |
| FUNC-047 | endpoint  | GET /api/v1/bible/catalog                                | 🟡 Médio    | pending | /api/v1/bible/catalog                                |
| FUNC-051 | endpoint  | GET /api/v1/bible/fallback                               | 🟡 Médio    | pending | /api/v1/bible/fallback                               |
| FUNC-052 | endpoint  | GET /api/v1/bible/sefaria/:ref                           | 🟡 Médio    | pending | /api/v1/bible/sefaria/:ref                           |
| FUNC-054 | endpoint  | GET /api/v1/bible/ingest-embeddings                      | 🟡 Médio    | pending | /api/v1/bible/ingest-embeddings                      |
| FUNC-055 | endpoint  | GET /api/v1/enterprise/routes                            | 🟡 Médio    | pending | /api/v1/enterprise/routes                            |
| FUNC-056 | endpoint  | GET /api/v1/enterprise/routes/:slug                      | 🟡 Médio    | pending | /api/v1/enterprise/routes/:slug                      |
| FUNC-057 | endpoint  | GET /api/v1/enterprise/research                          | 🟡 Médio    | pending | /api/v1/enterprise/research                          |
| FUNC-058 | endpoint  | GET /api/v1/enterprise/waypoints/:id                     | 🟡 Médio    | pending | /api/v1/enterprise/waypoints/:id                     |
| FUNC-059 | endpoint  | GET /api/v1/enterprise/models/:id                        | 🟡 Médio    | pending | /api/v1/enterprise/models/:id                        |
| FUNC-060 | endpoint  | GET /api/v1/enterprise/graph                             | 🟡 Médio    | pending | /api/v1/enterprise/graph                             |
| FUNC-061 | endpoint  | GET /api/v1/enterprise/search                            | 🟡 Médio    | pending | /api/v1/enterprise/search                            |
| FUNC-062 | endpoint  | POST /api/v1/enterprise/ai/explain                       | 🟡 Médio    | pending | /api/v1/enterprise/ai/explain                        |
| FUNC-063 | endpoint  | POST /api/v1/enterprise/ai/exegesis                      | 🟡 Médio    | pending | /api/v1/enterprise/ai/exegesis                       |
| FUNC-064 | endpoint  | POST /api/v1/enterprise/ai/tts                           | 🟡 Médio    | pending | /api/v1/enterprise/ai/tts                            |
| FUNC-065 | endpoint  | POST /api/v1/enterprise/ai/translate                     | 🟡 Médio    | pending | /api/v1/enterprise/ai/translate                      |
| FUNC-070 | endpoint  | GET /api/v1/geo/route-path                               | 🟡 Médio    | pending | /api/v1/geo/route-path                               |
| FUNC-076 | endpoint  | GET /api/v1/construct-search/presets                     | 🟡 Médio    | pending | /api/v1/construct-search/presets                     |
| FUNC-077 | endpoint  | POST /api/v1/construct-search/query                      | 🟡 Médio    | pending | /api/v1/construct-search/query                       |
| FUNC-078 | endpoint  | GET /api/v1/linguistics/lexical/:strongId                | 🟡 Médio    | pending | /api/v1/linguistics/lexical/:strongId                |
| FUNC-079 | endpoint  | GET /api/v1/linguistics/word-study/:strongId             | 🟡 Médio    | pending | /api/v1/linguistics/word-study/:strongId             |
| FUNC-080 | endpoint  | GET /api/v1/linguistics/search-root/:strongId            | 🟡 Médio    | pending | /api/v1/linguistics/search-root/:strongId            |
| FUNC-082 | endpoint  | GET /api/v1/linguistics/occurrences/:strongId            | 🟡 Médio    | pending | /api/v1/linguistics/occurrences/:strongId            |
| FUNC-083 | endpoint  | GET /api/v1/linguistics/analyze-word                     | 🟡 Médio    | pending | /api/v1/linguistics/analyze-word                     |
| FUNC-084 | endpoint  | GET /syntax-diagram/predefined                           | 🟡 Médio    | pending | /syntax-diagram/predefined                           |
| FUNC-085 | endpoint  | GET /syntax-diagram/canonical/:id                        | 🟡 Médio    | pending | /syntax-diagram/canonical/:id                        |
| FUNC-086 | endpoint  | GET /syntax-diagram/verse/:bookId/:chapter/:verse        | 🟡 Médio    | pending | /syntax-diagram/verse/:bookId/:chapter/:verse        |
| FUNC-087 | endpoint  | GET /textual-criticism/variants                          | 🟡 Médio    | pending | /textual-criticism/variants                          |
| FUNC-088 | endpoint  | GET /textual-criticism/variants/:id                      | 🟡 Médio    | pending | /textual-criticism/variants/:id                      |
| FUNC-089 | endpoint  | GET /textual-criticism/apparatus/:bookId/:chapter/:verse | 🟡 Médio    | pending | /textual-criticism/apparatus/:bookId/:chapter/:verse |
| FUNC-090 | endpoint  | POST /mcp/answer/stream                                  | 🟡 Médio    | pending | /mcp/answer/stream                                   |
| FUNC-091 | endpoint  | GET /mcp/                                                | 🟡 Médio    | pending | /mcp/                                                |
| FUNC-092 | endpoint  | GET /mcp                                                 | 🟡 Médio    | pending | /mcp                                                 |
| FUNC-093 | endpoint  | POST /mcp/                                               | 🟡 Médio    | pending | /mcp/                                                |
| FUNC-094 | endpoint  | POST /mcp                                                | 🟡 Médio    | pending | /mcp                                                 |
| FUNC-095 | endpoint  | DELETE /mcp/                                             | 🟡 Médio    | pending | /mcp/                                                |
| FUNC-096 | endpoint  | DELETE /mcp                                              | 🟡 Médio    | pending | /mcp                                                 |
| FUNC-097 | endpoint  | POST /mcp/agents/:agentId/tasks/:taskId/heartbeat        | 🟡 Médio    | pending | /mcp/agents/:agentId/tasks/:taskId/heartbeat         |
| FUNC-098 | endpoint  | POST /mcp/agents/:agentId/tasks/:taskId/result           | 🟡 Médio    | pending | /mcp/agents/:agentId/tasks/:taskId/result            |
| FUNC-099 | endpoint  | POST /mcp/agents/:agentId/tasks/:taskId/verify           | 🟡 Médio    | pending | /mcp/agents/:agentId/tasks/:taskId/verify            |
| FUNC-103 | endpoint  | GET /api/v1/rag/evidence                                 | 🟡 Médio    | pending | /api/v1/rag/evidence                                 |
| FUNC-106 | endpoint  | GET /api/v1/rag/graph                                    | 🟡 Médio    | pending | /api/v1/rag/graph                                    |
| FUNC-111 | endpoint  | POST /api/v1/rag/dictate                                 | 🟡 Médio    | pending | /api/v1/rag/dictate                                  |
| FUNC-112 | endpoint  | POST /api/v1/rag/index                                   | 🟡 Médio    | pending | /api/v1/rag/index                                    |
| FUNC-113 | endpoint  | POST /api/v1/rag/sync                                    | 🟡 Médio    | pending | /api/v1/rag/sync                                     |
| FUNC-115 | endpoint  | DELETE /api/v1/rag/cache                                 | 🟡 Médio    | pending | /api/v1/rag/cache                                    |
| FUNC-116 | endpoint  | DELETE /api/v1/rag/cache/:userId                         | 🟡 Médio    | pending | /api/v1/rag/cache/:userId                            |
| FUNC-118 | endpoint  | GET /api/v1/search/advanced                              | 🟡 Médio    | pending | /api/v1/search/advanced                              |

## Módulo: BUSCA

| ID       | Categoria     | Label                                                 | Criticidade | Status | Rota/Fonte                                     |
| -------- | ------------- | ----------------------------------------------------- | ----------- | ------ | ---------------------------------------------- |
| FUNC-117 | endpoint      | Busca full-text de versículos                         | 🔴 Crítico  | passou | /api/v1/search/verses → probe: ✅ 200 (1058ms) |
| FUNC-131 | bug-conhecido | BibleVerse.embedding NULL em prod — busca híbrida off | 🟠 Alto     | aberto | varredura-historica                            |

## Módulo: BÍBLIA

| ID       | Categoria | Label                     | Criticidade | Status  | Rota/Fonte                                                                  |
| -------- | --------- | ------------------------- | ----------- | ------- | --------------------------------------------------------------------------- |
| FUNC-005 | página    | Exegese                   | 🔴 Crítico  | pending | /exegesis                                                                   |
| FUNC-014 | página    | Leitor Bíblico (Estudo)   | 🔴 Crítico  | pending | /study                                                                      |
| FUNC-031 | endpoint  | Referências cruzadas      | 🟠 Alto     | passou  | /api/v1/cross-refs/ → probe: ✅ 200 (438ms)                                 |
| FUNC-032 | endpoint  | Referências cruzadas      | 🟠 Alto     | passou  | /api/v1/cross-refs → probe: ✅ 200 (438ms)                                  |
| FUNC-033 | endpoint  | Referências cruzadas      | 🟠 Alto     | passou  | /api/v1/cross-refs/counts → probe: ✅ 200 (438ms)                           |
| FUNC-046 | endpoint  | Listar traduções bíblicas | 🔴 Crítico  | pending | /api/v1/bible/versions                                                      |
| FUNC-048 | endpoint  | Listar livros da Bíblia   | 🔴 Crítico  | passou  | /api/v1/bible/books → probe: ✅ 200 (371ms)                                 |
| FUNC-049 | endpoint  | Carregar capítulo bíblico | 🔴 Crítico  | passou  | /api/v1/bible/chapter → probe: ✅ 200 (391ms)                               |
| FUNC-050 | endpoint  | Carregar capítulo bíblico | 🔴 Crítico  | passou  | /api/v1/bible/chapter/:translation/:bookId/:chapter → probe: ✅ 200 (391ms) |

## Módulo: COLLAB

| ID       | Categoria     | Label                                       | Criticidade | Status | Rota/Fonte          |
| -------- | ------------- | ------------------------------------------- | ----------- | ------ | ------------------- |
| FUNC-129 | bug-conhecido | WebSocket colaboração namespace inexistente | 🟠 Alto     | aberto | varredura-historica |

## Módulo: DESCONHECIDO

| ID       | Categoria | Label                      | Criticidade | Status  | Rota/Fonte          |
| -------- | --------- | -------------------------- | ----------- | ------- | ------------------- |
| FUNC-002 | página    | Página /admin/validated-qa | 🟡 Médio    | pending | /admin/validated-qa |
| FUNC-016 | página    | Página /exegete            | 🟡 Médio    | pending | /exegete            |

## Módulo: E2E

| ID       | Categoria | Label                                                             | Criticidade | Status | Rota/Fonte               |
| -------- | --------- | ----------------------------------------------------------------- | ----------- | ------ | ------------------------ |
| FUNC-119 | e2e       | Jornada: Login → Ler capítulo → Buscar palavra → Logout           | 🔴 Crítico  | fase3  | → probe: ✅ 200 (391ms)  |
| FUNC-120 | e2e       | Jornada: Registro → Confirmar → Primeiro login                    | 🔴 Crítico  | fase3  |                          |
| FUNC-121 | e2e       | Jornada: Chat IA → Feedback positivo → Rever QA validado          | 🟠 Alto     | fase3  |                          |
| FUNC-122 | e2e       | Jornada: Busca full-text → Abrir cross-refs → Ver léxico Strong's | 🟠 Alto     | fase3  | → probe: ✅ 200 (1058ms) |
| FUNC-123 | e2e       | Jornada: Upload Drive → Sync biblioteca → Perguntar IA sobre obra | 🟠 Alto     | fase3  | → probe: ✅ 401 (170ms)  |
| FUNC-124 | e2e       | Jornada: Usuário A não acessa dados de Usuário B (isolamento)     | 🔴 Crítico  | fase3  |                          |

## Módulo: FRONTEND

| ID       | Categoria     | Label                                            | Criticidade | Status | Rota/Fonte          |
| -------- | ------------- | ------------------------------------------------ | ----------- | ------ | ------------------- |
| FUNC-130 | bug-conhecido | 16 componentes com catch silencioso (tela vazia) | 🟠 Alto     | aberto | varredura-historica |

## Módulo: GEOESPACIAL

| ID       | Categoria | Label                    | Criticidade | Status  | Rota/Fonte                                    |
| -------- | --------- | ------------------------ | ----------- | ------- | --------------------------------------------- |
| FUNC-003 | página    | Atlas 4D (Geo)           | 🟡 Médio    | pending | /atlas                                        |
| FUNC-066 | endpoint  | Locais bíblicos (Atlas)  | 🟡 Médio    | passou  | /api/v1/geo/locations → probe: ✅ 200 (915ms) |
| FUNC-067 | endpoint  | Locais próximos (Atlas)  | 🟡 Médio    | passou  | /api/v1/geo/nearby → probe: ✅ 200 (915ms)    |
| FUNC-068 | endpoint  | Rotas históricas (Atlas) | 🟡 Médio    | pending | /api/v1/geo/routes                            |
| FUNC-069 | endpoint  | Rotas históricas (Atlas) | 🟡 Médio    | pending | /api/v1/geo/routes/:id                        |

## Módulo: GRAFO

| ID       | Categoria | Label              | Criticidade | Status  | Rota/Fonte |
| -------- | --------- | ------------------ | ----------- | ------- | ---------- |
| FUNC-007 | página    | TheoSGraph (Grafo) | 🟡 Médio    | pending | /graph     |

## Módulo: IA

| ID       | Categoria     | Label                                            | Criticidade | Status  | Rota/Fonte                                                |
| -------- | ------------- | ------------------------------------------------ | ----------- | ------- | --------------------------------------------------------- |
| FUNC-006 | página        | Factbook (IA)                                    | 🔴 Crítico  | pending | /factbook                                                 |
| FUNC-044 | endpoint      | Guia de passagem (IA)                            | 🟠 Alto     | pending | /api/v1/bible/passage-guide/:translation/:bookId/:chapter |
| FUNC-105 | endpoint      | Estatísticas RAG                                 | 🔵 Baixo    | passou  | /api/v1/rag/stats → probe: ✅ 200 (192ms)                 |
| FUNC-108 | endpoint      | Feedback IA (👍👎)                               | 🟡 Médio    | pending | /api/v1/rag/feedback                                      |
| FUNC-109 | endpoint      | Chat IA (RAG, library-first)                     | 🔴 Crítico  | pending | /api/v1/rag/chat                                          |
| FUNC-110 | endpoint      | Chat IA streaming                                | 🟠 Alto     | pending | /api/v1/rag/chat/stream                                   |
| FUNC-126 | bug-conhecido | Botões sem onClick: Factbook versículos e tags   | 🟠 Alto     | aberto  | varredura-historica                                       |
| FUNC-127 | bug-conhecido | Botões sem onClick: AIInsights Exegese/Perguntar | 🟠 Alto     | aberto  | varredura-historica                                       |

## Módulo: INFRA

| ID       | Categoria | Label               | Criticidade | Status | Rota/Fonte                                    |
| -------- | --------- | ------------------- | ----------- | ------ | --------------------------------------------- |
| FUNC-071 | endpoint  | Health check da API | 🔴 Crítico  | passou | /api/v1/health/ai → probe: ✅ 200 (1066ms)    |
| FUNC-072 | endpoint  | Health check da API | 🔴 Crítico  | passou | /api/v1/health/ → probe: ✅ 200 (1066ms)      |
| FUNC-073 | endpoint  | Health check da API | 🔴 Crítico  | passou | /api/v1/health/live → probe: ✅ 200 (1066ms)  |
| FUNC-074 | endpoint  | Health check da API | 🔴 Crítico  | passou | /api/v1/health/ready → probe: ✅ 200 (1066ms) |
| FUNC-075 | endpoint  | Health check da API | 🔴 Crítico  | passou | /api/v1/health → probe: ✅ 200 (1066ms)       |

## Módulo: INSTITUCIONAL

| ID       | Categoria | Label         | Criticidade | Status  | Rota/Fonte   |
| -------- | --------- | ------------- | ----------- | ------- | ------------ |
| FUNC-011 | página    | Privacidade   | 🟡 Médio    | pending | /privacidade |
| FUNC-013 | página    | Sobre         | 🟡 Médio    | pending | /sobre       |
| FUNC-015 | página    | Termos de Uso | 🟡 Médio    | pending | /termos      |

## Módulo: LÉXICO

| ID       | Categoria | Label                     | Criticidade | Status  | Rota/Fonte                                                               |
| -------- | --------- | ------------------------- | ----------- | ------- | ------------------------------------------------------------------------ |
| FUNC-053 | endpoint  | Léxico Strong's (verbete) | 🟠 Alto     | pending | /api/v1/bible/lexicon/:strongId                                          |
| FUNC-081 | endpoint  | Texto interlinear         | 🟠 Alto     | passou  | /api/v1/linguistics/interlinear/:bookId/:chapter → probe: ✅ 200 (195ms) |

## Módulo: NAVEGAÇÃO

| ID       | Categoria | Label           | Criticidade | Status  | Rota/Fonte |
| -------- | --------- | --------------- | ----------- | ------- | ---------- |
| FUNC-001 | página    | Home / Redirect | 🟡 Médio    | pending | /          |

## Módulo: USUÁRIO

| ID       | Categoria | Label                | Criticidade | Status  | Rota/Fonte |
| -------- | --------- | -------------------- | ----------- | ------- | ---------- |
| FUNC-010 | página    | Anotações do Usuário | 🟡 Médio    | pending | /notes     |
| FUNC-012 | página    | Configurações        | 🟡 Médio    | pending | /settings  |

## Critério de Aceitação da Fase 1

- [ ] Cristiano revisou o inventário acima e confirmou que nada crítico ficou de fora
- [ ] Usuário de teste `qa-bot@theosphere.dev` criado e isolado
- [ ] Aprovação para avançar para a **Fase 2** (testes de fluxos críticos)

## Próximos Passos (Fase 2)

Fluxos prioritários a testar (por criticidade):

1. Login / Logout / Sessão expirada
2. Registro de usuário + validações
3. Carregar capítulo bíblico + busca full-text
4. Chat IA (RAG) — library-first + fallback
5. Isolamento de dados entre usuários (segurança crítica)

> **Atenção:** Bugs conhecidos listados no módulo `bug-conhecido` devem ser confirmados
> antes da Fase 2 — alguns podem já ter sido corrigidos em commits recentes.
