import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GeospatialService } from './geospatial.service';
import { GeospatialController } from './geospatial.controller';

@Module({
  imports: [PrismaModule],
  controllers: [GeospatialController],
  providers: [GeospatialService],
  exports: [GeospatialService],
})
export class GeospatialModule {}
