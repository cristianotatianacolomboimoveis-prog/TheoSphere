import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface SyncAnnotationItem {
  id?: string;
  startRef: number;
  endRef: number;
  kind: 'highlight' | 'note';
  color?: string | null;
  body?: string | null;
  updatedAt: string | Date;
  deletedAt?: string | Date | null;
}

@Injectable()
export class AnnotationsService {
  private readonly logger = new Logger(AnnotationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista anotações do usuário autenticado com suporte a sincronização incremental (since)
   * e filtro por intervalo canônico BBCCCVVV.
   */
  async listAnnotations(
    userId: string,
    options?: {
      since?: Date;
      startRef?: number;
      endRef?: number;
      includeDeleted?: boolean;
    },
  ) {
    const where: any = { userId };

    if (options?.since) {
      where.updatedAt = { gte: options.since };
    }

    if (!options?.includeDeleted) {
      where.deletedAt = null;
    }

    if (options?.startRef !== undefined && options?.endRef !== undefined) {
      where.startRef = { gte: options.startRef, lte: options.endRef };
    }

    return this.prisma.annotation.findMany({
      where,
      orderBy: { updatedAt: 'asc' },
    });
  }

  /**
   * Sincronização em lote com Last-Write-Wins (LWW) e suporte a tombstones (deletedAt).
   */
  async syncBatch(userId: string, items: SyncAnnotationItem[]) {
    const serverTime = new Date();
    const results: any[] = [];

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const item of items) {
          const itemUpdatedAt = new Date(item.updatedAt);
          const itemDeletedAt = item.deletedAt
            ? new Date(item.deletedAt)
            : null;

          if (item.id) {
            const existing = await tx.annotation.findFirst({
              where: { id: item.id, userId },
            });

            if (existing) {
              // Last-Write-Wins: só atualiza se o item recebido for mais recente que o servidor
              if (itemUpdatedAt > existing.updatedAt) {
                const updated = await tx.annotation.update({
                  where: { id: existing.id },
                  data: {
                    startRef: item.startRef,
                    endRef: item.endRef,
                    kind: item.kind,
                    color: item.color ?? null,
                    body: item.body ?? null,
                    deletedAt: itemDeletedAt,
                    updatedAt: itemUpdatedAt,
                  },
                });
                results.push(updated);
              } else {
                results.push(existing);
              }
              continue;
            }
          }

          // Inserção de nova anotação
          const created = await tx.annotation.create({
            data: {
              ...(item.id ? { id: item.id } : {}),
              userId,
              startRef: item.startRef,
              endRef: item.endRef,
              kind: item.kind,
              color: item.color ?? null,
              body: item.body ?? null,
              deletedAt: itemDeletedAt,
              updatedAt: itemUpdatedAt,
            },
          });
          results.push(created);
        }
      });

      return {
        success: true,
        readOnlyDegraded: false,
        serverTime: serverTime.toISOString(),
        synced: results,
      };
    } catch (err: any) {
      // Read-only (25006) ou tabela ainda não criada porque a migração ficou
      // pendente no boot (Prisma P2021 / Postgres 42P01): degrada para local.
      const isReadOnly =
        err.message?.includes('read_only') ||
        err.message?.includes('read-only') ||
        err.code === '25006' ||
        err.code === 'P2021' ||
        err.code === '42P01';

      if (isReadOnly) {
        this.logger.warn(
          `Banco em modo read-only: sincronização degradada para local-only para usuário ${userId}`,
        );
        return {
          success: false,
          readOnlyDegraded: true,
          message:
            'Suas notas estão salvas apenas neste dispositivo (servidor em modo somente leitura).',
          serverTime: serverTime.toISOString(),
          synced: [],
        };
      }

      this.logger.error(`Erro ao sincronizar anotações: ${err.message}`);
      throw err;
    }
  }

  /**
   * Soft-delete de anotação com tombstone (deletedAt).
   */
  async softDelete(userId: string, id: string) {
    const existing = await this.prisma.annotation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Anotação não encontrada.');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException(
        'Acesso negado à anotação de outro usuário.',
      );
    }

    return this.prisma.annotation.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
