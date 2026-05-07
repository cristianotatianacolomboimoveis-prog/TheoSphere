#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# generate-secrets.sh
#
# Prints a fresh set of strong secrets to stdout (NOT to a file — pipe it
# yourself if you want to persist). Safe to re-run; nothing is touched on disk.
#
# Usage:
#   ./scripts/generate-secrets.sh                  # print all
#   ./scripts/generate-secrets.sh JWT_SECRET       # just one
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

if ! command -v openssl >/dev/null 2>&1; then
  echo "error: openssl is required (install via Homebrew: brew install openssl)" >&2
  exit 1
fi

rand_b64()  { openssl rand -base64 "$1" | tr -d '\n'; }
rand_hex()  { openssl rand -hex    "$1"; }

emit_jwt_secret()       { echo "JWT_SECRET=$(rand_b64 64)"; }
emit_postgres_password(){ echo "POSTGRES_PASSWORD=$(rand_b64 24 | tr -d '/+=')"; }
emit_redis_password()   { echo "REDIS_PASSWORD=$(rand_hex 24)"; }

case "${1:-all}" in
  JWT_SECRET)        emit_jwt_secret ;;
  POSTGRES_PASSWORD) emit_postgres_password ;;
  REDIS_PASSWORD)    emit_redis_password ;;
  all)
    emit_jwt_secret
    emit_postgres_password
    emit_redis_password
    ;;
  *) echo "unknown key: $1" >&2; exit 2 ;;
esac
