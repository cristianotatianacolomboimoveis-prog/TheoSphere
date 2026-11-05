# Prompt de execução — Plano de melhorias TheoSphere (auditoria de 2026-11-05)

> Cole este arquivo inteiro como instrução para o agente. Ele é autocontido.

---

## PAPEL

Você é o engenheiro responsável por executar o plano de melhorias do TheoSphere,
plataforma de estudo bíblico que compete com o Logos Bible Software. Você trabalha
dentro deste repositório (`backend/` NestJS 11 + Prisma 7 + pgvector; `frontend-v2/`
Next.js 16 + React 19). Seu trabalho é **corrigir defeitos estruturais e entregar
capacidade real**, não produzir vitrine.

## ANTES DE QUALQUER CÓDIGO

1. Leia `AGENTS.md` na raiz por inteiro. As seções 3 (convenções), 4 (verificação),
   5 (armadilhas) e 6 (pendências) são obrigatórias e prevalecem sobre este prompt
   em caso de conflito.
2. Rode a linha de base e registre os números (eles serão comparados no fim):
   ```bash
   cd backend && npm run verificar
   cd backend && npm run typecheck
   cd frontend-v2 && npx tsc --noEmit && npx vitest run
   node audit/scripts/static-checks.mjs
   ```
3. Se a linha de base já estiver vermelha, **pare e relate** antes de mudar qualquer coisa.

## REGRAS INEGOCIÁVEIS DESTA EXECUÇÃO

Estas regras existem porque execuções anteriores registraram como "concluído" coisas
que não estavam (ex.: diagrama sintático marcado `openTextCompliant: true` sendo
heurística; billing "implantado" sem pagamento). Não repita isso.

1. **Uma tarefa por vez, na ordem abaixo.** Cada tarefa = uma branch
   `fix/<id>-<slug>` ou `feat/<id>-<slug>` + commits próprios. Não misture tarefas.
2. **Nunca faça push para `main`, deploy em Vercel/Render, nem migração em produção**
   sem autorização explícita do dono naquela tarefa. Migrações Prisma: gere o arquivo,
   rode em banco local/teste, e pare.
3. **Nunca desabilite teste, regra de lint ou verificação** para fazer algo passar.
4. **Teste o caminho de falha** de toda mudança (não só o de sucesso).
5. **Proibido inventar dados.** Não fabrique alinhamentos, árvores sintáticas,
   variantes textuais, contagens ou licenças. Se o dado não existir no repositório
   ou numa fonte verificada, a tarefa fica **BLOQUEADA** e você relata.
6. **Portão de licença fail-closed.** Antes de ingerir qualquer fonte externa, abra o
   arquivo de licença _da própria fonte_ (LICENSE/README do repositório oficial) e
   registre: nome da licença, URL, data da verificação, obrigações de atribuição.
   Ausência de licença explícita = rejeitar. Não confie em nome de arquivo nem em
   memória sua sobre licenças.
7. **Sem superlativos em código, UI, commits ou AGENTS.md.** Nada de "superando o
   Logos", "nível acadêmico", "definitivo", "100% perfeito". Escreva o que foi feito
   e os números medidos.
8. **Relatório por tarefa** (formato no fim deste prompt), incluindo explicitamente
   **o que NÃO foi verificado e por quê**.
9. **Atlas 3D está congelado.** Não mexa em `/atlas`, Cesium, MapLibre, Deck.gl,
   rotas, waypoints ou MCP de mapa, exceto se uma tarefa abaixo pedir (T2.4 mede
   bundle — só medir e isolar, não adicionar recurso).
10. UI e comentários em PT-BR; código em inglês; `userId` sempre do JWT.

## TAREFAS QUE SÓ O DONO PODE FAZER (não tente executar — liste no relatório final)

- **D1.** Revogar o token do Railway exposto em `scripts/check-production-health.ts`
  (painel do Railway).
- **D2.** Escolher e contratar o gateway de pagamento (Mercado Pago, Asaas, Stripe ou
  outro) e fornecer as chaves via dashboard do Render — nunca no código.
- **D3.** Decidir sobre o disco do Supabase: upgrade para plano pago **ou** aprovar a
  estratégia de compressão de T0.3 (que exige migração em produção).
