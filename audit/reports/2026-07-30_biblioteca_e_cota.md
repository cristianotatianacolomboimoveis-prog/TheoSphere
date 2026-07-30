# Biblioteca antes da IA + cota por testador — 2026-07-30

Commit `689bb6b`. 109 testes, lint e tsc limpos. Backend em produção com o código novo.

---

## 🔴 Descoberta: a biblioteca do Drive está vazia

Antes de implementar, fui ver o que existe no acervo:

```
UserEmbedding por tipo → (tabela vazia)
trechos library_book   → 0
```

**Zero.** Isso significa que `libraryHasHits` sempre foi `false` em produção, o
ramo _"FONTE PRIORITÁRIA — BIBLIOTECA RAG"_ do prompt nunca disparou, e toda
resposta da plataforma veio do conhecimento geral do Gemini. A regra
"library-first" existe no código desde 20/07 e **nunca chegou a valer**.

### Por que está vazia — duas causas

**1. A ingestão de pasta nunca funcionou.** O `syncDrive` montava a URL sem o
prefixo `/api/v1` e recebia 404 silencioso. Corrigido ontem (`c35d6dd`), mas
até então nenhuma pasta jamais foi indexada.

**2. ~~`GOOGLE_PRIVATE_KEY` está truncado~~ — CORRIGIDO, era erro meu.**

Eu havia concluído que a chave tinha 27 caracteres e estava quebrada. **Estava
errado.** Meu script de inspeção lia o `.env` linha a linha; a chave é
multilinha e ele capturou só a primeira. O `dotenv`, que o backend usa de
fato, lê o valor completo.

Verificação real, com autenticação contra o Google:

```
private_key  : 1704 caracteres
✅ autenticou no Google
📁 pasta 1prLd1VZAE0NVnNiZqlIgkGqsWmrM_mPp: 20 arquivos
   Teologia Sistemática — Grudem · Comentário Romanos — Sproul
   Deus e seu Decreto — Renihan · O Problema do Sofrimento — C.S. Lewis ...
```

A credencial está correta e a service account enxerga o acervo. **A causa da
biblioteca vazia é só a primeira: a ingestão nunca rodou com sucesso**, porque
o `syncDrive` batia em 404 até 29/07.

Diagnóstico com `node backend/scratch/inspect-google-key.js` — ele mostra a
forma do valor e faz autenticação real, sem expor o segredo.

**Lição:** não inferir estado de credencial lendo arquivo de configuração.
Um `.env` com valor multilinha engana qualquer parser ingênuo — inclusive o
que eu tinha escrito. O teste que vale é autenticar.

### Popular o acervo

```bash
bash audit/scripts/ingest-drive-library.sh    # login + ingestão + verificação
node backend/scratch/inspect-library.js       # o que entrou, obra por obra
```

---

## 1. A biblioteca responde antes da IA

Nova **ETAPA 1.2**, entre o cache e a IA. Quando o acervo tem trechos acima de
`LIBRARY_DIRECT_THRESHOLD` (default **0.82**), a resposta é montada com os
excertos citados e **a IA não é chamada**:

```
**Da sua biblioteca**

Encontrei 2 trecho(s) do seu acervo que respondem diretamente a esta pergunta:

**1. Institutas — João Calvino** _(relevância 93%)_

> A justificação é a aceitação com que Deus nos recebe...
```

Custo: **zero chamadas de IA**. Cada afirmação vem com autor e obra — não há
como alucinar, porque não há geração. É o comportamento de um software de
pesquisa: entregar a fonte, não uma paráfrase.

Não vale em `jsonMode` — Factbook e Exegese precisam de estrutura, não de
excertos.

Abaixo do limiar, o fluxo segue como antes: a IA responde ancorada nos trechos.

---

## 2. Cota diária por testador

`AI_DAILY_LIMIT_PER_USER`, default **30**. Contador em Redis com expiração na
virada do dia; sem Redis, cai para memória.

**A regra que importa: só consome cota o que realmente chama a IA.**

| Origem da resposta                           | Consome cota? |
| -------------------------------------------- | ------------- |
| Cache semântico                              | ❌ não        |
| Biblioteca do Drive                          | ❌ não        |
| Falha do provedor (usuário não recebeu nada) | ❌ não        |
| **Chamada efetiva à IA**                     | ✅ sim        |

Isso alinha o incentivo: quem repete pergunta ou usa o próprio acervo não é
punido, e ninguém paga por uma resposta que não veio.

Ao esgotar, a mensagem explica o limite, quando reinicia e o que continua
liberado (busca bíblica, léxico, cross-refs, biblioteca) — em vez de um erro
seco.

Visitante público não tem cota individual; segue protegido pelo throttler
global de 100 req/min.

### Verificado em produção

```
"Qual o sentido de hesed no Salmo 31?"
  1ª vez → cached: false   (chamou a IA, consumiu 1 de 30)
  2ª vez → cached: true    (nenhuma chamada, nenhuma cota)
```

---

## O que muda quando a biblioteca for populada

Hoje toda pergunta inédita custa 2 requisições à API. Com o acervo indexado,
perguntas cobertas pelas suas obras passam a custar **1** (só o embedding da
busca) — e as repetidas, **zero**.

Para um acervo teológico razoável, a expectativa é que boa parte das perguntas
dos testadores seja atendida pelo próprio material. O limiar de 0.82 é
conservador de propósito: melhor mandar para a IA em caso de dúvida do que
entregar excerto pouco relacionado. Depois de ver uso real, dá para calibrar
por variável de ambiente, sem deploy.

---

## Ferramentas novas

```bash
node backend/scratch/inspect-library.js   # o que há no acervo, por obra
node backend/scratch/check-quota.js       # cache não consome cota?
```

## Ainda na mesa

**Interface da cota** — hoje o usuário só descobre o limite ao esgotá-lo.
Mostrar "restam N consultas hoje" exigiria expor o contador numa rota e ler no
frontend.

**Botão "aprofundar com IA"** — quando a resposta vier da biblioteca, dar a
opção de gastar uma consulta para a IA sintetizar. Você preferiu excertos puros
por ora; isso fica como evolução natural.
