import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/**
 * Serviço do acervo arqueológico.
 * Consulta descobertas curadas relacionadas ao mundo bíblico,
 * com filtros por categoria, autenticidade, texto livre, referência
 * bíblica e proximidade geográfica (para o Atlas 4D).
 *
 * Nota de tipagem: o delegate `archaeologicalFind` é acessado via tipos
 * locais (ArchFindDelegate) em vez dos tipos gerados pelo Prisma Client.
 * Motivo: o client é regenerado apenas no build de CI/produção
 * (`prisma generate` no Dockerfile/Render); os tipos locais mantêm o
 * type-check estável independente do estado do client gerado.
 */

export interface ArchFind {
  id: string;
  slug: string;
  namePt: string;
  nameEn: string | null;
  category: string;
  discoveryYear: number | null;
  discoverySite: string;
  currentLocation: string | null;
  period: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string;
  significance: string;
  authenticity: string;
  relatedRefs: string[];
  externalUrl: string | null;
  createdAt: Date;
}

interface ArchFindWhere {
  category?: string;
  authenticity?: string;
  OR?: Array<
    Record<string, { contains: string; mode: 'insensitive' } | undefined>
  >;
}

interface ArchFindDelegate {
  findMany(args: {
    where?: ArchFindWhere;
    orderBy?: Array<Record<string, 'asc' | 'desc'>>;
    take?: number;
    skip?: number;
  }): Promise<ArchFind[]>;
  findUnique(args: { where: { slug: string } }): Promise<ArchFind | null>;
  count(args: { where?: ArchFindWhere }): Promise<number>;
  groupBy(args: { by: string[]; _count: { _all: true } }): Promise<
    Array<{
      category?: string;
      authenticity?: string;
      _count: { _all: number };
    }>
  >;
}

@Injectable()
export class ArchaeologyService {
  constructor(private prisma: PrismaService) {}

  /** Delegate do model (ver nota de tipagem no cabeçalho). */
  private get finds(): ArchFindDelegate {
    return (this.prisma as unknown as Record<string, ArchFindDelegate>)[
      'archaeologicalFind'
    ];
  }

  async findAll(params: {
    category?: string;
    authenticity?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }) {
    const { category, authenticity, q } = params;
    const limit = Math.min(params.limit ?? 100, 200);
    const offset = params.offset ?? 0;

    const where: ArchFindWhere = {};
    if (category) where.category = category;
    if (authenticity) where.authenticity = authenticity;
    if (q) {
      const like = { contains: q, mode: 'insensitive' as const };
      where.OR = [
        { namePt: like },
        { nameEn: like },
        { description: like },
        { significance: like },
        { discoverySite: like },
      ];
    }

    const [items, total] = await Promise.all([
      this.finds.findMany({
        where,
        orderBy: [{ discoveryYear: 'asc' }],
        take: limit,
        skip: offset,
      }),
      this.finds.count({ where }),
    ]);
    return { items, total, limit, offset };
  }

  async findBySlug(slug: string): Promise<ArchFind | null> {
    return this.finds.findUnique({ where: { slug } });
  }

  /**
   * Busca descobertas ligadas a uma referência bíblica.
   * Match por prefixo: ref='2Rs 3' encontra '2Rs 3:4-27'; ref='2Rs' encontra
   * qualquer entrada do livro.
   */
  async findByRef(ref: string): Promise<ArchFind[]> {
    const normalized = ref.trim().replace(/\s+/g, ' ');
    return this.prisma.$queryRaw<ArchFind[]>`
      SELECT * FROM "ArchaeologicalFind"
      WHERE EXISTS (
        SELECT 1 FROM unnest("relatedRefs") AS r
        WHERE r ILIKE ${normalized + '%'}
      )
      ORDER BY "discoveryYear" ASC NULLS LAST
      LIMIT 100
    `;
  }

  /**
   * Descobertas próximas de um ponto (para o Atlas 4D).
   * Distância haversine em km calculada no SQL.
   */
  async findNearby(
    lat: number,
    lng: number,
    radiusKm = 50,
  ): Promise<Array<ArchFind & { distance_km: number }>> {
    const radius = Math.min(radiusKm, 500);
    return this.prisma.$queryRaw<Array<ArchFind & { distance_km: number }>>`
      SELECT *,
        (6371 * acos(
          least(1.0,
            cos(radians(${lat})) * cos(radians(latitude)) *
            cos(radians(longitude) - radians(${lng})) +
            sin(radians(${lat})) * sin(radians(latitude))
          )
        )) AS distance_km
      FROM "ArchaeologicalFind"
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        AND (6371 * acos(
          least(1.0,
            cos(radians(${lat})) * cos(radians(latitude)) *
            cos(radians(longitude) - radians(${lng})) +
            sin(radians(${lat})) * sin(radians(latitude))
          )
        )) <= ${radius}
      ORDER BY distance_km ASC
      LIMIT 100
    `;
  }

  /** Contagens por categoria e autenticidade (para filtros da UI). */
  async getStats() {
    const [byCategory, byAuthenticity] = await Promise.all([
      this.finds.groupBy({ by: ['category'], _count: { _all: true } }),
      this.finds.groupBy({ by: ['authenticity'], _count: { _all: true } }),
    ]);
    return {
      byCategory: byCategory.map((c) => ({
        category: c.category,
        count: c._count._all,
      })),
      byAuthenticity: byAuthenticity.map((a) => ({
        authenticity: a.authenticity,
        count: a._count._all,
      })),
    };
  }
}
