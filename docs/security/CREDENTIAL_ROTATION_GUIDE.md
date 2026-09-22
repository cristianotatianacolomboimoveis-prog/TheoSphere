# TheoSphere — Guia de Rotação de Credenciais

**Contexto:** O repositório `TheoSphere` é público. O histórico do git contém commits antigos (ex: `DEPLOY_RENDER.md`) que expõem credenciais reais. Reescrever o histórico (`git filter-branch` / `BFG`) em repo público já compartilhado é arriscado e não apaga caches do GitHub. A ação correta é **rotacionar todas as credenciais expostas**.

---

## Credenciais a Rotacionar (ação do dono)

### 1. DATABASE_URL / DIRECT_URL (Supabase PostgreSQL)

- **Onde rotacionar:** Supabase Dashboard → Project Settings → Database → Connection string → Reset database password
- **Depois:** copiar a nova connection string e atualizar nos dashboards:
  - Render: Environment → `DATABASE_URL` e `DIRECT_URL`
  - `.env` local do backend
- **Impacto:** zero downtime — Supabase gera nova senha instantaneamente; o serviço reconecta no próximo deploy/restart

### 2. JWT_SECRET / JWT_REFRESH_SECRET

- **Onde rotacionar:** gerar novo valor aleatório (mínimo 64 caracteres):
  ```bash
  openssl rand -base64 64
  ```
- **Depois:** atualizar no Render (env var `JWT_SECRET`) e no `.env` local
- **Impacto:** todos os tokens JWT existentes serão invalidados — usuários precisarão fazer login novamente

### 3. GEMINI_API_KEY (Google AI Studio)

- **Onde rotacionar:** [Google AI Studio](https://aistudio.google.com/apikey) → revogar a chave atual → criar nova
- **Depois:** atualizar no Render (`GEMINI_API_KEY`) e no `.env` local
- **Impacto:** a chave antiga para de funcionar imediatamente

### 4. REDIS_URL (Render Internal Key Value)

- **Risco:** baixo — o Redis é interno ao Render (acesso apenas via rede privada)
- **Ação:** se o URL estava no `DEPLOY_RENDER.md`, verificar; URLs internas do Render (`red-*:6379`) não são acessíveis externamente, mas por precaução pode recriar o Key Value store no dashboard do Render

### 5. VERCEL_TOKEN (se exposto)

- **Onde rotacionar:** [Vercel Dashboard](https://vercel.com/account/tokens) → revogar token antigo → criar novo
- **Depois:** atualizar em `~/.vercel/auth.json` na máquina local
- **Impacto:** CLI do Vercel precisa do novo token para deploys

### 6. NEXT_PUBLIC_ABIBLIADIGITAL_TOKEN

- **Onde rotacionar:** painel da API A Bíblia Digital — gerar novo JWT
- **Depois:** atualizar no `.env.local` do frontend
- **Impacto:** baixo — é um token de leitura pública

---

## MCP_API_KEY (nova — ainda não existe)

Esta credencial **não foi vazada** porque não existia antes. Precisa ser **criada** agora:

```bash
openssl rand -base64 48
```

- Adicionar no Render: Environment → `MCP_API_KEY` (mínimo 32 caracteres)
- Adicionar no `.env` local do backend
- O PR #8 já inclui a declaração no `render.yaml`

---

## Checklist de Execução

1. [ ] Rotacionar senha do database no Supabase
2. [ ] Atualizar `DATABASE_URL` e `DIRECT_URL` no Render e `.env` local
3. [ ] Gerar novo `JWT_SECRET` e atualizar no Render e `.env` local
4. [ ] Revogar e recriar `GEMINI_API_KEY` no Google AI Studio, atualizar no Render
5. [ ] Criar `MCP_API_KEY` (nova) e adicionar no Render
6. [ ] Verificar se `VERCEL_TOKEN` foi exposto; se sim, revogar e recriar
7. [ ] Verificar `NEXT_PUBLIC_ABIBLIADIGITAL_TOKEN`; rotacionar se exposto
8. [ ] Após todas as atualizações: fazer redeploy manual no Render
9. [ ] Validar: `/api/v1/health/live` → 200, `/api/v1/health/ready` → 200 (db up), `/mcp` → responde

---

## O que NÃO fazer

- **Não reescrever histórico do git** (`force push`, `BFG`, `filter-branch`) — o repo é público e compartilhado
- **Não deletar o arquivo** `DEPLOY_RENDER.md` achando que resolve — o conteúdo persiste nos commits antigos
- **Não confiar em "secret scanning alerts"** como única proteção — rotacionar é a única garantia

---

*Gerado em 2026-09-19. Após rotacionar, este guia pode ser descartado.*
