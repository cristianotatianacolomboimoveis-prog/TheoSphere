# TheoSphere QA — Inventário de Funcionalidades

**Gerado em:** 2026-09-02T18:52:27.205Z  
**Total de FUNC-IDs:** 98

## Resumo

| Categoria        | Qtd |
| ---------------- | --- |
| Páginas          | 16  |
| Endpoints de API | 68  |
| Componentes UI   | 0   |
| Jornadas E2E     | 6   |
| Bugs conhecidos  | 8   |

## Módulo: ACERVO

| ID       | Categoria     | Label                           | Criticidade | Status  | Rota/Fonte                       |
| -------- | ------------- | ------------------------------- | ----------- | ------- | -------------------------------- |
| FUNC-004 | página        | Enciclopédia Teológica          | 🟡 Médio    | pending | /encyclopedia                    |
| FUNC-008 | página        | Biblioteca / Acervo             | 🟡 Médio    | pending | /library                         |
| FUNC-067 | endpoint      | Sincronização Google Drive      | 🟡 Médio    | pending | /api/v1/drive-library/ingest     |
| FUNC-068 | endpoint      | Sincronização Google Drive      | 🟡 Médio    | pending | /api/v1/drive-library/ingest-url |
| FUNC-069 | endpoint      | Sincronização Google Drive      | 🟡 Médio    | pending | /api/v1/drive-library/reindex    |
| FUNC-070 | endpoint      | Busca na biblioteca teológica   | 🟠 Alto     | pending | /api/v1/library/lookup           |
| FUNC-094 | bug-conhecido | URL syncDrive sem /api/v1 → 404 | 🔴 Crítico  | aberto  | varredura-historica              |

## Módulo: ADMIN

| ID       | Categoria | Label                   | Criticidade | Status  | Rota/Fonte                   |
| -------- | --------- | ----------------------- | ----------- | ------- | ---------------------------- |
| FUNC-073 | endpoint  | QA validado (moderação) | 🟡 Médio    | pending | /api/v1/rag/validated-qa     |
| FUNC-080 | endpoint  | QA validado (moderação) | 🟡 Médio    | pending | /api/v1/rag/validated-qa/:id |

## Módulo: ARQUEOLOGIA

| ID       | Categoria | Label                       | Criticidade | Status  | Rota/Fonte                |
| -------- | --------- | --------------------------- | ----------- | ------- | ------------------------- |
| FUNC-022 | endpoint  | Estatísticas de arqueologia | 🔵 Baixo    | pending | /api/v1/archaeology/stats |

## Módulo: AUTH

| ID       | Categoria     | Label                                            | Criticidade | Status  | Rota/Fonte            |
| -------- | ------------- | ------------------------------------------------ | ----------- | ------- | --------------------- |
| FUNC-009 | página        | Login / Autenticação                             | 🔴 Crítico  | pending | /login                |
| FUNC-027 | endpoint      | Registro de usuário                              | 🔴 Crítico  | pending | /api/v1/auth/register |
| FUNC-028 | endpoint      | Login                                            | 🔴 Crítico  | pending | /api/v1/auth/login    |
| FUNC-029 | endpoint      | Refresh de token JWT                             | 🔴 Crítico  | pending | /api/v1/auth/refresh  |
| FUNC-030 | endpoint      | Logout                                           | 🔴 Crítico  | pending | /api/v1/auth/logout   |
| FUNC-091 | bug-conhecido | Botões sem onClick: SettingsPage 'Sair da Conta' | 🔴 Crítico  | aberto  | varredura-historica   |
| FUNC-098 | bug-conhecido | Login case-sensitive (401 com senha certa)       | 🔴 Crítico  | aberto  | varredura-historica   |

## Módulo: BACKEND

