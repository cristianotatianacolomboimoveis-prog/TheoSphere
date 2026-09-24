import { Module } from '@nestjs/common';
import { BibleIngestionService } from './bible-ingestion.service';
import { BibleController } from './bible.controller';
import { PrismaModule } from './prisma/prisma.module';
import { EmbeddingModule } from './rag/embedding.module';
import { LinguisticsModule } from './linguistics/linguistics.module';
import { CrossReferencesService } from './bible/cross-references.service';
import { CrossReferencesController } from './bible/cross-references.controller';
import { PassageGuideService } from './bible/passage-guide.service';
import { BibleComparisonService } from './bible/bible-comparison.service';
import { ArchaeologyModule } from './archaeology/archaeology.module';

@Module({
  imports: [
    PrismaModule,
    EmbeddingModule,
    LinguisticsModule,
    ArchaeologyModule,
  ],
  controllers: [BibleController, CrossReferencesController],
  providers: [
    BibleIngestionService,
    CrossReferencesService,
    PassageGuideService,
    BibleComparisonService,
  ],
  exports: [
    BibleIngestionService,
    CrossReferencesService,
    BibleComparisonService,
  ],
})
export class BibleModule {}
