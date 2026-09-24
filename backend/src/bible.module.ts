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
import { HomileticsService } from './bible/homiletics.service';
import { HomileticsController } from './bible/homiletics.controller';
import { SynopsisService } from './bible/synopsis.service';
import { SynopsisController } from './bible/synopsis.controller';
import { TimelineService } from './bible/timeline.service';
import { TimelineController } from './bible/timeline.controller';

@Module({
  imports: [
    PrismaModule,
    EmbeddingModule,
    LinguisticsModule,
    ArchaeologyModule,
  ],
  controllers: [
    BibleController,
    CrossReferencesController,
    HomileticsController,
    SynopsisController,
    TimelineController,
  ],
  providers: [
    BibleIngestionService,
    CrossReferencesService,
    PassageGuideService,
    BibleComparisonService,
    HomileticsService,
    SynopsisService,
    TimelineService,
  ],
  exports: [
    BibleIngestionService,
    CrossReferencesService,
    BibleComparisonService,
    HomileticsService,
    SynopsisService,
    TimelineService,
  ],
})
export class BibleModule {}
