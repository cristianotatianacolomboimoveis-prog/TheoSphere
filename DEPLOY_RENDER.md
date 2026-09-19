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
DATABASE_URL=postgresql://<usuario>:<senha>@<host-do-pooler>:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://<usuario>:<senha>@<host-direto>:5432/postgres
GEMINI_API_KEY=<sua_chave_gemini>
JWT_SECRET=<segredo_com_32+_caracteres>
JWT_EXPIRES_IN=7d
MCP_API_KEY=<segredo_com_32+_caracteres>   # openssl rand -hex 32
REDIS_URL=<connection string do theosphere-redis (Render Key Value)>
ALLOWED_ORIGINS=https://frontend-v2-omega-seven.vercel.app,http://localhost:3000
GOOGLE_CLIENT_EMAIL=<email_da_service_account>
GOOGLE_DRIVE_FOLDER_ID=<id_da_pasta>
GOOGLE_PRIVATE_KEY=<chave_privada_da_service_account>
```

> **NUNCA** cole valores reais neste arquivo: o repositório é público e o histórico do Git é permanente. Segredos ficam só no painel do Render.
>
> **Obrigatórias em produção** (o boot é recusado sem elas, ver `backend/src/app.module.ts`): `MCP_API_KEY` (mín. 32 caracteres), `REDIS_URL` e uma de `GEMINI_API_KEY`/`OPENAI_API_KEY`. Sem `MCP_API_KEY` um deploy novo falha ao subir e o Render mantém a versão anterior no ar.
>
> Este serviço foi criado manualmente (Root Directory `backend`); o `backend/render.yaml` só vale se o serviço for criado/sincronizado por Blueprint. Adicionar uma variável ao `render.yaml` **não** altera um serviço existente: crie-a também em **Environment** no painel.

> **Rotação:** credenciais que já apareceram em arquivos do repositório (senha do banco, chave Gemini, `JWT_SECRET`, chave da service account do Google, tokens da Vercel/Railway) devem ser tratadas como vazadas e **trocadas**, não copiadas de ambientes antigos.

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
- **Redis**: em produção `REDIS_URL` é obrigatória (throttler distribuído, EventBus, locks do MCP).

---

_TheoSphere OS — Nexus Dev Team_
