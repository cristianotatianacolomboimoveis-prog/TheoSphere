# Prompt — LXX real, busca semântica completa e fechamento da Fase 1 (TheoSphere)

> Cole este arquivo inteiro no Antigravity. Ele **substitui** o Passo 2 de
> `audit/prompts/antigravity-finalizacao-fase1-2026-11-05.md` (T1.1, T1.4 e
> T1.5). Antes de começar, leia `AGENTS.md` inteiro, em especial as seções 3
> (convenções), 4 (verificação) e 6 (portão de licença).

## PAPEL

Você é o engenheiro responsável por fechar quatro pendências que o dono quer
resolvidas antes de ampliar o teste fechado:

| #   | Pendência                          | Sintoma visto pelo usuário                                       |
| --- | ---------------------------------- | ---------------------------------------------------------------- |
| A   | Texto da Septuaginta (LXX)         | O leitor mostra lemas de dicionário, não o texto bíblico         |
| B   | Busca semântica incompleta         | Só BLIVRE e NVA têm embeddings em todos os versículos            |
| C   | Análise gramatical do grego (T1.5) | Árvore sintática real só existe para 7 versículos escritos à mão |
| D   | Índice da biblioteca (T1.4)        | Comentários clássicos não são ligados ao versículo com precisão  |

Execute **na ordem A → B → C → D**. A precisa vir antes de B, porque não se gera
embedding de um texto que vai ser trocado.

## ESTADO MEDIDO (2026-11-07, Claude Code)

- **Banco:** Supabase Pro, **gravável**, 1.195 MB e 21 migrações aplicadas.
  Smoke de produção com 8 de 8 etapas e IA respondendo (`/health/ai` = `ok`).
- **Cobertura de embeddings em `BibleVerse`:**

  | tradução | com embedding | total  | faltam                       |
  | -------- | ------------- | ------ | ---------------------------- |
  | BLIVRE   | 31.102        | 31.102 | 0                            |
  | NVA      | 31.094        | 31.094 | 0                            |
  | KJV      | 1.600         | 30.470 | 28.870                       |
  | WEB      | 500           | 30.456 | 29.956                       |
  | WLC      | 500           | 22.550 | 22.050                       |
  | TR       | 1.000         | 7.957  | 6.957                        |
  | LXX      | 500           | 21.899 | (refazer depois da tarefa A) |

- **Causa do defeito no LXX:** está na fonte, não no nosso script. O
  `scripts/mass-ingest-bibles.ts` baixa de `bolls.life/get-chapter/LXX/...`, e a
  própria bolls.life entrega uma sequência de lemas. Exemplo em Sl 9:2:
  "ἐκὁμολογέω σύ κύριος ἐν ὅλος καρδία…", quando o texto real é
  "ἐξομολογήσομαί σοι, κύριε, ἐν ὅλῃ καρδίᾳ μου…". Também há junções
  quebradas, como "ἐκὁμολογέω". A bolls.life não oferece outra Septuaginta
  grega.
- **Atenção:** a coluna `book` de `BibleVerse` é **texto**, não inteiro. Uma
  consulta com `book = 19` falha com `operator does not exist: text = integer`.

## REGRAS INEGOCIÁVEIS

1. **Worktree próprio** (`git worktree add ../theosphere-ag <branch>`), uma
   branch por tarefa: `fix/lxx-texto-real`, `feat/embeddings-completos`,
   `feat/t1.5-macula-lowfat`, `feat/t1.4-indice-referencias`.
2. **Portão de licença fail-closed.** Aceite só domínio público, CC0 ou CC BY.
   Para **CC BY-SA, CC BY-NC, licença "uso pessoal" ou licença ausente**, marque a
   tarefa como **BLOQUEADA** e peça a decisão ao dono. Registre cada fonte em
   `docs/licenses/<NOME>.md` com o link da licença **lida na fonte**, não citada de
   memória. Nome de arquivo dizendo "public domain" não vale como verificação.
3. **Nunca desabilite teste nem lint.** Nunca escreva segredo em código.
   O `userId` sempre vem do JWT.
4. **Todo controller novo** usa `@Controller('api/v1/...')`. O
   `route-prefix.spec.ts` falha se faltar.
5. **Migrações só aditivas.** A `main` faz deploy automático no Render, e o
   `start` roda `prisma migrate deploy`. Nada de `DROP` nem de `ALTER` destrutivo
   em tabela com dados de usuário.
