import { Controller, Get, Query, Param, NotFoundException } from '@nestjs/common';
import { GeospatialService } from './geospatial.service';

@Controller('api/v1/geo')
export class GeospatialController {
  constructor(private readonly geospatial: GeospatialService) {}

  @Get('locations')
  async list(@Query('era') era?: string) {
    const data = await this.geospatial.getAllLocations(era ? parseInt(era) : undefined);
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

  @Get('routes')
  async getRoutes() {
    const data = await this.geospatial.getRoutes();
    return { success: true, data };
  }

  @Get('routes/:id')
  async getRoute(@Param('id') id: string) {
    const data = await this.geospatial.getRouteById(id);
    if (!data) throw new NotFoundException(`Route ${id} not found`);
    return { success: true, data };
  }
}
