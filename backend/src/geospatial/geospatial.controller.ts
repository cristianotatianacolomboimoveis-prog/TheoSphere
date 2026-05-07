import { Controller, Get, Query } from '@nestjs/common';
import { GeospatialService } from './geospatial.service';

@Controller('api/v1/geo')
export class GeospatialController {
  constructor(private readonly geospatial: GeospatialService) {}

  @Get('locations')
  async list() {
    const data = await this.geospatial.getAllLocations();
    return { success: true, data };
  }

  @Get('nearby')
  async nearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radiusKm') radiusKm?: string,
  ) {
    const data = await this.geospatial.getNearbyLocations(
      parseFloat(lat),
      parseFloat(lng),
      radiusKm ? parseFloat(radiusKm) : 100,
    );
    return { success: true, data };
  }
}
