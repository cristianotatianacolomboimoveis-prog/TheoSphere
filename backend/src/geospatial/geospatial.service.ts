import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { THEOLOGICAL_ROUTES } from './geospatial-routes.registry';
import axios from 'axios';

@Injectable()
export class GeospatialService {
  private readonly logger = new Logger(GeospatialService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca locais convertendo tipos espaciais do PostGIS (geom) para tipos JSON (lat/lng).
   */
  async getAllLocations(era?: number) {
    try {
      this.logger.debug(
        `Fetching locations ${era ? `for era ${era}` : 'all eras'}`,
      );

      if (era !== undefined) {
        // Tolerância dinâmica baseada no testamento:
        // Antigo Testamento (era < 0): +- 300 anos devido à esparsidade dos dados históricos
        // Novo Testamento (era >= 0): +- 100 anos para abarcar o primeiro século amplamente
        const minEra = era < 0 ? era - 300 : era - 100;
        const maxEra = era < 0 ? era + 300 : era + 100;

        const locations = await this.prisma.$queryRaw`
          SELECT id, name, era, category, description,
                 ST_X(geom::geometry) as lng,
                 ST_Y(geom::geometry) as lat
          FROM "Location"
          WHERE era BETWEEN ${minEra} AND ${maxEra};
        `;
        return locations;
      } else {
        const locations = await this.prisma.$queryRaw`
          SELECT id, name, era, category, description,
                 ST_X(geom::geometry) as lng,
                 ST_Y(geom::geometry) as lat
          FROM "Location";
        `;
        return locations;
      }
    } catch (error) {
      this.logger.error(
        `Failed to fetch locations: ${(error as Error).message}`,
      );
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
      this.logger.error(
        `Failed to fetch nearby locations: ${(error as Error).message}`,
      );
      return [];
    }
  }

  /**
   * Retorna todas as rotas teológicas disponíveis.
   */
  async getRoutes() {
    return Object.values(THEOLOGICAL_ROUTES).map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      waypointCount: r.waypoints.length,
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

  /**
   * Obtém o caminho da rota dinâmica via Valhalla ou fallback geodésico.
   */
  async getRoutePath(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    costing: string = 'pedestrian',
  ): Promise<{
    success: boolean;
    source: 'valhalla' | 'fallback';
    coordinates: [number, number][];
  }> {
    const isWithinIsraelPalestine = (lat: number, lng: number) => {
      return lat >= 29.0 && lat <= 34.5 && lng >= 33.5 && lng <= 36.5;
    };

    const startInBounds = isWithinIsraelPalestine(startLat, startLng);
    const endInBounds = isWithinIsraelPalestine(endLat, endLng);

    if (!startInBounds || !endInBounds) {
      this.logger.debug(
        `Coordinates outside Israel/Palestine [${startLat}, ${startLng}] -> [${endLat}, ${endLng}]. Using geodesic fallback.`,
      );
      const coords = this.interpolateGeodesic(
        startLat,
        startLng,
        endLat,
        endLng,
      );
      return { success: true, source: 'fallback', coordinates: coords };
    }

    try {
      this.logger.debug(
        `Requesting Valhalla route from [${startLat}, ${startLng}] to [${endLat}, ${endLng}] with costing: ${costing}`,
      );

      const valhallaUrl = process.env.VALHALLA_URL || 'http://localhost:8002';
      const response = await axios.post(`${valhallaUrl}/route`, {
        locations: [
          { lat: startLat, lon: startLng, type: 'break' },
          { lat: endLat, lon: endLng, type: 'break' },
        ],
        costing,
        directions_options: { units: 'kilometers' },
      });

      if (response.data && response.data.trip && response.data.trip.legs) {
        const coords: [number, number][] = [];
        for (const leg of response.data.trip.legs) {
          if (leg.shape) {
            coords.push(...this.decodePolyline(leg.shape, 6));
          }
        }

        if (coords.length > 0) {
          return { success: true, source: 'valhalla', coordinates: coords };
        }
      }

      throw new Error('No coordinates returned from Valhalla trip legs.');
    } catch (error) {
      this.logger.warn(
        `Valhalla route failed or offline. Falling back to geodesic path. Error: ${(error as Error).message}`,
      );
      const coords = this.interpolateGeodesic(
        startLat,
        startLng,
        endLat,
        endLng,
      );
      return { success: true, source: 'fallback', coordinates: coords };
    }
  }

  private decodePolyline(
    str: string,
    precision: number = 6,
  ): [number, number][] {
    let index = 0;
    let lat = 0;
    let lng = 0;
    const coordinates: [number, number][] = [];
    let shift: number;
    let result: number;
    let byte: number;
    let latitude_change: number;
    let longitude_change: number;
    const factor = Math.pow(10, precision);

    while (index < str.length) {
      shift = 0;
      result = 0;

      do {
        byte = str.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      latitude_change = result & 1 ? ~(result >> 1) : result >> 1;

      shift = 0;
      result = 0;

      do {
        byte = str.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      longitude_change = result & 1 ? ~(result >> 1) : result >> 1;

      lat += latitude_change;
      lng += longitude_change;

      coordinates.push([lat / factor, lng / factor]);
    }

    return coordinates;
  }

  /**
   * Interpola pontos ao longo do caminho geodésico reto (lerp simplificado).
   */
  private interpolateGeodesic(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    numPoints: number = 30,
  ): [number, number][] {
    const coords: [number, number][] = [];
    for (let i = 0; i <= numPoints; i++) {
      const fraction = i / numPoints;
      const lat = startLat + (endLat - startLat) * fraction;
      const lng = startLng + (endLng - startLng) * fraction;
      coords.push([lat, lng]);
    }
    return coords;
  }
}
