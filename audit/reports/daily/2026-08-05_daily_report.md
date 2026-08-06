# Relatório Diário TheoSphere — 2026-08-05

## Status Geral: 🟡

Dois motivos, nenhum deles um bug novo no código:

1. **A Fase 4 não foi medida hoje.** O sandbox ficou sem espaço em disco no meio da verificação e travou de vez — nenhum comando roda mais nele. Justamente as três perguntas que mais importam (a IA responde de verdade? inteira? usando o acervo?) ficaram sem resposta.
2. **O `next build` do frontend não chegou ao fim.** Compilou com sucesso (32,4 s) e morreu em `Collecting page data` quando o disco encheu. A compilação passou; o empacotamento não foi observado até o fim.

Tudo que **foi** medido passou. Nenhum achado novo de comportamento, nenhum endpoint fora do ar, IA reportando saúde normal.

## O que foi medido

Este relatório garante: o backend passa lint, 140 testes e typecheck; o frontend passa lint e typecheck; não há botão sem handler nem rota inexistente; os 12 endpoints de produção respondem com dados reais (verificado o conteúdo, não só o status).

Este relatório **não** garante: que a IA responde sem texto enlatado, que a resposta chega completa, que a biblioteca do Drive tem acervo, nem que o `next build` produz artefato válido. Essas quatro coisas não foram testadas hoje.

| Componente        | Verificação                 | Status                         | Corrigido?           |
| ----------------- | --------------------------- | ------------------------------ | -------------------- |
| Backend           | lint / test / build         | ✅ / ✅ / ✅                   | Nada a corrigir      |
| Frontend          | lint / test / build         | ✅ / ⚪ não rodou / ⚠️ parcial | Bloqueio de ambiente |
| Comportamento     | handlers / rotas / silêncio | ✅                             | Nada a corrigir      |
| Produção          | 12 endpoints                | ✅                             | N/A                  |
| IA                | health/ai                   | ✅                             | N/A                  |
| IA                | resposta real (enlatada?)   | ⚪ não medido                  | N/A                  |
| Resposta completa | chat + Factbook             | ⚪ não medido                  | N/A                  |
| Biblioteca        | trechos indexados           | ⚪ não medido                  | N/A                  |

## Correções aplicadas

Nenhuma. Não houve erro corrigível — os dois problemas do dia são do ambiente de verificação, não do repositório. Nada foi alterado no código, na allowlist ou nos testes.

## Erros não resolvidos

**Sandbox sem espaço em disco (bloqueante para as fases 4 e parte da 1).**
A cópia do frontend para `/tmp` mais a saída do `next build` esgotaram o disco do sandbox. A partir daí todo comando falha com `no space left on device`, inclusive o `rm -rf` que limparia a bagunça. Não é corrigível de dentro: o shell não sobe mais.

Caminho: reiniciar a sessão do sandbox (o disco é efêmero e volta limpo). Nas próximas execuções, rodar o `next build` direto em `frontend-v2` com `NEXT_DISABLE_FONT_DOWNLOADS` ou stub aplicado in loco e revertido, em vez de duplicar a árvore inteira em `/tmp` — a cópia custava ~1 GB antes mesmo de o build começar.

**Frontend `npm run test` não chegou a rodar.** Ficou na fila atrás do build quando o disco acabou. Lacuna de cobertura de hoje, não regressão conhecida.

Observação metodológica: no sandbox, processos em background morrem entre chamadas do bash. `setsid <cmd> </dev/null & disown` sobrevive — foi o que permitiu rodar lint, testes e typecheck, que passam dos 45 s de teto por chamada.

## Produção

Commit mais recente no repositório: `aad399f` — _fix(acervo): portao de licenca no runtime da ingestao + idempotencia por fileId_. Nenhum 404 em endpoint existente. **Nenhum deploy pendente detectado.**

