import { Logger } from '@nestjs/common';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';

/**
 * Rate limit no Redis com reserva em memória.
 *
 * Antes, se o Redis caísse, TODA requisição respondia 500
 * (MaxRetriesPerRequestError no ThrottlerGuard) — o Redis, que o AGENTS.md
 * descreve como opcional, virava ponto único de falha da API inteira.
 * Agora a falha do Redis degrada para o contador em memória do processo
 * (limite por pod, não global) e é registrada em warn, no máximo 1x/minuto.
 */
export class FallbackThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger('ThrottlerStorage');
  private readonly memory = new ThrottlerStorageService();
  private lastWarnAt = 0;

  constructor(private readonly primary: ThrottlerStorage) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    try {
      return await this.primary.increment(
        key,
        ttl,
        limit,
        blockDuration,
        throttlerName,
      );
    } catch (error) {
      const now = Date.now();
      if (now - this.lastWarnAt > 60_000) {
        this.lastWarnAt = now;
        this.logger.warn(
          `Redis indisponível para rate limit; usando contador em memória: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      return this.memory.increment(
        key,
        ttl,
        limit,
        blockDuration,
        throttlerName,
      );
    }
  }
}
