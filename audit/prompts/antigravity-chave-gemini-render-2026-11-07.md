# Prompt — Trocar a chave do Gemini no Render (TheoSphere)

> Cole este arquivo inteiro no Antigravity. Tarefa curta e operacional. Não mexa
> em código, não faça commit e não troque de branch.

## CONTEXTO

Em produção, o backend `theosphere-backend` (Render, `https://theosphere.onrender.com`)
está com uma `GEMINI_API_KEY` **inválida**. O Google responde `API_KEY_INVALID`.
Por isso a IA do app está desligada: o chat devolve só uma resposta genérica de
fallback, e `GET /api/v1/health/ai` responde `"status":"degraded"`. O resto do
sistema foi conferido em 2026-11-06 e funciona: banco gravável, migrações
aplicadas, smoke test com 8 de 8 etapas.

O dono do projeto já gerou uma chave nova. Sua tarefa é colocá-la no Render e
provar que a IA voltou.

## REGRAS DE SEGURANÇA (inegociáveis)

1. **Peça a chave ao dono no momento da tarefa.** Não procure a chave em
   arquivos do repositório, no histórico do git nem em `scripts/`. O token do
   Railway em `scripts/check-production-health.ts` já está vazado: não use.
2. **Nunca escreva a chave em arquivo do repositório**, em commit, em log, em
   relatório nem na resposta ao dono. Ao citá-la, use só os 4 últimos caracteres
   (`...abcd`).
3. **Nunca coloque a chave numa URL** (`?key=`). Use o header `x-goog-api-key`.
   URL vai parar em log e histórico de shell.
4. Não altere nenhuma outra variável do Render além das duas listadas abaixo.

## PASSO 1 — Validar a chave antes de usá-la

Rode o teste sem imprimir a chave (mostra só o código HTTP):

```bash
read -rs GEMINI_NEW && export GEMINI_NEW
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -H "x-goog-api-key: $GEMINI_NEW" \
  https://generativelanguage.googleapis.com/v1beta/models
```

- `HTTP 200`: a chave é válida. Siga para o passo 2.
- Qualquer outro código: **pare** e diga ao dono que a chave foi recusada, com o
  código recebido. Não grave uma chave inválida no Render.

Confira também se a chave libera o modelo de embedding usado em produção
(`gemini-embedding-001`, 768 dimensões):

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST \
  -H "x-goog-api-key: $GEMINI_NEW" -H "Content-Type: application/json" \
  -d '{"content":{"parts":[{"text":"graça"}]},"outputDimensionality":768}' \
  https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent
```

O esperado é `HTTP 200`. Se vier `429`, a chave é válida mas está sem cota:
avise o dono antes de seguir.

## PASSO 2 — Gravar no Render

Variáveis a definir no serviço **theosphere-backend**:

| Variável                  | Valor        |
| ------------------------- | ------------ |
| `GEMINI_API_KEY`          | a chave nova |
| `AI_CREDITS_FREE_MONTHLY` | `100`        |

**Opção A — painel (preferida, se você opera o navegador):**
dashboard.render.com → `theosphere-backend` → **Environment** → edite
`GEMINI_API_KEY` → adicione `AI_CREDITS_FREE_MONTHLY` → **Save Changes**.
Escolha "Save and deploy" se o painel oferecer.

**Opção B — API do Render.** Use só se o dono te fornecer um `RENDER_API_KEY`;
leia esse token com `read -rs` também:

```bash
read -rs RENDER_API_KEY && export RENDER_API_KEY
# Descobrir o ID do serviço
curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services?name=theosphere-backend&limit=5" \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>JSON.parse(d).forEach(x=>console.log(x.service.id,x.service.name)))'
export SRV=<id-do-serviço>

# Atualizar as duas variáveis (só altera estas; não apaga as demais)
node -e 'process.stdout.write(JSON.stringify({value:process.env.GEMINI_NEW}))' \
  | curl -s -o /dev/null -w "GEMINI_API_KEY: HTTP %{http_code}\n" -X PUT \
    -H "Authorization: Bearer $RENDER_API_KEY" -H "Content-Type: application/json" \
    --data-binary @- "https://api.render.com/v1/services/$SRV/env-vars/GEMINI_API_KEY"
