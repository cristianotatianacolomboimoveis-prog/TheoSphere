# Redução de consumo da API de IA — 2026-07-30

Commits `e5f8119` e `6c8fda0`. Migration aplicada em produção, 104 testes passando.

## A IA voltou a funcionar

Durante a validação, pergunta nova sobre Melquisedeque retornou resposta real:

> "Melquisedeque é primeiramente apresentado em Gênesis 14:18-20 como o rei de Salém e sacerdote de El Elyon, que abençoou Abraão e recebeu dízimos dele. Sua figura é teologicamente elaborada em Hebreus 7 como um tipo prefigurativo de Cristo…"

`degraded: false` · `/health/ai` → `ok | sem falhas`. O teto de gastos liberou.

---

## O que foi feito

### 1. Match exato antes do embedding — o ganho de verdade

**Antes:** `findSimilarResponse` começava sempre em `createEmbedding(query)`, mesmo quando a pergunta era idêntica a uma já respondida. Ou seja, cada pergunta custava **duas requisições faturadas** (embedding + geração), consumindo a cota diária no dobro da velocidade.

**Agora:** consulta primeiro por hash indexado — SHA-256 da pergunta normalizada (minúsculas, sem acento, espaços colapsados, pontuação final descartada).

**Verificado em produção:**

```
"Quem foi Melquisedeque? Responda em duas frases."  → cached: false  (1ª vez)
"quem foi melquisedeque? responda em duas frases"   → cached: true, similarity: 1
```

Caixa e pontuação diferentes, mesmo acerto. Essa segunda pergunta custou **zero** chamadas de API — antes teria custado duas.

Migration `20260730160000_cache_query_hash`: coluna `queryHash` anulável + dois índices parciais. Entradas antigas continuam sendo encontradas pela busca vetorial.

### 2. Blocos de contexto vazios fora do prompt

Os rótulos iam sempre, mesmo sem conteúdo — `"CONTEÚDO PESSOAL (GOOGLE DRIVE):"` seguido de nada.

**Economia medida: ~70 tokens por chamada (4%).** Modesto, e é honesto dizer: o peso está no `THEO_AI_SYSTEM_PROMPT`, que sozinho tem 6.584 caracteres (~1.650 tokens) e vai em toda chamada. Não mexi nele porque alterar o system prompt muda o comportamento da IA — é decisão de produto, não de otimização.

Blocos longos passam a ser truncados em 4.000 caracteres.

### 3. Teto de saída

`maxOutputTokens` de 3000 → **1500** no chat. `jsonMode` (Factbook e Exegese) mantém 3000, porque o dossiê precisa do espaço.

---

## Impacto real

| Cenário               | Antes          | Depois         |
| --------------------- | -------------- | -------------- |
| Pergunta inédita      | 2 chamadas     | 2 chamadas     |
| **Pergunta repetida** | **2 chamadas** | **0 chamadas** |
| Tokens de entrada     | ~1.762         | ~1.692         |
| Teto de saída (chat)  | 3.000          | 1.500          |

O ganho depende da taxa de repetição entre os testadores. Perguntas sobre os mesmos temas bíblicos tendem a repetir bastante, então na prática a economia deve ser relevante — mas só os números reais dirão.

---

## Sobre voltar ao plano free

A tabela oficial deixa claro que **spending cap não existe no tier gratuito** — ele só aparece a partir do Tier 1, que é ativado ao vincular uma conta de faturamento. Baixar o cap não devolve o projeto ao free.

Para voltar de fato:

1. Desvincular a conta de faturamento do projeto, **ou** criar um projeto novo sem billing
2. **Gerar a chave depois** da mudança — chave criada antes costuma ficar com estado inconsistente (relatos recorrentes no fórum do Google)
3. Atualizar `GEMINI_API_KEY` no Render

Antes de decidir, veja seus limites reais em https://aistudio.google.com/rate-limit. As fontes públicas divergem (10 RPM/250 RPD em umas, 15 RPM/1.500 RPD em outras) porque o Google cortou as cotas gratuitas em dezembro/2025. O número que vale é o da sua conta.

Com a otimização acima, cada pergunta **inédita** consome 2 requisições da cota diária e cada **repetida** consome zero — o que estica bastante o teto do free.

---

## Ainda na mesa

**O system prompt de 6.5 KB em toda chamada.** É o maior custo de entrada que sobrou. Dá para reduzir bastante, mas mexe na qualidade e no tom das respostas — precisa da sua decisão e de avaliação lado a lado antes/depois.

**Limite por usuário/dia.** Hoje um único testador pode consumir a cota do dia inteiro. Era o item 4 do plano, fora do escopo aprovado.

## Ferramentas novas

```bash
node backend/scratch/count-cache.js          # tamanho do cache
node backend/scratch/inspect-cache.js        # o que está cacheado, sinaliza texto enlatado
node backend/scratch/check-cache-schema.js   # confirma a migration em produção
```
