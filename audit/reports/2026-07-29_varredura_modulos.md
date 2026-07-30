# Varredura de Módulos — TheoSphere

**Data:** 2026-07-29 · **Escopo:** frontend-v2 + backend · **Gatilho:** "várias funcionalidades não estão funcionando, principalmente no Factbook" (falha reportada em local **e** produção)

---

## Sumário executivo

A varredura encontrou **quatro classes distintas de problema**. Só uma delas é "bug de código clássico"; as outras três são deploy pendente, UI decorativa e falha silenciosa — e é a combinação delas que produz a sensação de "nada funciona".

| #   | Classe                                    | Severidade | Afeta local? | Afeta prod? |
| --- | ----------------------------------------- | ---------- | ------------ | ----------- |
| 1   | Trabalho pronto nunca commitado/deployado | 🔴 Crítico | não          | **sim**     |
| 2   | Botões sem handler (UI decorativa)        | 🔴 Crítico | **sim**      | **sim**     |
| 3   | URLs de API erradas → 404 silencioso      | 🔴 Crítico | **sim**      | **sim**     |
| 4   | Falha silenciosa (catch que só loga)      | 🟡 Alto    | **sim**      | **sim**     |

Baseline de saúde: **96 testes do backend passando**, health de produção OK (`db` e `redis` up). Ou seja — o que está quebrado não é regressão de teste; é código que nunca foi ligado.

---

## 1. 🔴 Produção roda código de 9 dias atrás

O último commit é `a4b9b9f`. A working tree tem **56 arquivos modificados não commitados**, incluindo trabalho que corrige exatamente os sintomas relatados:

| Arquivo pendente                                                  | O que destrava                                                                                        |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `backend/src/rag/rag.service.ts`                                  | `structuredMode` — sem ele o Factbook recebe "minha especialidade é teologia" e **nunca gera dossiê** |
| `backend/src/bible.controller.ts` + `bible/passage-guide.service` | endpoint `GET /api/v1/bible/passage-guide/...` — **não existe em produção** → Passage Guide dá 404    |
| `backend/src/search/search.service.ts` + `query-parser.ts`        | busca reescrita (−292 linhas de complexidade)                                                         |
| `backend/src/linguistics/linguistics.service.ts`                  | interlinear                                                                                           |
| `backend/src/rag/rag.controller.ts`                               | `@UseGuards(JwtAuthGuard)` no `/dictate` (endpoint que gasta tokens estava aberto)                    |

O Render deploya por push no GitHub. Enquanto não houver commit + push, **nenhum desses fixes existe em produção** — por mais que funcionem na sua máquina.

> Isso explica a metade "produção" do seu relato. A metade "local" são os itens 2, 3 e 4.

---

## 2. 🔴 21 botões sem handler em 10 arquivos

Varredura automatizada em 142 `<button>` do `frontend-v2/src`: **15% não têm `onClick`, `onMouseDown` nem `type="submit"`**. Eles têm `hover:`, `transition-all`, ícone — parecem vivos e não fazem nada.

### Factbook — 8 de 11 botões mortos (o pior caso do projeto)

| Botão                                | Linha | O que deveria fazer                      |
| ------------------------------------ | ----- | ---------------------------------------- |
| Library (barra superior)             | 181   | abrir biblioteca                         |
| Compartilhar                         | 201   | compartilhar dossiê                      |
| Imprimir                             | 204   | imprimir/PDF                             |
| Copiar                               | 343   | copiar dossiê                            |
| Ferramentas                          | 346   | menu de ferramentas                      |
| Menu "…" da seção                    | 371   | ações da seção                           |
| **Passagens Chave** (cada versículo) | 402   | **abrir o versículo no leitor**          |
| **Tópicos Relacionados** (cada tag)  | 439   | **disparar novo dossiê**                 |
| Leitura Adicional                    | ~450  | `<div>` com `cursor-pointer`, não navega |

Os dois marcados em negrito são o coração do produto: um Factbook estilo Logos vale pela navegação entre entidades. Hoje é um texto estático.

### Demais módulos

| Arquivo                       | Linha         | Botão morto                     | Impacto                                                 |
| ----------------------------- | ------------- | ------------------------------- | ------------------------------------------------------- |
| `pages/SettingsPage.tsx`      | 79            | **"Sair da Conta"**             | 🔴 usuário não consegue deslogar                        |
| `layout/Sidebar.tsx`          | 164           | engrenagem Configurações        | não navega                                              |
| `layout/TheoSphereTopBar.tsx` | 106           | sino de notificações            | decorativo                                              |
| `layout/Workspace.tsx`        | 214, 217      | menu "⋮" e **fechar aba**       | abas não fecham; o "+" (nova aba) é `<div>` sem handler |
| `reader/AIInsights.tsx`       | 126, 129      | **"Exegese"** e **"Perguntar"** | dois CTAs principais do leitor                          |
| `TheoSGraph.tsx`              | 242, 245, 248 | zoom in, zoom out, filtro       | grafo não navegável                                     |
| `ManuscriptViewer.tsx`        | 105           | maximizar                       | (o zoom tem handler)                                    |

