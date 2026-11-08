-- AlterTable: Add interval columns (startRef, endRef) and kind ('heading' | 'inline') to ResourceReference (T1.4)
ALTER TABLE "ResourceReference"
  ADD COLUMN IF NOT EXISTS "startRef" INTEGER,
  ADD COLUMN IF NOT EXISTS "endRef" INTEGER,
  ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'inline';

-- CreateIndex: Range index for fast interval lookups on ResourceReference
CREATE INDEX IF NOT EXISTS "ResourceReference_startRef_endRef_idx"
  ON "ResourceReference"("startRef", "endRef");

