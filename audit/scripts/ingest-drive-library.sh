#!/usr/bin/env bash
#
# ingest-drive-library.sh — indexa as obras do Google Drive na biblioteca RAG.
#
# Por que existe: até 30/07/2026 a biblioteca estava VAZIA em produção (0
# trechos). A credencial do Google sempre esteve correta e a service account
# enxerga o acervo — o que faltava era a ingestão jamais ter rodado com
# sucesso, porque o syncDrive do frontend batia num 404 (corrigido em c35d6dd).
#
# Com a biblioteca populada, o backend passa a responder direto dos seus livros
# quando a relevância for alta — sem chamar a IA, sem gastar cota, com autor e
# obra citados.
#
# A senha é lida do terminal com stty -echo: não aparece na tela, não fica no
# histórico do shell e não é gravada em lugar nenhum.
#
# Uso:
#   bash audit/scripts/ingest-drive-library.sh
#   bash audit/scripts/ingest-drive-library.sh voce@email.com
#   BASE_URL=http://localhost:3002 bash audit/scripts/ingest-drive-library.sh
#
# Variáveis opcionais:
#   FOLDER_ID   pasta específica do Drive (padrão: GOOGLE_DRIVE_FOLDER_ID do servidor)
#   TRADITION   rótulo da tradição para os trechos (padrão: Geral)
#
set -euo pipefail

BASE="${BASE_URL:-https://theosphere.onrender.com}"
FOLDER="${FOLDER_ID:-}"
TRADICAO="${TRADITION:-Geral}"

echo "Ingestão da biblioteca do Drive — $BASE"
echo

if [ ! -t 0 ] && [ ! -e /dev/tty ]; then
  echo "✗ Sem terminal interativo para ler as credenciais."
  exit 1
fi

# ─── Credenciais (lidas de /dev/tty, imune a sobra de buffer no paste) ───────
EMAIL="${1:-}"
while true; do
  if [ -z "$EMAIL" ]; then
    printf 'E-mail: ' > /dev/tty
    IFS= read -r EMAIL < /dev/tty || EMAIL=""
  fi
  EMAIL="$(printf '%s' "$EMAIL" | tr -d '[:space:]')"
  case "$EMAIL" in
    ?*@?*.?*) break ;;
    "") echo "  (vazio — digite o e-mail)" > /dev/tty ;;
    *) echo "  (não parece um e-mail: '$EMAIL')" > /dev/tty; EMAIL="" ;;
  esac
done

while true; do
  printf 'Senha (não aparece na tela): ' > /dev/tty
  stty -echo < /dev/tty
  IFS= read -r PASSWORD < /dev/tty || PASSWORD=""
  stty echo < /dev/tty
  echo > /dev/tty
  [ -n "$PASSWORD" ] && break
  echo "  (vazia — digite a senha)" > /dev/tty
done

# ─── 1. Login ───────────────────────────────────────────────────────────────
echo
echo "→ Autenticando..."
LOGIN_BODY=$(printf '{"email":%s,"password":%s}' \
  "$(printf '%s' "$EMAIL" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')" \
  "$(printf '%s' "$PASSWORD" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')")

LOGIN_RES=$(printf '%s' "$LOGIN_BODY" | curl -s --max-time 90 \
  -X POST "$BASE/api/v1/auth/login" \
  -H 'Content-Type: application/json' --data-binary @-)
unset PASSWORD LOGIN_BODY

TOKEN=$(printf '%s' "$LOGIN_RES" | python3 -c '
import json, sys
try: d = json.load(sys.stdin)
except Exception: sys.exit(0)
print(d.get("accessToken") or d.get("data", {}).get("accessToken") or "")
')

if [ -z "$TOKEN" ]; then
  echo "✗ Login falhou:"
  printf '%s\n' "$LOGIN_RES" | head -c 300; echo
  exit 1
fi
echo "✓ Autenticado."

# ─── 2. Ingestão ────────────────────────────────────────────────────────────
echo
echo "→ Indexando o acervo (pode levar vários minutos — cada PDF é extraído,"
echo "  fatiado em trechos e vetorizado)..."

INGEST_BODY=$(printf '{"folderId":%s,"tradition":%s}' \
  "$(printf '%s' "$FOLDER" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')" \
  "$(printf '%s' "$TRADICAO" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')")

HTTP=$(printf '%s' "$INGEST_BODY" | curl -s -o /tmp/theo_ingest.json -w '%{http_code}' \
  --max-time 900 -X POST "$BASE/api/v1/drive-library/ingest" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" --data-binary @-)
unset TOKEN

case "$HTTP" in
  200|201)
    echo "✓ Ingestão concluída."
    python3 -c '
import json
d = json.load(open("/tmp/theo_ingest.json"))
corpo = d.get("data", d)
if isinstance(corpo, dict):
    for k, v in corpo.items():
        if not isinstance(v, (dict, list)):
            print(f"   {k}: {v}")
else:
    print("  ", str(corpo)[:300])
' 2>/dev/null || head -c 400 /tmp/theo_ingest.json
    ;;
  401) echo "✗ HTTP 401 — sessão recusada."; exit 1 ;;
  403) echo "✗ HTTP 403 — sem permissão para ingerir."; exit 1 ;;
  500)
    echo "✗ HTTP 500 — o servidor falhou. Causas comuns:"
    echo "   • GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY ausentes no Render"
    echo "   • a pasta do Drive não está compartilhada com a service account"
    head -c 400 /tmp/theo_ingest.json; echo
    exit 1
    ;;
  *) echo "✗ HTTP $HTTP"; head -c 400 /tmp/theo_ingest.json; echo; exit 1 ;;
esac
rm -f /tmp/theo_ingest.json

# ─── 3. Verificação ─────────────────────────────────────────────────────────
echo
echo "→ Conferindo o que entrou no banco..."
RAIZ="$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd || true)"
if [ -n "$RAIZ" ] && [ -f "$RAIZ/backend/scratch/inspect-library.js" ]; then
  (cd "$RAIZ/backend" && node scratch/inspect-library.js) || \
    echo "   (não foi possível ler o banco daqui — rode manualmente)"
else
  echo "   backend/ não encontrado a partir deste script;"
  echo "   rode: node backend/scratch/inspect-library.js"
fi

echo
echo "Pronto. A partir de agora, perguntas cobertas pelas suas obras são"
echo "respondidas direto da biblioteca — sem chamar a IA e sem gastar cota."
