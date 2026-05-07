# Security Notes

## ⚠️ Credential Rotation Required

The following secrets were exposed in development chat transcripts and **MUST be rotated** before any production / public deployment:

- **Supabase DB password** (project `chjywahtwktqqxqlthvc`)
  - Rotate at: https://supabase.com/dashboard/project/chjywahtwktqqxqlthvc/settings/database → "Reset database password"
  - After rotation, update `backend/.env` (`DATABASE_URL`, `DIRECT_URL`).
- **JWT_SECRET** — already rotated to a 64-byte random value via `openssl rand -base64 64`. If exposed again, regenerate with the same command.

## ✅ Remediated defaults

| Item | Before | Now |
|---|---|---|
| `JWT_SECRET` | Hardcoded `"theosphere_ultra_secret_key_phd_2026"` literal in code + `.env.example` | Removed; `.env.example` ships **empty**; bootstrap fails-fast (Joi `min(32).required()`) if not set |
| `POSTGRES_PASSWORD` (compose) | Default `theosecret` | **No default** — `${POSTGRES_PASSWORD:?must be set}` blocks `docker compose up` without it |
| `REDIS_PASSWORD` | Not configured | Optional in dev, supported via compose env (sets `--requirepass`) |
| Default fallback secrets in `jwt.strategy.ts` / `auth.module.ts` | `'theosphere_ultra_..._2026'` literal | Removed; both throw if `JWT_SECRET` missing |

Generate fresh secrets:
```bash
./scripts/generate-secrets.sh > .env   # JWT_SECRET, POSTGRES_PASSWORD, REDIS_PASSWORD
```

## Storage rules

- `backend/.env` and `frontend-v2/.env.local` are **gitignored**. Never commit them.
- For prod, use the platform's secret manager:
  - Vercel: Project Settings → Environment Variables
  - Railway: Variables tab
  - Supabase: dashboard

## Required env vars (validated at boot)

Backend will fail-fast (Joi schema in `app.module.ts`) if any of these are missing or malformed:

- `DATABASE_URL` (postgres URI)
- `DIRECT_URL` (postgres URI)
- `JWT_SECRET` (≥ 32 chars)
- `PORT` (number, default 3002)
- `NODE_ENV` (`development` | `production` | `test`)
- `GEMINI_API_KEY` or `OPENAI_API_KEY` (at least one in production)
