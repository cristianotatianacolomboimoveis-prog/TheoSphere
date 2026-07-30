import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaModule } from '../prisma/prisma.module';
import { RagModule } from '../rag/rag.module';
import { HealthController } from './health.controller';
import { TheoHealthIndicators } from './health.indicators';

// RagModule entra para o /health/ai poder consultar o estado do provedor.
// Não há ciclo: RagModule não importa HealthModule.
@Module({
  imports: [TerminusModule, PrismaModule, RagModule],
  controllers: [HealthController],
  providers: [TheoHealthIndicators],
})
export class HealthModule {}
