# AGENTS.md — TheoSphere

Instruções para agentes de IA que trabalham neste repositório. Arquivo cross-tool: lido por Antigravity, Cursor, Claude Code e afins.

> **Estado MCP/autonomia — 2026-09-18:** `main` (`859253f`, PR #7) contém o control-plane MCP, Theo Engine, EvidencePack, RAG evidence-aware, ProjectMemory, tarefas governadas, agentes, locks, execution receipts e verificação independente. O CI (`CI` e `Security Audit`) concluiu com sucesso nesse commit. Alterações posteriores devem sempre aguardar e verificar a execução correspondente antes de declarar verde.

## Decisão operacional atual

- Trabalhar sempre em branch própria; nada de commit direto em `main`. Merge só com CI verificado — nunca para mascarar pendências.
- CI obrigatório: backend lint + typecheck (incluindo specs) + Jest + Prisma + MCP HTTP E2E smoke; frontend lint/typecheck/build; Prisma drift; Security Audit.
- **Lint:** `npm run lint` roda com `--fix` (reescreve arquivos) e por isso nunca falha por formatação. Para uma checagem que pode falhar, use uma verificação somente-leitura (`eslint ... --max-warnings 0` sem `--fix`).
- O MCP moderno é `2026-07-28`, stateless. Compatibilidade legada `2025-11-25`/`2025-06-18` permanece explicitamente separada.
- Tasks são cooperativas/eventualmente consistentes: `cancel` não mata fisicamente uma operação já em execução. Uma operação assíncrona deve consultar o estado antes de publicar o resultado; resultado tardio nunca pode sobrescrever `cancelled`.
- Tasks persistem antes do handle ser devolvido. Em restart, tarefas `working`/`input_required` são marcadas `failed` para não fabricar progresso.
- Não gerar embeddings indiscriminadamente nem gastar quota paga para validação.
- Falha de Vercel (quota), Render, Supabase, Redis, Cloudflare ou credencial é problema de infraestrutura: classificar como tal, não alterar código para mascarar.

## Pendências vivas

1. **Validação em ambiente real (não feita):** Render (`theosphere-backend`, `theosphere-redis`), Supabase (conectividade, pgvector, migrations), health `/api/v1/health/live` e `/ready`, e `npm run mcp:smoke` contra a URL real (ver `docs/MCP-OPERATIONS.md`). Só depois considerar o caminho MCP/EvidencePack/RAG pronto para teste de produção controlado.

## Requisitos de boot em produção

`app.module.ts` (Joi) recusa iniciar com `NODE_ENV=production` sem: `MCP_API_KEY` (mín. 32 caracteres), `REDIS_URL` e ao menos uma de `GEMINI_API_KEY`/`OPENAI_API_KEY`. Toda variável exigida deve estar declarada em `backend/render.yaml` (com `sync: false` para segredos), senão o Blueprint não a solicita e o deploy quebra no boot.

## Limitações conhecidas (não são bugs novos; decidir antes de escalar)

- **Recuperação após restart é global:** `McpProtocolTaskService.onModuleInit` marca `failed` toda task `working`/`input_required`, inclusive as que estão rodando em outra instância viva. Seguro para instância única (Render free); para múltiplas instâncias exige posse/lease por task.
- A execução de `theosphere_answer`/`theosphere_research` como Task roda no processo que a criou. Se ele cair, a task fica `working` até o TTL (1 h) ou até um restart marcá-la `failed`.
- Sessões do protocolo MCP legado (`2025-*`) ficam em memória (`McpController.sessions`): não sobrevivem a restart nem são compartilhadas entre instâncias. O protocolo `2026-07-28` é stateless.
- `TheologyEngineService.research` faz uma consulta de cross-reference por hit (até 50) e até 4 capítulos interlineares; latência não medida em produção.
- `EvidenceAwareRagService` faz monkey-patch de `buildGeminiRequest`/`buildOpenAiRequest` do `RagService`; qualquer refactor do `RagService` deve manter esse contrato coberto por `evidence-aware-rag.service.spec.ts`.

## Evidência recente

- Commit `859253f533e7e82a8bc9c8ce524a79d2d4102e2e` (PR #7, merge em `main`): estado de Task serializado por `pg_advisory_xact_lock`, leitura sempre da persistência, recuperação pós-restart; um `complete()` tardio não sobrescreve estado terminal (coberto por `mcp.protocol-task.service.spec.ts`, corrida `cancel -> complete`). `CI` e `Security Audit` verdes na `main` nesse commit.
- O smoke HTTP/E2E do CI cobre criação de Task, cancelamento cooperativo, `tasks/get` posterior e `-32602` para Task inexistente.
- Não extrapolar resultados de CI para commits posteriores sem consultar a execução correspondente.