Falsos positivos verificados e descartados: `ui/ThemeToggle.tsx:23` (placeholder pré-hydration, intencional) e `visualizer/RouteControlPanel.tsx:147` (o `<div>` pai tem `onClick={onToggleLegend}`).

---

## 3. 🔴 Duas URLs de API erradas → 404 que ninguém vê

Cruzei todas as chamadas do frontend contra as 60 rotas registradas nos controllers. Duas não batem:

### 3.1 Sincronização do Google Drive nunca funcionou

`frontend-v2/src/hooks/useRAG.ts:539`

```ts
// O comentário no código diz:
// "/drive-library/* não tem o prefixo /api/v1 — usar URL absoluta."
return await api.post(`${API_BASE}/drive-library/ingest`, ...)
```

`API_BASE = CONFIG.BACKEND_URL` (sem `/api/v1`). Mas o controller **é** `@Controller('api/v1/drive-library')`. A premissa do comentário está errada → a URL montada é `https://theosphere.onrender.com/drive-library/ingest` → **404**. E o `catch` só faz `logger.warn` → a tela não muda, o usuário conclui que "sincronizar não funciona".

O irmão dessa chamada (`TheologicalLibrary.tsx:204`, `api.post("/drive-library/ingest-url")`) passa pelo `lib/api.ts` e monta a URL certa. Ou seja: ingestão por URL funciona, ingestão de pasta não — sintoma clássico de "às vezes funciona".

### 3.2 Colaboração em tempo real nunca conecta

`frontend-v2/src/hooks/useCollaboration.ts:33`

```ts
const backendUrl = CONFIG.API_BASE_URL.replace("/api", "") + "/collaboration";
// → "https://theosphere.onrender.com/v1/collaboration"
```

O `@WebSocketGateway` do backend **não declara namespace** — escuta na raiz. O socket aponta para um namespace que não existe → nunca conecta, sem erro visível.

---

## 4. 🟡 16 componentes falham em silêncio

Arquivos com `catch` mas **sem nenhum estado de erro** (`setError`, toast ou equivalente) — o erro vira `logger.warn` no console e a UI volta ao estado vazio:

`Factbook` · `ExegesisPanel` · `PassageGuide` · `WordStudy` · `Encyclopedia` · `StrongOverlay` · `AIAssistant` · `TheologicalLibrary` · `AgenticConsole` · `TheoSGraph` · `CesiumGlobe` · `dashboard/DashboardWidgets` · `visualizer/TheoSphere3D` (9 catches) · `reader/AIInsights` · `admin/validated-qa` · `SWRegistrar`

No Factbook isso é especialmente cruel: recusa do backend, cold start do Render (~60s) e JSON malformado da IA produzem **exatamente a mesma tela** — a inicial, como se você nunca tivesse clicado.

---

## 5. 🟡 Mídia do Factbook é 100% falsa

O prompt pede à IA `headerImage` e um array `images` na seção "Mídia & Arqueologia". O componente **não tem uma única tag `<img>`** (`grep -c "<img\|next/image"` → 0):

- `headerImage` é declarado na interface e **nunca renderizado**;
- `section.images.map()` desenha um ícone cinza de placeholder por item, ignorando a URL.

Você paga tokens para a IA inventar URLs de imagem que são jogadas fora. Ou o recurso vira real (arqueologia já tem 102 itens no acervo — dá para ligar no `archaeology/by-ref`), ou sai do prompt.

**Órfão relacionado:** `backend/src/rag/theological-sources.service.ts:103` — `getSwordModuleContent()` retorna a string literal `"[SWORD Fallback] Conteúdo do módulo..."`. Não é chamado em lugar nenhum; é código morto que pode vazar para o usuário se alguém plugar.

---

## Ordem de ataque sugerida

