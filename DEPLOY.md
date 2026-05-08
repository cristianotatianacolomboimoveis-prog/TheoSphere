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

## 2. Backend (Render)
O backend usa o blueprint `render.yaml` para configuração automática.
- **Conexão:** Conecte o repositório GitHub ao Render.
- **Blueprint:** O Render detectará automaticamente o arquivo `backend/render.yaml`.
- **Variáveis de Ambiente:**
  - `PORT`: `3002`
  - `DATABASE_URL`: URL de Transaction Pooling do Supabase (porta 6543).
  - `DIRECT_URL`: URL de conexão direta do Supabase (porta 5432).
  - `GEMINI_API_KEY`: Sua chave do Google AI Studio.
  - `JWT_SECRET`: Uma string longa e aleatória para assinatura dos tokens.
  - `ALLOWED_ORIGINS`: URL final do frontend (ex: `https://theosphere.vercel.app`).

## 3. Frontend (Vercel)
O frontend Next.js 15 otimizado para performance.
- **Root Directory:** Selecione `/frontend-v2`.
- **Framework:** Next.js.
- **Variáveis de Ambiente:**
  - `NEXT_PUBLIC_BACKEND_URL`: URL gerada pelo Render (ex: `https://theosphere-1.onrender.com`).
  - `NEXT_PUBLIC_MAPBOX_TOKEN`: Seu token do Mapbox para o Atlas 4D.

## 🚀 Ordem de Operações
1. **Supabase**: Validar conexão, habilitar `vector` e adicionar IPs do Render ao firewall.
2. **Backend**: Rodar `db:migrate` localmente apontando para o Supabase e depois subir no Render.
3. **Frontend**: Subir no Vercel apontando para o domínio do Render.

---
*TheoSphere OS — Engenharia Teológica de Alta Disponibilidade.*
