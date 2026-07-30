#!/usr/bin/env bash
#
# clear-rag-cache.sh — limpa o cache semântico do RAG em produção.
#
# Por que existe: em 29/07/2026 a cota do Gemini estourou e o texto de
# fallback foi gravado no cache semântico. Depois disso ele voltava com
# `cached: true` para qualquer pergunta parecida — e o TTL padrão é de 720h,
# ou seja, a plataforma continuaria respondendo com texto enlatado por um mês
# mesmo com a IA de volta.
#
# O código já foi corrigido (resposta degradada não entra mais no cache), mas
# as entradas gravadas ANTES da correção precisam ser apagadas à mão.
#
# DELETE /api/v1/rag/cache exige um JWT de usuário com role ADMIN.
#
# A senha é lida do terminal com `read -s`: não aparece na tela, não fica no
# histórico do shell e não é gravada em lugar nenhum.
#
# Uso:
#   bash audit/scripts/clear-rag-cache.sh
#   bash audit/scripts/clear-rag-cache.sh voce@email.com     # e-mail como argumento
#   BASE_URL=http://localhost:3002 bash audit/scripts/clear-rag-cache.sh
#
set -euo pipefail

BASE="${BASE_URL:-https://theosphere.onrender.com}"

echo "Limpeza do cache semântico — $BASE"
echo

# As leituras vêm de /dev/tty, não de stdin. Rodando `bash script.sh` logo
# após colar um comando, uma quebra de linha residual no buffer era consumida
# pelo primeiro `read`, que voltava vazio — e o script seguia adiante mandando
# e-mail e senha em branco para a API (30/07/2026).
if [ ! -t 0 ] && [ ! -e /dev/tty ]; then
  echo "✗ Sem terminal interativo disponível para ler as credenciais."
  exit 1
fi

# E-mail: aceita como argumento ou pergunta até vir algo válido.
EMAIL="${1:-}"
while true; do
  if [ -z "$EMAIL" ]; then
    printf 'E-mail (usuário ADMIN): ' > /dev/tty
    IFS= read -r EMAIL < /dev/tty || EMAIL=""
  fi
  # Remove espaços das pontas (paste costuma trazer).
  EMAIL="$(printf '%s' "$EMAIL" | tr -d '[:space:]')"
  case "$EMAIL" in
    ?*@?*.?*) break ;;
    "") echo "  (vazio — digite o e-mail e pressione Enter)" > /dev/tty ;;
    *) echo "  (não parece um e-mail válido: '$EMAIL')" > /dev/tty; EMAIL="" ;;
  esac
done

# Senha: não ecoa. Repete se vier vazia.
while true; do
  printf 'Senha (não aparece na tela): ' > /dev/tty
  stty -echo < /dev/tty
  IFS= read -r PASSWORD < /dev/tty || PASSWORD=""
  stty echo < /dev/tty
  echo > /dev/tty
  [ -n "$PASSWORD" ] && break
  echo "  (vazia — digite a senha e pressione Enter)" > /dev/tty
done

echo
echo "  e-mail: $EMAIL"
echo

# ─── 1. Login ───────────────────────────────────────────────────────────────
echo "→ Autenticando..."
LOGIN_BODY=$(printf '{"email":%s,"password":%s}' \
  "$(printf '%s' "$EMAIL" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')" \
  "$(printf '%s' "$PASSWORD" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')")

# --data-binary @- : o corpo vai por stdin, então a senha nunca aparece na
# lista de processos (`ps aux` mostraria o -d '{"password":"..."}').
LOGIN_RES=$(printf '%s' "$LOGIN_BODY" | curl -s --max-time 90 \
  -X POST "$BASE/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  --data-binary @-)
unset PASSWORD LOGIN_BODY

TOKEN=$(printf '%s' "$LOGIN_RES" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)
print(d.get("accessToken") or d.get("data", {}).get("accessToken") or "")
')

if [ -z "$TOKEN" ]; then
  echo "✗ Login falhou. Resposta do servidor:"
  printf '%s\n' "$LOGIN_RES" | head -c 400
  echo
  exit 1
fi
echo "✓ Autenticado."

# ─── 2. Limpeza ─────────────────────────────────────────────────────────────
echo "→ Limpando o cache..."
HTTP=$(curl -s -o /tmp/theo_cache_clear.json -w '%{http_code}' \
  --max-time 90 -X DELETE "$BASE/api/v1/rag/cache" \
  -H "Authorization: Bearer $TOKEN")
unset TOKEN

case "$HTTP" in
  200|201)
    echo "✓ Cache limpo."
    cat /tmp/theo_cache_clear.json; echo
    ;;
  403)
    echo "✗ HTTP 403 — este usuário não tem role ADMIN."
    echo
    echo "  Para promover, rode no banco (Supabase → SQL Editor):"
    echo "    UPDATE \"User\" SET role = 'ADMIN' WHERE email = '$EMAIL';"
    echo
    echo "  Depois faça logout/login na plataforma (o role vai no JWT) e rode este script de novo."
    exit 1
    ;;
  401)
    echo "✗ HTTP 401 — token recusado. Tente novamente."
    exit 1
    ;;
  *)
    echo "✗ HTTP $HTTP"
    cat /tmp/theo_cache_clear.json; echo
    exit 1
    ;;
esac
rm -f /tmp/theo_cache_clear.json

# ─── 3. Validação ───────────────────────────────────────────────────────────
echo
echo "→ Validando com uma pergunta real..."
RES=$(curl -s --max-time 90 -X POST "$BASE/api/v1/rag/chat" \
  -H 'Content-Type: application/json' \
  -d '{"query":"Quem foi Ninive na Biblia? Responda em duas frases."}')

printf '%s' "$RES" | python3 -c '
import json, sys
d = json.load(sys.stdin)["data"]
c, m = d["content"], d["meta"]
enlatado = "Perspectiva Reformada" in c or "Análise Teológica" in c
print("  cached  :", m.get("cached"))
print("  degraded:", m.get("degraded"), m.get("degradedReason") or "")
print()
if enlatado and m.get("degraded"):
    print("⚠️  Ainda enlatado, mas SINALIZADO: a IA segue indisponível.")
    print("   Cheque o teto de gastos em https://ai.studio/spend")
elif enlatado:
    print("✗ Ainda enlatado e NÃO sinalizado — investigue.")
else:
    print("✓ Resposta real da IA:")
    print("  " + c[:200].replace("\n", " "))
'
