import { Module, Global } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { GeoEngineService } from './geo/geo-engine.service';
import { TheologyEngineService } from './theo/theo-engine.service';
import { GraphEngineService } from './graph/graph-engine.service';
import { AIEngineService } from './ai/ai-engine.service';
import { ThreeEngineService } from './3d/three-engine.service';
import { RagModule } from '../rag/rag.module';
import { EnterpriseController } from './enterprise.controller';

@Global()
@Module({
  imports: [RagModule],
  providers: [
    PrismaService,
    GeoEngineService,
    TheologyEngineService,
    GraphEngineService,
    AIEngineService,
    ThreeEngineService,
  ],
  controllers: [EnterpriseController],
  exports: [
    GeoEngineService,
    TheologyEngineService,
    GraphEngineService,
    AIEngineService,
    ThreeEngineService,
  ],
})
export class EnginesModule {}