- **D4.** Negociar licenças das Bíblias de púlpito brasileiras (ARA/ARC/NAA — SBB;
  NVI — Biblica). Decisão comercial.
- **D5.** Definir orçamento mensal de infraestrutura (Render pago, Redis, CDN).
- **D6.** Definir público prioritário (pastor/sermão vs. seminarista/exegese) — afeta
  a ordem da Fase 2.

---

# FASE 0 — BLOQUEADORES (segurança, integridade de dados, dinheiro)

### T0.1 — Fechar a auto-promoção de plano em `/billing/subscribe`

**Evidência verificada:** `backend/src/billing/billing.controller.ts:48-61` aceita
`{ plan }` do body e `backend/src/billing/billing.service.ts:46-71` grava
`user.plan` direto, sem pagamento. Qualquer usuário logado vira `CHURCH` de graça.
Além disso, se o `update` falhar (banco read-only), o `catch` só faz `logger.warn`
e a função retorna `success: true` — falha silenciosa. Plano inválido lança
`Error` genérico → HTTP 500.

**Fazer:**

1. `POST /billing/subscribe` deixa de alterar plano. Até existir gateway (D2), deve
   responder `403` (ou `501 Not Implemented`) com mensagem PT-BR clara
   ("Assinaturas ainda não estão disponíveis; entre na lista de espera").
2. Introduzir a única via legítima de mudança de plano: um método
   `applyPaidPlan(userId, plan, providerEventId)` chamado **somente** por um endpoint
   de webhook com verificação de assinatura do provedor. Crie a interface
   `PaymentProvider` (verifySignature, parseEvent) e um adapter **fake só para testes**.
   Não implemente provedor real sem D2.
3. Idempotência: tabela `BillingEvent(providerEventId @unique, userId, plan,
receivedAt)`; evento repetido não reaplica.
4. Falha de persistência **propaga** (5xx com mensagem), nunca `success: true`.
5. Plano inválido → `BadRequestException` (400).
6. Frontend `/pricing`: botões de assinatura levam a estado "em breve / lista de
   espera", sem prometer ativação.

**Aceite / testes:** usuário autenticado chamando `subscribe` não muda de plano;
webhook com assinatura inválida → 401 e plano inalterado; evento duplicado aplicado
uma vez; erro de banco → não retorna sucesso; plano inválido → 400.

### T0.2 — Separar espaços vetoriais e parar de envenenar o cache de embeddings

**Evidência verificada:** `backend/src/rag/embedding.service.ts:202-241`:
`createEmbedding` tenta Gemini (`gemini-embedding-001`), depois OpenAI
(`text-embedding-3-small`), depois um hash local (`generateLocalFallbackEmbedding`,
linhas ~170-185), e **grava qualquer um deles no mesmo cache** e devolve como se
fossem equivalentes. São três espaços vetoriais diferentes com a mesma dimensão:
comparar um vetor OpenAI ou hash contra um índice HNSW preenchido com Gemini dá
resultado sem sentido, silenciosamente. Consequência adicional: como
`createEmbedding` nunca rejeita, o estado `meta.vectorArm = 'failed'` (AGENTS §0
item 12) **nunca ocorre em produção** — o teste passa porque mocka a rejeição.

**Fazer:**

1. `createEmbedding` retorna `{ vector, provider, model }` (ou equivalente tipado).
2. Para **consulta contra índice persistido**, só é aceito o mesmo `provider+model`
   que gerou o índice (Gemini `gemini-embedding-001`, 768). Se indisponível, lançar
   erro tipado (`EmbeddingUnavailableError`) — isso faz `vectorArm = 'failed'`
   aparecer de verdade.
3. Fallback OpenAI/hash só pode ser usado em contextos efêmeros documentados (ex.:
   similaridade dentro de uma mesma requisição) — nunca gravado no banco nem em cache
   compartilhado.
4. Cache: chave inclui `provider:model:dim`. Escrever no cache somente vetores do
   provedor primário.
5. Script **somente leitura** `backend/scratch/diagnostico-espacos-vetoriais.js` que
   estima contaminação já existente (ex.: vetores com padrão esparso típico do hash —
   muitos zeros/valores inteiros — em `BibleVerse`, `UserEmbedding`,
   `SemanticCacheEntry`). Rodar, reportar números. **Não apagar nada** sem
   autorização.
