import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class GeoEngineService {
  private readonly logger = new Logger(GeoEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna todas as rotas teológicas (Jornadas).
   */
  async getRoutes() {
    return this.prisma.route.findMany({
      include: {
        _count: {
          select: { waypoints: true }
        }
      }
    });
  }

  /**
   * Retorna os detalhes de uma rota por slug.
   */
  async getRouteBySlug(slug: string) {
    return this.prisma.route.findUnique({
      where: { slug },
      include: {
        waypoints: {
          orderBy: { stepOrder: 'asc' },
          include: {
            contents: true,
            models3d: true
          }
        }
      }
    });
  }

  /**
   * Busca waypoints próximos.
   */
  async getNearbyWaypoints(lat: number, lng: number, radiusKm: number = 50) {
    // Como os waypoints agora usam lat/lng como Float, usamos uma query SQL simples
    // ou PostGIS se integrarmos com a tabela Location.
    // Para simplificar e seguir o novo schema:
    return this.prisma.$queryRaw`
      SELECT * FROM (
        SELECT w.*, 
          (6371 * acos(cos(radians(${lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${lng})) + sin(radians(${lat})) * sin(radians(latitude)))) AS distance
        FROM "Waypoint" w
      ) AS distances
      WHERE distance < ${radiusKm}
      ORDER BY distance;
    `;
  }
}
