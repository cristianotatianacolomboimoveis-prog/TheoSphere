-- CreateTable
CREATE TABLE "Annotation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startRef" INTEGER NOT NULL,
    "endRef" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "color" TEXT,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Annotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Annotation_userId_startRef_idx" ON "Annotation"("userId", "startRef");

-- CreateIndex
CREATE INDEX "Annotation_userId_updatedAt_idx" ON "Annotation"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