| ID       | Categoria | Label                                         | Criticidade | Status  | Rota/Fonte                                |
| -------- | --------- | --------------------------------------------- | ----------- | ------- | ----------------------------------------- |
| FUNC-017 | endpoint  | GET /                                         | 🟡 Médio    | pending | /                                         |
| FUNC-018 | endpoint  | GET /api/v1/ai/locations                      | 🟡 Médio    | pending | /api/v1/ai/locations                      |
| FUNC-019 | endpoint  | GET /                                         | 🟡 Médio    | pending | /                                         |
| FUNC-020 | endpoint  | POST /api/v1/ai/compare                       | 🟡 Médio    | pending | /api/v1/ai/compare                        |
| FUNC-021 | endpoint  | GET /api/v1/archaeology/                      | 🟡 Médio    | pending | /api/v1/archaeology/                      |
| FUNC-023 | endpoint  | GET /api/v1/archaeology/by-ref                | 🟡 Médio    | pending | /api/v1/archaeology/by-ref                |
| FUNC-024 | endpoint  | GET /api/v1/archaeology/near                  | 🟡 Médio    | pending | /api/v1/archaeology/near                  |
| FUNC-025 | endpoint  | GET /api/v1/archaeology/:slug                 | 🟡 Médio    | pending | /api/v1/archaeology/:slug                 |
| FUNC-026 | endpoint  | GET /api/v1/archaeology                       | 🟡 Médio    | pending | /api/v1/archaeology                       |
| FUNC-039 | endpoint  | GET /api/v1/bible/fallback                    | 🟡 Médio    | pending | /api/v1/bible/fallback                    |
| FUNC-040 | endpoint  | GET /api/v1/bible/sefaria/:ref                | 🟡 Médio    | pending | /api/v1/bible/sefaria/:ref                |
| FUNC-042 | endpoint  | GET /api/v1/bible/ingest-embeddings           | 🟡 Médio    | pending | /api/v1/bible/ingest-embeddings           |
| FUNC-043 | endpoint  | GET /api/v1/enterprise/routes                 | 🟡 Médio    | pending | /api/v1/enterprise/routes                 |
| FUNC-044 | endpoint  | GET /api/v1/enterprise/routes/:slug           | 🟡 Médio    | pending | /api/v1/enterprise/routes/:slug           |
| FUNC-045 | endpoint  | GET /api/v1/enterprise/waypoints/:id          | 🟡 Médio    | pending | /api/v1/enterprise/waypoints/:id          |
| FUNC-046 | endpoint  | GET /api/v1/enterprise/models/:id             | 🟡 Médio    | pending | /api/v1/enterprise/models/:id             |
| FUNC-047 | endpoint  | GET /api/v1/enterprise/graph                  | 🟡 Médio    | pending | /api/v1/enterprise/graph                  |
| FUNC-048 | endpoint  | GET /api/v1/enterprise/search                 | 🟡 Médio    | pending | /api/v1/enterprise/search                 |
| FUNC-049 | endpoint  | POST /api/v1/enterprise/ai/explain            | 🟡 Médio    | pending | /api/v1/enterprise/ai/explain             |
| FUNC-050 | endpoint  | POST /api/v1/enterprise/ai/exegesis           | 🟡 Médio    | pending | /api/v1/enterprise/ai/exegesis            |
| FUNC-051 | endpoint  | POST /api/v1/enterprise/ai/tts                | 🟡 Médio    | pending | /api/v1/enterprise/ai/tts                 |
| FUNC-052 | endpoint  | POST /api/v1/enterprise/ai/translate          | 🟡 Médio    | pending | /api/v1/enterprise/ai/translate           |
| FUNC-057 | endpoint  | GET /api/v1/geo/route-path                    | 🟡 Médio    | pending | /api/v1/geo/route-path                    |
| FUNC-063 | endpoint  | GET /api/v1/linguistics/lexical/:strongId     | 🟡 Médio    | pending | /api/v1/linguistics/lexical/:strongId     |
| FUNC-064 | endpoint  | GET /api/v1/linguistics/search-root/:strongId | 🟡 Médio    | pending | /api/v1/linguistics/search-root/:strongId |
| FUNC-066 | endpoint  | GET /api/v1/linguistics/occurrences/:strongId | 🟡 Médio    | pending | /api/v1/linguistics/occurrences/:strongId |
| FUNC-072 | endpoint  | GET /api/v1/rag/graph                         | 🟡 Médio    | pending | /api/v1/rag/graph                         |
| FUNC-077 | endpoint  | POST /api/v1/rag/dictate                      | 🟡 Médio    | pending | /api/v1/rag/dictate                       |
| FUNC-078 | endpoint  | POST /api/v1/rag/index                        | 🟡 Médio    | pending | /api/v1/rag/index                         |
| FUNC-079 | endpoint  | POST /api/v1/rag/sync                         | 🟡 Médio    | pending | /api/v1/rag/sync                          |
| FUNC-081 | endpoint  | DELETE /api/v1/rag/cache                      | 🟡 Médio    | pending | /api/v1/rag/cache                         |
| FUNC-082 | endpoint  | DELETE /api/v1/rag/cache/:userId              | 🟡 Médio    | pending | /api/v1/rag/cache/:userId                 |
| FUNC-084 | endpoint  | GET /api/v1/search/advanced                   | 🟡 Médio    | pending | /api/v1/search/advanced                   |

