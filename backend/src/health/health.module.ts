import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaModule } from '../prisma/prisma.module';
import { HealthController } from './health.controller';
import { TheoHealthIndicators } from './health.indicators';

@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController],
  providers: [TheoHealthIndicators],
})
export class HealthModule {}
