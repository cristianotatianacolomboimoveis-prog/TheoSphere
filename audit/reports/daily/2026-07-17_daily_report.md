# Relatório Diário TheoSphere — 2026-07-17

## Status Geral: 🟢

## Resumo das Verificações

| Componente | Comando       | Status          | Corrigido? |
| ---------- | ------------- | --------------- | ---------- |
| Backend    | npm run lint  | ✅¹             | N/A        |
| Backend    | npm run test  | ✅ (27/27)      | N/A        |
| Backend    | npm run build | ✅²             | N/A        |
| Frontend   | npm run lint  | ✅ (1 warning³) | N/A        |
| Frontend   | npm run test  | ✅ (12/12)      | N/A        |
| Frontend   | npm run build | ✅⁴             | N/A        |

¹ Primeira execução falhou com OOM (heap padrão ~2 GB do Node no sandbox). Re-executado com `NODE_OPTIONS=--max-old-space-size=6144` → passou limpo. Não é problema de código (mesmo comportamento de 2026-07-16).

² `prisma generate` continua bloqueado pela rede do sandbox (binaries.prisma.sh). Compilação verificada em cópia local (`/tmp`) com node_modules simbolicamente vinculado: `tsc -p tsconfig.build.json` → EXIT 0, `dist/main.js` gerado. Sem erros de compilação.

³ Warning conhecido do React Compiler em `BibleReader.tsx:276` — `useVirtualizer()` (TanStack Virtual) não é memoizável (`react-hooks/incompatible-library`). Informativo; sem ação necessária.

⁴ Build verificado em cópia local com os mesmos workarounds de ambiente de 2026-07-15/16: stub de `next/font/google` (fonts.googleapis.com bloqueado no sandbox) e `next build --webpack`. As primeiras tentativas morreram porque o sandbox ceifa processos a ~180s; com o cache do webpack aquecido entre tentativas, o build completo finalizou com **EXIT 0** e todas as rotas geradas (estáticas + dinâmicas). Typecheck completo confirmado à parte: `npx tsc --noEmit` → EXIT 0. Warning conhecido: "Critical dependency" em `@duckdb/duckdb-wasm` (dinâmico; informativo). Nenhum arquivo do repositório foi alterado.

## Correções Aplicadas

Nenhuma correção de código foi necessária — não havia erros no código do projeto. Todos os ajustes (heap do Node, cópia local, stub de fontes) foram contornos de limitações do ambiente de verificação, aplicados apenas em cópias temporárias fora do repositório.

Testes do backend subiram de 19 para 27 (novos specs de `event-bus.service` e `rag.service` acompanhando o commit `6e5e05a` — redis pub/sub resiliente).

## Erros Não Resolvidos

Nenhum.

## Saúde do Deploy

`GET https://theosphere.onrender.com/api/v1/health` →

```json
{"status":"ok","info":{"database":{"status":"up"},"redis":{"status":"up"}}}
```

🟢 Produção respondendo normalmente. Destaque: **Redis agora reporta "up"** (ontem o EventBus logava "REDIS_URL não configurada" nos testes locais; o commit `6e5e05a` adicionou `REDIS_URL` ao blueprint do Render e o pub/sub resiliente está ativo em produção).

## Observações Operacionais

- Nenhuma mudança de código-fonte desde as 08:00 (verificações da manhã e da tarde cobrem o mesmo estado, commit `6e5e05a`).
- O sandbox ceifa processos que passam de ~180s por chamada; builds longos exigem cache aquecido ou execução em fases. Documentado para os próximos runs.
- Diretórios `/tmp` de runs anteriores ficam com dono `nobody` (remapeamento de UID entre sessões) e não são removíveis; usar diretórios novos por dia (`/tmp/be`, `/tmp/fe2`).
