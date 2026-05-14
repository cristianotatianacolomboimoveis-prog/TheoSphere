import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { THEOLOGICAL_ROUTES } from './geospatial-routes.registry';

@Injectable()
export class GeospatialService {
  private readonly logger = new Logger(GeospatialService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca locais convertendo tipos espaciais do PostGIS (geom) para tipos JSON (lat/lng).
   */
  async getAllLocations(era?: number) {
    try {
      this.logger.debug(`Fetching locations ${era ? `for era ${era}` : 'all eras'}`);

      const locations = era !== undefined
        ? await this.prisma.$queryRaw`
            SELECT id, name, era, category, description,
                   ST_X(geom::geometry) as lng,
                   ST_Y(geom::geometry) as lat
            FROM "Location"
            WHERE era BETWEEN ${era - 50} AND ${era + 50};
          `
        : await this.prisma.$queryRaw`
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

  /**
   * Retorna todas as rotas teológicas disponíveis.
   */
  async getRoutes() {
    return Object.values(THEOLOGICAL_ROUTES).map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      waypointCount: r.waypoints.length
    }));
  }

  /**
   * Retorna os detalhes de uma rota específica.
   */
  async getRouteById(id: string) {
    const route = THEOLOGICAL_ROUTES[id];
    if (!route) return null;
    return route;
  }
}
