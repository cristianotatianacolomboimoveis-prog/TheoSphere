# Relatório Diário TheoSphere — 2026-07-15

## Status Geral: 🟢

Todas as verificações de código passaram. As únicas falhas foram limitações do ambiente sandbox (memória, rede e permissões de FUSE), contornadas sem alterar nenhum arquivo do repositório.

## Resumo das Verificações

| Componente | Comando       | Status          | Corrigido? |
| ---------- | ------------- | --------------- | ---------- |
| Backend    | npm run lint  | ✅              | N/A¹       |
| Backend    | npm run test  | ✅ (19/19)      | N/A        |
| Backend    | npm run build | ✅²             | N/A        |
| Frontend   | npm run lint  | ✅ (1 warning³) | N/A        |
| Frontend   | npm run test  | ✅ (12/12)      | N/A        |
| Frontend   | npm run build | ✅⁴             | N/A        |

¹ Primeira execução falhou com OOM (heap 2 GB do sandbox). Re-executado com `NODE_OPTIONS=--max-old-space-size=6144` → passou limpo. Não é problema de código.

² `prisma generate` falhou: download de engines em binaries.prisma.sh bloqueado pela rede do sandbox (403). O Prisma Client já estava gerado em `node_modules/.prisma`, então `nest build` foi executado direto → compilou sem erros.

³ Warning conhecido do React Compiler em `BibleReader.tsx:276` — `useVirtualizer()` (TanStack Virtual) não é memoizável (`react-hooks/incompatible-library`). Informativo; sem ação necessária.

⁴ O build não pôde rodar dentro do mount (o sandbox não tem permissão de deleção de arquivos, e o `next build` precisa limpar `.next/`). Workaround: cópia dos fontes para diretório local com symlink de `node_modules`, build via `next build --webpack`. Além disso, `fonts.googleapis.com` está bloqueado no sandbox, então `next/font/google` foi stubado **apenas na cópia de verificação** (nenhum arquivo do repositório foi alterado). Resultado: `✓ Compiled successfully in 15.8s`, type-check incluído, EXIT 0. Na Vercel o fetch de fontes funciona normalmente.

## Correções Aplicadas

Nenhuma correção de código foi necessária — não havia erros no código do projeto.

## Erros Não Resolvidos

Nenhum erro de código pendente. Limitações do ambiente de verificação (para registro):

- Rede do sandbox bloqueia binaries.prisma.sh e fonts.googleapis.com — afeta apenas a verificação local, não os deploys (Render/Vercel).
- O mount do workspace não permite deleção de arquivos, impedindo `next build` in-place; há arquivos `.fuse_hidden*` órfãos em `frontend-v2/.next/` que podem ser removidos manualmente se desejado.

## Saúde do Deploy

GET https://theosphere.onrender.com/api/v1/health → **200 OK**

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": {
      "status": "up",
      "degraded": true,
      "reason": "redis pub/sub not ready"
    }
  }
}
```

🟡 Observação: Redis reporta `degraded: true` ("redis pub/sub not ready") — mesmo estado dos dias anteriores; banco e API respondendo normalmente.
