# Relatório Diário TheoSphere — 2026-07-31

## Status Geral: 🟢

> **Correção pós-verificação (2026-07-31, com o Cristiano no Mac).** Eu havia
> marcado este dia como 🔴 por causa do `/api/v1/cross-refs` supostamente vazio.
> **Era falso alarme meu:** `curl -i` no Mac mostrou `HTTP/2 200`,
> `content-type: application/json`, etag de corpo não-vazio. O "vazio" foi
> artefato da minha ferramenta de fetch (web_fetch) com essa rota — não do
> servidor. Do sandbox NÃO dá para ler o status HTTP real, então não deveria ter
> escalado para vermelho. Os 12/12 endpoints estão saudáveis. Ver seção Produção.
>
> A Fase 4, também verificada no Mac: a **biblioteca está populada** —
> `inspect-library.js` retornou **12.699 trechos** (Institutas Editora Fiel 4367,
> Cultura Cristã Vol 1 3866 e Vol 3 3026, Hoekema "Línguas" 1440). A ingestão de
> 30/07 pegou; a saga da biblioteca vazia está encerrada.

## O que foi medido

Do sandbox: o código compila, passa lint/testes/build e não tem botão morto
(fases 1-2), e os 12 endpoints de produção respondem (11 confirmados via web_fetch;
o cross-refs confirmado via `curl` no Mac). No Mac, com o Cristiano: biblioteca
com 12.699 trechos. **Ainda não medido em runtime:** se a IA responde de
verdade/inteira (o `POST /rag/chat` e `check-prod-answer`/`check-factbook` exigem
POST ou rede de saída do Node, indisponíveis no sandbox) — só verifiquei a infra
de IA (`/health/ai` OK) e a config anti-truncagem no código.

| Componente        | Verificação                                  | Status                              | Corrigido? |
| ----------------- | -------------------------------------------- | ----------------------------------- | ---------- |
| Backend           | lint / test / build                          | ✅                                  | N/A        |
| Frontend          | lint / test / build                          | ✅                                  | N/A        |
| Comportamento     | handlers / rotas / silêncio                  | ✅                                  | N/A        |
| Produção          | 12/12 endpoints OK (cross-refs 200 via curl) | ✅                                  | N/A        |
| IA                | health/ai OK · resposta real                 | ⚠️ infra OK, conteúdo não medido    | N/A        |
| Resposta completa | chat + Factbook                              | ⚠️ não medida (config OK no código) | N/A        |
| Biblioteca        | 12.699 trechos indexados                     | ✅                                  | N/A        |

## Correções aplicadas

Nenhuma correção de código foi necessária. A suíte local está 100% verde (backend
122 testes, frontend 49 testes, ambos os builds passam) e o `static-checks` não
achou nada novo (0 handlers, 0 rotas, 0 silêncio; allowlist inalterada).

## Erros não resolvidos

Nenhum. (O `/api/v1/cross-refs` reportado como quebrado foi falso alarme —
detalhado abaixo.)

## Falso alarme corrigido — `/api/v1/cross-refs`

- **O que eu disse:** que o endpoint devolvia corpo vazio em produção → 🔴.
- **Realidade (curl -i no Mac):** `HTTP/2 200`, `content-type: application/json`,
  `etag` de corpo não-vazio, servido por Cloudflare. **Endpoint saudável.**
- **Causa do erro:** minha ferramenta de fetch (web_fetch) retornou vazio para
  essa rota específica — provavelmente pelos headers de CSP/Cloudflare. Do
  sandbox não é possível ler o status HTTP real (curl/Node sem rede: HTTP=000 /
  EAI_AGAIN; web_fetch esconde o status).
- **Lição para as próximas verificações:** não escalar para vermelho com base só
  em "web_fetch veio vazio" — pedir um `curl -i` ao Cristiano antes de afirmar
  outage.

<details><summary>Diagnóstico original (arquivado — estava errado)</summary>

### 🔴 `/api/v1/cross-refs` retorna corpo vazio em produção

- **Sintoma:** `GET /api/v1/cross-refs?ref=John 3:16` devolve resposta sem corpo
  e sem `Content-Type`. Os outros 11 endpoints devolvem JSON com
  `Content-Type: application/json`. Reproduzido 3× com servidor quente.
- **Não é bug de código:** `CrossReferencesController` (`@Controller('api/v1/cross-refs')`)
  está registrado em `bible.module.ts`, o handler sempre retorna
  `{success:true, data:{source, count, refs}}` (nunca vazio), e a rota entrou nos
  commits `f215fa4`/`e414e1c`, ambos ancestrais do HEAD atual `91f2412`. A suíte
  local passa.
- **Descarte de hipóteses:** um 404 do Nest devolveria JSON
  (`{"statusCode":404,...}`) com content-type; tabela vazia devolveria
  `{count:0, refs:[]}`; tabela ausente lançaria P2021 → 500 com JSON. Nenhum
  desses produz corpo totalmente vazio. Corpo vazio sem content-type aponta para
  camada de plataforma/processo (502/503 do Render ou conexão encerrada) **só
  nessa rota**.
