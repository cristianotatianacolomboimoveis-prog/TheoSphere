import { Module } from '@nestjs/common';
import { BibleIngestionService } from './bible-ingestion.service';
import { BibleController } from './bible.controller';
import { PrismaModule } from './prisma/prisma.module';
import { EmbeddingModule } from './rag/embedding.module';
import { LinguisticsModule } from './linguistics/linguistics.module';

@Module({
  imports: [PrismaModule, EmbeddingModule, LinguisticsModule],
  controllers: [BibleController],
  providers: [BibleIngestionService],
  exports: [BibleIngestionService],
})
export class BibleModule {}
