# brains-antigravity/

Arquivo do que o Antigravity IDE acumulou como "brain" persistente por sessão de trabalho no TheoSphere.
Migrado do Antigravity para dentro do repositório em **2026-09-15**, no dia em que o projeto passou a ser
operado exclusivamente pelo Claude Code / Cowork.

O `AGENTS.md` da raiz é o estado consolidado — esta pasta é o histórico bruto de raciocínio + evidência
visual que produziu o consolidado. Se algo no `AGENTS.md` §0 parecer não fazer sentido, aqui está a
reconstituição do "por que ficou assim".

## Estrutura

Um subfolder por sessão, ordenado pela entrega correspondente no `AGENTS.md` §0:

- **`01-arquitetura-superior-ao-logos/`** — itens 4, 6, 7, 8 do §0. Sessão pesada de benchmarking do
  Logos Bible Software: 100 screenshots comparativos (`screenshots/`), 5 scratchpads do browser sobre
  auditoria do Logos vs TheoSphere em produção, e o plano/walkthrough que originaram o
  `LayoutSwitcher`, o `ContextualInsightsPanel`, as lentes do Factbook e o duplo-clique interlinear.
  **77.5 MB** — a maior parte é PNG.
- **`02-povoamento-embeddings-livres/`** — item 2. Estratégia de povoamento das 7 traduções canônicas
  sem estourar cota do Gemini. **0.4 MB**.
- **`03-ingestao-teologica-global/`** — item 3, o "próximo passo" declarado. Plano de escala do acervo
  clássico para ~10 mil livros de domínio público / ~2.4 M chunks. Inclui `architecture_review_feedback.md`,
  `task.md` e 2 imagens de contexto. **8.5 MB**.
- **`04-normalizacao-traducoes/`** — item 10. Case-insensitivity das chaves de tradução
  (`SearchService.translation?.toUpperCase().trim()`) e sinalização de amostras parciais no picker.
  **1.5 MB**.

Cada subfolder tem, quando existiam no brain original:

- `implementation_plan.md` — o plano estruturado (o "briefing" que o agente montou antes de executar).
- `walkthrough.md` — a narrativa passo-a-passo que o agente escreveu enquanto executava.
- `task.md`, `architecture_review_feedback.md` — quando a sessão gerou.
- `transcripts/transcript.jsonl` e `transcript_full.jsonl` — histórico completo da conversa
  com o agente Antigravity (formato JSON Lines, um evento por linha).
- `messages/*.json` — as mensagens individuais indexadas por UUID.
- `tasks/task-*.log` — logs de execução de cada task numerada.
- `screenshots/` — capturas geradas pela sessão. Subdivisão:
  - `temp/` — screenshots temporários do agente (do folder `.tempmediaStorage/`)
  - `user-uploaded/` — imagens que o usuário enviou (do folder `.user_uploaded/`)
  - `click-feedback/` — feedback visual de cada clique (do folder `.system_generated/click_feedback/`)
- `browser/scratchpad_*.md` — notas do agente sobre navegação (existe apenas em
  `01-arquitetura-superior-ao-logos/`, onde a auditoria do Logos exigiu browsing intensivo).

`MANIFEST.json` na raiz da pasta lista contagens por brain e o mapeamento UUID → nome amigável, útil se
alguém quiser correlacionar com backups do Antigravity IDE.

## O que **é** e **não é** versionado no git

Ver `.gitignore` da raiz: os arquivos textuais (`.md`, `.json`, `.jsonl`, `.log`) são versionados; os
binários (`.png`, `.webp`, `.jpg`) ficam apenas no disco local. A pasta inteira é ~88 MB, mas o que
o git rastreia é ~10 MB — screenshots são referência histórica que não tira benefício de diff nem
merge.

## Origem exata

`~/.gemini/antigravity-ide/brain/<UUID>/` de cada UUID no `MANIFEST.json`. Cópia por `shutil.copy2` (mtime
preservado). Os brains originais no Antigravity foram removidos junto com o resto do workspace do IDE
nessa mesma sessão de migração.
