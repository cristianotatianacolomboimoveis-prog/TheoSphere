# Plano de Povoamento de Embeddings Livres (Sem Risco de Estouro de Cota)

Este plano descreve como povoar **todos os conteúdos livres e de domínio público** disponíveis com embeddings vetoriais de IA, garantindo taxa de controle para nunca estourar a cota da API do Gemini.

## 🛡️ Auditoria de Licenças e Proteção Contra Conteúdo Protegido

1. **Estado do Banco de Dados:**
   - **Bíblias Restritas:** Já foram 100% purgadas. Restam apenas 7 traduções **100% de domínio público / licença aberta** (`BLIVRE`, `NVA`, `KJV`, `WEB`, `WLC`, `LXX`, `TR`).
   - **Acervo Teológico:** O arquivo [`license-manifest.ts`](file:///Users/cristianocolombo/Downloads/TheoSphere/backend/src/rag/license-manifest.ts) e o `LicenseGate` barram em tempo de execução qualquer livro com copyright sob demanda.

2. **O que já está 100% Povoado com Embeddings:**
   - **BLIVRE** (31.102 versículos) — 100% com embedding.
   - **NVA** (31.094 versículos) — 100% com embedding.
   - **Acervo Teológico (`UserEmbedding`)** (17.889 trechos) — 100% com embedding.

3. **O que falta Povoar (Traduções Livres em Inglês, Grego e Hebraico):**
   - **KJV** (King James): 30.470 versículos
   - **WEB** (World English Bible): 30.456 versículos
   - **WLC** (Hebraico Massorético): 22.550 versículos
   - **LXX** (Septuaginta Grega): 21.899 versículos
   - **TR** (Textus Receptus Grego): 7.957 versículos
   - **Total:** 113.332 versículos livres pendentes.

---

## ⚙️ Proposta de Ingestão Segura com Rate-Limiting e Graceful Backoff

Para evitar qualquer estouro de cota de API:

- Criaremos o script dedicado [`scripts/povoar-embeddings-livres.ts`](file:///Users/cristianocolombo/Downloads/TheoSphere/backend/scripts/povoar-embeddings-livres.ts).
- O script processará os versículos em sub-lotes pequenos (20 por requisição) com pausa (throttle) de 300ms entre requisições.
- Se a API retornar limite de requisições (HTTP 429 / Quota Exceeded), o script aguardará automaticamente 15 segundos antes de tentar novamente, mantendo o progresso salvo.
- As traduções serão processadas em sequência, começando pela **KJV** (Inglês).

---

## 📋 Passos de Execução

### Componente 1: Script de Povoamento Seguro

#### [NEW] [`backend/scripts/povoar-embeddings-livres.ts`](file:///Users/cristianocolombo/Downloads/TheoSphere/backend/scripts/povoar-embeddings-livres.ts)

- Script TypeScript executável via `npx tsx` que aceita parâmetro de versão (ex: `npx tsx scripts/povoar-embeddings-livres.ts KJV`).
- Grava embeddings via `bulk UPDATE` no Supabase.

---

## 🧪 Plano de Verificação

### 1. Testes Automatizados

- Executar `npm run verificar` para garantir que o script e modificações no backend mantêm typecheck 0 e 100% dos testes passando.

### 2. Verificação do Banco

- Executar `node scratch/diagnostico-completo.js` (somente leitura) após o povoamento para confirmar o número exato de embeddings gerados por versão.
