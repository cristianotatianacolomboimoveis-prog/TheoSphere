import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { EmbeddingModule } from './embedding.module';
import { SemanticCacheService } from './semantic-cache.service';
import { UserContextService } from './user-context.service';
import { BibleModule } from '../bible.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesGuard } from '../auth/roles.guard';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [EmbeddingModule, BibleModule, PrismaModule, SearchModule],
  controllers: [RagController],
  providers: [
    RagService,
    SemanticCacheService,
    UserContextService,
    RolesGuard, // class-based guard used by @UseGuards(RolesGuard) — needs DI
  ],
  exports: [RagService],
})
export class RagModule {}
