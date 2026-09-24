import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LinguisticsService } from './linguistics.service';
import { LinguisticsController } from './linguistics.controller';
import { ConstructSearchService } from './construct-search.service';
import { ConstructSearchController } from './construct-search.controller';

@Module({
  imports: [PrismaModule],
  controllers: [LinguisticsController, ConstructSearchController],
  providers: [LinguisticsService, ConstructSearchService],
  exports: [LinguisticsService, ConstructSearchService],
})
export class LinguisticsModule {}
