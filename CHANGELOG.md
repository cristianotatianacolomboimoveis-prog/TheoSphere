# CHANGELOG — TheoSphere

Histórico de entregas, melhorias e marcos de desenvolvimento do TheoSphere.

---

## Entregas Históricas (Sessões Anteriores até 2026-11-05)

1. **Agente Autônomo Diário de QA (Fases 2 e 3 Ativas na Nuvem):** Configurado em `.github/workflows/daily-qa.yml` para rodar todos os dias às 06:00 BRT (09:00 UTC). Suíte Fase 2 (14 testes) e Fase 3 (13 testes E2E com isolamento multi-tenant, leitura, anotações, interlinear e encerramento de sessão) validadas contra a produção com **100.0% de Health Score**.
2. **Povoamento Incremental de Embeddings & Suporte Unicode:** Corrigido bug crítico em `EmbeddingService.normalizeText` para suportar nativamente diacríticos e caracteres gregos/hebraicos (`\p{L}\p{N}\p{M}`). Povoamento com Gemini executado: **66.296 versículos com embeddings ativos** (BLIVRE 100%, NVA 100%, KJV 1.600, TR 1.000, WLC 500, LXX 500, WEB 500) e busca híbrida validada com `vectorArm: ok`.
3. **Pipeline de Ingestão do Acervo Clássico (Domínio Público):** Ingestão e indexação vetorial de **38 obras clássicas completas (18.790 chunks de 500 palavras)** no `UserEmbedding` com portão de licença fail-closed (Agostinho, Calvino, Lutero, Spurgeon, Edwards, Aquino, Bunyan, Comentários de Matthew Henry e Easton's Bible Dictionary), validado com citação precisa de 7 fontes pelo Copilot IA RAG.
4. **Sistema de Layouts do Workspace:** Implementado `LayoutSwitcher.tsx` e `Workspace.tsx` com 5 layouts dinâmicos em 1 clique (Foco Único, Paralelo 50/50, Bancada Exegética Tríplice, Copilot IA e Grade Sinótica 2x2), além de maximização individual por painel e Link Set A automático.
5. **Speed Search & Busca Híbrida:** Implementado `TheoSphereCommandPalette.tsx` com atalho global `Cmd+K`/`Ctrl+K`, parser de referências canônicas (`bibleReference.ts`) e operadores booleanos (`AND`, `OR`, `NOT`, `book:`, `chapter:`).
6. **Painel Contextual de Ideias:** Criado `ContextualInsightsPanel.tsx` e botão `[💡 Ideias]` na toolbar da Bíblia, integrando comentários de domínio público (JFB, Matthew Henry, Calvino), referências TSK e Copilot IA RAG via `/rag/chat`.
7. **Factbook com Lentes e Atlas 3D:** Adicionadas lentes temáticas (_Tudo_, _Bíblico_, _Teológico_, _Geografia_, _Biblioteca_), galeria de tópicos populares e botão de 1 clique para plotar no globo 3D.
8. **Morfologia Interlinear de 1 Clique:** `VerseRow.tsx` enriquecido para que duplo-clique em qualquer palavra do versículo acione o `StrongOverlay.tsx` na posição do cursor.
9. **Deploy em Produção:** Backend sincronizado via Git push (`main ae4562d`) e frontend publicado com sucesso na Vercel (`https://frontend-v2-lake.vercel.app`).
10. **Limpeza e Normalização de Traduções (Concluído):** Normalizado `opts.translation` com `.toUpperCase().trim()` em `SearchService` (abrangendo detecção de referências, busca híbrida e avançada). No frontend (`BibleReader.tsx` e `TranslationPicker.tsx`), atualizado o catálogo com as 7 edições integrais canônicas de domínio público/licença livre (`BLIVRE`, `NVA`, `KJV`, `WEB`, `TR`, `WLC`, `LXX`) com badges estilizados para grego (`GR`) e hebraico (`HE`), e sinalização explícita de versões parciais/amostras (`isPartial: true`).
11. **Migração cross-tool para Claude Code (2026-09-15):** Removido o TheoSphere do workspace do Antigravity IDE — `storage.json` (2 refs), `state.vscdb` (5 chaves com `TheoSphere` limpas) e `workspaceStorage/d66ebd…c6bb/` deletado. Backups `.bak.<ts>` mantidos ao lado dos originais. `~/.gemini/GEMINI.md` global já é agnóstico (só instrui a ler AGENTS.md). `.agent/workflows/audit-weekly.md` reescrito para ser cross-tool. Repositório agora é operado pelo Claude Code / Cowork / Antigravity.
12. **Sinalização `meta.vectorArm` verificada, corrigida e coberta por teste (2026-09-15):** `/search/verses` responde `meta: { vectorArm: "ok" | "empty" | "failed" }` sobre a propriedade não-enumerável anexada em `search.service.ts`. Removido o `try/catch` interno de `vectorSearch`, deixando o erro propagar para o outer `.catch` de `hybridSearchVerses` que já marca `'failed'`. Testes adicionados cobrindo os 3 estados e invariante de não-enumerabilidade.
13. **Ingestão Massiva e Conclusão de Comentários Exegéticos Canônicos (2026-09-23):** Acervo clássico expandido para **45.114 chunks ativos** em obras teológicas completas no `UserEmbedding`.
    - **Matthew Henry:** Todos os 6 volumes completos no banco (Vols 1 a 6 somando 14.591 chunks).
    - **João Calvino:** Novo Testamento e volumes de Salmos, Gênesis, Pentateuco, Isaías, Jeremias.
    - **Tomás de Aquino:** _Summa Theologica_ completa indexada.
    - **Martinho Lutero:** Comentário aos Gálatas e Catecismos.
    - **John Bunyan:** Trilogia clássica (_O Peregrino_, _Graça Abundante_, _Guerra Santa_).
    - **Flávio Josefo & John Foxe:** _Antiguidades Judaicas_, _Guerras dos Judeus_ e _Livro dos Mártires_.
    - **Agostinho de Hipona:** _A Cidade de Deus_ e _Escritos Anti-Pelagianos_.
    - **Banco de Dados Supabase:** Banco atingiu 1.194 MB (1,19 GB) com 45.114 chunks no `UserEmbedding`. Modo read-only ativado pelo Supabase Free Tier por ultrapassar 1 GB.
14. **Guia de Passagem Exegético em 1 Clique (2026-09-23):** Conectados os chunks de comentários clássicos (João Calvino, Matthew Henry, Martinho Lutero) ao leitor e bancada exegética via `PassageGuideService.getClassicCommentaries`.
15. **Comparação de Versões & Alinhamento Sinótico com Diff Textual (2026-09-24):** Implementada a ferramenta de Text Comparison para análise exegética entre versões bíblicas canônicas via `BibleComparisonService` e `TextComparison.tsx`.
16. **Catálogo Teológico Clássico Conectado à Biblioteca (2026-09-24):** Mapeamento canônico das obras clássicas conectado à Biblioteca Teológica (`/library`) com catálogo em `classicCatalog.ts` e endpoint `@Get('catalog')`.
17. **Estudo de Palavra Original de Léxico e Morfologia (2026-09-24):** Criado `LinguisticsService.getWordStudyDetails(strongId)` calculando distribuição canônica e frequências por livro bíblico com formas flexionadas gregas/hebraicas.
18. **Caderno de Anotações Pessoais & Marca-Texto Temático no Leitor (2026-09-24):** Gerenciamento reativo de destaques e anotações com paleta temática de 5 cores.
19. **Diretriz de Equilíbrio Teológico (Meio-termo Calvinista / Arminiano) no Copilot IA (2026-09-24):** Configurada abordagem acadêmica imparcial nos prompts do RAG, apresentando as tradições Reformada e Arminiana/Wesleyana com igual rigor.
20. **Overhaul do Design System Global (2026-09-24):** Escala de ardósia obsidiana (`#090C12`), azul safira, ouro bizantino e esmeralda; tipografia editorial com `Literata`, `Outfit` e `Plus Jakarta Sans`.
21. **Ferramenta de Navegação 3D via Protocolo MCP (`theosphere_map_navigate`) (2026-09-24):** Controle governado de navegação cartográfica via MCP (`listRoutes`, `selectRoute`, `flyTo`, `setEra`, `queryLocation`).
22. **Paridade Funcional e Estética entre Mapa 2.5D e Globo 3D (2026-09-24):** Card flutuante interativo, labels 3D nítidos e hover com cursor responsivo.
23. **Modo Imersão no Atlas 3D (2026-09-24):** Voo de câmera rente ao relevo bíblico (1.800m a 2.800m), órbita 360° contínua e modo de foco total com recolhimento da barra lateral.
24. **Navegação Orbital e Órbita 360° via MCP no Atlas 3D (2026-09-25):** Expandida ferramenta MCP com perspectiva macro e órbita contínua.
25. **Kit de Lançamento para Testes Externos & Beta Fechado (2026-09-28):** Keep-alive 24/7 no Render (`/api/v1/health/live`), banner de aquecimento (`ServerWarmupBanner.tsx`), tour de boas-vindas (`WelcomeTourModal.tsx`) e modal de feedback (`FeedbackModal.tsx`).
26. **Duplo Provedor de IA com Failover Automático (2026-09-28):** Gemini primário (`gemini-3.8-flash`) com fallback automático para OpenAI (`gpt-4o-mini`).
27. **Árvore Sintática e Mapeamento de Cláusulas (2026-09-28):** Papéis funcionais, segmentação de orações e mapeamento de livros deuterocanônicos sob divisão canônica identificada.
28. **Landing Direta na Tela de Login com Vídeo e Dicas Beta (2026-09-28):** Portão de autenticação unificado em `/` renderizando `LoginPage` para visitantes não logados.
29. **Unificação da Estrutura de Pastas (2026-09-30):** Eliminação de duplicidades e promoção da raiz única `/Users/cristianocolombo/Desktop/Theosphere 2026`.
30. **Tradução Automática Dinâmica para Português nos Comentários Clássicos (2026-10-01):** Localização fluida de passagens em inglês com cache em memória e alternador `[Original (EN)]` / `[Traduzido (PT)]`.
31. **Eliminação de Sobreposições no Atlas 3D (2026-10-02):** Sidebar lateral fechada por padrão, painel de rotas contido e timeline minimizável.
32. **Resolução de Colisão de Toponímia no Atlas (2026-10-02):** Camada de satélite limpa sem cidades contemporâneas competindo com sítios bíblicos.
33. **Correção de Caracteres Acentuados no Deck.gl (2026-10-02):** Configurado `characterSet: "auto"` para renderizar diacríticos e acentos latinos.
34. **Exegese Histórica e Arqueológica nos Eventos da Linha do Tempo (2026-10-02):** Modal aprofundado com abas de teologia, história/arqueologia e cristocentrismo em `EventDeepDiveModal.tsx`.
35. **Esquadrão Diário de Usabilidade (UX Squad) (2026-10-09):** Automação em `.github/workflows/daily-ux-squad.yml` com Playwright e avaliação visual de telas.
36. **Navegação do Atlas Bíblico 3D & HUD de Exploração (2026-10-09):** 25 marcos bíblicos e 8 rotas pré-carregadas offline, navegador de marcos (`⌘M`) e HUD de rota passo a passo.
37. **Correção do Carregamento do Globo 3D Cesium (2026-10-13):** Carregamento assíncrono estático do Cesium desacoplado do bundle do Turbopack e overscaling de tiles com `maxzoom: 16`.
38. **Resiliência de Autenticação em Modo Read-Only (2026-10-19):** Tratamento do erro Postgres 25006 em `generateRefreshToken` permitindo emissão de JWT em memória quando banco estiver em read-only.
39. **Versionamento do UX Squad e Hidratação de node_modules (2026-11-04):** Correção de caminhos e validação local/produção da suíte inteira.
40. **Ativação e Validação das Chaves de IA em Produção no Render (2026-11-04):** `GEMINI_API_KEY` e `OPENAI_API_KEY` ativas e respondendo com status ok em `/health/ai`.
41. **Identificação Visual Inteligente e Hover no Atlas 3D (2026-11-04):** TextLayer e tooltips contextuais instantâneos ao passar o mouse.
42. **Modo Ultra-Clean no Atlas 3D (2026-11-04):** Rótulos secundários ativados exclusivamente no hover, preservando o relevo do satélite.
43. **Correção de Cascading Renders no React 19 (2026-11-04):** Correções de `react-hooks/set-state-in-effect` com CI 100% verde no GitHub.
44. **Catálogo de 23 Rotas Bíblicas Canônicas no Atlas 3D (2026-11-04):** Expansão para 23 rotas bíblicas completas (13 AT, 4 Evangelhos, 2 Apóstolos, 4 Paulo).
45. **Expansão da Biblioteca Teológica Livre & História da Igreja (2026-11-05):** Inclusão de Eusébio, Philip Schaff, Didaquê, Pais da Igreja e Credos Ecumênicos no catálogo canônico (108 obras mapeadas).
46. **Sistema de Planos e Limites de IA em BRL (/pricing) (2026-11-05):** Starter (R$ 14,90), Plus (R$ 24,90), Pro (R$ 39,90) e Church (R$ 99,90) com cotas de IA estruturadas.
47. **Perfil Altimétrico Interativo do Terreno Bíblico (Elevation Profile HUD) (2026-11-05):** Motor gráfico de altimetria e relevo com cumes bíblicos e distâncias geodésicas.