## Módulo: BUSCA

| ID       | Categoria     | Label                                                 | Criticidade | Status  | Rota/Fonte            |
| -------- | ------------- | ----------------------------------------------------- | ----------- | ------- | --------------------- |
| FUNC-083 | endpoint      | Busca full-text de versículos                         | 🔴 Crítico  | pending | /api/v1/search/verses |
| FUNC-097 | bug-conhecido | BibleVerse.embedding NULL em prod — busca híbrida off | 🟠 Alto     | aberto  | varredura-historica   |

## Módulo: BÍBLIA

| ID       | Categoria | Label                     | Criticidade | Status  | Rota/Fonte                                          |
| -------- | --------- | ------------------------- | ----------- | ------- | --------------------------------------------------- |
| FUNC-005 | página    | Exegese                   | 🔴 Crítico  | pending | /exegesis                                           |
| FUNC-014 | página    | Leitor Bíblico (Estudo)   | 🔴 Crítico  | pending | /study                                              |
| FUNC-031 | endpoint  | Referências cruzadas      | 🟠 Alto     | pending | /api/v1/cross-refs/                                 |
| FUNC-032 | endpoint  | Referências cruzadas      | 🟠 Alto     | pending | /api/v1/cross-refs                                  |
| FUNC-033 | endpoint  | Referências cruzadas      | 🟠 Alto     | pending | /api/v1/cross-refs/counts                           |
| FUNC-035 | endpoint  | Listar traduções bíblicas | 🔴 Crítico  | pending | /api/v1/bible/versions                              |
| FUNC-036 | endpoint  | Listar livros da Bíblia   | 🔴 Crítico  | pending | /api/v1/bible/books                                 |
| FUNC-037 | endpoint  | Carregar capítulo bíblico | 🔴 Crítico  | pending | /api/v1/bible/chapter                               |
| FUNC-038 | endpoint  | Carregar capítulo bíblico | 🔴 Crítico  | pending | /api/v1/bible/chapter/:translation/:bookId/:chapter |

## Módulo: COLLAB

| ID       | Categoria     | Label                                       | Criticidade | Status | Rota/Fonte          |
| -------- | ------------- | ------------------------------------------- | ----------- | ------ | ------------------- |
| FUNC-095 | bug-conhecido | WebSocket colaboração namespace inexistente | 🟠 Alto     | aberto | varredura-historica |

## Módulo: DESCONHECIDO

| ID       | Categoria | Label                      | Criticidade | Status  | Rota/Fonte          |
| -------- | --------- | -------------------------- | ----------- | ------- | ------------------- |
| FUNC-002 | página    | Página /admin/validated-qa | 🟡 Médio    | pending | /admin/validated-qa |
| FUNC-016 | página    | Página /exegete            | 🟡 Médio    | pending | /exegete            |

## Módulo: E2E

| ID       | Categoria | Label                                                             | Criticidade | Status | Rota/Fonte |
| -------- | --------- | ----------------------------------------------------------------- | ----------- | ------ | ---------- |
| FUNC-085 | e2e       | Jornada: Login → Ler capítulo → Buscar palavra → Logout           | 🔴 Crítico  | fase3  |            |
| FUNC-086 | e2e       | Jornada: Registro → Confirmar → Primeiro login                    | 🔴 Crítico  | fase3  |            |
| FUNC-087 | e2e       | Jornada: Chat IA → Feedback positivo → Rever QA validado          | 🟠 Alto     | fase3  |            |
| FUNC-088 | e2e       | Jornada: Busca full-text → Abrir cross-refs → Ver léxico Strong's | 🟠 Alto     | fase3  |            |
| FUNC-089 | e2e       | Jornada: Upload Drive → Sync biblioteca → Perguntar IA sobre obra | 🟠 Alto     | fase3  |            |
| FUNC-090 | e2e       | Jornada: Usuário A não acessa dados de Usuário B (isolamento)     | 🔴 Crítico  | fase3  |            |

## Módulo: FRONTEND

| ID       | Categoria     | Label                                            | Criticidade | Status | Rota/Fonte          |
| -------- | ------------- | ------------------------------------------------ | ----------- | ------ | ------------------- |
| FUNC-096 | bug-conhecido | 16 componentes com catch silencioso (tela vazia) | 🟠 Alto     | aberto | varredura-historica |

