import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LinguisticsService } from './linguistics.service';
import { LinguisticsController } from './linguistics.controller';

@Module({
  imports: [PrismaModule],
  controllers: [LinguisticsController],
  providers: [LinguisticsService],
  exports: [LinguisticsService],
})
export class LinguisticsModule {}
