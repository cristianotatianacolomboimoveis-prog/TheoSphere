# AGENTS.md — TheoSphere

Instruções para agentes de IA que trabalham neste repositório. Arquivo cross-tool: lido por Antigravity, Cursor, Claude Code e afins.

> **Estado MCP/autonomia — 2026-09-18:** a branch `feat/theosearch-evidence-linguistics` mantém o control-plane MCP, Theo Engine, EvidencePack, RAG evidence-aware, ProjectMemory, tarefas governadas, agentes, locks, execution receipts e verificação independente. O CI de aplicação foi confirmado verde no commit `a54a523331bb7806d2496ef2eb88a0c18c113d89`; alterações posteriores devem sempre aguardar e verificar a execução correspondente antes de declarar verde.

## Decisão operacional atual

- **Não tocar em `main` nem fazer merge para mascarar pendências.**
- CI obrigatório: backend lint + typecheck (incluindo specs) + Jest + Prisma + MCP HTTP E2E smoke; frontend lint/typecheck/build; Prisma drift; Security Audit.
- O MCP moderno é `2026-07-28`, stateless. Compatibilidade legada `2025-11-25`/`2025-06-18` permanece explicitamente separada.
- Tasks são cooperativas/eventualmente consistentes: `cancel` não mata fisicamente uma operação já em execução. Uma operação assíncrona deve consultar o estado antes de publicar o resultado; resultado tardio nunca pode sobrescrever `cancelled`.
- Tasks persistem antes do handle ser devolvido. Em restart, tarefas `working`/`input_required` são marcadas `failed` para não fabricar progresso.
- Não gerar embeddings indiscriminadamente nem gastar quota paga para validação.

## Pendências MCP vivas

1. Fazer revisão final de concorrência em `tasks/get`, `tasks/update`, `tasks/cancel` e persistência para múltiplas instâncias.
2. Validar o caminho MCP/EvidencePack/RAG no ambiente de staging quando a infraestrutura externa permitir; separar falhas de aplicação de rate limits/limites de build da Vercel e falhas de deployment Cloudflare.
3. Somente depois disso considerar o caminho MCP/EvidencePack/RAG pronto para teste de produção controlado.

## Evidência recente

- Commit `caa3aefc9c6aed609680458f062d018791129a0a`: endureceu `complete()` contra sobrescrever estado terminal de Task.
- Commit `f17e1885389d1a804d2edca7231088ff72bae941`: adicionou regressão para a corrida cooperativa `cancel -> complete`.
- Commit `a54a523331bb7806d2496ef2eb88a0c18c113d89`: documentação operacional e estado de validação; o CI associado confirmou backend, frontend, Prisma drift, Security Audit e MCP HTTP E2E smoke verdes.
- O smoke HTTP/E2E atual cobre criação de Task, cancelamento cooperativo, `tasks/get` posterior e `-32602` para Task inexistente.
- Não extrapolar resultados de CI para commits posteriores sem consultar a execução correspondente.

## Produção observada — 2026-09-20
Validação end-to-end em produção (`https://theosphere.onrender.com`), após merge do PR #8 (`chore/backend-lint-gate`) em `main`.

### Infraestrutura

| Item | Estado | Evidência |
|------|--------|-----------|
| Render deploy | ✅ Live | Commit `859253f` no Render, status Live |
| `MCP_API_KEY` em Render | ✅ Configurada | Env var presente no dashboard (valor não exposto) |
| `render.yaml` inclui `MCP_API_KEY` | ✅ Corrigido no PR #8 | Commit `cb51d047` |
| Redis interno | ✅ Ativo | `red-d9ckjpe7r5hc738odcb0` |

### Health checks

| Endpoint | Status | Body |
|----------|--------|------|
| `GET /` | 200 | `{"service":"TheoSphere API","version":"1.0.0","status":"operational"}` |
| `GET /api/v1/health/live` | 200 | `{"status":"ok"}` |
| `GET /api/v1/health/ready` | 200 | `{"status":"ok","info":{"database":{"status":"up"}}}` |

### MCP smoke test (`scripts/mcp-smoke.mjs`)

Executado uma única vez em 2026-09-20. Nenhuma tool de IA invocada (sem gasto de quota Gemini).

```json
{
  "ok": true,
  "steps": [
    { "name": "server/discover", "resultType": "complete", "supportedVersions": ["2026-07-28","2025-11-25","2025-06-18"], "tasks": true },
    { "name": "tools/list", "resultType": "complete", "toolCount": 15, "hasTheoAnswer": true }
  ]
}
```

### Observações

- A URL de serviço é `https://theosphere.onrender.com` (não `theosphere-backend`).
- Free tier do Render: spin-down após 15 min de inatividade; cold start leva 50+ segundos.
- Credenciais expostas no histórico público do repositório devem ser rotacionadas conforme `CREDENTIAL_ROTATION_GUIDE.md` entregue nesta sessão.
