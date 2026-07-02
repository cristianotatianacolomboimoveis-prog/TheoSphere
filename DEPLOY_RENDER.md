# Deploy TheoSphere Backend no Render — Guia Rápido

## Passo 1: Criar Web Service

1. Acesse [dashboard.render.com](https://dashboard.render.com)
2. Vá em **Theosphere** → **Create new service** → **New Web Service**
3. Selecione o repositório **TheoSphere**
4. Configure:

| Campo              | Valor                |
| ------------------ | -------------------- |
| **Name**           | `theosphere-backend` |
| **Region**         | `Ohio (US East)`     |
| **Branch**         | `main`               |
| **Root Directory** | `backend`            |
| **Runtime**        | `Docker`             |
| **Instance Type**  | `Free`               |

> ⚠️ **CRÍTICO**: O Root Directory DEVE ser `backend`. Sem isso, o build falha.

## Passo 2: Variáveis de Ambiente

Na seção **Environment Variables**, adicione TODAS as variáveis abaixo:

```
NODE_ENV=production
DATABASE_URL=postgresql://postgres.chjywahtwktqqxqlthvc:TheoSphere2026Prod%20@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.chjywahtwktqqxqlthvc:TheoSphere2026Prod%20@aws-1-sa-east-1.pooler.supabase.com:5432/postgres
GEMINI_API_KEY=<sua_chave_gemini>
JWT_SECRET=<copie_do_railway>
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=https://frontend-v2-omega-seven.vercel.app,http://localhost:3000
GOOGLE_CLIENT_EMAIL=<copie_do_railway>
GOOGLE_DRIVE_FOLDER_ID=<copie_do_railway>
GOOGLE_PRIVATE_KEY=<copie_do_railway>
```

> **DICA**: Copie os valores sensíveis (JWT*SECRET, GEMINI_API_KEY, GOOGLE*\*) diretamente do Railway > Variables > Raw Editor.

## Passo 3: Health Check

Em **Advanced** → **Health Check Path**, defina:

```
/api/v1/health/live
```

## Passo 4: Deploy

Clique **Create Web Service**. O build leva ~5 minutos.

Após o deploy, sua URL será algo como:

```
https://theosphere-backend.onrender.com
```

## Passo 5: Atualizar Frontend na Vercel

1. Acesse [vercel.com/dashboard](https://vercel.com/dashboard)
2. Vá em **frontend-v2** → **Settings** → **Environment Variables**
3. Atualize `NEXT_PUBLIC_BACKEND_URL` para a URL do Render:
   ```
   https://theosphere-backend.onrender.com
   ```
4. **Redeploy** o frontend (Deployments → último deploy → Redeploy)

## Passo 6: Atualizar CORS no Render

Volte ao Render → **theosphere-backend** → **Environment** e confirme que `ALLOWED_ORIGINS` inclui a URL do frontend Vercel.

---

## Notas Importantes

- **Sleep Mode**: O free tier do Render dorme após 15 min de inatividade. O primeiro request após sleep demora ~60s para acordar.
- **O backend NestJS já tem auto-detect de URLs Vercel** (`frontend-v2*.vercel.app`) no CORS, então preview deploys também funcionam.
- **Sem Redis**: O throttler usa memória local no free tier — funciona bem para testes.

---

_TheoSphere OS — Nexus Dev Team_
