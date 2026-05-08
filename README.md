# 🧬 TheoSphere OS — Total Reconstruction (Modo Reconstrução Total)

Este projeto passou por uma reconstrução completa e estabilização para atingir o nível **Enterprise PhD**. O ecossistema TheoSphere agora é resiliente, seguro e auditado.

## 🚀 Status da Missão

- **Infraestrutura**: Estável com fallback inteligente (resiliência a falta de Redis/Docker).
- **Backend (NestJS)**: Hardened com filtros globais de exceção, Sentry e auditoria.
- **Frontend (Next.js 15)**: Nova interface "OS Shell" com Sidebar e Console Agêntico funcional.
- **AI/RAG**: Pipeline otimizado com cache semântico e fallbacks robustos para modo offline.
- **Dados**: Dataset enriquecido com entradas acadêmicas de alta qualidade (BDAG/HALOT).

## 🛠️ Como Iniciar

### Pré-requisitos
- Node.js 20+
- PostgreSQL (ou Supabase)
- Redis (Opcional, o sistema possui fallback local)

### Instalação Rápida
1. **Configuração**:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend-v2/.env.local.example frontend-v2/.env.local
   ```
2. **Segredos**:
   ```bash
   ./scripts/generate-secrets.sh >> backend/.env
   ```
3. **Dependências**:
   ```bash
   cd backend && npm install
   cd ../frontend-v2 && npm install
   ```
4. **Banco de Dados & Seed**:
   ```bash
   cd backend
   npm run db:migrate
   npm run db:seed:enterprise
   ```
5. **Execução**:
   - Backend: `npm run start:dev` (Porta 3002)
   - Frontend: `npm run dev` (Porta 3000)

## 🏛️ Ferramentas Inclusas (Unified Sidebar)

| Ferramenta | Descrição |
| :--- | :--- |
| **Análise Exegética** | Interface PhD para estudo gramatical e léxico (RAG). |
| **Agentic Console** | Shell interativo para consultas complexas à TheoAI. |
| **Atlas 4D** | Visualização geoespacial histórica com WebGL/DeckGL. |
| **Word Study** | Concordância Strong's integrada (Grego/Hebraico). |
| **Sermon Builder** | Construtor de sermões com templates homiléticos. |
| **Manuscript Viewer** | Acesso virtual aos principais códices (Sinaiticus, etc). |

## 🔒 Segurança & Observabilidade
- **Sentry**: Integrado no backend para rastreamento de erros críticos.
- **Filtros Globais**: Todas as respostas de erro são padronizadas em JSON.
- **PII Scrubbing**: Segredos são redigidos automaticamente antes do envio de logs.

## 📖 Documentação Adicional
- [DEPLOY.md](DEPLOY.md): Guia de deploy em produção (Render/Vercel/Supabase).
- [SECURITY.md](SECURITY.md): Notas sobre rotação de credenciais e segurança.

---
*Engenharia Teológica de Alta Disponibilidade — TheoSphere OS 2026.*