6. **Nada de árvore sintática, morfologia ou texto bíblico gerado por LLM.**
   Tudo vem de fonte anotada e licenciada.
7. **Merge na `main` é permitido** quando a tarefa cumprir **todos** os aceites, e
   depois de `npm run verificar`, `npm run typecheck`,
   `node audit/scripts/static-checks.mjs` e, no frontend, `tsc --noEmit` mais
   `vitest`, todos com exit 0. Faça um merge por tarefa. Depois de cada merge, rode
   `node backend/scripts/smoke-teste-producao.mjs` (precisa dar 8 de 8) e apague os
   registros `smoke-*` em transação.
8. Relatório **por tarefa**, com números e a seção "o que NÃO foi verificado".

---

## TAREFA A — Septuaginta com texto real

### A1. Escolher a fonte (portão de licença)

Avalie as candidatas e registre a licença de cada uma lida na fonte. Não
pressuponha:

| Candidata                                                      | Observação a verificar                                                                                                                                                                                         |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Swete**, _The Old Testament in Greek_ (Cambridge, 1909–1930) | A obra impressa é domínio público pela idade. A **edição digital** pode ter licença própria: a da First1KGreek / OpenGreekAndLatin costuma ser CC BY-SA, o que **bloqueia** sem decisão do dono                |
| **Rahlfs 1935** (1ª edição)                                    | O status de domínio público é contestado. As versões digitais derivam do CCAT/TLG, com termo de uso restritivo. A Rahlfs-Hanhart 2006 é protegida pela Deutsche Bibelgesellschaft. **Provavelmente BLOQUEADA** |
| Outra fonte que você encontrar                                 | Mesmos critérios                                                                                                                                                                                               |

Se nenhuma fonte passar, **não ingira nada**. Siga para A4.

### A2. Ingestão (só com fonte aprovada)

- Escreva `backend/scripts/ingest-lxx-<fonte>.ts`, idempotente, com
  `PrismaClient` usando o adapter `PrismaPg`. O `static-checks` acusa se faltar.
- Grave numa **tradução nova** (ex.: `LXXS` para Swete) e **não sobrescreva**
  `LXX` até conferir a contagem. Só depois troque o mapeamento no leitor e,
  confirmado, apague as linhas antigas de `LXX`.
- **Versificação:** a numeração que o `versification.ts` assume para o LXX é a de
  Rahlfs (título do salmo = v.1; capitulação do MT fora dos Salmos). Se a fonte
  escolhida numerar diferente, **ajuste o mapeamento e os testes**. O teste de ida
  e volta KJV → LXX → KJV precisa continuar passando.
- Livros que a fonte não tiver (deuterocanônicos ou partes de Daniel/Ester) devem
  ser listados no relatório, não preenchidos com outra fonte sem avisar.

### A3. Aceite A

- Contagem de versículos por livro: fonte × banco, em tabela. A diferença tem de
  ser 0, ou cada diferença tem de vir explicada.
- Amostra lida no banco, mostrando que o texto é flexionado e não lema:
  Sl 9:2 (Rahlfs), Gn 1:1, Is 7:14 e Sl 22(21):2.
- Teste automatizado que **falhe** se aparecerem junções como `ἐκὁ` ou
  `διαἡ` numa amostra do LXX, para pegar a volta do defeito.
- O leitor, o comparador e a sinopse mostram o texto novo. Confira com `curl` em
  `/api/v1/bible/chapter/<TRAD>/19/9`.

### A4. Se a fonte for BLOQUEADA

Não deixe o defeito invisível:

- Na UI (`TranslationPicker.tsx` e no cabeçalho do leitor), mostre na LXX o rótulo
  **"Texto lematizado (forma de dicionário) — não é o texto corrido"**.
- Exclua a LXX da busca semântica e do diff do comparador enquanto o rótulo
  existir.
- Escreva um teste que garanta o rótulo enquanto a fonte for `bolls.life/LXX`.
- Registre no `AGENTS.md` como **decisão pendente D7: fonte licenciada da LXX**.

---

## TAREFA B — Embeddings de todas as traduções

### B1. Antes de gastar cota

