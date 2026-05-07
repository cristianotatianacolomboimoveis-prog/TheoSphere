# syntax=docker/dockerfile:1.7

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Builder
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Build deps for native addons (bcrypt etc.)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .

# Generate Prisma Client and compile NestJS
RUN npx prisma generate && npm run build

# Drop dev dependencies for the runtime layer
RUN npm prune --omit=dev

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Runner — minimal, non-root
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

# tini for proper PID 1 / signal handling; wget for the HEALTHCHECK probe.
RUN apk add --no-cache tini wget

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3002 \
    NPM_CONFIG_LOGLEVEL=warn

# The official node image already ships a non-root `node` user (uid 1000).
# Copy with proper ownership so we don't need a chown pass.
COPY --from=builder --chown=node:node /app/dist          ./dist
COPY --from=builder --chown=node:node /app/node_modules  ./node_modules
COPY --from=builder --chown=node:node /app/prisma        ./prisma
COPY --from=builder --chown=node:node /app/package.json  ./package.json

USER node

EXPOSE 3002

# Container-level liveness probe. Fast (≤1s), zero-dep, returns 200 when
# the Nest event loop is responsive. Readiness (DB-aware) is at /ready.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --spider --tries=1 --timeout=3 http://127.0.0.1:3002/api/v1/health/live || exit 1

# tini → migrate → start. If migrations fail, the container exits non-zero
# and the orchestrator (Railway/K8s) restarts it instead of running stale code.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