1. **Commit + push do backend** — destrava Factbook, Passage Guide e search em produção de uma vez. 96 testes passando, é seguro. _(1 comando)_
2. **Corrigir as duas URLs** (`useRAG.ts:539`, `useCollaboration.ts:33`) — duas linhas, dois recursos inteiros de volta.
3. **"Sair da Conta"** — é o botão morto de maior gravidade funcional.
4. **Factbook navegável** — versículos abrem o leitor, tags disparam novo dossiê. É o que transforma o Factbook em produto.
5. **Estado de erro visível** — começar por Factbook, ExegesisPanel e PassageGuide (os três mais usados).
6. **Restante dos botões decorativos** — ou implementar, ou remover. Botão que não faz nada custa mais confiança do que ausência de botão.
7. **Mídia do Factbook** — ligar no acervo arqueológico ou tirar do prompt.

---

## Correções aplicadas (mesma data)

Todas verificadas: **backend** 96 testes + lint + tsc limpos · **frontend** 49 testes (40 + 9 novos), lint limpo (só o warning pré-existente do `useVirtualizer`), `tsc --noEmit` e `next build` OK.

### URLs quebradas

| Arquivo                     | Correção                                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `hooks/useRAG.ts`           | `syncDrive` usa path relativo `drive-library/ingest` — o `lib/api.ts` prefixa `/api/v1`. Comentário antigo (que afirmava não haver prefixo) corrigido. |
| `hooks/useCollaboration.ts` | socket aponta para `CONFIG.WS_URL` (raiz do backend), que é onde o gateway realmente escuta.                                                           |

### Factbook

- **Passagens Chave** abrem o versículo no leitor (`setBibleReference` + `setActiveVerse` + `/study`). Referência que a IA inventar (livro inexistente, capítulo fora do intervalo) aparece desabilitada em vez de virar botão morto.
- **Tópicos Relacionados** disparam um novo dossiê — a navegação entre entidades que define o produto.
- **Copiar** (com confirmação visual), **Imprimir** e **Compartilhar** (Web Share API com fallback para cópia) funcionando.
- **Banner de erro** com "Tentar novamente", distinguindo _JSON inválido_ de _servidor inacessível_ — e mencionando o cold start do Render, que era a causa mais provável de "não fez nada".
- **Ferramentas** e o menu "…" por seção: removidos (não havia nada por trás).
- **Mídia falsa**: `headerImage` e `images` saíram do prompt e da interface — o componente nunca renderizou imagem. Menos tokens, zero promessa falsa.
- Novo `parseFactbookRef` tolerante a PT-BR ("Gênesis 14:18"), abreviações ("Hb 7:1") e livros numerados — o `parseRef` existente rejeita acentos e exige versículo. **9 testes de regressão** em `Factbook.test.ts`.

### Demais botões