- **Não pude fechar o diagnóstico daqui:** a ferramenta de fetch só aceita as 12
  URLs do provenance (não testei variações de `ref`) e o `curl`/Node do sandbox
  não tem rede de saída (`HTTP=000` / `EAI_AGAIN`), então não consegui ler o
  código de status HTTP real.
- **Caminho para o Cristiano (no Mac):**
  1. Confirmar que o Render fez deploy do HEAD `91f2412` (Dashboard → Events).
  2. `curl -i "https://theosphere.onrender.com/api/v1/cross-refs?ref=John%203:16"`
     para ver o status real (200 vazio? 502? 500?).
  3. Se 500/erro: checar se a tabela `CrossReference` existe e está semeada na
     base de produção (o baseline veio de `e414e1c`); rodar o seed TSK se estiver
     vazia/ausente.
  4. Ver os logs do Render no momento do request — um stack trace ali fecha o caso.

</details>

## Produção

Aquecimento do Render: ~ primeiro request respondeu dentro de 30s.
**cross-refs corrigido para ✅** após o `curl -i` no Mac (200 / application/json).

| Endpoint                                  | Resultado                                                          |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `/health`                                 | ✅ `status:ok`, database up, redis up                              |
| `/health/ai`                              | ✅ `status:ok`, provider gemini, configured:true, lastFailure:null |
| `/bible/versions`                         | ✅ 7 versões (BLIVRE, NVA, ARA, NVIPT, KJV, TR, WLC)               |
| `/bible/books`                            | ✅ 66 livros                                                       |
| `/bible/chapter/BLIVRE/1/1`               | ✅ Gênesis 1, 31 versículos                                        |
| `/bible/passage-guide/BLIVRE/1/1`         | ✅ 200, payload grande (~63 KB)                                    |
| `/search/verses?q=luz&translation=BLIVRE` | ✅ 20 resultados, com score/rank                                   |
| `/cross-refs?ref=John 3:16`               | ✅ HTTP/2 200, application/json (confirmado via `curl -i` no Mac)  |
| `/geo/locations`                          | ✅ 48 locais                                                       |
| `/archaeology/stats`                      | ✅ agregados por categoria/autenticidade (102 itens)               |
| `/linguistics/interlinear/1/1`            | ✅ 200, payload grande (~62 KB)                                    |
| `/rag/stats`                              | ✅ 200 (ver ressalva na seção IA)                                  |

## IA e biblioteca

- **Provedor / última falha:** `gemini`, `configured:true`, `lastFailure:null`,
  `hint:null`. A infra de IA está saudável — sem sinal de teto de gastos, cota,
  chave inválida ou timeout.
- **Config anti-truncagem (verificada no código):** `buildGeminiRequest` em
  `rag.service.ts` (linhas 275/282) está com `thinkingConfig:{ thinkingBudget:0 }`
  e `maxOutputTokens:3000` — exatamente a configuração correta. A regressão de
  30/07 (raciocínio consumindo o teto) **não** está presente no código.
- **Resposta real vs. enlatada (4.1):** NÃO MEDIDA. Exige `POST /rag/chat`; a
  ferramenta de fetch do sandbox só faz `GET` e o `fetch` do Node não tem rede
  (`EAI_AGAIN`). Não consigo confirmar daqui se a resposta é real, enlatada
  (`fallback-responses.ts`) ou de cache envenenado.
- **Resposta completa (4.2):** NÃO MEDIDA. `check-prod-answer.js` e
  `check-factbook.js` usam `fetch` de saída (bloqueado). Só a config estática foi
  conferida (acima).
- **Biblioteca do Drive (4.3):** ✅ **POPULADA.** `inspect-library.js` no Mac do
  Cristiano retornou **12.699 trechos** `library_book` (1 usuário): Institutas —
  Editora Fiel (4367), Institutas Vol 1 — Cultura Cristã (3866), Institutas Vol 3
  — Cultura Cristã (3026) e Hoekema "Línguas" (1440). A ingestão de 30/07 à noite
  persistiu. (Nota: o `userContext.totalDocuments:0` do `rag/stats` é um índice em
  memória, não o acervo do Drive — não usar para medir a biblioteca.)
- **Ainda a medir no Mac (runtime da IA):**
  `node backend/scratch/check-prod-answer.js "..."` (truncagem/enlatado) e
  `node backend/scratch/check-factbook.js Melquisedeque` (JSON estruturado).

## Deploy pendente

Nenhum sinal de deploy pendente. Os 12 endpoints respondem (cross-refs confirmado
via `curl`). HEAD local: `91f2412 Portao de qualidade do acervo antes da
indexacao`, árvore de trabalho limpa.