6. Atualizar o teste de `meta.vectorArm` para cobrir o caminho real (Gemini falha →
   erro propaga → `failed`), não só o mock de rejeição direta.

**Aceite:** com Gemini indisponível, `/search/verses` responde `vectorArm: "failed"`
e o braço full-text ainda funciona; nenhum vetor não-Gemini é escrito em tabela
persistente (teste).

### T0.3 — Plano para sair do modo read-only do Supabase (preparar, não aplicar)

**Contexto:** banco em 1,19 GB no Free Tier → `default_transaction_read_only = on`.
Nada do usuário persiste (cadastro, refresh token, planos, notas).

**Fazer (local apenas):**

1. Medir tamanho por tabela e por índice (`pg_total_relation_size`) num dump/cópia
   ou via consulta somente leitura; registrar números.
2. Preparar migração (sem aplicar em produção) com:
   - colunas `vector(768)` → `halfvec(768)` e índices HNSW recriados com
     `halfvec_cosine_ops` (verifique a versão do pgvector suportada pelo Supabase
     antes);
   - estimativa de economia com base nos números medidos.
3. Documentar em `docs/architecture/plano-disco-supabase.md`: medição, opções
   (halfvec, reduzir `outputDimensionality` do `gemini-embedding-001`, mover texto
   bíblico estático para fora do Postgres — ver T2.4), custo, risco, rollback.
4. Parar e pedir D3.

### T0.4 — Anotações e marca-texto persistidos no servidor

**Evidência verificada:** `frontend-v2/src/hooks/useVerseAnnotations.ts:67-80`
lê/grava apenas `localStorage`. Trocar de dispositivo ou limpar o navegador apaga
tudo.

**Fazer:**

1. Modelo Prisma `Annotation(id, userId, startRef Int, endRef Int, kind
'highlight'|'note', color?, body?, createdAt, updatedAt, deletedAt?)`, com
   referência no formato numérico **BBCCCVVV** (ver T1.3). Índice `(userId, startRef)`.
2. Endpoints CRUD com `userId` do JWT; sincronização incremental por `updatedAt`
   (`GET /annotations?since=`), `deletedAt` para remoções (tombstone).
3. Hook: `localStorage` vira cache/fila offline; ao logar, faz merge
   (last-write-wins por `updatedAt`) e envia pendências. Migra dados locais
   existentes na primeira sincronização, sem perder nada.
4. Se o banco estiver read-only, a UI informa explicitamente "suas notas estão
   salvas só neste dispositivo" — não fingir sincronização.

**Aceite:** testes de merge (conflito, remoção, offline→online), isolamento entre
usuários (usuário A não lê nota de B), teste do estado read-only.

### T0.5 — Remover afirmações falsas e funcionalidade enganosa

1. `backend/src/linguistics/syntax-diagram.service.ts:319` declara
   `openTextCompliant: true` para um diagrama gerado por heurística (ordem de
   palavras + `split` por pontuação no português, linhas ~425-452). Trocar por
   `method: 'heuristic-interlinear' | 'heuristic-text' | 'treebank'` e exibir na UI o
   rótulo "Segmentação aproximada (não é árvore sintática anotada)" enquanto T1.5
   não estiver pronto.
2. `backend/src/bible/bible-comparison.service.ts`: o diff LCS palavra-a-palavra é
   aplicado entre línguas diferentes (ex.: BLIVRE × TR × WLC), o que não tem
   significado. Restringir diff e "% de similaridade" a pares de **mesma língua**;
   para pares entre línguas, mostrar colunas lado a lado sem diff e uma nota
   explicando. Testes para ambos os casos.
3. Varra UI e textos por superlativos e promessas não sustentadas ("supera o Logos",
   "nível acadêmico", "sem alucinação") e reescreva de forma factual.

### T0.6 — Higiene de documentação

1. `AGENTS.md`: mover a lista histórica da §0 (itens 1–47) para `CHANGELOG.md`;
   deixar na §0 apenas estado atual medido + pendências. Corrigir a URL de frontend
   divergente (`frontend-v2-lake` vs `frontend-v2-omega-seven` na §2) — verificar
   qual responde e registrar.
