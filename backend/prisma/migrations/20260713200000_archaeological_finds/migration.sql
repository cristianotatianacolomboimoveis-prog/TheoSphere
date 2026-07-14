-- Acervo arqueológico: descobertas relacionadas ao mundo bíblico
CREATE TABLE "ArchaeologicalFind" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "namePt" TEXT NOT NULL,
    "nameEn" TEXT,
    "category" TEXT NOT NULL,
    "discoveryYear" INTEGER,
    "discoverySite" TEXT NOT NULL,
    "currentLocation" TEXT,
    "period" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "description" TEXT NOT NULL,
    "significance" TEXT NOT NULL,
    "authenticity" TEXT NOT NULL DEFAULT 'confirmada',
    "relatedRefs" TEXT[],
    "externalUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchaeologicalFind_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArchaeologicalFind_slug_key" ON "ArchaeologicalFind"("slug");
CREATE INDEX "ArchaeologicalFind_category_idx" ON "ArchaeologicalFind"("category");
CREATE INDEX "ArchaeologicalFind_authenticity_idx" ON "ArchaeologicalFind"("authenticity");
