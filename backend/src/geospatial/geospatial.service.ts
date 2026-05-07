import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class GeospatialService {
  private readonly logger = new Logger(GeospatialService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca locais convertendo tipos espaciais do PostGIS (geom) para tipos JSON (lat/lng).
   */
  async getAllLocations() {
    try {
      this.logger.debug('Fetching all locations with PostGIS conversion');

      const locations = await this.prisma.$queryRaw`
        SELECT id, name, era, category, description,
               ST_X(geom::geometry) as lng,
               ST_Y(geom::geometry) as lat
        FROM "Location";
      `;

      return locations;
    } catch (error) {
      this.logger.error(`Failed to fetch locations: ${error.message}`);
      return [];
    }
  }

  /**
   * Busca locais por proximidade (Busca Geoespacial).
   */
  async getNearbyLocations(lat: number, lng: number, radiusKm: number = 100) {
    try {
      const locations = await this.prisma.$queryRaw`
        SELECT id, name, ST_X(geom::geometry) as lng, ST_Y(geom::geometry) as lat,
               ST_Distance(geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) / 1000 as distance_km
        FROM "Location"
        WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusKm * 1000})
        ORDER BY distance_km ASC;
      `;
      return locations;
    } catch (error) {
      this.logger.error(`Failed to fetch nearby locations: ${error.message}`);
      return [];
    }
  }
}
