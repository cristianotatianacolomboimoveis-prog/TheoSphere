CREATE TABLE "ProjectMemory" ("id" TEXT NOT NULL,"category" TEXT NOT NULL,"memoryKey" TEXT NOT NULL,"content" TEXT NOT NULL,"tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],"source" TEXT,"taskId" TEXT,"agentId" TEXT,"supersedesId" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "ProjectMemory_pkey" PRIMARY KEY ("id"));
CREATE INDEX "ProjectMemory_category_createdAt_idx" ON "ProjectMemory"("category","createdAt");
CREATE INDEX "ProjectMemory_memoryKey_createdAt_idx" ON "ProjectMemory"("memoryKey","createdAt");
CREATE INDEX "ProjectMemory_taskId_idx" ON "ProjectMemory"("taskId");
CREATE INDEX "ProjectMemory_agentId_idx" ON "ProjectMemory"("agentId");
