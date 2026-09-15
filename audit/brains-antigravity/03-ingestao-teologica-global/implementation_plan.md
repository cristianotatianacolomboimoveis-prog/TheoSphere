# Plano de Ingestão Teológica Global

Este plano descreve a estratégia técnica para escalar a biblioteca do TheoSphere de ~8.900 fragmentos para um acervo global massivo (~10.000 livros curados de domínio público, totalizando ~2.400.000 fragmentos), garantindo resiliência contra quedas de API, limites de cota e otimização do banco de dados PostgreSQL/pgvector.

---

## User Review Required

> [!WARNING]
> **Consumo de Cota da API do Gemini:** A execução total deste plano consumirá cerca de 1,6 bilhão de tokens de embedding (estimado em \$40,00 USD de cota Gemini).
>
> **Pacing e Tempo de Execução:** Devido aos limites de requisição por minuto (Rate Limits) das APIs do Project Gutenberg e do Gemini, o processo deve ser fatiado e executado ao longo de 5 a 7 dias em segundo plano.

---

## Open Questions

> [!IMPORTANT]
>
> 1. **Ambiente de Destino:** A carga de dados deve ser executada diretamente contra o banco de produção do Supabase (`DATABASE_URL` atual no `.env`), ou deseja rodar uma validação prévia de escala em um banco de staging intermediário?
> 2. **Configuração de Armazenamento:** O seu plano atual do Supabase possui teto de armazenamento contratado acima de 40 GB para acomodar os novos fragmentos e os índices vetoriais HNSW?

---

## Proposed Changes

### [Backend: Ingestion Engine]

Proposta de refatoração e criação de novas ferramentas para garantir a resiliência do processo de carga massiva:

#### [NEW] [massive-scale-ingest.ts](file:///Users/cristianocolombo/Downloads/TheoSphere/backend/scratch/massive-scale-ingest.ts)

- Script aprimorado de importação que substitui o crawler básico. Ele implementará:
  - **Checkpointing (Resiliência):** Salvar o progresso em um arquivo local `ingestion-checkpoint.json` após cada livro concluído, permitindo pausar e continuar o processo a qualquer momento sem duplicar downloads ou embeddings.
  - **Retry Backoff Exponencial:** Capturar erros temporários do Gemini (HTTP 503) ou Gutenberg (HTTP 429) e esperar intervalos crescentes (2s, 4s, 8s, 16s) antes de abortar.
  - **Curadoria Estendida de IDs:** Carregar uma lista expandida com mais de 500 IDs validados do Gutenberg.

#### [MODIFY] [prisma.service.ts](file:///Users/cristianocolombo/Downloads/TheoSphere/backend/src/prisma.service.ts)

- Configurar o tempo limite de conexões (`connection_limit` e timeouts) nas conexões diretas de banco de dados (`DIRECT_URL`) para evitar quebras por timeout durante transações massivas e concorrência HNSW.

---

## Verification Plan

### Automated Tests

1. Rodar os testes unitários do backend para garantir que as alterações no `PrismaService` não afetem o ciclo de vida normal do app:
   ```bash
   npm run test
   ```

### Manual Verification

1. Executar uma rodada piloto de importação com limite estrito (ex: 5 livros) para validar o salvamento e a restauração de checkpoints e o controle de cotas:
   ```bash
   npx tsx scratch/massive-scale-ingest.ts --dry-run
   ```
