# TODO List — Ingestão Teológica Global

- `[x]` Configurar timeouts e limites de conexão em `PrismaService` para transações massivas.
- `[x]` Criar o script robusto `massive-scale-ingest.ts` em `backend/scratch` (com checkpoints e retry exponential backoff).
- `[x]` Rodar piloto de validação com limite de 5 livros para atestar o checkpoint.
- `[x]` Rodar testes unitários do backend para homologação geral.
