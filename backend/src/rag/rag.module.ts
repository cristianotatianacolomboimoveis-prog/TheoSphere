import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
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

@Module({
  imports: [EmbeddingModule, BibleModule, PrismaModule, SearchModule],
  controllers: [RagController, DriveRagController, LibraryController],
  providers: [
    RagService,
    SemanticCacheService,
    UserContextService,
    DriveRagService,
    LibraryService,
    TheologicalSourcesService,
    RolesGuard, // class-based guard used by @UseGuards(RolesGuard) — needs DI
  ],
  exports: [RagService],
})
export class RagModule {}