1. Leia `backend/scripts/povoar-embeddings-livres.ts` e confirme que ele grava
   **somente** vetores do modelo persistido (`gemini-embedding-001`, 768
   dimensões), nunca o fallback efêmero de hash ou OpenAI (regra T0.2). Se o
   `createBatchEmbeddings` não devolver provedor e modelo, **adicione uma guarda**:
   o script aborta se `dimensions !== 768` ou se o provedor não for Gemini, e um
   teste cobre isso. Vetor de outro espaço misturado no índice HNSW envenena a
   busca em silêncio.
2. Confirme que o script só seleciona `WHERE embedding IS NULL`, ou seja, que
   retoma de onde parou e não regrava.
3. **Meça o disco antes:** `node backend/scratch/medir-tamanho-banco.js`. A
   estimativa do Claude Code, tirada das medições atuais (cerca de 2,9 KB de
   vetor + cerca de 3,9 KB de HNSW por versículo), é de **+550 a 650 MB** para os
   cerca de 88 mil versículos que faltam. O banco vai a cerca de 1,8 GB, dentro
   dos 8 GB do Pro. Confirme no painel o tamanho real do disco provisionado.

### B2. Lote piloto

Rode `npx tsx scripts/povoar-embeddings-livres.ts TR 1000` e meça:

- versículos por minuto e número de 429;
- custo, tirado do painel do Google AI Studio ou da telemetria;
- MB de crescimento do banco.

Com isso, **projete** o tempo e o custo total e coloque a projeção no relatório
**antes** de seguir.

### B3. Execução completa

Ordem: **TR → WLC → KJV → WEB**, e depois o LXX novo, se a tarefa A tiver passado.

- **A chave do Gemini é a mesma da produção.** Um 429 em excesso derruba o chat
  dos testadores. Rode em lotes, com pausa, e entre os lotes confira
  `curl -s https://theosphere.onrender.com/api/v1/health/ai`. Se aparecer
  `lastFailure` com cota ou limite, **pause** e aumente o intervalo.
- Não paralelize traduções.

### B4. Aceite B

- A consulta somente leitura abaixo deve mostrar `faltam = 0` em todas as
  traduções (ou, no LXX, a situação da tarefa A explicada):

  ```sql
  SELECT translation,
         count(*) FILTER (WHERE embedding IS NOT NULL) AS com_embedding,
         count(*) AS total,
         count(*) FILTER (WHERE embedding IS NULL) AS faltam
  FROM "BibleVerse" GROUP BY 1 ORDER BY 1;
  ```

- `EXPLAIN ANALYZE` de uma busca vetorial filtrada por `KJV` mostrando uso do
  índice HNSW, com tempo em ms. Lembrete: sem índice, essa busca leva de 20 a
  30 s.
- `GET /api/v1/search/verses?q=amor%20de%20Deus&translation=KJV` em produção com
  `meta.vectorArm: "ok"` e resultados que não casam só por palavra-chave.
  Mostre um exemplo.
- O tamanho do banco depois da carga, comparado com a estimativa.
- Atualize a tabela de embeddings na seção 6 do `AGENTS.md`.

---

## TAREFA C — Árvore sintática real do NT (T1.5)

**Fonte:** MACULA Greek, **Lowfat XML** (github.com/Clear-Bible/macula-greek),
CC BY 4.0, já aprovada em `docs/licenses/SYNTAX-TREEBANK.md`. Reconfira se a
licença no repositório continua a mesma e registre o commit/tag usado.

1. Escreva um importador que leia o Lowfat XML **do arquivo**, sem LLM e sem
   heurística, preservando:
   - os **IDs de palavra** MACULA (`n43001001001`…);
   - os papéis funcionais (S, P, O, IO, ADV, V…) e a estrutura de cláusulas;
   - lema, morfologia e Strong de cada palavra, que servem também para C3.
2. Armazenamento:
   - se o diagrama couber em JSON por versículo, use uma tabela nova `SyntaxTree`
     (`numRef` BBCCCVVV, `tree` JSONB, `source`, `sourceVersion`), criada por
     migração aditiva;
   - ou use um dataset `.json.gz` versionado, como foi feito no SBLGNT. Justifique
     a escolha pelo tamanho medido.
3. **Morfologia do SBLGNT (pendência do T1.1):** use os mesmos dados do MACULA
   para preencher `InterlinearWord` do SBLGNT (lema, morfologia, Strong).
   ⚠️ **Não use MorphGNT**: é CC BY-SA.
