import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LinguisticsService } from './linguistics.service';
import { LinguisticsController } from './linguistics.controller';
import { ConstructSearchService } from './construct-search.service';
import { ConstructSearchController } from './construct-search.controller';
import { SyntaxDiagramService } from './syntax-diagram.service';
import { SyntaxDiagramController } from './syntax-diagram.controller';
import { TextualCriticismService } from './textual-criticism.service';
import { TextualCriticismController } from './textual-criticism.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    LinguisticsController,
    ConstructSearchController,
    SyntaxDiagramController,
    TextualCriticismController,
  ],
  providers: [
    LinguisticsService,
    ConstructSearchService,
    SyntaxDiagramService,
    TextualCriticismService,
  ],
  exports: [
    LinguisticsService,
    ConstructSearchService,
    SyntaxDiagramService,
    TextualCriticismService,
  ],
})
export class LinguisticsModule {}