## Módulo: GEOESPACIAL

| ID       | Categoria | Label                    | Criticidade | Status  | Rota/Fonte             |
| -------- | --------- | ------------------------ | ----------- | ------- | ---------------------- |
| FUNC-003 | página    | Atlas 4D (Geo)           | 🟡 Médio    | pending | /atlas                 |
| FUNC-053 | endpoint  | Locais bíblicos (Atlas)  | 🟡 Médio    | pending | /api/v1/geo/locations  |
| FUNC-054 | endpoint  | Locais próximos (Atlas)  | 🟡 Médio    | pending | /api/v1/geo/nearby     |
| FUNC-055 | endpoint  | Rotas históricas (Atlas) | 🟡 Médio    | pending | /api/v1/geo/routes     |
| FUNC-056 | endpoint  | Rotas históricas (Atlas) | 🟡 Médio    | pending | /api/v1/geo/routes/:id |

## Módulo: GRAFO

| ID       | Categoria | Label              | Criticidade | Status  | Rota/Fonte |
| -------- | --------- | ------------------ | ----------- | ------- | ---------- |
| FUNC-007 | página    | TheoSGraph (Grafo) | 🟡 Médio    | pending | /graph     |

## Módulo: IA

| ID       | Categoria     | Label                                            | Criticidade | Status  | Rota/Fonte                                                |
| -------- | ------------- | ------------------------------------------------ | ----------- | ------- | --------------------------------------------------------- |
| FUNC-006 | página        | Factbook (IA)                                    | 🔴 Crítico  | pending | /factbook                                                 |
| FUNC-034 | endpoint      | Guia de passagem (IA)                            | 🟠 Alto     | pending | /api/v1/bible/passage-guide/:translation/:bookId/:chapter |
| FUNC-071 | endpoint      | Estatísticas RAG                                 | 🔵 Baixo    | pending | /api/v1/rag/stats                                         |
| FUNC-074 | endpoint      | Feedback IA (👍👎)                               | 🟡 Médio    | pending | /api/v1/rag/feedback                                      |
| FUNC-075 | endpoint      | Chat IA (RAG, library-first)                     | 🔴 Crítico  | pending | /api/v1/rag/chat                                          |
| FUNC-076 | endpoint      | Chat IA streaming                                | 🟠 Alto     | pending | /api/v1/rag/chat/stream                                   |
| FUNC-092 | bug-conhecido | Botões sem onClick: Factbook versículos e tags   | 🟠 Alto     | aberto  | varredura-historica                                       |
| FUNC-093 | bug-conhecido | Botões sem onClick: AIInsights Exegese/Perguntar | 🟠 Alto     | aberto  | varredura-historica                                       |

## Módulo: INFRA

| ID       | Categoria | Label               | Criticidade | Status  | Rota/Fonte           |
| -------- | --------- | ------------------- | ----------- | ------- | -------------------- |
| FUNC-058 | endpoint  | Health check da API | 🔴 Crítico  | pending | /api/v1/health/ai    |
| FUNC-059 | endpoint  | Health check da API | 🔴 Crítico  | pending | /api/v1/health/      |
| FUNC-060 | endpoint  | Health check da API | 🔴 Crítico  | pending | /api/v1/health/live  |
| FUNC-061 | endpoint  | Health check da API | 🔴 Crítico  | pending | /api/v1/health/ready |
| FUNC-062 | endpoint  | Health check da API | 🔴 Crítico  | pending | /api/v1/health       |

## Módulo: INSTITUCIONAL

| ID       | Categoria | Label         | Criticidade | Status  | Rota/Fonte   |
| -------- | --------- | ------------- | ----------- | ------- | ------------ |
| FUNC-011 | página    | Privacidade   | 🟡 Médio    | pending | /privacidade |
| FUNC-013 | página    | Sobre         | 🟡 Médio    | pending | /sobre       |
| FUNC-015 | página    | Termos de Uso | 🟡 Médio    | pending | /termos      |

## Módulo: LÉXICO

| ID       | Categoria | Label                     | Criticidade | Status  | Rota/Fonte                                       |
| -------- | --------- | ------------------------- | ----------- | ------- | ------------------------------------------------ |
| FUNC-041 | endpoint  | Léxico Strong's (verbete) | 🟠 Alto     | pending | /api/v1/bible/lexicon/:strongId                  |
| FUNC-065 | endpoint  | Texto interlinear         | 🟠 Alto     | pending | /api/v1/linguistics/interlinear/:bookId/:chapter |

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
