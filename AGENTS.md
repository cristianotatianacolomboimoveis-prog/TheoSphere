# AGENTS.md — TheoSphere

Instruções para agentes de IA que trabalham neste repositório. Arquivo cross-tool:
lido por Antigravity, Cursor, Claude Code e afins.

> **Antigravity:** este arquivo **não** é carregado automaticamente. Configure uma
> regra global (Settings → Rules) instruindo o agente a ler `AGENTS.md` na raiz do
> workspace, ou copie o conteúdo para `~/.gemini/GEMINI.md`.

---

## 0. COMECE AQUI — onde o trabalho parou

Última sessão: **2026-09-28**. Repositório limpo, suíte inteira passando
(**338 testes backend**, 49 frontend, lint 0, typecheck 0, static-checks 0, `verificar:acervo` coerente,
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
13. **Ingestão Massiva e Conclusão de Comentários Exegéticos Canônicos (2026-09-23):**
    Acervo clássico expandido para **45.114 chunks ativos** em **90 obras teológicas completas** (+13.713 chunks e +36 obras nesta sessão).

- **Matthew Henry:** Todos os 6 volumes 100% completos no banco (Vols 1 a 6 somando 14.591 chunks).
- **João Calvino:** 100% do Novo Testamento concluído (Harmonia dos Evangelhos 3 vols, João 2 vols, Atos 2 vols, 8 volumes de Epístolas) e grande parte do Antigo Testamento concluído (Gênesis 2 vols, Pentateuco 4 vols, Josué, Salmos Vols 1 a 5, Isaías, Jeremias, Ezequiel, Daniel).
- **Tomás de Aquino:** _Summa Theologica_ completa indexada (Partes I, I-II, II-II e III somando mais de 4.400 chunks).
- **Martinho Lutero:** Comentário aos Gálatas (Gutenberg #3390, 55 chunks) e Catecismos.
- **John Bunyan:** Trilogia clássica completa (_O Peregrino_, _Graça Abundante_, _Guerra Santa_).
- **Flávio Josefo & John Foxe:** _Antiguidades Judaicas_, _Guerras dos Judeus_ e _Livro dos Mártires_.
- **Agostinho de Hipona:** _A Cidade de Deus_ e _Escritos Anti-Pelagianos_.
- **Jonathan Edwards & Charles Spurgeon:** Tratados clássicos e sermões de domínio público.
- **Banco de Dados Supabase:** Banco atingiu 1.194 MB (1,19 GB) com 45.114 chunks no `UserEmbedding`. Busca vetorial, híbrida e textual plenamente ativas. Modo read-only de disco ativado pelo Supabase Free Tier por ultrapassar 1 GB (requer ajuste no dashboard do Supabase para novas gravações em lote).

14. **Guia de Passagem Exegético em 1 Clique (2026-09-23):**
    Conectados os **45.114 chunks de comentários clássicos** (João Calvino, Matthew Henry, Martinho Lutero) ao leitor e bancada exegética via `PassageGuideService.getClassicCommentaries`.

- **Backend:** Mapeamento canônico dos 66 livros para os respectivos Gutenberg IDs e volumes do acervo. Filtro inteligente para descarte de índices remissivos numéricos e extração de prosa teológica pura.
- **Frontend:** Atualizados `ContextualInsightsPanel.tsx`, `PassageGuide.tsx` e `ReaderToolbar.tsx` com novo botão `[📖 Guia Exegético]` de 1 clique, badges de autores (`JC`, `MH`, `ML`) e sincronização fluida de passagens.
- **Validação:** 254 testes backend e 49 testes frontend passando.

15. **Comparação de Versões & Alinhamento Sinótico com Diff Textual (2026-09-24):**
    Implementada a ferramenta de **Text Comparison** estilo Logos Bible Software para análise exegética e de variantes textuais entre versões bíblicas canônicas:

- **Backend (`text-diff.ts` e `BibleComparisonService`):** Algoritmo LCS (Longest Common Subsequence) para alinhamento palavra por palavra e detecção de acréscimos textuais (`added`), omissões textuais (`removed`) e cálculo de percentual de similaridade léxica. Endpoint orquestrado `@Get('compare/:bookId/:chapter')` com suporte a versões primárias e alvos (`BLIVRE`, `NVA`, `KJV`, `WEB`, `TR`, `WLC`, `LXX`).
- **Frontend (`TextComparison.tsx` e `useTextComparison.ts`):** Componente modal de alta resolução com switch entre **Grid Sinótico (Colunas)** e **Intercalado (Verso a Verso)**, toggles para destaque visual de adições/omissões, cópia para Markdown e integração direta via botão `[⚖️ Sinopse & Variantes]` na `ReaderToolbar.tsx`.
- **Validação:** **262 testes backend** (+8 novos testes cobrindo diff e comparação) e **49 testes frontend** passando, 0 erros de lint, 0 erros de typecheck.

16. **Catálogo Teológico Clássico Conectado à Biblioteca (2026-09-24):**
    O acervo completo das 89 obras canônicas (João Calvino, Matthew Henry, Tomás de Aquino, Martinho Lutero, Santo Agostinho, John Bunyan, Flávio Josefo, John Foxe, etc.) totalizando **45.092 chunks indexados no Supabase** foi conectado diretamente à Biblioteca Teológica (`/library`):

- **Backend (`classic-catalog.ts` e `BibleController`):** Mapeamento canônico tipado das 89 obras com metadados estruturados (autor limpo, categoria exegética/sistemática/patrística/histórica/devocional, tradição reformada/escolástica/patrística/puritana, contagem precisa de chunks e link de domínio público Gutenberg/CCEL). Endpoint `@Get('catalog')` com `Cache-Control: public, max-age=86400`.
- **Frontend (`TheologicalLibrary.tsx` e `classicCatalog.ts`):** Interface reformulada estilo Logos com catálogo offline instantâneo (0ms) e revalidação assíncrona, banner de métricas (89 obras / 45.092 chunks), busca em tempo real, tabs de categorias, pills de tradição com cores temáticas e modal de consulta rápida para o Copilot IA ancorado na obra.
- **Validação:** **262 testes backend**, **49 testes frontend**, `static-checks.mjs` limpo (0 achados), build e typecheck 100% aprovados.

17. **Estudo de Palavra Original de Nível Acadêmico — Logos-Grade Word Study (2026-09-24):**
    Construído o motor de estudo exegético aprofundado para lemas gregos e hebraicos, superando o modelo fragmentado do Logos:

- **Backend (`LinguisticsService` & `LinguisticsController`):** Adicionado `BOOK_ID_TO_NAME_PT` e `getCanonicalDivision` em `book-map.ts`. Criado método `getWordStudyDetails(strongId)` que calcula em tempo real a distribuição canônica (Pentateuco, Históricos, Poéticos, Profetas, Evangelhos, Atos, Paulinas, Gerais, Apocalipse), a contagem detalhada por livro bíblico e o agrupamento das formas flexionadas no corpus grego/hebraico com morfologia e contagem de ocorrências. Exposto via endpoint `@Get('word-study/:strongId')` com LRU cache em memória e Cache-Control de 24h.
- **Frontend (`WordStudy.tsx`, `CanonicalDistributionChart.tsx` & `InflectedFormsTable.tsx`):** Gráfico de barras horizontais temáticas da distribuição canônica, listagem de frequências por livro bíblico, tabela interlinear de formas flexionadas com tradução morfológica legível em português, disparo automático ao selecionar termo, integração com citações do Acervo Clássico das 89 obras e botão de 1 clique "Copiar Ficha Exegética em Markdown".
- **Validação:** **267 testes backend** (+5 novos testes unitários cobrindo divisões canônicas, agregação e cache), **49 testes frontend**, `static-checks.mjs` com 0 achados, ESLint e TypeScript limpos.

18. **Caderno de Anotações Pessoais & Marca-Texto Temático no Leitor (2026-09-24):**
    Construído o sistema de estudo bíblico pessoal de padrão Logos Bible Software, permitindo anotações homiléticas e marca-texto com semântica teológica diretamente no texto:

- **Hook de Persistência (`useVerseAnnotations.ts`):** Gerencia reativamente destaques e anotações por livro e capítulo, com sincronização em `localStorage`.
- **Paleta Teológica de 5 Cores:** Amarelo (Doutrina Geral), Esmeralda (Graça & Salvação), Azul (Aliança & Promessas), Roxo (Soberania de Deus) e Vermelho (Mandamentos & Alerta), com estilos ricos de fundo e borda aplicados no `VerseRow.tsx`.
- **Barra Flutuante (`VerseSelectionToolbar.tsx`) & Modal de Anotações (`VerseNoteModal.tsx`):** Exibição instantânea ao selecionar um ou mais versículos, com paleta de 1 clique, atalho para abrir/editar notas de sermão, cópia formatada com referências e botão para sinopse textual.

19. **Diretriz de Equilíbrio Teológico (Meio-termo Calvinista / Arminiano) no Copilot IA (2026-09-24):**
    Configurada uma abordagem acadêmica imparcial e de equilíbrio teológico (meio-termo entre Calvinismo e Arminianismo) como padrão da IA:

- **Prompts & System Instructions (`prompts.ts` e `rag.service.ts`):** Quando a biblioteca não retorna trechos específicos ou não há tradição especificada pelo usuário, a IA apresenta com igual rigor acadêmico os argumentos da tradição Calvinista/Reformada (Calvino, Spurgeon, Owen, Dort) e da tradição Arminiana/Wesleyana (Armínio, Wesley, Remonstrantes, Clarke), destacando convergências essenciais (Sola Gratia, Sola Fide, Solus Christus) e distinções hermenêuticas legítimas, sem impor uma linha sobre a outra (respeitando escolhas explícitas quando indicadas).
- **Fallback Estático (`fallback-responses.ts`):** Respostas de contingência offline estruturadas com análise teológica equilibrada entre as visões Reformada e Arminiana, consenso bíblico e grau de tensão ecumênica.
- **Segurança e Qualidade:** MapLibre GL atualizado para `6.11.2` (eliminando vulnerabilidade GHSA-jrc7-96c5-q579), cookie de `/refresh` corrigido com flags dinâmicas de segurança, `addUserXP` instrumentado com logging visível.
- **Validação:** **327 testes backend** (todos os 38 specs aprovados, incluindo 4 testes unitários cobrindo o equilíbrio teológico), **49 testes frontend**, `static-checks.mjs` com 0 achados, `verificar:acervo` coerente, build, typecheck e lint 100% limpos.

20. **Overhaul do Design System Global & Estética Acadêmica de Luxo (2026-09-24):**
    Reformulação dos tokens e estética de interface para padrão premium de workstation acadêmica (superando Logos 10 e alinhado a interfaces modernas como Linear/Raycast):

- **Tokens de Cor & Tipografia (`globals.css`):** Eliminação de overrides de templates antigos em favor de uma escala de ardósia obsidiana profunda (`#090C12`), azul safira lapis-lazúli (`#3B82F6`), ouro bizantino sacro (`#F59E0B`), esmeralda espiritual (`#10B981`) e tipografia editorial com `Literata`, `Outfit` e `Plus Jakarta Sans`.
- **Glassmorphism 2.0 & Micro-Interações:** Novas classes de utilidade (`.glass-panel`, `.glass-card`, `.text-gradient-gold`, `.glow-indigo`), scrollbars auto-ocultantes ultra-finas e animações fluidas (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **TopBar & Command Palette (`TheoSphereTopBar.tsx` e `TheoSphereCommandPalette.tsx`):** Barra superior em vidro translúcido com desfoque de 24px, caixa de comando com realce luminoso no foco, novo atalho `⌘K`, cards de navegação com bordas sutis e status de velocidade.
- **Bancada de Trabalho (`Workspace.tsx`):** Abas de cabeçalho refinadas com gradiente celeste, insígnia dourada de sincronização (_Link Set A_), indicador pulsante esmeralda e separadores de redimensionamento suaves.
- **Validação:** 49/49 testes frontend passando (vitest), typecheck limpo com 0 erros (`tsc --noEmit`), `static-checks.mjs` limpo (0 achados).

21. **Ferramenta de Navegação 3D via Protocolo MCP (`theosphere_map_navigate`) (2026-09-24):**
    Implementado o controle de navegação e exploração cartográfica 3D/2.5D do atlas bíblico via protocolo MCP (Model Context Protocol):

- **Ferramenta MCP (`theosphere_map_navigate`):** Registrada no catálogo de ferramentas do MCP com permissão governada `'map:navigate'` concedida por padrão aos agentes orquestradores e protocolos.
- **Ações Disponíveis:**
  - `listRoutes`: enumera todas as 8 rotas bíblicas/teológicas mapeadas (Abraão, Êxodo, Jesus na Galileia, Viagens de Paulo, Terra Prometida, Exílios Assírio e Babilônico) com contagem de marcos e coordenadas iniciais.
  - `selectRoute` e `getRoute`: carrega e ativa a rota selecionada, calculando o centro inicial da câmera e retornando waypoints com referências bíblicas, dados arqueológicos e modelos 3D.
  - `flyTo`: posiciona a câmera 3D de forma fluida a partir de coordenadas geográficas `[lat, lng]` ou por resolução léxica de marcos bíblicos canônicos (Jerusalém, Cafarnaum, Monte Sinai, Nazaré, Belém, Ur, Roma, Éfeso, Babilônia, etc.), com controle de `zoom`, `pitch`, `bearing` e `mode` (`satellite`, `vector`, `cesium3d`).
  - `setEra`: sintoniza o atlas em períodos históricos (-2000 a +100 d.C.) e filtra as rotas correspondentes à época.
  - `queryLocation`: consulta metadados geográficos, teológicos e arqueológicos de marcos bíblicos.
- **Validação:** **335 testes backend** (+8 novos testes cobrindo listagem, navegação, rota e eras), **49 testes frontend**, `static-checks.mjs` com 0 achados, typecheck e build 100% limpos.

22. **Paridade Funcional e Estética Total entre Mapa 2.5D e Globo 3D (2026-09-24):**
    Unificada a experiência de exploração bíblica, geográfica e arqueológica entre os motores 2.5D (MapLibre/Deck.gl) e 3D (Cesium):

- **Card Flutuante Interativo:** Removida a limitação de exibição exclusiva em tela cheia (`selectedEvent`). O card flutuante premium glassmorphism agora abre tanto no modo normal quanto em tela cheia, posicionado elegantemente em `top-20 left-5` (abaixo do `MapHeader`), sem sobrepor o painel de rotas ou o controlador temporal.
- **Rótulos de Texto Dinâmicos (3D Labels):** Adicionados `<LabelGraphics>` aos locais bíblicos, achados arqueológicos e waypoints das rotas no Cesium, com contorno escuro legível, posicionamento otimizado e `distanceDisplayCondition` para nitidez impecável sem poluição visual.
- **Hover Responsivo (Pointer):** Implementado `ScreenSpaceEventHandler` no Cesium canvas que detecta movimento sobre entidades e atualiza instantaneamente o cursor para `pointer`.
- **Eliminação Definitiva da Caixa Branca do Cesium:** Substituído o iframe nativo instável do Cesium pelo design system TheoSphere (`glass-heavy`), integrando citação teológica, referência bíblica com atalho para o módulo de exegese (`[📖 Estudar na Exegese]`), artefatos 3D e foco de câmera.
- **Sincronia Dupla:** A seleção de qualquer entidade no globo ou mapa 2.5D sincroniza reativamente o card flutuante sobre o mapa e a barra lateral (`TheoSphereDashboard`).

23. **Modo Imersão Real — Padrão National Geographic / Voyager no Atlas 3D (2026-09-24):**
    Construída a experiência imersiva de campo histórico-geográfico para visualização de sítios bíblicos em primeira pessoa:

- **Voo Cinematográfico Rente ao Relevo:** Substituída a altitude estática de 45.000m por voo dinâmico de solo (1.800m a 2.800m) com inclinação de horizonte (`pitch: -22°`) para visualização tridimensional de montanhas, vales e escarpas contra o céu atmosférico.
- **Órbita 360° Contínua:** Implementada rotação contínua da câmera ao redor do local histórico (`cameraCommand: toggleOrbit`), com botão interativo pulsante verde esmeralda na Ficha de Campo.
- **Modo Foco Total (Zero Poluição):** Adicionado botão de toggle no `MapHeader` (`[ ◨ Foco Total ]` / `[ Modo Imersão Ativo ]`) com recolhimento suave da barra lateral de 350px e minimização automática do painel de rotas para liberar 100% da tela para o relevo bíblico.
- **Ficha de Campo com Fotografia Real de Alta Resolução:** Banner panorâmico do sítio arqueológico/geográfico (Monte Sinai, Jerusalém, Cafarnaum, Babilônia, Belém, etc.) integrado a dados de terreno, citação bíblica e botão `[📖 Estudar na Exegese]`.
- **Validação:** 335 testes backend, 49 testes frontend passando, `static-checks.mjs` com 0 achados, typecheck 100% aprovado e capturas Playwright comprovando a imersão.

24. **Navegação Orbital e Órbita 360° via MCP no Atlas 3D (2026-09-25):**
    Expandida a ferramenta governada `theosphere_map_navigate` com perspectiva macro e rotação angular contínua:

- **Perspectiva Orbital (`perspective: 'orbital'`):** Posiciona a câmera em altitude macro (~25.000m) e pitch de 45° para visualização por satélite em alta escala do relevo geográfico regional.
- **Órbita 360° Contínua (`action: 'orbit360'`):** Ativa rotação 360° ininterrupta da câmera em tempo real ao redor do marco geográfico (altitude 2.400m e pitch -22°).
- **Validação:** **338 testes backend** (38 specs aprovados com +3 novos testes cobrindo perspectiva orbital e órbita 360°), **49 testes frontend**, `npm run verificar` 100% verde, `static-checks.mjs` com 0 achados, typecheck com 0 erros.

25. **Kit de Lançamento para Testes Externos & Beta Fechado (2026-09-28):**
    Construído o ecossistema de acolhimento e suporte para abertura do TheoSphere a pastores, teólogos e pesquisadores convidados:

- **Keep-Alive do Backend na Nuvem (`.github/workflows/keep-alive.yml`):** Ping HTTP a cada 10 minutos (24/7) no endpoint `/api/v1/health/live` para neutralizar o auto-sleep do Render Free Tier e garantir resposta instantânea no primeiro clique.
- **Banner de Aquecimento Elegante (`ServerWarmupBanner.tsx`):** Alerta não intrusivo com pulso e detecção inteligente de cold start (>2.8s) no primeiro carregamento do app com transição suave para conectado.
- **Mini-Tour de Onboarding (`WelcomeTourModal.tsx`):** Guia de boas-vindas com 4 passos essenciais (morfologia Strong com duplo-clique, Speed Search ⌘K, bancada com 90 obras e Atlas 3D com órbita 360°), persistência no `localStorage` e botão de reabertura permanente na TopBar (`[?] Guia`).
- **Canal de Feedback & Relato de Bugs Integrado (`FeedbackModal.tsx`):** Modal com seleção de 4 categorias (Sugestão, Bug, Dúvida Teológica, Elogio), avaliação de 1 a 5 estrelas, coleta automática de contexto e confirmação visual calorosa acionável via botão `[💬 Feedback BETA]` na TopBar.
- **Responsividade Aprimorada para Tablets/iPad (`Sidebar.tsx`):** Auto-recolhimento da barra lateral para modo de ícones finos (`w-18`) em viewports entre 768px e 1024px, liberando 200px extras para leitura bíblica e exegese confortável.
- **Mensagens Humanas de Cota & Fallback no Copilot IA (`AIAssistant.tsx`):** Respostas empáticas e informativas em casos de rate limit (429) do Gemini com ativação transparente do acervo clássico offline.
- **Validação:** 338 testes backend passando, 49 testes frontend passando, lint 0 erros, capturas Playwright atestando a renderização impecável.

26. **Duplo Provedor de IA com Failover Automático (Gemini Primário + OpenAI Fallback) (2026-09-28):**
    Arquitetura de alta disponibilidade para a IA teológica no Copilot RAG:

- **Google Gemini 3.8 Flash (`gemini-3.8-flash`):** Provedor primário ativo padrão (respostas exegéticas BDAG e síntese das 90 obras teológicas com custo zero no Free Tier).
- **OpenAI GPT-4o-mini (`gpt-4o-mini`):** Provedor de fallback de contingência inicializado em paralelo. É acionado de forma transparente e imediata se o Gemini atingir cota (429), indisponibilidade temporária ou timeout, tanto no chat síncrono quanto no streaming SSE.
- **Validação:** 338 testes backend e 49 frontend passando. Simulação de queda de cota (429) validou a transferência automática de requisição para a OpenAI em 7,1s sem interrupção.

**Próximos passos:**

1. **Configuração de Variáveis no Render Dashboard:** Definir `GEMINI_API_KEY` e `OPENAI_API_KEY` nas Environment Variables do Render para reflexão em nuvem.
2. **Ajuste de Cota de Disco no Supabase:** Habilitar expansão de disco no Supabase para continuar ingestões de novos volumes do acervo.

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
