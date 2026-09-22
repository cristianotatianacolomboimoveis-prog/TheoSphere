import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { EvidenceAwareRagService } from './evidence-aware-rag.service';
import { AiQuotaService } from './ai-quota.service';
import { RagController } from './rag.controller';
import { EvidenceController } from './evidence.controller';
import { EmbeddingModule } from './embedding.module';
import { SemanticCacheService } from './semantic-cache.service';
import { UserContextService } from './user-context.service';
import { DriveRagService } from './drive-rag.service';
import { DriveRagController } from './drive-rag.controller';
import { LibraryService } from './library.service';
import { LibraryController } from './library.controller';
import { BibleModule } from '../bible.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesGuard } from '../auth/roles.guard';
import { SearchModule } from '../search/search.module';
import { TheologicalSourcesService } from './theological-sources.service';
import { RerankerService } from './reranker.service';
import { EvidencePackService } from './evidence-pack.service';
import { EvidencePackContextService } from './evidence-pack-context.service';
import { ConfigModule } from '@nestjs/config';

import { DomainClassifierService } from './domain-classifier.service';
import { RagContextBuilderService } from './rag-context-builder.service';
import { TheologyGraphService } from './theology-graph.service';

@Module({
  imports: [
    ConfigModule,
    EmbeddingModule,
    BibleModule,
    PrismaModule,
    SearchModule,
  ],
  controllers: [
    RagController,
    EvidenceController,
    DriveRagController,
    LibraryController,
  ],
  providers: [
    {
      provide: RagService,
      useClass: EvidenceAwareRagService,
    },
    DomainClassifierService,
    RagContextBuilderService,
    TheologyGraphService,
    AiQuotaService,
    SemanticCacheService,
    UserContextService,
    DriveRagService,
    LibraryService,
    TheologicalSourcesService,
    RerankerService,
    EvidencePackService,
    EvidencePackContextService,
    RolesGuard,
  ],
  exports: [
    RagService,
    AiQuotaService,
    EvidencePackService,
    EvidencePackContextService,
    DomainClassifierService,
    RagContextBuilderService,
    TheologyGraphService,
  ],
})
export class RagModule {}