2. Unificar contagem do acervo: hoje o documento cita 38/18.790, 89/45.092,
   90/45.114 e 108 obras. Medir no banco (somente leitura) e registrar **um** número
   com data; `frontend-v2/src/data/classicCatalog.ts` deve ser gerado a partir do
   endpoint `/catalog` (ou de um JSON gerado por script), não mantido à mão.

---

# FASE 1 — FUNDAÇÕES DE EXEGESE E BIBLIOTECA

### T1.1 — Texto grego crítico do NT

**Contexto:** só existe `TR` (7.957 versículos). Uso acadêmico exige texto crítico.

**Fazer:** identificar e verificar licença (regra 6) de candidatos: SBLGNT,
Nestle 1904, dados Macula Greek (Clear Bible / Biblica), Tyndale House GNT. Ingerir
o(s) aprovado(s) em `BibleVerse` + `InterlinearWord` (lema, morfologia, Strong)
com atribuição exigida pela licença visível na UI. Tornar o texto crítico o padrão
do NT no modo grego, mantendo TR selecionável.

**Aceite:** contagem de versículos por livro conferida contra a fonte; script de
ingestão idempotente com adapter Prisma (AGENTS §5); `static-checks` limpo.

### T1.2 — Mapeamento de versificação

**Contexto:** a chave `(translation, bookId, chapter, verse)` assume versificação
única. WLC/LXX divergem das traduções em português/inglês (títulos de Salmos,
Ml 3–4, Jl 2–3, Nm 16–17, etc.). Sincronização de painéis e comparação desalinham.

**Fazer:** adotar um esquema de versificação de referência e uma tabela de
mapeamento por tradução (fonte verificada, ex.: dados de versificação do projeto
STEPBible ou da especificação de versificação usada pelo Paratext — verificar
licença). Função `mapRef(ref, fromScheme, toScheme)`. Usar em comparação, Link Set
e painéis paralelos.

**Aceite:** testes com ≥ 20 casos conhecidos de divergência; teste de ida-e-volta.

### T1.3 — Referência canônica numérica

Normalizar referências para inteiro **BBCCCVVV** (livro 2 dígitos, capítulo 3,
versículo 3) num utilitário compartilhado backend/frontend. Migrar
`CrossReference.sourceRef/targetRef` (hoje strings em inglês "John 3:16") para
colunas numéricas indexadas (mantendo as strings durante a transição). Permitir
consultas por intervalo.

### T1.4 — Índice de referências por trecho + chunking estrutural (núcleo do Guia de Passagem)

**Evidência verificada:** `backend/src/bible/passage-guide.service.ts:~270-293` busca
comentários com `content ILIKE '%John 3:16%'` sobre chunks fixos de 500 palavras,
filtrados por `metadata->>'gutenbergId'`. Perde "Jo 3.16", "v. 16", comentário
sob cabeçalho de capítulo; chunks cortam comentário no meio; ILIKE sem índice faz
varredura completa.

**Fazer:**

1. Novos modelos: `Resource(id, title, author, license, sourceUrl, language, …)`,
   `ResourceChunk(id, resourceId, ordinal, headingPath, content, embedding)` e
   `ResourceReference(chunkId, startRef, endRef, kind 'heading'|'inline')` com
   índice de intervalo (GiST sobre `int4range` ou par de B-trees).
2. **Mover o acervo público para fora de `UserEmbedding`** (que é tabela de dados
   pessoais com `userId`). `UserEmbedding` fica só para notas/sermões do usuário.
   Script de migração idempotente; não apagar origem até verificação de contagem.
3. Chunking estrutural por cabeçalhos (Matthew Henry, Calvino e outros comentários
   têm marcação de capítulo/versículo); fallback para janelas com sobreposição.
4. Extrator de referências (reusar `frontend-v2/src/lib/bibleReference.ts` /
   `passageRef.ts` portado ou compartilhado) para EN e PT, incluindo abreviações,
   intervalos e "v. 16" resolvido pelo cabeçalho corrente.
5. `PassageGuideService` passa a consultar `ResourceReference` por sobreposição de
   intervalo, ordenando `heading` antes de `inline`.

**Aceite:** amostra auditada manualmente de 50 trechos (precisão do extrator
reportada em número); consulta do guia com `EXPLAIN ANALYZE` usando índice; testes
do extrator com casos difíceis.

