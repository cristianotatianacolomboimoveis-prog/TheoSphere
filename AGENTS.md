# AGENTS.md — TheoSphere

Instruções para agentes de IA que trabalham neste repositório. Arquivo cross-tool: lido por Antigravity, Cursor, Claude Code e afins.

> **Estado MCP/autonomia — 2026-09-18:** a branch `feat/theosearch-evidence-linguistics` mantém o control-plane MCP, Theo Engine, EvidencePack, RAG evidence-aware, ProjectMemory, tarefas governadas, agentes, locks, execution receipts e verificação independente. O CI de aplicação foi confirmado verde em commits anteriores; alterações posteriores devem sempre aguardar e verificar a execução correspondente antes de declarar verde.

## Decisão operacional atual

- **Não tocar em `main` nem fazer merge para mascarar pendências.**
- CI obrigatório: backend lint + typecheck (incluindo specs) + Jest + Prisma; frontend lint/typecheck/build; Prisma drift; Security Audit.
- O MCP moderno é `2026-07-28`, stateless. Compatibilidade legada `2025-11-25`/`2025-06-18` permanece explicitamente separada.
- Tasks são cooperativas/eventualmente consistentes: `cancel` não mata fisicamente uma operação já em execução. Uma operação assíncrona deve consultar o estado antes de publicar o resultado; resultado tardio nunca pode sobrescrever `cancelled`.
- Tasks persistem antes do handle ser devolvido. Em restart, tarefas `working`/`input_required` são marcadas `failed` para não fabricar progresso.
- Não gerar embeddings indiscriminadamente nem gastar quota paga para validação.

## Pendências MCP vivas

1. Confirmar o CI do commit `f17e1885389d1a804d2edca7231088ff72bae941` e, se verde, manter o teste de corrida `cancel -> complete` como regressão permanente.
2. Validar o smoke HTTP/E2E no ambiente de staging quando a infraestrutura externa permitir; separar falhas de aplicação de rate limits/limites de build da Vercel e falhas de deployment Cloudflare.
3. Fazer revisão final de concorrência em `tasks/get`, `tasks/update`, `tasks/cancel` e persistência para múltiplas instâncias.
4. Somente depois disso considerar o caminho MCP/EvidencePack/RAG pronto para teste de produção controlado.

## Evidência recente

- Commit `caa3aefc9c6aed609680458f062d018791129a0a`: endureceu `complete()` contra sobrescrever estado terminal de Task.
- Commit `f17e1885389d1a804d2edca7231088ff72bae941`: adicionou regressão para a corrida cooperativa `cancel -> complete`.
- O último CI previamente confirmado para a base anterior tinha backend/frontend/Prisma/Security verdes. Não extrapolar esse resultado para commits posteriores.