curl -s -o /dev/null -w "AI_CREDITS_FREE_MONTHLY: HTTP %{http_code}\n" -X PUT \
  -H "Authorization: Bearer $RENDER_API_KEY" -H "Content-Type: application/json" \
  -d '{"value":"100"}' "https://api.render.com/v1/services/$SRV/env-vars/AI_CREDITS_FREE_MONTHLY"

# A API não reinicia sozinha: disparar o deploy
curl -s -o /dev/null -w "deploy: HTTP %{http_code}\n" -X POST \
  -H "Authorization: Bearer $RENDER_API_KEY" -H "Content-Type: application/json" \
  -d '{}' "https://api.render.com/v1/services/$SRV/deploys"
```

**Não use** `PUT /v1/services/$SRV/env-vars` (sem o nome da variável no fim):
essa rota **substitui a lista inteira** e apagaria `DATABASE_URL`, `JWT_SECRET`,
`MCP_API_KEY`, `REDIS_URL` e as demais.

Sem acesso ao navegador nem `RENDER_API_KEY`, pare e diga isso ao dono. Não
tente outro caminho.

## PASSO 3 — Provar que a IA voltou

O deploy leva de 3 a 5 minutos. **Cuidado:** depois do reinício, `/health/ai`
responde `"ok"` **mesmo com a chave errada**, porque a falha só é registrada na
primeira chamada real. Por isso a ordem é: primeiro uma pergunta real, depois o
health.

```bash
# 1. Esperar o servidor novo (cold start de até ~60 s)
curl -s -o /dev/null -w "live: HTTP %{http_code}\n" --max-time 90 \
  https://theosphere.onrender.com/api/v1/health/live

# 2. Pergunta real (gasta 1 crédito de visitante; não repita à toa)
curl -s -X POST https://theosphere.onrender.com/api/v1/rag/chat \
  -H 'Content-Type: application/json' --max-time 90 \
  -d '{"query":"Em uma frase: o que significa graça em Efésios 2:8?"}' \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const r=JSON.parse(d).data||{};console.log("degraded:",r.degraded===true,"| reason:",r.degradedReason??"-");console.log(String(r.content).slice(0,300))})'

# 3. Health depois da chamada real
curl -s https://theosphere.onrender.com/api/v1/health/ai

# 4. Fluxo completo do testador (cria e usa um usuário smoke-*)
node backend/scripts/smoke-teste-producao.mjs
```

**Aceite (as quatro condições juntas):**

- `degraded: false` no passo 2, com uma resposta que fala de Efésios 2:8. Este é
  o texto do fallback, que **não vale** como aceite: "Essa é uma questão
  fundamental na teologia cristã com múltiplas perspectivas…".
- `/health/ai` com `"status":"ok"` e `"lastFailure":null` **depois** do passo 2.
- Smoke com 8 de 8 etapas. A etapa `billing/usage` deve mostrar `"limite":100`,
  o que prova que `AI_CREDITS_FREE_MONTHLY` entrou.
- Nenhuma ocorrência da chave em `git status` nem em `git diff`. Rode os dois e
  confirme.

Se `degraded` vier `true`: leia o `degradedReason` e o `/health/ai`, relate os
dois ao dono e **pare**. Não tente outra chave por conta própria.

## PASSO 4 — Limpar e relatar

1. `unset GEMINI_NEW RENDER_API_KEY` e feche o terminal usado.
2. Apague o usuário e o feedback de teste criados pelo smoke, de forma
   **transacional**, e confira as contagens antes e depois:
   `DELETE FROM "Feedback" WHERE message LIKE '[smoke]%'` e
   `DELETE FROM "User" WHERE email LIKE 'smoke-%@example.com'`.
3. Relatório ao dono, com os números:
   - código HTTP de cada passo;
   - os 4 últimos caracteres da chave gravada;
   - `degraded` e `/health/ai` antes e depois;
   - a tabela do smoke;
   - a seção **"o que NÃO foi verificado"**, por exemplo o chat no navegador.
