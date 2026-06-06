# Deploy TheoSphere 4D OS

Instruções para deploy em produção do ecossistema TheoSphere.

## 1. Banco de Dados (Supabase + pgvector)

A infraestrutura de dados deve ser a primeira a ser validada.

- **PgVector:** Certifique-se de que a extensão `vector` está habilitada no Supabase (`CREATE EXTENSION IF NOT EXISTS vector;`).
- **Whitelisting (IPs do Render):** Para permitir que o Render conecte ao Supabase, adicione os seguintes IPs ao firewall do Supabase:
  - `74.220.48.0/24`
  - `74.220.56.0/24`
- **Migrations:** Execute as migrações para preparar o schema:
  ```bash
  cd backend
  npm run db:migrate
  ```
- **Seed:** (Opcional) Popule o banco com dados iniciais:
  ```bash
  npm run db:seed
  ```

## 2. Backend (Render OU Railway)

> ⚠️ **CRÍTICO — Root Directory.** O monorepo tem um `package.json` na raiz
> que existe **somente** para o tooling de commit (husky/lint-staged). Ele
> **não é um app deployável**. Se o serviço de deploy apontar para a raiz do
> repositório, o builder (Nixpacks) tentará rodar a raiz e o deploy vai
> falhar — foi exatamente o que aconteceu quando o Railway estava deployando
> um `index.ts` de demonstração que já foi removido.
>
> **O serviço do backend DEVE ter `Root Directory = backend`.**

### Render

O backend usa o blueprint `render.yaml`.

- **Blueprint:** O Render detecta `backend/render.yaml`.

### Railway

- **Root Directory:** `backend` (obrigatório — ver aviso acima).
- **Build/Start:** definidos em `backend/railway.json`
  (Dockerfile → `node dist/main`, healthcheck `/api/v1/health/live`).

### Variáveis de Ambiente (ambos)

> [!IMPORTANT]
> Em produção (`NODE_ENV=production`), **pelo menos uma** chave de IA
> (`GEMINI_API_KEY` ou `OPENAI_API_KEY`) é **obrigatória**. Sem ela, o app
> crasha silenciosamente durante a inicialização (validação Joi) — antes
> do health endpoint ficar disponível. A plataforma verá um container que
> nunca fica healthy e reiniciará infinitamente.

- `DATABASE_URL`: URL do Transaction Pooling do Supabase (porta 6543 ou 5432 com `?pgbouncer=true`).
- `DIRECT_URL`: URL de conexão direta do Supabase (porta 5432).
  > [!IMPORTANT]
  > Se a sua hospedagem (Railway, Render, etc.) não possuir IPv6 habilitado por padrão ou se houver bloqueios na porta direta `5432` do Supabase, o deploy falhará com erro de **Healthcheck failure** durante o `prisma migrate deploy`.
  > **Resolução:** Altere a porta da sua `DIRECT_URL` (e `DATABASE_URL`) no painel da Railway de `5432` para `6543`. A porta `6543` é o Connection Pooler da Supabase que suporta conexões IPv4 públicas estáveis.
- `GEMINI_API_KEY`: **Obrigatória em produção.** Chave do Google AI Studio.
- `JWT_SECRET`: Uma string longa e aleatória (≥ 32 chars) para os tokens.
- `ALLOWED_ORIGINS`: URL final do frontend (ex: `https://theosphere.vercel.app`).
- `PORT`: **Não defina manualmente** — Railway e Render atribuem automaticamente.

> Nota: a partir do Prisma 7 as URLs são lidas via `backend/prisma.config.ts`,
> que por sua vez lê `DATABASE_URL`/`DIRECT_URL` do ambiente — o shape das
> variáveis **não mudou**, só a localização lógica no código.

## 3. Frontend (Vercel)

O frontend Next.js 15 otimizado para performance.

- **Root Directory:** Selecione `frontend-v2`.
- **Framework:** Next.js.
- **Variáveis de Ambiente:**
  - `NEXT_PUBLIC_BACKEND_URL`: URL pública do backend no Railway
    (ex: `https://theosphere-production.up.railway.app`).
    > [!CAUTION]
    > Esta variável **deve ser do tipo `Plain`** (não `Sensitive`/`Secret`).
    > Variáveis `NEXT_PUBLIC_*` são embutidas no JavaScript do frontend
    > durante o build. Se for `Sensitive`, o valor fica vazio no bundle
    > final e **nenhuma chamada de API funciona** para visitantes do site.
  - `NEXT_PUBLIC_MAPBOX_TOKEN`: (Opcional) Seu token do Mapbox para o Atlas 4D.

## 🚀 Ordem de Operações

1. **Supabase**: Validar conexão e habilitar `vector`.
2. **Backend**: Rodar `db:migrate` localmente apontando para o Supabase e depois subir no Railway (ou Render).
3. **Frontend**: Subir no Vercel com `NEXT_PUBLIC_BACKEND_URL` apontando para o domínio público do Railway.
4. **Backend (ALLOWED_ORIGINS)**: Atualizar no Railway para incluir o domínio gerado pela Vercel.

---

_TheoSphere OS — Engenharia Teológica de Alta Disponibilidade._
