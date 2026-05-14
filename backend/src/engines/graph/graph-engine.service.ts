import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class GraphEngineService {
  private readonly logger = new Logger(GraphEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna o grafo relacional (nodes e edges) para uma query ou nó inicial.
   */
  async getRelationalGraph(query?: string) {
    this.logger.debug(`Fetching relational graph for: ${query || 'all'}`);

    // Em um sistema real, faríamos uma busca semântica para encontrar o nó inicial.
    // Para o MVP, retornamos os nós e conexões que existem no banco.
    const nodes = await this.prisma.graphNode.findMany({
      take: 50
    });

    const edges = await this.prisma.graphEdge.findMany({
      where: {
        OR: [
          { sourceId: { in: nodes.map(n => n.id) } },
          { targetId: { in: nodes.map(n => n.id) } }
        ]
      }
    });

    return {
      nodes: nodes.map(n => ({
        id: n.id,
        label: n.label,
        type: n.type,
        ...((n.metadata as any) || {})
      })),
      links: edges.map(e => ({
        source: e.sourceId,
        target: e.targetId,
        relation: e.relationType,
        weight: e.weight
      }))
    };
  }
}
