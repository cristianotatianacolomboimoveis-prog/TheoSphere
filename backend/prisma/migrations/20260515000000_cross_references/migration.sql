-- CrossReference table — TSK (Treasury of Scripture Knowledge) cross-refs.
--
-- Denormalised one-row-per-(source, target) on purpose:
--   • Avoids array unmarshalling in hot path (verse view loads refs
--     hundreds of times per chapter scroll).
--   • Lets us ORDER BY rank/votes inside SQL.
--   • Lets us extend later with edge metadata (relation_type, topic)
--     without schema gymnastics on a JSON array.
--
-- Idempotent: IF NOT EXISTS on every object. Re-runs are no-ops.

CREATE TABLE IF NOT EXISTS "CrossReference" (
  "id"        TEXT NOT NULL,
  "sourceRef" TEXT NOT NULL,
  "targetRef" TEXT NOT NULL,
  "rank"      INTEGER,
  "votes"     INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrossReference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CrossReference_sourceRef_targetRef_key"
  ON "CrossReference" ("sourceRef", "targetRef");

CREATE INDEX IF NOT EXISTS "CrossReference_sourceRef_idx"
  ON "CrossReference" ("sourceRef");
