# AGENTS.md — TheoSphere

Instruções para agentes de IA que trabalham neste repositório. Arquivo cross-tool: lido por Antigravity, Cursor, Claude Code e afins.

> **Estado MCP/autonomia — 2026-09-18:** a branch `feat/theosearch-evidence-linguistics` mantém o control-plane MCP, Theo Engine, EvidencePack, RAG evidence-aware, ProjectMemory, tarefas governadas, agentes, locks, execution receipts e verificação independente. O HEAD atual é `0ce00586c6df53c9fe45a965df24f754f3598dac`.

## Decisão operacional atual

- **Não tocar em `main` nem fazer merge para mascarar pendências.**
- CI obrigatório: backend lint + typecheck (incluindo specs) + Jest + Prisma + MCP HTTP E2E smoke; frontend lint/typecheck/build; Prisma drift; Security Audit.
- O MCP moderno é `2026-07-28`, stateless. Compatibilidade legada `2025-11-25`/`2025-06-18` permanece explicitamente separada.
- Tasks são cooperativas/eventualmente consistentes: `cancel` não mata fisicamente uma operação já em execução. Uma operação assíncrona deve consultar o estado antes de publicar o resultado; resultado tardio nunca pode sobrescrever `cancelled`.
- Tasks persistem antes do handle ser devolvido. Em restart, tarefas `working`/`input_required` são marcadas `failed` para não fabricar progresso.
- Não gerar embeddings indiscriminadamente nem gastar quota paga para validação.

## Estado de validação observado

- O commit `0ce00586c6df53c9fe45a965df24f754f3598dac` removeu o probe obsoleto de Cloudflare do script de health-check, reduzindo o caminho de monitoramento aos endpoints de backend realmente utilizados.
- O status do commit `0ce00586c6df53c9fe45a965df24f754f3598dac` mostra o deployment Vercel como **success / Deployment has completed**.
- O último conjunto de CI de aplicação previamente confirmado como verde continua sendo a referência até que a execução correspondente ao HEAD atual seja consultada; não extrapolar resultados de commits anteriores.

## Pendências MCP vivas

1. Fazer revisão final de concorrência em `tasks/get`, `tasks/update`, `tasks/cancel` e persistência para múltiplas instâncias.
2. Confirmar, no GitHub Actions, a execução completa correspondente ao HEAD atual, incluindo backend, frontend, Prisma drift, Security Audit e MCP HTTP E2E smoke.
3. Validar o caminho MCP/EvidencePack/RAG no ambiente de staging quando a infraestrutura externa permitir; separar falhas de aplicação de limites/rate limits de provedores de deploy.
4. Somente depois disso considerar o caminho MCP/EvidencePack/RAG pronto para teste de produção controlado.

## Evidência recente

- `caa3aefc9c6aed609680458f062d018791129a0a`: endureceu `complete()` contra sobrescrever estado terminal de Task.
- `f17e1885389d1a804d2edca7231088ff72bae941`: adicionou regressão para a corrida cooperativa `cancel -> complete`.
- `a54a523331bb7806d2496ef2eb88a0c18c113d89`: documentação operacional e estado de validação; o CI associado confirmou backend, frontend, Prisma drift, Security Audit e MCP HTTP E2E smoke verdes.
- `cc0929f333ed0bfe613a9c1f778c09f2d42b5a5f`: isolou execução assíncrona de research tasks nos testes.
- `10996a2f5324af2d7c17ffa9c7b2a2cd21a74239`: tornou testes assíncronos de protocolo determinísticos.
- `0ce00586c6df53c9fe45a965df24f754f3598dac`: removeu o health probe Cloudflare obsoleto; deployment Vercel reportado como concluído.
- O smoke HTTP/E2E atual cobre criação de Task, cancelamento cooperativo, `tasks/get` posterior e `-32602` para Task inexistente.
- Não extrapolar resultados de CI para commits posteriores sem consultar a execução correspondente.