4. Sirva com `method: 'treebank'` e `isAnnotatedTree: true` **somente** o que veio
   desse import. Os 7 versículos de `curated-syntax.data.ts` continuam como
   `curated-manual`, ou são substituídos pelos do treebank; nunca misture os
   dois.
5. Atualize o invariante em `syntax-diagram.service.spec.ts`: todo nó `treebank`
   precisa ter ID MACULA válido. Deve haver um teste que falhe com um nó sem ID.

**Aceite C:**

- Cobertura: versículos com árvore ÷ 7.957 do NT, em número.
- Três versículos conferidos à mão contra o XML original (Jo 1:1, Rm 8:28 e
  Ef 2:8), com os IDs.
- `/api/v1/syntax-diagram/...` em produção devolvendo `method: "treebank"` para
  Ef 2:8.
- Na UI, o badge "✓ Árvore Anotada (Treebank)" aparece para versículos do NT fora
  do piloto.

---

## TAREFA D — Índice de referências da biblioteca (T1.4)

Hoje `ResourceReference` tem só `canonicalRef`, e o script de migração só copia
os chunks antigos de 500 palavras. Falta:

1. **Esquema (migração aditiva):** `startRef`, `endRef` (intervalos como
   "Jo 3:16-18") e `kind` (`'heading' | 'inline'`), com índice para busca por
   intervalo. A consulta do guia deve achar uma referência quando o versículo
   pedido estiver **dentro** do intervalo.
2. **Chunking estrutural:** corte por cabeçalhos (CHAPTER/VERSE em Matthew Henry,
   Calvino, Gill etc.). Quando não houver cabeçalho, use janelas com
   sobreposição. Um trecho sob o cabeçalho "Verses 16-18" herda esse intervalo
   como `kind: 'heading'`.
3. **Extrator PT + EN:** abreviações, intervalos e "v. 16" resolvido pelo
   cabeçalho corrente. Reaproveite `frontend-v2/src/lib/bibleReference.ts`.
   Cuidados que já viraram bug neste projeto:
   - "Jn" em inglês é **João**, não Jonas;
   - palavras comuns que coincidem com abreviações (`is`, `at`, `am`, `ex`, `ne`,
     `os`, `ed`, `et`, `na`, `ag`, `cl`) geram falso positivo em "at 5:30" ou
     "is 3:16". Exija maiúscula inicial, ponto ou lista de exclusão, e escreva
     testes com esses casos;
   - `jn_nt` não é abreviação real.
4. **Migração dos dados:** rode
   `scripts/migrate-user-embeddings-to-resources.ts --dry-run` (ele mede), depois
   a migração real. **Não apague nada de `UserEmbedding`** antes de conferir a
   contagem de chunks na origem e no destino. Hoje são 45.114 chunks em 88
   obras.
5. **T1.3 pendente (agora possível, porque o banco grava):** rode
   `scripts/populate-cross-ref-numeric.ts` e reporte linhas preenchidas × total e
   as referências que não foi possível interpretar.

**Aceite D:**

- **Auditoria manual de 50 trechos** sorteados (com a semente registrada), com
  precisão e cobertura do extrator **em número**. Meta: precisão ≥ 95%. Liste os
  erros encontrados.
- `EXPLAIN ANALYZE` da consulta do Passage Guide mostrando o uso do índice e o
  tempo em ms.
- Contagem `UserEmbedding` × `ResourceChunk` por obra; diferença 0 ou explicada.
- `GET /api/v1/resources/references?ref=43003016` (Jo 3:16) em produção
  devolvendo trechos de comentários com o intervalo correto.

---

## FECHAMENTO

1. Atualize a seção 0 e a seção 6 do `AGENTS.md` com os números finais (sem
   superlativos) e marque a Fase 1 como concluída **só** se A a D tiverem passado.
   Tarefa BLOQUEADA continua aparecendo como bloqueada.
2. Apague da pasta principal as cópias de conflito do iCloud com " 2" no nome
   (ex.: `ingest-sblgnt 2.ts`, `migration 2.sql`). Não as commite.
3. Relatório final com uma tabela por tarefa (A, B, C, D): estado
   (CONCLUÍDA / BLOQUEADA / PARCIAL), números do aceite, commits, e a seção
   **"o que NÃO foi verificado"**.
