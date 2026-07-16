import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { PrismaService } from '../prisma.service';
import { EventBusService } from '../events/event-bus.service';

/**
 * Custom Terminus health indicators for TheoSphere infra.
 *
 *   - prisma : `SELECT 1` against the configured Postgres connection.
 *   - redis  : delegates to EventBusService.isHealthy() (which tracks the
 *              ioredis client status). Treated as DEGRADED rather than DOWN
 *              because Pub/Sub is best-effort: the API stays up without it.
 */
@Injectable()
export class TheoHealthIndicators {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBusService,
    private readonly health: HealthIndicatorService,
  ) {}

  async checkDatabase(key = 'database') {
    const indicator = this.health.check(key);
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return indicator.up();
    } catch (err) {
      return indicator.down({ message: (err as Error).message });
    }
  }

  /**
   * Redis é "up" se a conexão do publisher estiver pronta.
   *
   * Três estados possíveis no payload:
   *   - up                        → conectado e saudável
   *   - up + pubsub: 'disabled'   → REDIS_URL não configurada (deliberado,
   *                                 não é falha — dev/single-pod)
   *   - up + degraded: true       → configurado, mas a conexão caiu
   *
   * Sempre `up()` porque a indisponibilidade do Pub/Sub não é fatal à API.
   */
  checkRedis(key = 'redis') {
    const indicator = this.health.check(key);
    if (!this.events.isEnabled()) {
      return indicator.up({
        pubsub: 'disabled',
        reason: 'REDIS_URL not set — pub/sub intentionally off',
      });
    }
    if (this.events.isHealthy()) {
      return indicator.up();
    }
    return indicator.up({ degraded: true, reason: 'redis pub/sub not ready' });
  }
}
