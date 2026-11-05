import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { parseRefToCanonical, fromCanonicalRef } from '../common/canonical-ref';

export interface ResourceCitationItem {
  id: string;
  resourceTitle: string;
  author: string;
  resourceSlug: string;
  year?: number | null;
  text: string;
  chunkIndex: number;
  canonicalRef: number;
  confidence: number;
  matchType: 'explicit_reference' | 'scoped_range';
}

@Injectable()
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna trechos de obras clássicas que citam ou comentam o versículo informado.
   * Suporta ref numérica (BBCCCVVV) ou string ("Sl 51:1", "João 3:16", "Romans 8:28").
   */
  async findReferences(
    refInput: number | string,
    limit = 20,
  ): Promise<ResourceCitationItem[]> {
    const safeLimit = Math.min(Math.max(1, limit), 50);
    const canonicalRef =
      typeof refInput === 'number' ? refInput : parseRefToCanonical(refInput);

    if (!canonicalRef) {
      return [];
    }

    try {
      // 1. Busca por citações diretas indexadas em ResourceReference
      const directRefs = await this.prisma.resourceReference.findMany({
        where: { canonicalRef },
        include: {
          chunk: {
            include: {
              resource: true,
            },
          },
        },
        orderBy: [{ confidence: 'desc' }, { createdAt: 'asc' }],
        take: safeLimit,
      });

      // 2. Busca por chunks cujo intervalo [startRef, endRef] abranja a referência
      const scopedChunks = await this.prisma.resourceChunk.findMany({
        where: {
          startRef: { lte: canonicalRef },
          endRef: { gte: canonicalRef },
        },
        include: {
          resource: true,
        },
        take: safeLimit,
      });

      const results: ResourceCitationItem[] = [];
      const seenChunkIds = new Set<string>();

      // Adiciona referências diretas
      for (const row of directRefs) {
        if (!row.chunk || seenChunkIds.has(row.chunkId)) continue;
        seenChunkIds.add(row.chunkId);
        results.push({
          id: row.id,
          resourceTitle: row.chunk.resource.title,
          author: row.chunk.resource.author,
          resourceSlug: row.chunk.resource.slug,
          year: row.chunk.resource.year,
          text: row.chunk.text,
          chunkIndex: row.chunk.chunkIndex,
          canonicalRef: row.canonicalRef,
          confidence: row.confidence,
          matchType: 'explicit_reference',
        });
      }

      // Adiciona trechos por intervalo
      for (const chunk of scopedChunks) {
        if (seenChunkIds.has(chunk.id) || results.length >= safeLimit) continue;
        seenChunkIds.add(chunk.id);
        results.push({
          id: chunk.id,
          resourceTitle: chunk.resource.title,
          author: chunk.resource.author,
          resourceSlug: chunk.resource.slug,
          year: chunk.resource.year,
          text: chunk.text,
          chunkIndex: chunk.chunkIndex,
          canonicalRef,
          confidence: 0.85,
          matchType: 'scoped_range',
        });
      }

      return results;
    } catch (err: any) {
      this.logger.warn(
        `Erro ao consultar ResourceReference para ${canonicalRef}: ${err.message}`,
      );
      return [];
    }
  }
}
