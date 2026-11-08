# Prompt — Finalizar a Fase 1 do TheoSphere (pós-revisão de 2026-11-05)

> Cole este arquivo inteiro no Antigravity. Ele continua o plano original
> (`audit/prompts/antigravity-plano-melhorias-2026-11-05.md`), cujas **regras
> inegociáveis, tarefas do dono (D1–D6) e formato de relatório continuam valendo**.
> Leia `AGENTS.md` e o plano original antes de começar.

## PAPEL

Você é o engenheiro responsável por fechar a Fase 1 do TheoSphere. Uma revisão
independente (Claude Code, 2026-11-05) conferiu T1.1–T1.5 contra os critérios de
aceite do plano. Parte foi corrigida na branch `fix/t1-review-corrections`. Sua
tarefa é integrar essa branch, terminar o que ficou aberto e seguir com T1.6–T1.8.

## REGRA DE CONVIVÊNCIA (nova — causou incidente)

Dois agentes trocando de branch na mesma pasta já fizeram um commit cair na
branch errada. **Trabalhe num worktree próprio** ou avise o dono antes de trocar
de branch na pasta principal:

```bash
git worktree add ../theosphere-ag <branch>
```

---

## PASSO 0 — Destravar o build (bloqueador)

O seu trabalho não commitado em `backend/src/common/book-map.ts` quebra o
backend: **155 erros TS1117** ("An object literal cannot have multiple properties
with the same name"). O bloco de abreviações novo repete chaves que já existem
(`jud`, `ap`, `rev`, `os`, `am` etc.).

Corrija antes de commitar, observando estes problemas de lógica no mesmo bloco:

- `jn: 32` manda "Jn" para **Jonas**. Em inglês, "Jn" é **João** (Jn 3:16). A
  abreviação ambígua precisa de regra por idioma ou deve ficar de fora.
- Várias abreviações são palavras comuns em EN/PT: `is`, `at`, `am`, `ex`, `ne`,
  `os`, `ed`, `et`, `na`, `ag`, `cl`. Num extrator por regex ("at 5:30",
  "is 3:16"), elas geram falsos positivos. Restrinja o uso delas no extrator, por
  exemplo exigindo maiúscula inicial, um ponto ou uma lista de exclusão, e teste
  esses casos.
- `jn_nt` não é uma abreviação real. Remova.

**Aceite:** `npm run verificar` e `npm run typecheck` com exit 0; testes do
extrator com os falsos positivos acima.

## PASSO 1 — Integrar a branch de correções

```bash
git merge fix/t1-review-corrections   # 41b3407, sobre aea54da; sem conflito com feat/t1.5
```

O que ela já corrige (não refaça):

| Tarefa | Correção                                                                                                                                                             | Evidência                                                    |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| T1.2   | KJV→LXX passa pelo MT. O LXX do banco segue Rahlfs (título = v.1, capitulação do MT fora dos Salmos). Corrigidos Sl 9–10, 114–115, títulos e Ml 4/Jl 2/Nm 16         | 13 casos novos com ida e volta; 10 falhavam no código antigo |
| T1.1   | `ingestChapter` devolvia `[]` quando o banco recusava a gravação (read-only), descartando o capítulo já baixado do bolls.life. Agora serve o texto e registra `warn` | `bible-ingestion.service.spec.ts` (3 testes)                 |
| T1.5   | Os 7 versículos "MACULA" eram escritos à mão. Agora estão em `curated-syntax.data.ts`, com `method: 'curated-manual'` e `isAnnotatedTree: false`                     | Invariante em `syntax-diagram.service.spec.ts`               |
| T1.4   | Script de migração copia o embedding, fica idempotente nas referências e tem `--dry-run` que mede sem gravar. O guia registra `warn` quando o índice falha           | Spec do caminho de falha                                     |

Estado após o merge: backend 459/459, frontend 65/65, typecheck 0, static-checks 0.

---

## PASSO 2 — Fechar o que ficou aberto em T1.1–T1.5

### T1.1 — SBLGNT

1. **Morfologia (`InterlinearWord`) para o SBLGNT.** O aceite exige lema, morfologia
   e Strong. Fonte preferida: **MACULA Greek** (CC BY 4.0, já aprovado), que traz
   o SBLGNT anotado. ⚠️ O **MorphGNT** é CC BY-**SA**. Não use sem decisão do dono
   (regra 6 do plano).
2. **Contagem por livro medida, não declarada.** O registro de licença afirma
   "7.958 versículos". Gere a contagem por livro a partir do arquivo-fonte e
   compare com o `sblgnt-verses.json.gz`, registrando os números.
3. Ingestão real só depois de D3 (banco gravável). Até lá, o leitor recebe o
   SBLGNT pelo bolls.life (já conferido: `bolls.life/get-chapter/SBLGNT/43/1/`
   responde).

### T1.2 — Versificação

1. Usar `mapTranslationRef` também nos **painéis paralelos, no Link Set e na
   sinopse**. Hoje só a comparação usa.
2. Eliminar a cópia duplicada (`backend/src/bible/versification.ts` ×
   `frontend-v2/src/lib/versification.ts`): gere uma a partir da outra, como no
   `scripts/sync-catalog.mjs`, ou crie um teste que falhe se divergirem.
3. **Teste orientado a dados (somente leitura):** para cada versículo KJV dos
   Salmos, confirme que a referência mapeada para WLC e para LXX **existe no banco**.
   Reporte o número de órfãos. Faça o mesmo para Jeremias, Êxodo 35–40 e Daniel,
   onde a LXX diverge em ordem e conteúdo, e documente o que não for mapeável.

### T1.3 — Referência numérica

Rodar `scripts/populate-cross-ref-numeric.ts` quando o banco estiver gravável e
reportar linhas preenchidas × total e as referências não parseadas.

### T1.4 — Índice de referências (o mais incompleto)

Ainda falta:

1. **Esquema:** `ResourceReference` tem só `canonicalRef`. O plano pede
   `startRef`, `endRef` (intervalos como "Jo 3:16-18") e
   `kind 'heading' | 'inline'`, com índice de intervalo.
2. **Chunking estrutural** por cabeçalhos (CHAPTER/VERSE em Matthew Henry,
   Calvino etc.), com fallback de janelas com sobreposição. Hoje o script só
   copia os chunks antigos de 500 palavras.
3. **Extrator** PT+EN: abreviações (com os cuidados do Passo 0), intervalos e
   "v. 16" resolvido pelo cabeçalho corrente. Reaproveite
   `frontend-v2/src/lib/bibleReference.ts`.
4. **Aceite numérico:** auditoria manual de **50 trechos** com a precisão do
   extrator em número. Use o `--dry-run`, que agora mede. Inclua o
   `EXPLAIN ANALYZE` da consulta do guia mostrando o uso de índice.
5. Não apague nada de `UserEmbedding` antes de conferir a contagem origem × destino.

### T1.5 — Treebank real (ou BLOQUEADA)

Escreva um script que importe o **Lowfat XML do MACULA Greek** (github.com/Clear-Bible/macula-greek),
preservando os **IDs de palavra** (`n43001001001`…). Sirva o resultado com
`method: 'treebank'` e `isAnnotatedTree: true` **somente** para o que veio desse
import. Reporte a cobertura (versículos com árvore ÷ total do NT).

O invariante em `syntax-diagram.service.spec.ts` vai falhar quando o treebank
real entrar. Atualize-o para exigir que todo `treebank` tenha IDs MACULA.
Se não for possível, marque **BLOQUEADA**. Nunca gere a árvore com LLM.

### Achado novo — texto do LXX no banco é sequência de lemas

Medido em 2026-11-05: `LXX Sl 9:2` = "ἐκὁμολογέω σύ κύριος ἐν ὅλος καρδία ἐγώ
διαἡγέομαι…". São **lemas**, não o texto flexionado, e há junções quebradas
como "ἐκὁμολογέω" e "διαἡγέομαι". Investigue o script de ingestão do LXX e a fonte,
e corrija os dados com uma fonte licenciada (ex.: Rahlfs-1935 aberto, conferindo a
licença). Se não der, rotule na UI que o texto é lematizado. Esse defeito afeta a
leitura, a comparação e a busca.

---

## PASSO 3 — Seguir o plano original

T1.6 (interlinear reverso PT), T1.7 (aparato crítico) e T1.8 (busca morfológica),
depois as Fases 2 e 3, exatamente como no plano original.

## LEMBRETES

- As migrações `20261105170000_cross_reference_numeric_ref` e
  `20261105173000_resource_theological_index` estão em `prisma/migrations/` e
  rodam no deploy. Com o banco em read-only, o `migrate deploy` falha e o servidor
  sobe mesmo assim (T0.7). Por isso, todo código novo que lê essas tabelas precisa
  degradar com `warn`, nunca com 500 nem em silêncio.
- **Não faça merge na `main` nem deploy** sem pedido do dono.
- Relatório por tarefa no formato do plano original, com números e com a seção
  "o que NÃO foi verificado".

---

## ADENDO — 2026-11-06 (release do teste fechado, já na `main`)

Antes de qualquer coisa: `git pull` na `main`. Já entraram (não refaça):

- `fix/t1-review-corrections` (Passo 1 acima) está na `main`.
- Rotas fora de `/api/v1` corrigidas: annotations, billing, syntax-diagram,
  textual-criticism, resources. **Todo controller novo precisa de
  `@Controller('api/v1/...')`.** O `route-prefix.spec.ts` falha se faltar.
- Feedback real (`POST /api/v1/feedback`), cota de IA no `chat/stream` e para
  visitantes (por IP), `trust proxy`, rate limit com reserva em memória quando o
  Redis cai.
- `node backend/scripts/smoke-teste-producao.mjs` testa o fluxo do testador de
  ponta a ponta.

O Passo 0 (book-map.ts) continua valendo, caso essa edição volte.
A pasta principal tem cópias de conflito do iCloud com " 2" no nome
(ex.: `ingest-sblgnt 2.ts`, `migration 2.sql`). Apague-as e não as commite.
