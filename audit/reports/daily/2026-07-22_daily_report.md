# Relatório Diário TheoSphere — 2026-07-22

## Status Geral: 🟡

Tudo passou; apenas warnings menores pré-existentes (não são regressões).

## Resumo das Verificações

| Componente | Comando               | Status                     | Corrigido? |
| ---------- | --------------------- | -------------------------- | ---------- |
| Backend    | npm run lint          | ✅                         | N/A        |
| Backend    | npm run test          | ✅ (10 suítes, 94 testes)  | N/A        |
| Backend    | npm run build (tsc)   | ✅                         | N/A        |
| Frontend   | npm run lint          | ✅ (0 erros, 1 warning)    | N/A        |
| Frontend   | npm run test (vitest) | ✅ (4 arquivos, 40 testes) | N/A        |
| Frontend   | next build --webpack  | ✅ (com warnings)          | N/A        |

## Correções Aplicadas

Nenhuma correção necessária — não houve falhas.

## Alertas Menores (🟡)

1. **Frontend lint** — `src/components/BibleReader.tsx:276` — warning `react-hooks/incompatible-library`: React Compiler pula memoização do `useVirtualizer()` (TanStack Virtual retorna funções não-memoizáveis). Comportamento conhecido da biblioteca, sem correção possível sem desabilitar a rule. Sem impacto funcional.
2. **Frontend build** — warning "Critical dependency: the request of a dependency is an expression" em `@duckdb/duckdb-wasm/dist/duckdb-node.cjs` (trace: geoWorker.ts → useTheoWorker.ts → BibleReader.tsx → exegesis/page.tsx). Warning conhecido do bundle Node do duckdb-wasm sob webpack; não afeta o bundle do browser.

## Erros Não Resolvidos

Nenhum.

## Saúde do Deploy

GET https://theosphere.onrender.com/api/v1/health → **200 OK**

```json
{
  "status": "ok",
  "info": { "database": { "status": "up" }, "redis": { "status": "up" } }
}
```

Backend em produção 🟢 (database up, redis up).

## Notas de Execução (sandbox)

- Workarounds aplicados conforme playbook: heap 6144 MB no lint do backend; build do backend via cópia em `/tmp/be0722` + `npx tsc -p tsconfig.build.json` (prisma generate bloqueado no sandbox); build do frontend via cópia em `/tmp/fe0722` com stub de `next/font/google` e `ignoreBuildErrors` na cópia + `tsc --noEmit` à parte (0 erros). Nenhum arquivo do repositório foi alterado.
- Sandbox instável hoje: várias chamadas bash travaram além do `timeout` interno ("process already running"); resolvido com re-execuções. `next build --webpack` completou na 3ª chamada aproveitando o cache webpack em `.next/cache`.
- Bindings Linux do node_modules intactos hoje (nenhum `npm install` necessário).
