# Auditoria Multi-Agente TheoSphere — 2026-07-02

## Status Geral: 🟡 Projeto sólido com gargalos críticos a resolver

**Método:** 5 agentes Claude rodaram em paralelo, cada um auditando uma área do codebase por completo. Total de ~200 arquivos inspecionados.

---

## Resumo Executivo

O TheoSphere tem uma arquitetura surpreendentemente madura para seu estágio — o pipeline RAG é sofisticado (multi-fonte, semantic cache, fallback em 3 níveis), a busca híbrida backend (RRF + pgvector + FTS) é de nível profissional, e a segurança de autenticação (refresh token rotation com detecção de reuso) supera muitos produtos em produção.

**O problema principal: o frontend não usa o que o backend já entrega.** A busca avançada existe mas nunca é chamada. O App Router do Next.js é desperdiçado numa SPA monolítica. O CesiumGlobe (~42MB) não é lazy-loaded. E o RAG não tem streaming, fazendo o usuário esperar 5-15s sem feedback.

---

## Top 15 Achados Críticos (por impacto)

### 🔴 CRÍTICOS — Resolver imediatamente

| # | Área | Achado | Arquivo(s) |
|---|---|---|---|
| 1 | **Frontend** | SPA monolítica — `page.tsx` é `"use client"` com 18+ ferramentas via condicionais. Zero SSR, zero code-splitting por rota, URLs não compartilháveis | `frontend-v2/src/app/page.tsx` |
| 2 | **Busca** | `useAdvancedSearch` é importado mas NUNCA chamado — toda a busca híbrida (RRF, pgvector, FTS) está morta na UI. O usuário só tem `String.includes()` local | `BibleReader.tsx:193` |
| 3 | **IA/RAG** | Sem streaming (SSE/WebSocket) — respostas de exegese levam 5-15s sem feedback visual. Gemini suporta `generateContentStream` nativamente | `rag.service.ts`, `rag.controller.ts` |
| 4 | **IA/RAG** | Sem citação de fontes — `sources[]` existe no tipo do frontend mas o backend nunca retorna quais documentos foram usados como contexto | `rag.service.ts:29-38` |
| 5 | **Segurança** | Token `NEXT_PUBLIC_ABIBLIADIGITAL_TOKEN` exposto no bundle JS do cliente — qualquer usuário pode extraí-lo | `frontend-v2/.env.local:21` |
| 6 | **Dados** | N+1 em `massGenerateEmbeddings` — 5000 UPDATEs individuais dentro de um loop | `bible-ingestion.service.ts:378-386` |
| 7 | **Dados** | Full Table Scan em `getLexicalContext` via `ILIKE '%query%'` sem índice trigram — roda a cada chamada do RAG | `rag.service.ts:880-927` |
| 8 | **Frontend** | CesiumGlobe (~42MB) com import estático dentro de TheoSphere3D — não é lazy-loaded | `TheoSphere3D.tsx:24` |
| 9 | **Frontend** | Dependências duplicadas: `leaflet` + `mapbox-gl` + `react-map-gl` não são usados (MapLibre + Deck.gl cobrem tudo) | `frontend-v2/package.json` |
| 10 | **Performance** | Zero HTTP Cache Headers — `/bible/chapter` é imutável mas cada navegação faz round-trip completo | `backend/src/main.ts` |

### 🟡 IMPORTANTES — Próximo sprint

| # | Área | Achado | Arquivo(s) |
|---|---|---|---|
| 11 | **IA/RAG** | Contexto pessoal usa instrução perigosa: "VERDADE ABSOLUTA para este usuário" — pode fazer a IA afirmar conteúdo errado das notas como fato | `user-context.service.ts:293` |
| 12 | **Segurança** | `JWT_EXPIRES_IN=7d` em dev + access token em localStorage = janela de XSS de 7 dias | `backend/.env:28`, `useAuth.ts:158` |
| 13 | **Frontend** | BibleReader.tsx (710 linhas) e TheoSphere3D.tsx (1237 linhas) — componentes monolíticos que precisam decomposição | Ambos |
| 14 | **Frontend** | Zero responsividade — sidebar fixa, sem mobile layout, sem hamburger menu | `page.tsx`, `Sidebar.tsx` |
| 15 | **Dados** | `findOccurrencesByRoot` busca Strong ID no texto do versículo (semanticamente incorreto — Strong IDs são metadados) | `linguistics.service.ts:43-48` |

---

## Diagnóstico por Esquadrão

### Alpha — Camada de Dados
- **Schema:** 18 modelos, relações bem definidas, indexes adequados na maioria
- **pgvector:** 7/10 — HNSW configurado, mas cast de vetor via `JSON.stringify` é frágil (3 arquivos fazem diferente do padrão)
- **Seeds:** 6/10 — `seed-phd.ts` e `seed-geo.ts` criam duplicatas em re-execução
- **Faltam:** Índice GiST em `Location.geom`, índice trigram em `LexicalEntry`, unique constraint em `TechnicalCommentary` e `Location`

