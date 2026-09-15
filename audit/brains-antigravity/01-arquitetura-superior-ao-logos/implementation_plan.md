# Plano de Implementação: Arquitetura e Layouts Superiores ao Logos Bible

## 1. Contexto & Benchmark Real (Engenharia Reversa do Logos Bible)

A inspeção e navegação profunda no **Logos Bible Web** (`https://app.logos.com`) revelou com precisão cirúrgica a arquitetura de interface, os pontos fortes que os acadêmicos valorizam e, principalmente, as **graves fraquezas e atritos** que abrem espaço para o TheoSphere superá-lo com folga:

| Dimensão                        | Logos Bible (Inspecionado)                                                                                                         | TheoSphere (Nossa Arquitetura Superior)                                                                                                                                                                                                        |
| :------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Aparência & Leitura**         | Justificação forçada com "rios de espaços em branco" irregulares entre as palavras, banners de upsell invasivos e poluição visual. | Tipografia editorial de excelência (Literata & Outfit), kerning natural, modo Dark OLED e Sépia, zero anúncios ou banners de cobrança.                                                                                                         |
| **Sistema de Layouts**          | Abas e divisões de tela pesadas, lentas no navegador, com configuração manual e confusa de Link Sets (A, B, C, D).                 | **Layout Switcher Dinâmico**: 5 modos em 1 clique (Foco Leitura, Estudo Paralelo 50/50, Bancada Exegética 3-Panes, Modo Sinótico 4-Panes, e IA Copilot). Sincronização automática via Zustand sem necessidade de configurar Link Sets manuais. |
| **Painel Contextual de Ideias** | Cards estáticos pequenos com poucas fontes livres e exigência de paywall para obras relevantes.                                    | **Painel Dinâmico de Exegese Contextual**: Conecta Matthew Henry, Calvino, Patrística, TSK (Cross-References) e Morfologia Strong sincronizados ao versículo em foco.                                                                          |
| **Inteligência Artificial**     | Chatbot genérico rudimentar, bloqueado por login/paywall, sem análise exegética aprofundada de línguas originais.                  | **Copilot Exegético RAG Nativo**: Conectado diretamente ao endpoint `/rag/chat` de produção (resposta estruturada de 9.500+ caracteres com fontes históricas, morfologia e quiasmos).                                                          |
| **Geografia & Atlas**           | Mapas estáticos em bitmap 2D.                                                                                                      | **Atlas 3D Interativo**: Cesium / MapLibre GL com relevo topográfico, rotas de patriarcas e camadas arqueológicas.                                                                                                                             |

---

## 2. Proposta de Componentes e Melhorias Imediatas

### Componente 1: `LayoutSwitcher` & Menu de Disposição de Painéis

Implementar um seletor de layout avançado acessível tanto na `TheoSphereTopBar` (no botão Layouts, que hoje apenas redirecionava para exegesis) quanto no `Workspace`:

- **Modo 1: Leitura Focada (Single Pane)** — Leitura pura sem distrações, ideal para devocional ou estudo contínuo.
- **Modo 2: Estudo Paralelo (Split 50/50)** — Bíblia ao lado de outra tradução (ex: BLIVRE vs KJV) ou do Interlinear Grego/Hebraico.
- **Modo 3: Bancada Exegética (3 Painéis)** — Bíblia (45%) + Guia de Passagem & Comentários (35%) + Análise Lexical / Strong (20%).
- **Modo 4: Copilot Teológico (Split 60/40)** — Bíblia ao lado do Chat RAG com contexto automático da perícope ativa.
- **Modo 5: Grade Sinótica (2x2)** — 4 painéis integrados (Bíblia, Comentários, Morfologia e Atlas/Factbook).

### Componente 2: `ContextualInsightsPanel` (O equivalente superior ao "Ideias" do Logos)

Uma gaveta ou aba lateral inteligente que acompanha a leitura bíblica versículo a versículo:

- **Resumo Exegético Rápido**: Contexto imediato da perícope.
- **Comentários Clássicos Disponíveis**: Trechos pertinentes das obras de domínio público ingeridas.
- **Referências Cruzadas Relevantes**: Top 5 referências TSK com preview imediato ao passar o mouse.
- **Botão de Ação Rápida de IA**: _"Gerar Análise Exegética Completa"_ ou _"Examinar Morfologia no Original"_.

### Componente 3: Refinamento do `Workspace.tsx`

- Permitir redimensionamento suave com persistência de proporções no LocalStorage.
- Adicionar cabeçalhos de aba elegantes em cada painel com badge de sincronização ativa (Link Set Automático: verde/ativo).
- Maximizar/Restaurar qualquer painel individual com um clique duplo ou atalho de teclado.

---

## 3. Plano de Verificação

### Automated Tests

- `cd backend && npm run verificar`: Garantir que nenhuma alteração quebre a suíte existente.
- `cd frontend-v2 && npm run build` ou `tsc --noEmit`: Validar integridade estrita de tipos e componentes.
- `node audit/scripts/static-checks.mjs`: Garantir conformidade de verificações estáticas.

### Manual Verification

- Testar a alternância entre os 5 layouts no navegador.
- Validar a sincronização em tempo real de versículos e comentários entre os painéis.
- Verificar a fluidez e usabilidade dos novos controles de layout.
