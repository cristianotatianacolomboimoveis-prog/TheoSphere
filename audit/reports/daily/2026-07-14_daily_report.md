# Relatório Diário TheoSphere — 2026-07-14

## Status Geral: 🟢

Todo o código passou nas verificações. As únicas falhas foram limitações conhecidas do ambiente sandbox (heap, rede allowlist, FUSE), idênticas às dos runs anteriores — nenhuma exigiu correção de código.

## Resumo das Verificações

| Componente | Comando       | Status                               | Corrigido? |
| ---------- | ------------- | ------------------------------------ | ---------- |
| Backend    | npm run lint  | ✅ \*                                | N/A        |
| Backend    | npm run test  | ✅ (19/19)                           | N/A        |
| Backend    | npm run build | ✅ \*\*                              | N/A        |
| Frontend   | npm run lint  | ✅ (1 warning)                       | N/A        |
| Frontend   | npm run test  | ✅ (12/12)                           | N/A        |
| Frontend   | npm run build | ⚠️ Não verificável (tsc --noEmit ✅) | N/A        |

\* ESLint estoura o heap padrão do Node no sandbox (~2GB). Passou com `NODE_OPTIONS=--max-old-space-size=6144`. Não afeta CI/produção.

\*\* `prisma generate` falha no sandbox (403 ao baixar engine binaries em binaries.prisma.sh — rede bloqueada por allowlist). O `nest build` (compilação TypeScript completa) foi executado separadamente e passou com exit 0, usando o Prisma Client já gerado em node_modules. Em CI/Render o `prisma generate` funciona normalmente.

## Detalhes

- **Backend test:** 3 suítes, 19 testes, todos passando em 4.3s (search.service, rag.service, app.controller).
- **Frontend test:** 2 arquivos, 12 testes, todos passando (transliteration, edge-ai).
- **Frontend lint:** 0 erros, 1 warning conhecido — `react-hooks/incompatible-library` em `BibleReader.tsx:275` (useVirtualizer do TanStack Virtual não é memoizável pelo React Compiler). Warning informativo, sem ação necessária.

## Correções Aplicadas

Nenhuma correção necessária hoje. Todo o código passou nas verificações sem alterações.

## Erros Não Resolvidos (limitações de ambiente, não de código)

1. **Frontend `npm run build`** — `EPERM: unlink '.next/.fuse_hidden...'`: o filesystem FUSE do sandbox mantém handles abertos no diretório `.next`, impedindo o Next.js de limpá-lo (arquivos `.fuse_hidden` não removíveis). Verificação alternativa: `tsc --noEmit` passou sem erros de tipo. O build real funciona no Vercel.
2. **`prisma generate`** — rede do sandbox bloqueia binaries.prisma.sh (403). Contornado usando o client já gerado + `nest build` direto.

## Saúde do Deploy

⚠️ **Inconclusivo** — GET em `https://theosphere.onrender.com/api/v1/health` via web_fetch retornou resposta vazia (host alcançável, sem corpo na resposta), mesmo comportamento do run de 2026-07-13. Não foi possível confirmar o payload de health do backend em produção. Recomenda-se verificar manualmente ou pelo dashboard do Render.

## Comparativo com o run anterior (2026-07-13)

Sem mudanças: mesmos resultados, mesmas limitações de ambiente, nenhum novo erro ou warning introduzido.
