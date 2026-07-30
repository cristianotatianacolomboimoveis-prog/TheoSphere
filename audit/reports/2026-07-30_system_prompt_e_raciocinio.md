# System prompt enxuto e o raciocínio do modelo — 2026-07-30

Commits `db13a53` e `8f668a1`. 105 testes, lint e tsc limpos.

> **A pergunta era:** dá para enxugar o system prompt mantendo qualidade superior?
> **A resposta:** sim — e o A/B revelou um problema muito maior, que não tinha
> nada a ver com o prompt.

---

## 🔴 O que o A/B expôs: as respostas estavam sendo truncadas

Ao comparar os dois prompts, notei respostas terminando no meio da frase e um
contador de saída que não batia com o texto. Investiguei.

O `gemini-2.5-flash` **raciocina antes de responder**, e os tokens de raciocínio
saem do **mesmo** `maxOutputTokens` da resposta. Medido com uma pergunta
exegética real:

| Configuração             | Raciocínio | Resposta   | Resultado                   |
| ------------------------ | ---------- | ---------- | --------------------------- |
| Livre, teto 3000         | 1.852 tok  | 1.144 tok  | ✂️ `MAX_TOKENS`             |
| Livre, teto **1500**     | 1.439 tok  | **57 tok** | ✂️ **173 caracteres**       |
| **Desligado, teto 2000** | 0          | 1.812 tok  | ✅ `STOP`, 6.242 caracteres |

Duas conclusões desconfortáveis:

**1. Eu causei uma regressão em produção.** No commit `e5f8119` baixei
`maxOutputTokens` de 3000 para 1500 achando que economizaria. Como o raciocínio
consumia 1.439 tokens, sobravam 57 para a resposta — os testadores receberam
respostas de 173 caracteres, cortadas no meio da frase.

**2. A plataforma já truncava antes de mim.** Mesmo com 3000, o `finishReason`
sempre foi `MAX_TOKENS`. Isso vinha de antes e ninguém tinha percebido — e pode
explicar parte dos "dossiê fora do formato" do Factbook: **JSON truncado é JSON
inválido.**

### A correção

```ts
thinkingConfig: { thinkingBudget: 0 },
maxOutputTokens: 3000,
```

Desligar o raciocínio dá resposta **completa, mais longa e mais barata**:
1.812 tokens de saída contra 2.996.

E corrigi também meu raciocínio errado sobre o teto: **`maxOutputTokens` é
limite, não reserva.** Você paga pelos tokens que o modelo realmente gera.
Baixá-lo não economiza nada numa resposta curta — só corta a longa.

### Verificado em produção

```
antes  →   553 caracteres, cortada em "…Cristológico (Filipenses 2:6-1"
depois → 9.424 caracteres, terminando em "…seja útil para sua compreensão."
```

O cache foi limpo de novo: durante a janela do teto baixo, respostas truncadas
foram cacheadas e continuariam sendo servidas por 30 dias.

---

## O enxugamento do system prompt: 6.584 → 5.356 chars (−18%)

Dois blocos saíram, e nenhum dos dois por custo — os dois atrapalhavam.

### "RECURSOS E BANCO DE DADOS DA THEOSPHERE" (−173 tokens)

Listava "quase 45 mil anotações exegéticas", "centenas de reconstruções
cartográficas", "inúmeros infográficos" e ordenava: _"Sempre utilize e faça
referência a esse vasto material"_.

Nada disso chega no prompt. O conteúdo real do RAG é injetado separadamente,
nos blocos de contexto. Era, literalmente, instrução para citar fonte que o
modelo não recebeu — **um convite à alucinação**, no prompt que exige rigor
acadêmico. Trocado por uma regra sobre as fontes que de fato existem na
mensagem, com a instrução explícita de nunca atribuir afirmação a fonte
ausente do contexto.

### O schema JSON estava invertido (−139 tokens)

O schema da exegese vivia dentro do `THEO_AI_SYSTEM_PROMPT` — que é usado
**apenas quando `jsonMode` é falso**. Ou seja: ia em toda conversa normal, onde
só servia para puxar a resposta ao formato de exegese de versículo, e faltava
justamente no `jsonMode`.

Foi **removido, não realocado**: Factbook e ExegesisPanel já mandam o próprio
schema no prompt do usuário. Injetar um schema canônico no `jsonMode` faria o
Factbook receber formato de exegese — exatamente o sintoma investigado em 29/07.

### Também

Sete modelos de citação viraram dois — eram variações da mesma instrução.

### Mantido intacto

Persona e diretrizes (462 tok), objetivo em cinco partes (200 tok), regras de
formato e idioma (210 tok), lista de comentaristas clássicos (220 tok) e
guardrails (116 tok). É o que sustenta a qualidade.

---

## Resultado consolidado

| Métrica                     | Antes       | Depois      |
| --------------------------- | ----------- | ----------- |
| System prompt               | 6.584 chars | 5.356 chars |
| Tokens de entrada           | ~1.828      | ~1.482      |
| Raciocínio (saída, cobrado) | ~1.850 tok  | 0           |
| Resposta completa?          | ✂️ não      | ✅ sim      |
| Pergunta repetida           | 2 chamadas  | 0 chamadas  |

**−19% de entrada, −100% de raciocínio, e as respostas deixaram de ser
cortadas.** Economia e qualidade na mesma direção — o que só apareceu porque
o A/B foi feito com perguntas reais em vez de aceitar a estimativa.

O A/B lado a lado das 5 perguntas está em `2026-07-30_ab_system_prompt.md`.
Vale a leitura: as respostas "DEPOIS" são consistentemente mais completas.

---

## Ferramentas novas

```bash
node backend/scratch/check-prod-answer.js "pergunta"   # resposta chega completa?
node backend/scratch/check-thinking-budget.js          # quanto o modelo gasta pensando
node backend/scratch/tune-thinking.js                  # acha a melhor combinação
node backend/scratch/ab-system-prompt.js               # A/B de prompts (gasta ~10 chamadas)
```

## Ainda na mesa

**Limite por usuário/dia** — hoje um único testador pode consumir a cota do dia
inteiro. Era o item 4 do plano original, nunca aprovado.

**Verificar truncagem na task diária** — o `check-prod-answer.js` já faz a
checagem; falta plugá-lo na verificação de todo dia para que resposta cortada
vire 🔴 automaticamente.