### T1.5 — Árvores sintáticas reais

Verificar licença (regra 6) de treebanks abertos (ex.: Macula Greek "Lowfat",
Macula Hebrew). Ingerir e servir em `SyntaxDiagramService` com `method:
'treebank'`. Heurística vira fallback rotulado. Se nenhuma fonte for aprovada,
tarefa BLOQUEADA — não gerar árvore com LLM e chamar de anotada.

### T1.6 — Interlinear reverso em português

**Contexto:** `InterlinearWord` tem glosa EN/ES, mas não há alinhamento palavra PT
↔ palavra original. É a principal lacuna para o público lusófono.

**Fazer:**

1. Modelo `WordAlignment(translation, ref, targetTokenIdx, sourceWordId,
confidence, method)`.
2. Pipeline offline (script, não no request): tokenização PT; alinhamento
   estatístico (ex.: eflomal ou fast_align) entre NVA/BLIVRE e o texto original,
   usando glosas e lemas como sinal auxiliar; gravar `confidence` e `method`.
3. UI: clicar numa palavra em português mostra lema/morfologia do original
   alinhado; confiança baixa exibida como tal.
4. **Antes de ingerir tudo:** avaliar em amostra (ex.: Jo 1, Rm 3, Gn 1) com
   conferência manual e reportar precisão. Se < limiar acordado com o dono, não
   publicar.

### T1.7 — Aparato crítico aberto

`backend/src/linguistics/textual-criticism-data.ts` é estático e curado à mão (408
linhas). Verificar licença de dados abertos de variantes (ex.: aparato do SBLGNT,
dados do CNTR, Tyndale House GNT) e substituir/complementar. Exibir fonte por
variante.

### T1.8 — Busca morfológica e normalização FTS

1. Verificar (e registrar) se já existe busca por lema/morfologia. Se não:
   endpoint e operadores na Command Palette, ex.: `lemma:ἀγαπάω morph:V-A*`,
   `strong:G26 book:Jo`.
2. Verificar a configuração de full-text: português com `unaccent` + dicionário
   `portuguese`; grego/hebraico com normalização (remover acentos/pontos/cantilação)
   numa coluna de forma normalizada indexada.

---

# FASE 2 — FLUXO DE TRABALHO, UX E PERFORMANCE

### T2.1 — Editor de sermão/estudo persistente

1. Editor de blocos (TipTap/ProseMirror) com nó de **referência viva** (hover mostra
   o texto na tradução escolhida) e nó de **citação de recurso** (chunkId +
   atribuição automática).
2. Persistência server-side versionada (`Document`, `DocumentVersion`), autosave,
   offline com fila. Avaliar o que já existe em `backend/src/collaboration/` antes
   de criar algo novo; se usar CRDT (Yjs), justificar.
3. Integrar `SermonOutlineModal`/`useHomiletics` existentes ao novo documento.
4. Exportar DOCX e PDF; exportar slides PPTX (um slide por ponto/versículo).
5. Modo púlpito: tela cheia, fonte grande, avanço por teclado, timer.

### T2.2 — Painel contextual único

Substituir a proliferação de botões na `ReaderToolbar` (Ideias, Guia Exegético,
Sinopse, Sintaxe…) por um painel lateral que muda conforme a seleção: palavra →
léxico/morfologia/alinhamento; versículo → comentários (T1.4), referências
cruzadas, notas; passagem → guia. Os botões viram abas ou ações da paleta. Medir
antes/depois quantos cliques leva cada tarefa comum.

### T2.3 — Teclado primeiro

