# Relatório Diário TheoSphere — 2026-08-02

## Status Geral: 🟡

Nada quebrado. O amarelo é o **acervo em zero** (por decisão, não por bug) e o
fato de que o comportamento da IA em runtime **não foi medido** — o sandbox não
tem rede de saída para POST.

## O que foi medido

Este relatório garante: que o código compila, passa 128 + 49 testes e está limpo
no eslint; que os 12 endpoints de produção respondem com dados reais; que a
config anti-truncagem continua correta no código; e que nenhum botão morto, rota
inexistente ou falha silenciosa nova apareceu. **Não garante** que a IA responde
texto real (e não enlatado), nem que a resposta chega inteira — nada disso foi
executado hoje, porque exige POST e o proxy do sandbox devolve `403` para
qualquer saída HTTP que não seja a ferramenta de fetch (só GET).

| Componente        | Verificação                     | Status                        | Corrigido? |
| ----------------- | ------------------------------- | ----------------------------- | ---------- |
| Backend           | lint / test / build             | ✅ / ✅ (128) / ✅            | —          |
| Frontend          | lint / test / build             | ✅ (1 warning) / ✅ (49) / ✅ | —          |
| Comportamento     | handlers / rotas / silêncio     | ✅ 0 / 0 / 0                  | —          |
| Produção          | 12 endpoints                    | ✅                            | N/A        |
| IA                | health/ai ✅ · resposta real ❔ | ⚠️ parcial                    | N/A        |
| Resposta completa | chat ❔ / Factbook ❔           | ❔ não medido                 | N/A        |
| Biblioteca        | 0 trechos (purga de 01/08)      | 🟡                            | N/A        |

## Correções aplicadas

Nenhuma. Não houve erro a corrigir.

## Erros não resolvidos

Nenhum erro. Duas medições ficaram **em aberto por limite de ambiente**:

- **Fase 4.1 / 4.2 (runtime da IA)** — `POST /api/v1/rag/chat`,
  `check-prod-answer.js` e `check-factbook.js` precisam de rede de saída. Do
  sandbox: `curl` → `HTTP 403 from proxy after CONNECT`; `fetch` do Node →
  `fetch failed`, inclusive com `--use-env-proxy`. **Rodar no Mac.**
- **Fase 4.3 (acervo)** — `inspect-library.js` lê o Postgres, também bloqueado.

Um warning de lint no frontend, pré-existente e legítimo (não é erro):
`BibleReader.tsx:276` — o React Compiler pula a memoização por causa do
`useVirtualizer()` do TanStack Virtual, cuja API devolve funções que não podem
ser memoizadas com segurança. Nada a fazer.

## Produção

HEAD local `926d5b5`, árvore de trabalho limpa. Nenhum sinal de deploy pendente.

| Endpoint                                  | Resultado                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| `/health`                                 | ✅ `status:ok`, database up, redis up                                           |
| `/health/ai`                              | ✅ `provider:gemini`, `configured:true`, `lastFailure:null`, `hint:null`        |
| `/bible/versions`                         | ✅ 7 traduções (BLIVRE, NVA, ARA, NVIPT, KJV, TR, WLC) com metadados de licença |
| `/bible/books`                            | ✅ 66 livros                                                                    |
| `/bible/chapter/BLIVRE/1/1`               | ✅ Gênesis 1, 31 versículos                                                     |
| `/bible/passage-guide/BLIVRE/1/1`         | ✅ 200, payload grande (~63 KB)                                                 |
| `/search/verses?q=luz&translation=BLIVRE` | ✅ 20 resultados com score e keywordRank                                        |
| `/cross-refs?ref=John 3:16`               | ⚠️ corpo vazio na ferramenta de fetch — **falso alarme conhecido** (ver abaixo) |
| `/geo/locations`                          | ✅ 48 locais                                                                    |
| `/archaeology/stats`                      | ✅ 102 itens agregados por categoria e autenticidade                            |
| `/linguistics/interlinear/1/1`            | ✅ 200, payload grande (~62 KB)                                                 |
| `/rag/stats`                              | ✅ 200 (índice em memória — não mede o acervo)                                  |

