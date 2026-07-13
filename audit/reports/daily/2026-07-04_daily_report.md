# Relatório Diário TheoSphere — 2026-07-04

## Status Geral: 🟡

🟡 = Alertas menores — 2 correções aplicadas com sucesso; backend test e frontend build não puderam ser validados por limitações do ambiente sandbox (incompatibilidade ts-jest/Jest 30 e Google Fonts inacessível).

## Resumo das Verificações

| Componente | Comando       | Status                                                                        | Corrigido?                              |
| ---------- | ------------- | ----------------------------------------------------------------------------- | --------------------------------------- |
| Backend    | npm run lint  | ✅ (requer `--max-old-space-size=4096`)                                       | N/A                                     |
| Backend    | npm run test  | ❌ ts-jest 29 incompatível com Jest 30                                        | ⚠️ Problema de dependência              |
| Backend    | npm run build | ✅ (`nest build` OK, `prisma generate` falha no sandbox por 403 nos binários) | N/A                                     |
| Frontend   | npm run lint  | ✅ (0 errors, 1 warning)                                                      | ✅ Corrigido (era 1 error + 2 warnings) |
| Frontend   | npm run test  | ✅ 12/12 passed                                                               | ✅ Corrigido (1 teste falhava)          |
| Frontend   | npm run build | ❌ Google Fonts inacessível no sandbox                                        | ⚠️ Limitação do ambiente                |

## Correções Aplicadas

### 1. Frontend — edge-ai.test.ts (teste falhando)

- **Arquivo:** `frontend-v2/src/lib/edge-ai.test.ts` linha 145
- **Problema:** Teste esperava model ID antigo `gemma-2b-it-q4f16_1-MLC`, mas o código foi atualizado para `gemma-2-2b-it-q4f16_1-MLC`
- **Correção:** Atualizado o model ID no teste para `gemma-2-2b-it-q4f16_1-MLC`
- **Re-teste:** ✅ 12/12 testes passando

### 2. Frontend — Workspace.tsx (lint error)

- **Arquivo:** `frontend-v2/src/components/layout/Workspace.tsx` linhas 20-31
- **Problema:** `setIsMobile(mq.matches)` chamado diretamente dentro de `useEffect`, violando regra `react-hooks/set-state-in-effect` do React Compiler
- **Correção:** Refatorado `useIsMobile()` para usar `useSyncExternalStore` — padrão idiomático do React 18+ que elimina o setState no efeito e é SSR-safe
- **Re-teste:** ✅ Lint passou (0 errors)

### 3. Frontend — TheoSphere3D.tsx (lint warning)

- **Arquivo:** `frontend-v2/src/components/visualizer/TheoSphere3D.tsx` linha 486
- **Problema:** `getRouteInfo` listado como dependência desnecessária no `useMemo` (escopo externo, não causa re-render)
- **Correção:** Removido `getRouteInfo` do array de dependências
- **Re-teste:** ✅ Warning eliminado

## Erros Não Resolvidos

### Backend: ts-jest 29 incompatível com Jest 30

- **Erro:** `Module ts-jest in the transform option was not found` — Jest 30 resolve transforms relativo ao `rootDir` (src/), não à raiz do projeto
- **Causa raiz:** ts-jest só existe até v29.x; não há versão para Jest 30
- **Opções de correção (requer decisão humana):**
  1. Downgrade jest para `^29.7.0` (mais conservador)
  2. Migrar para `@swc/jest` (mais rápido, suporta Jest 30)
  3. Usar `jest.config.ts` com transform path absoluto (workaround)
- **Recomendação:** Opção 2 (`@swc/jest`) — mais performático e compatível

### Frontend build: Google Fonts

- **Não é bug** — `next/font/google` tenta baixar fontes em build time. Falha apenas no sandbox (sem acesso a fonts.googleapis.com). Build funciona normalmente em Vercel.

### Backend: heap OOM no lint e build

- Lint e build do NestJS exigem `NODE_OPTIONS="--max-old-space-size=4096"`. Considerar adicionar ao `package.json` scripts para evitar falhas em CI com memória limitada.

## Saúde do Deploy

- **Status:** ⚠️ Não verificável — o sandbox bloqueia requisições externas para `theosphere.onrender.com`
- **Nota:** Health check precisa ser verificado manualmente ou via ambiente com acesso à rede
