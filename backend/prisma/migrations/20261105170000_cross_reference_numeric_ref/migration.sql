-- AlterTable
ALTER TABLE "CrossReference" ADD COLUMN "sourceNumRef" INTEGER;
ALTER TABLE "CrossReference" ADD COLUMN "targetNumRef" INTEGER;

-- CreateIndex
CREATE INDEX "CrossReference_sourceNumRef_idx" ON "CrossReference"("sourceNumRef");

-- CreateIndex
CREATE INDEX "CrossReference_targetNumRef_idx" ON "CrossReference"("targetNumRef");
