import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { parseRefToCanonical } from '../common/canonical-ref';

export interface ResourceCitationItem {
  id: string;
  resourceTitle: string;
  author: string;
  resourceSlug: string;
  year?: number | null;
  text: string;
  chunkIndex: number;
  canonicalRef: number;
  startRef?: number | null;
  endRef?: number | null;
  kind?: 'heading' | 'inline';
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
   * A consulta encontra tanto referências pontuais quanto intervalos [startRef, endRef]
   * que contenham o versículo pedido (ex.: "Jo 3:16-18" quando se pede 43003016).
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

    const bookId = Math.floor(canonicalRef / 1_000_000);
    const bookMinRef = bookId * 1_000_000;
    const bookMaxRef = bookId * 1_000_000 + 999_999;

    try {
      // 1. Busca em ResourceReference por referência exata OU intervalo [startRef, endRef] do mesmo livro que cubra o versículo
      const directRefs = await this.prisma.resourceReference.findMany({
        where: {
          OR: [
            { canonicalRef },
            {
              startRef: { gte: bookMinRef, lte: canonicalRef },
              endRef: { gte: canonicalRef, lte: bookMaxRef },
            },
          ],
        },
        include: {
          chunk: {
            include: {
              resource: true,
            },
          },
        },
        orderBy: [{ confidence: 'desc' }, { createdAt: 'asc' }],
        take: Math.max(safeLimit * 3, 60),
      });

      // Ordena priorizando cabeçalhos de perícope estreita (comentários do próprio trecho, span <= 50),
      // seguidos de citações diretas (span 0) e seções maiores.
      const sortedDirectRefs = [...directRefs].sort((a, b) => {
        const spanA =
          a.startRef != null && a.endRef != null
            ? Math.max(0, a.endRef - a.startRef)
            : 0;
        const spanB =
          b.startRef != null && b.endRef != null
            ? Math.max(0, b.endRef - b.startRef)
            : 0;
        const isPericopeHeadingA = a.kind === 'heading' && spanA <= 50 ? 0 : 1;
        const isPericopeHeadingB = b.kind === 'heading' && spanB <= 50 ? 0 : 1;
        if (isPericopeHeadingA !== isPericopeHeadingB) {
          return isPericopeHeadingA - isPericopeHeadingB;
        }
        if (spanA !== spanB) return spanA - spanB;
        return (b.confidence ?? 1) - (a.confidence ?? 1);
      });

      // 2. Busca complementar por chunks cujo intervalo [startRef, endRef] abranja a referência
      const scopedChunks = await this.prisma.resourceChunk.findMany({
        where: {
          startRef: { gte: bookMinRef, lte: canonicalRef },
          endRef: { gte: canonicalRef, lte: bookMaxRef },
        },
        include: {
          resource: true,
        },
        take: safeLimit,
      });

      const results: ResourceCitationItem[] = [];
      const seenChunkIds = new Set<string>();

      for (const row of sortedDirectRefs) {
        if (
          !row.chunk ||
          seenChunkIds.has(row.chunkId) ||
          results.length >= safeLimit
        ) {
          continue;
        }
        seenChunkIds.add(row.chunkId);
        const startRef = row.startRef ?? row.canonicalRef;
        const endRef = row.endRef ?? row.canonicalRef;
        const kind = row.kind === 'heading' ? 'heading' : 'inline';
        const isRange = endRef > startRef || kind === 'heading';
        results.push({
          id: row.id,
          resourceTitle: row.chunk.resource.title,
          author: row.chunk.resource.author,
          resourceSlug: row.chunk.resource.slug,
          year: row.chunk.resource.year,
          text: row.chunk.text,
          chunkIndex: row.chunk.chunkIndex,
          canonicalRef: row.canonicalRef,
          startRef,
          endRef,
          kind,
          confidence: row.confidence,
          matchType: isRange ? 'scoped_range' : 'explicit_reference',
        });
      }

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
          startRef: chunk.startRef ?? canonicalRef,
          endRef: chunk.endRef ?? canonicalRef,
          kind: 'heading',
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
