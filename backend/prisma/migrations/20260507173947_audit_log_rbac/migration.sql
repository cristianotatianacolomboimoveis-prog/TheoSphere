-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: RBAC role on User + append-only AuditLog
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. RBAC role on User ───────────────────────────────────────────────────
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER';
CREATE INDEX "User_role_idx" ON "User"("role");

-- ─── 2. AuditLog ────────────────────────────────────────────────────────────
CREATE TABLE "AuditLog" (
    "id"         TEXT NOT NULL,
    "actorId"    TEXT,
    "action"     TEXT NOT NULL,
    "resource"   TEXT NOT NULL,
    "resourceId" TEXT,
    "payload"    JSONB,
    "ip"         TEXT,
    "userAgent"  TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_actorId_idx"             ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_action_idx"              ON "AuditLog"("action");
CREATE INDEX "AuditLog_resource_resourceId_idx" ON "AuditLog"("resource", "resourceId");
CREATE INDEX "AuditLog_createdAt_idx"           ON "AuditLog"("createdAt");

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
