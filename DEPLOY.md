# Deploy TheoSphere 4D OS

Instruções para deploy em produção do ecossistema TheoSphere.

## 1. Banco de Dados (Supabase + pgvector)
A infraestrutura de dados deve ser a primeira a ser validada.
- **PgVector:** Certifique-se de que a extensão `vector` está habilitada no Supabase (`CREATE EXTENSION IF NOT EXISTS vector;`).
- **Migrations:** Execute as migrações para preparar o schema:
  ```bash
  cd backend
  npm run db:migrate
  ```
- **Seed:** (Opcional) Popule o banco com dados iniciais:
  ```bash
  npm run db:seed
  ```

## 2. Backend (Railway)
O backend usa Docker para garantir paridade entre ambientes.
- **Conexão:** Conecte o repositório GitHub ao Railway.
- **Root Directory:** Selecione `/backend`.
- **Variáveis de Ambiente:**
  - `PORT`: `3002`
  - `DATABASE_URL`: URL de Transaction Pooling do Supabase (porta 6543).
  - `DIRECT_URL`: URL de conexão direta do Supabase (porta 5432).
  - `GEMINI_API_KEY`: Sua chave do Google AI Studio.
  - `JWT_SECRET`: Uma string longa e aleatória para assinatura dos tokens.
  - `CORS_ORIGIN`: URL final do frontend (ex: `https://theosphere.vercel.app`).

## 3. Frontend (Vercel)
O frontend Next.js 15 otimizado para performance.
- **Root Directory:** Selecione `/frontend-v2`.
- **Framework:** Next.js.
- **Variáveis de Ambiente:**
  - `NEXT_PUBLIC_BACKEND_URL`: URL gerada pelo Railway (ex: `https://backend-production.up.railway.app`).
  - `NEXT_PUBLIC_MAPBOX_TOKEN`: Seu token do Mapbox para o Atlas 4D.

## 🚀 Ordem de Operações
1. **Supabase**: Validar conexão e rodar `db:migrate`.
2. **Railway**: Subir o backend e aguardar o healthcheck passar.
3. **Vercel**: Subir o frontend apontando para o domínio do Railway.

---
*TheoSphere OS — Engenharia Teológica de Alta Disponibilidade.*