| Endpoint                          | Resultado                                                                                       |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| `/health`                         | ✅ `status: ok` — database up, redis up                                                         |
| `/health/ai`                      | ✅ `provider: gemini`, `configured: true`, `lastFailure: null`                                  |
| `/bible/versions`                 | ✅ 7 versões, com metadados de licença (BLIVRE e NVA livres; ARA e NVIPT marcadas `restricted`) |
| `/bible/books`                    | ✅ 66 livros                                                                                    |
| `/bible/chapter/BLIVRE/1/1`       | ✅ Gênesis 1 completo, 31 versículos                                                            |
| `/bible/passage-guide/BLIVRE/1/1` | ✅ 63 KB de payload (truncado pela ferramenta de fetch, não pela API)                           |
| `/search/verses?q=luz`            | ✅ 3 resultados com texto e score                                                               |
| `/cross-refs?ref=John 3:16`       | ✅ 12 cross-refs reais — medido pelo vizinho (ver nota)                                         |
| `/geo/locations`                  | ✅ 48 locais com coordenadas e descrição                                                        |
| `/archaeology/stats`              | ✅ 102 achados: 84 confirmados, 15 debatidos, 3 disputados                                      |
| `/linguistics/interlinear/1/1`    | ✅ 62 KB de payload                                                                             |
| `/rag/stats`                      | ✅ responde — porém `totalDocuments: 0` (ver nota)                                              |

**Nota sobre `/cross-refs`:** o endpoint continua opaco para a ferramenta de fetch do sandbox — o corpo nunca é renderizado. Medido pelo vizinho `/bible/passage-guide/BLIVRE/43/3?verse=16`, que consome o mesmo `CrossReferencesService`. Retornou `crossReferences.mode: "list"` com 12 referências para João 3:16 (Jo 1:14, 3:15, 3:17, 3:36, 5:24, 6:40, 17:3, Rm 5:8, 8:32, 1Jo 4:9, 4:10, 5:11). Tabela populada.

**Nota sobre `/rag/stats`:** o `totalDocuments: 0` é do cache em memória do processo, que zera a cada restart do Render. Não diz nada sobre o acervo indexado — e o Render free reinicia com frequência. Este endpoint não serve para medir a biblioteca.

### Duas lacunas de conteúdo confirmadas de novo hoje

Nenhuma é regressão; ambas continuam na fila.

- **Léxico vazio.** `passage-guide` de João 3:16 devolveu `lexicon: []` para 26 palavras gregas. O seed é uma amostra (~36 verbetes hebraicos, 12 gregos), então o painel volta vazio em quase toda a Bíblia.
- **Comentários vazios.** `commentaries: []` no mesmo versículo — coerente com a purga de 10 obras licenciadas de 01/08.

### Uma observação nova, não confirmada

Na busca por "luz", os três resultados vieram com `vectorRank: null` e `keywordRank` 1, 2, 3 — ou seja, a metade semântica do ranking híbrido não contribuiu; só o full-text ordenou. Pode ser o comportamento correto para uma palavra curta e frequente, e pode ser o braço vetorial fora do ar. **Não investiguei** — o sandbox já tinha travado. Vale um teste dirigido na próxima execução: uma consulta conceitual ("perdão dos inimigos") deveria produzir `vectorRank` preenchido; se vier `null` de novo, é regressão.

## IA e biblioteca

- **Provedor:** Gemini, configurado, sem falha registrada. `lastFailure: null` e `hint: null` — nenhum sinal de teto de gastos, cota estourada ou chave inválida.
- **Resposta real ou enlatada:** não medido. O `POST /rag/chat` exige requisição POST, que a ferramenta de fetch do sandbox não faz, e o Node do sandbox está bloqueado para HTTP de saída — antes mesmo do travamento por disco.
- **Truncagem:** não medida (`check-prod-answer.js` e `check-factbook.js` precisam de Node com rede).
- **Tamanho do acervo:** não medido (`inspect-library.js` idem).

Vale repetir o que o `health/ai` significa e o que não significa: ele diz que a chave está configurada e que a última chamada não falhou. Ele **não** diz que a resposta chegou inteira nem que veio do acervo em vez do `fallback-responses.ts`. Foi exatamente essa distinção que deixou a plataforma servir ensaio sobre Calvinismo com HTTP 200 em julho. Hoje o verde da linha "IA" cobre só a metade barata da pergunta.

Para fechar essa lacuna sem depender do sandbox, o caminho é rodar no Mac:

```bash
cd ~/Downloads/TheoSphere
node backend/scratch/check-prod-answer.js "Explique a estrutura sintatica de Filipenses 2:6-11"
node backend/scratch/check-factbook.js Melquisedeque
node backend/scratch/inspect-library.js
```

## Deploy pendente

Nenhum. Todos os endpoints do código respondem em produção; nenhum 404 em rota existente.
