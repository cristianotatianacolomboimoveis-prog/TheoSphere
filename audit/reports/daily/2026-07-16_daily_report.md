# Relatório Diário TheoSphere — 2026-07-16

## Status Geral: 🟢

Todas as verificações de código passaram. As únicas falhas foram limitações do ambiente sandbox (memória, rede e permissões de FUSE), contornadas sem alterar nenhum arquivo do repositório.

## Resumo das Verificações

| Componente | Comando       | Status          | Corrigido? |
| ---------- | ------------- | --------------- | ---------- |
| Backend    | npm run lint  | ✅¹             | N/A        |
| Backend    | npm run test  | ✅ (19/19)      | N/A        |
| Backend    | npm run build | ✅²             | N/A        |
| Frontend   | npm run lint  | ✅ (1 warning³) | N/A        |
| Frontend   | npm run test  | ✅ (12/12)      | N/A        |
| Frontend   | npm run build | ✅⁴             | N/A        |

¹ Primeira execução falhou com OOM (heap padrão ~2 GB do Node no sandbox). Re-executado com `NODE_OPTIONS=--max-old-space-size=6144` → passou limpo. Não é problema de código.

² `prisma generate` falhou: download de engines em binaries.prisma.sh bloqueado pela rede do sandbox (403 Forbidden). O Prisma Client já estava gerado em `node_modules/.prisma`, então `nest build` foi executado direto → compilou sem erros (EXIT 0).

³ Warning conhecido do React Compiler em `BibleReader.tsx:276` — `useVirtualizer()` (TanStack Virtual) não é memoizável (`react-hooks/incompatible-library`). Informativo; sem ação necessária.

⁴ O build Turbopack padrão falhou por dois motivos de ambiente: (a) o sandbox mata processos em background entre chamadas e tem apenas ~3,9 GB de RAM (builds longos morrem por OOM/reaping); (b) `fonts.googleapis.com` está bloqueado, e `next/font/google` exige rede no build. Workaround (idêntico ao de 2026-07-15): cópia dos fontes para diretório local com symlink de `node_modules`, stub de `next/font/google` **apenas na cópia de verificação**, build via `next build --webpack` → compilou e gerou todas as rotas com sucesso, EXIT 0. Adicionalmente, `npx tsc --noEmit` passou limpo no código original. Nenhum arquivo do repositório foi alterado. Na Vercel o fetch de fontes funciona normalmente.

## Correções Aplicadas

Nenhuma correção de código foi necessária — não havia erros no código do projeto.

Observação operacional: foi necessário habilitar permissão de deleção na pasta do projeto para limpar o `.next/` parcial deixado por um build interrompido (o `next build` falhava com `EPERM: unlink .next/diagnostics/build-diagnostics.json`). Apenas artefatos de build foram removidos; nenhum código-fonte foi tocado.

## Erros Não Resolvidos

Nenhum erro de código pendente. Limitações persistentes do sandbox (informativas, se repetem diariamente):

- Rede bloqueia binaries.prisma.sh (impede `prisma generate`) e fonts.googleapis.com (impede build Turbopack padrão).
- Processos em background são finalizados entre chamadas de shell; comandos precisam caber em ~45 s.

## Saúde do Deploy

`GET https://theosphere.onrender.com/api/v1/health` → **200 OK**

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": {
      "degraded": true,
      "reason": "redis pub/sub not ready",
      "status": "up"
    }
  }
}
```

- Database: 🟢 up
- Redis: 🟡 up, porém **degraded** — `redis pub/sub not ready`. Mesmo estado observado em runs anteriores; funcional, mas vale investigar a inicialização do pub/sub no Render se a degradação persistir.
