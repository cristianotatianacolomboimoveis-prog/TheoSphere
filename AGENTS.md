# AGENTS.md — TheoSphere

Instruções para agentes de IA que trabalham neste repositório. Arquivo cross-tool: lido por Antigravity, Cursor, Claude Code e afins.

> **Estado MCP/autonomia — 2026-09-18:** a branch `feat/theosearch-evidence-linguistics` mantém o control-plane MCP, Theo Engine, EvidencePack, RAG evidence-aware, ProjectMemory, tarefas governadas, agentes, locks, execution receipts e verificação independente. O HEAD atual é `ff1fe578de083838a409a4f7435a1edefabca4a5`.

## Decisão operacional atual

- **Não tocar em `main` nem fazer merge para mascarar pendências.**
- CI obrigatório: backend lint + typecheck (incluindo specs) + Jest + Prisma + MCP HTTP E2E smoke; frontend lint/typecheck/build; Prisma drift; Security Audit.
- O MCP moderno é `2026-07-28`, stateless. Compatibilidade legada `2025-11-25`/`2025-06-18` permanece explicitamente separada.
- Tasks são cooperativas/eventualmente consistentes: `cancel` não mata fisicamente uma operação já em execução. Uma operação assíncrona deve consultar o estado antes de publicar o resultado; resultado tardio nunca pode sobrescrever `cancelled`.
- Tasks persistem antes do handle ser devolvido. Em restart, tarefas `working`/`input_required` são marcadas `failed` para não fabricar progresso.
- A memória durável é a fonte de verdade entre instâncias: antes de `update`, `complete`, `fail` ou `cancel`, o serviço atualiza seu snapshot local a partir do último estado persistido. O mapa em memória é somente cache e não pode ser tratado como autoridade multi-instância.
- Não gerar embeddings indiscriminadamente nem gastar quota paga para validação.

## Estado de validação observado

- O CI do commit `5b7c668f6ffff4b892887ab6eb8c12a44989caaa` foi confirmado **success** no GitHub Actions: frontend lint/typecheck/build, Prisma drift e backend lint/typecheck/Jest/MCP HTTP E2E smoke passaram.
- Os commits posteriores `c8d1c2ed` e `ff1fe578` adicionam a atualização do cache de Tasks a partir da memória durável e o teste de regressão multi-instância; seus resultados de Actions ainda precisam ser consultados antes de declarar o novo HEAD verde.
- O deployment Vercel previamente observado como concluído não substitui a validação do novo HEAD.

## Pendências MCP vivas

1. Confirmar no GitHub Actions a execução completa correspondente ao HEAD `ff1fe578`, incluindo backend, frontend, Prisma drift, Security Audit e MCP HTTP E2E smoke.
2. Se o CI estiver verde, revisar se a transição concorrente ainda precisa de lock/controle otimista no banco; o refresh antes de cada mutação resolve estado stale entre instâncias, mas não constitui lock transacional contra duas mutações simultâneas.
3. Validar o caminho MCP/EvidencePack/RAG no ambiente de staging quando a infraestrutura externa permitir; separar falhas de aplicação de limites/rate limits de provedores de deploy.
4. Somente depois disso considerar o caminho MCP/EvidencePack/RAG pronto para teste de produção controlado.

## Evidência recente

- `caa3aefc9c6aed609680458f062d018791129a0a`: endureceu `complete()` contra sobrescrever estado terminal de Task.
- `f17e1885389d1a804d2edca7231088ff72bae941`: adicionou regressão para a corrida cooperativa `cancel -> complete`.
- `cc0929f333ed0bfe613a9c1f778c09f2d42b5a5f`: isolou execução assíncrona de research tasks nos testes.
- `10996a2f5324af2d7c17ffa9c7b2a2cd21a74239`: tornou testes assíncronos de protocolo determinísticos.
- `0ce00586c6df53c9fe45a965df24f754f3598dac`: removeu o health probe Cloudflare obsoleto; deployment Vercel reportado como concluído.
- `c8d1c2edbc2421c1ac0e644ca722f6f3019e465a`: antes de transições de Task, atualiza o snapshot a partir da memória durável para reduzir stale state entre instâncias.
- `ff1fe578de083838a409a4f7435a1edefabca4a5`: adicionou regressão explícita para transição cross-instance após cancelamento persistido.
- O smoke HTTP/E2E cobre criação de Task, cancelamento cooperativo, `tasks/get` posterior e `-32602` para Task inexistente.
- Não extrapolar resultados de CI para commits posteriores sem consultar a execução correspondente.