**Sobre o `cross-refs`:** testei com quatro variações (`John 3:16`, `John+3:16`,
`Genesis 1:1`, com e sem `limit`) e a ferramenta de fetch devolveu corpo vazio em
todas. O controller (`cross-references.controller.ts:63`) **sempre** devolve o
envelope `{success, data:{source, count, refs}}` — não existe caminho de código
que retorne vazio. É o mesmo comportamento diagnosticado como falso alarme em
31/07, quando `curl -i` no Mac confirmou `HTTP/2 200 application/json`. Como o
`curl` do sandbox está bloqueado por proxy hoje, não deu para reconfirmar daqui.

## IA e biblioteca

- **Provedor:** `gemini`, configurado, `lastFailure:null`, `hint:null`. Infra de
  IA saudável — sem sinal de teto de gastos, cota estourada, chave inválida ou
  timeout.
- **Config anti-truncagem (conferida no código):** `rag.service.ts` linhas
  275 e 282 — `thinkingConfig: { thinkingBudget: 0 }` e `maxOutputTokens: 3000`.
  A regressão de 30/07 não está presente.
- **Resposta real vs. enlatada:** NÃO MEDIDA (POST bloqueado).
- **Resposta completa / Factbook:** NÃO MEDIDAS (rede de saída bloqueada).
- **Biblioteca: 0 trechos.** 🟡 A purga do portão de licença (01/08, commit
  `926d5b5`) removeu 10 obras e 27.887 trechos — tudo que não era domínio
  público. **O acervo está vazio por decisão, não por bug.** Consequência prática
  hoje: toda resposta sai do conhecimento geral do Gemini, nenhuma usa as obras
  do Cristiano, e toda pergunta custa chamada de IA (sem o alívio de cota que o
  acervo dava).
- **Atenção — tarefa noturna às 20h:** `theosphere-library-ingest` roda com o
  manifesto `licencas.json` vazio, então indexa 0 obras todo dia. Vale pausá-la
  até liberar as primeiras obras de domínio público (fila em
  `FILA-INGESTAO-DOMINIO-PUBLICO.md`).

## A rodar no Mac (fecha os buracos deste relatório)

```bash
cd ~/Downloads/TheoSphere
node backend/scratch/check-prod-answer.js "Quem foi Ninive na Biblia? Responda em duas frases."
node backend/scratch/check-factbook.js Melquisedeque
node backend/scratch/inspect-library.js
curl -i "https://theosphere.onrender.com/api/v1/cross-refs?ref=John+3:16&limit=5"
```

## Deploy pendente

Nenhum. Todos os endpoints do código respondem em produção; HEAD local
`926d5b5` com árvore limpa.

---

### Notas de execução no sandbox

- Cada chamada de bash roda em um PID namespace próprio: processo em background
  morre no fim da chamada. Tudo precisa caber em ~40s **em foreground**.
- `npm run lint` do backend usa `--fix` e não termina na janela disponível.
  Rodei `npx eslint` sem `--fix`, em quatro lotes por diretório
  (rag/auth/bible · archaeology/audit/collaboration/common/engines/events ·
  geospatial/health/linguistics/observability/prisma/search/raiz · test).
  Zero problemas em todos. `src/types` está no ignore do eslint.
- Backend build: `prisma generate` bloqueado → cópia em `/tmp` com symlink de
  `node_modules` e `npx tsc -p tsconfig.build.json --noEmit` → limpo.
- Frontend build: cópia em `/tmp`, stub de `next/font/google` no `layout.tsx`,
  `typescript.ignoreBuildErrors` na cópia, `next build --webpack` → 20 rotas
  geradas. `npx tsc --noEmit` rodado à parte no repositório real → limpo.
  Nenhuma dessas mudanças tocou o repositório.