| Arquivo                       | Correção                                                                                                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages/SettingsPage.tsx`      | **logout real** com estado de carregamento e redirect para `/login`; os 5 cards decorativos ganharam selo "Em breve" e perderam o `cursor-pointer` que os fazia parecer clicáveis |
| `layout/Sidebar.tsx`          | engrenagem navega para Ajustes, com estado ativo                                                                                                                                  |
| `reader/AIInsights.tsx`       | "Exegese" e "Perguntar" abrem as ferramentas correspondentes                                                                                                                      |
| `TheoSGraph.tsx`              | zoom in/out movem a câmera; o filtro foi removido (não existia mecanismo)                                                                                                         |
| `ManuscriptViewer.tsx`        | maximizar restaura o zoom                                                                                                                                                         |
| `layout/Workspace.tsx`        | barra de abas falsa ("+", "⋮", "X") removida — não havia sistema de abas                                                                                                          |
| `layout/TheoSphereTopBar.tsx` | sino de notificações removido — não há sistema de notificações                                                                                                                    |

**Resultado da varredura automatizada:** de **21 botões sem handler para 2** — e os 2 restantes são falsos positivos verificados (`ThemeToggle` pré-hydration, `RouteControlPanel` com handler no elemento pai).

### Critério usado

Botão sem handler foi **implementado** quando existia comportamento real por trás, e **removido** quando não existia. Nenhum foi mantido como enfeite e nenhum recurso foi simulado — botão que não faz nada custa mais confiança do que a ausência dele.

---

## Segunda rodada: verificação automatizada permanente

A varredura manual acima é um retrato. O que impede a repetição são dois scripts que entraram na verificação diária.

### `audit/scripts/static-checks.mjs`

Três checagens que lint, teste e build não fazem:

| Grupo        | O que pega                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------- |
| **handlers** | `<button>` e elementos com `cursor-pointer` sem `onClick`                                         |
| **rotas**    | chamadas `api.*` sem rota correspondente nos controllers, e URLs absolutas montadas sem `/api/v1` |
| **silêncio** | componentes que capturam erro sem mostrar nada ao usuário                                         |

Falsos positivos vão para `static-checks.allowlist.json`, **cada um com justificativa escrita** — sem isso o check vira carimbo.

**Teste de sensibilidade:** injetei em cópia os três defeitos exatos que sobreviveram meses (botão sem handler, chamada para rota inexistente, URL sem prefixo). O scanner pegou os três; o repositório real fica verde. Duas armadilhas apareceram nesse teste e foram corrigidas: o `disabled:` do Tailwind no className fazia o check inteiro passar batido, e `{...props}` em componente genérico de UI gerava falso positivo.

### `audit/scripts/probe-production.mjs`

Sonda 11 endpoints críticos em produção com status e tempo, absorvendo o cold start do Render no primeiro request. Roda na sua máquina (`node audit/scripts/probe-production.mjs`) — o sandbox da task bloqueia HTTP de saída do Node, então lá o agente sonda os mesmos endpoints pela ferramenta de fetch, com a lista de URLs escrita na própria task.

### O que o scanner achou que a varredura manual não tinha achado

Eu só tinha contado `<button>`. O scanner varre também elementos com `cursor-pointer` — e achou quatro coisas reais:

- **`TheoSGraph`**: o painel de detalhe imprimia **Gênesis 1:1-2 fixo para qualquer nó de versículo**, e as "Correlações Semânticas" eram "Justificação" e "Apóstolo Paulo" hardcoded, independentemente do nó. Agora o texto vem do nó e as correlações são os vizinhos reais do grafo, clicáveis para navegar.
- **`ExegeticalConcordance`** (Word Study): as ocorrências tinham `cursor-pointer` e seta, sem navegar. Agora abrem o versículo no leitor.
- **`NoteEditor`**: itens do histórico pareciam clicáveis. Agora expandem o texto da nota.
- **`Factbook`**: itens de "Artigos" e "Eventos" tinham hover azul sem clique — afordância removida (são frases, não entidades).

Também zerei o grupo "silêncio" nos componentes de dados: `ExegesisPanel`, `WordStudy`, `TheoSGraph` e `AIAssistant` agora mostram o erro em vez de ficarem vazios — no AIAssistant a falha entra na conversa, porque antes o "digitando…" sumia e a pergunta ficava sem resposta.

O parser de referência bíblica virou `lib/bibleRef.ts`, compartilhado entre Factbook e Word Study, com 9 testes.

### Estado da verificação

```
backend   lint ✅   96 testes ✅   build ✅
frontend  lint ✅   49 testes ✅   build ✅   tsc ✅
comportamento  handlers 0 · rotas 0 · silêncio 0   ✅
```

A task diária foi reescrita: agora roda as três fases, sonda produção, e o relatório passa a ter uma seção "O que foi medido" — porque "🟢 tudo verde" significava "nada regrediu no lint/test/build" e era lido como "tudo funciona".

---

## Pendente: commit e deploy (precisa ser você)

O ambiente onde rodei não consegue apagar arquivos dentro de `.git`, e o hook de pre-commit (lint-staged) depende disso. **Não foi possível commitar daqui** — o trabalho está todo no working tree, verificado e pronto.

O backend já está com os 18 arquivos em stage. Na raiz do projeto:

```bash
# 1. Backend → dispara o deploy automático no Render
git commit -m "feat(backend): structuredMode no RAG, Passage Guide e busca reescrita"

# 2. Frontend
git add frontend-v2/
git commit -m "fix(frontend): URLs 404 do Drive e da colaboracao, logout, Factbook navegavel"

git push origin main
```

Depois, para o frontend (Vercel não tem Git integration):

```bash
npx vercel --prod --yes
```

> Ao validar no navegador, lembre do Service Worker: use hard reload ou query string nova, senão você lê o bundle antigo do cache.

Se algo em `.git/_sandbox_litter/` estiver sobrando, pode apagar a pasta inteira — são locks e objetos temporários que o ambiente não conseguiu remover sozinho.

---

## Metodologia

- Parser AST-lite em `<button>` (extrai a tag de abertura respeitando `{}` aninhado) sobre 142 ocorrências em `.tsx`.
- Extração das 60 rotas dos 13 controllers NestJS, cruzada com todas as chamadas `api.*` e `fetch()` do frontend.
- `git status` / `git diff --stat` para separar o que é bug do que é deploy pendente.
- `npx jest` no backend: 10 suítes, 96 testes, 0 falhas.
- `GET /api/v1/health` em produção: `{"status":"ok","database":"up","redis":"up"}`.

**Nada foi alterado no repositório** — esta rodada é diagnóstico.
