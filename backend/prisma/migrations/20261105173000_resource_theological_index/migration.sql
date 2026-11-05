-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "year" INTEGER,
    "language" TEXT NOT NULL DEFAULT 'pt',
    "license" TEXT NOT NULL DEFAULT 'Domínio Público',
    "isPublicDomain" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceChunk" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "startRef" INTEGER,
    "endRef" INTEGER,
    "embedding" vector(768),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceReference" (
    "id" TEXT NOT NULL,
    "chunkId" TEXT NOT NULL,
    "canonicalRef" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Resource_slug_key" ON "Resource"("slug");
CREATE INDEX "Resource_author_idx" ON "Resource"("author");
CREATE INDEX "Resource_language_idx" ON "Resource"("language");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceChunk_resourceId_chunkIndex_key" ON "ResourceChunk"("resourceId", "chunkIndex");
CREATE INDEX "ResourceChunk_resourceId_chunkIndex_idx" ON "ResourceChunk"("resourceId", "chunkIndex");
CREATE INDEX "ResourceChunk_startRef_endRef_idx" ON "ResourceChunk"("startRef", "endRef");

-- CreateIndex
CREATE INDEX "ResourceReference_canonicalRef_idx" ON "ResourceReference"("canonicalRef");
CREATE INDEX "ResourceReference_chunkId_idx" ON "ResourceReference"("chunkId");

-- AddForeignKey
ALTER TABLE "ResourceChunk" ADD CONSTRAINT "ResourceChunk_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceReference" ADD CONSTRAINT "ResourceReference_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "ResourceChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