### Beta — Busca & Performance
- **Backend:** Busca híbrida RRF com FTS + pgvector + query parser estilo Logos — **excelente**
- **Frontend:** Não usa nada disso. `String.includes()` no capítulo atual é tudo
- **Cache:** Embedding cache L1/L2 bom, semantic cache bom, mas zero cache HTTP e zero cache de resultados de busca
- **Correção mais impactante:** Conectar `useAdvancedSearch` ao BibleReader com debounce de 300ms — não precisa construir nada novo

### Gamma — IA/RAG
- **Pipeline:** Sofisticado — multi-fonte (pgvector + Sefaria + Bible-API + Drive + comentários clássicos), semantic cache, fallback em 3 níveis
- **Prompts:** System prompt teológico PhD de alta qualidade
- **Lacunas críticas:** Sem streaming, sem citação de fontes, sem verificação factual pós-geração
- **Edge AI:** Implementado (WebGPU + Gemma-2B) mas sem contexto RAG offline — é um chatbot genérico

### Delta — Frontend/UX
- **Arquitetura:** Next.js 16 App Router desperdiçado numa SPA monolítica `"use client"`
- **Bundle:** Estimado >10MB — Cesium (42MB), Three.js, MapLibre, Deck.gl, DuckDB-WASM, HuggingFace Transformers + 3 libs de mapa duplicadas
- **Bom:** Virtualização com `@tanstack/react-virtual`, Web Workers, design system básico
- **Falta:** Sistema de tabs real, Command Palette (existe `CommandBar.tsx` mas não é usado), responsividade

### Epsilon — Segurança
- **Autenticação:** 8/10 — SHA-256 pre-hash + bcrypt, refresh token rotation com detecção de reuso, httpOnly cookies
- **CORS:** Bem configurado com regex para Vercel previews
- **Infra:** Helmet com CSP, rate limiting distribuído, circuit breaker, audit logging
- **Problemas:** Token exposto via `NEXT_PUBLIC_`, access token em localStorage com 7d de validade, sem CSRF protection

---

## Plano de Ação — 4 Sprints

### Sprint 1: "Conectar o que já existe" (Impacto máximo, esforço mínimo)
1. Conectar `useAdvancedSearch` ao BibleReader com debounce 300ms
2. Adicionar Cache-Control headers em `/bible/chapter` (dados imutáveis)
3. Implementar streaming SSE no endpoint `/rag/chat`
4. Rotacionar segredos expostos e mover `ABIBLIADIGITAL_TOKEN` para proxy backend
5. Reduzir `JWT_EXPIRES_IN` para 15m em produção

### Sprint 2: "Performance & Bundle"
6. Lazy-load CesiumGlobe com `dynamic()` dentro de TheoSphere3D
7. Remover `leaflet`, `react-leaflet`, `mapbox-gl`, `react-map-gl` do package.json
8. Remover `@import url(fonts)` duplicado do globals.css
9. Batch UPDATE em `massGenerateEmbeddings` (eliminar N+1)
10. Criar índices trigram em `LexicalEntry.word`, `LexicalEntry.definition`, `TechnicalCommentary.content`

### Sprint 3: "Arquitetura Frontend"
11. Migrar de SPA monolítica para rotas App Router (`/reader`, `/exegesis`, `/atlas`, `/study`)
12. Decompor BibleReader.tsx e TheoSphere3D.tsx em sub-componentes
13. Implementar sistema de tabs com layout persistente
14. Ativar CommandBar.tsx (Command Palette)
15. Responsividade básica (mobile sidebar, layout stacking)

### Sprint 4: "IA de Nível Acadêmico"
16. Retornar `sources[]` no RAG response com referências verificáveis
17. Verificação factual pós-geração (Strong IDs, referências bíblicas)
18. Implementar reranking com cross-encoder
19. Corrigir instrução "VERDADE ABSOLUTA" no contexto pessoal
20. Melhorar Edge AI (modelo maior + injeção de contexto local)

---

## Métricas de Sucesso

| Métrica | Atual (estimado) | Meta Sprint 1 | Meta Sprint 4 |
|---|---|---|---|
| Tempo de busca (UI) | Sem busca real | <200ms | <50ms |
| First token RAG | 5-15s | <500ms (streaming) | <500ms |
| Bundle size (gzipped) | >3MB | <2MB | <1.5MB |
| Lighthouse Performance | ~40 | ~60 | ~80 |
| Citação de fontes | 0% | 0% | 100% |
| Cache hit rate (HTTP) | 0% | >60% | >80% |

---

*Relatório gerado por auditoria multi-agente Claude em 2026-07-02. 5 agentes paralelos, ~200 arquivos auditados, ~500k tokens processados.*