1. Command Palette (⌘K) passa a executar **ações**, não só navegar ("abrir
   comentário de Calvino aqui", "nova nota", "comparar com KJV").
2. Atalhos do leitor: `j/k` versículo, `g` ir para referência, `s` Strong do
   versículo, `n` nota, `c` comparar, `?` lista de atalhos. Um registro central de
   atalhos, sem conflitos, com teste.
3. Toda ação navegável por teclado com foco visível (acessibilidade).

### T2.4 — Leitor offline e orçamento de bundle

1. Rodar `next build` e registrar First Load JS por rota. Meta: rota do leitor
   < 200 KB sem nenhum código de Cesium/Deck.gl/MapLibre/Three.js/WebLLM. Isolar com
   import dinâmico onde vazar.
2. Exportar cada tradução + interlinear como arquivo SQLite estático (script em
   `backend/scripts/`), servido por CDN/`public/` com hash de versão.
3. No frontend, leitura e busca FTS5 local via SQLite-WASM com OPFS; o backend só é
   chamado para IA, dados do usuário e recursos não baixados. Download opcional por
   tradução, com tamanho exibido.
4. Medir: tempo para abrir capítulo e buscar termo, online frio (cold start do
   Render) vs. offline local. Reportar números.

### T2.5 — Lente teológica configurável

O prompt atual fixa "meio-termo calvinista/arminiano" como padrão
(`backend/src/rag/prompts.ts`, `rag.service.ts`). Adicionar preferência de perfil
`theologicalLens` (Reformada, Wesleyana-Arminiana, Pentecostal, Batista, Luterana,
Católica, Acadêmica-neutra) que muda enquadramento e ranking de fontes. Padrão
continua neutro-acadêmico. Testes de que a lente altera o prompt e não remove as
citações.

### T2.6 — Tradução persistida dos comentários

Hoje a tradução EN→PT é feita sob demanda com cache em memória
(`frontend-v2/src/lib/translate.ts`, proxy `/api/translate`) que zera a cada restart.
Pré-traduzir em lote (respeitando o controle de custo de IA, AGENTS §7 — pedir
autorização para o volume) as obras mais consultadas, gravar em
`ResourceChunkTranslation(chunkId, lang, text, method, createdAt)` e marcar na UI
"tradução automática".

---

# FASE 3 — DIFERENCIAIS (comece cada um com um design doc curto em `docs/architecture/` e aguarde aprovação)

### T3.1 — Respostas de IA com evidência verificável

Antes de construir, leia o que já existe em `backend/src/rag/evidence-pack.service.ts`,
`evidence-aware-rag.service.ts` e `evidence.controller.ts` e reporte o que falta.
Meta:

1. Toda afirmação da resposta carrega âncoras `[chunkId]` e/ou referência bíblica.
2. Verificação pós-geração: o trecho citado existe e contém o que é afirmado
   (casamento textual + checagem de suporte); referências bíblicas citadas são
   resolvidas para o texto real.
3. Afirmações sem suporte são marcadas visualmente; modo "somente o que a biblioteca
   diz".
4. Painel de evidências lado a lado.
5. Métrica: % de afirmações com suporte num conjunto fixo de 30 perguntas de
   avaliação versionado no repositório.

### T3.2 — Rastreio de palavra (depende de T1.6)

Selecionar uma palavra em português → todos os lemas originais por trás dela no
cânon, com distribuição; e o inverso (lema → todas as traduções em PT com
contagem).

### T3.3 — Segundo cérebro pastoral (depende de T0.4 e T2.1)

Notas e sermões do usuário indexados em `UserEmbedding` (uso legítimo dessa tabela);
consultas do tipo "o que já preguei sobre Romanos 8?" e "sermões que usam
Jo 3.16"; arquivo de sermões pregados com data/local; tudo restrito ao `userId` do
JWT, com teste de isolamento.

---

## FORMATO DO RELATÓRIO (ao fim de cada tarefa)

```
## <ID> — <título>
Status: CONCLUÍDA | PARCIAL | BLOQUEADA (motivo)
Branch / commits: ...
O que mudou (arquivos principais com caminho:linha): ...
Números medidos:
  - backend: N testes (antes M), lint X, typecheck Y
  - frontend: N testes, tsc X
  - static-checks: N achados
  - específicos da tarefa (ex.: precisão do extrator = 0,93 em 50 amostras)
Caminhos de falha testados: ...
NÃO verificado (e por quê): ...
Depende do dono: ...
AGENTS.md §6 atualizado: sim/não
```

## CRITÉRIO DE PARADA

- Pare e peça decisão ao dono quando: precisar de credencial, de migração/deploy em
  produção, de gasto de cota de IA acima do lote diário, de licença não verificável,
  ou quando uma tarefa depender de D1–D6.
- Ao terminar cada fase, pare e entregue o resumo da fase antes de iniciar a próxima.
