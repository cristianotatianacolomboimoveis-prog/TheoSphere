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
   * Redis is considered "up" if the publisher connection is ready.
   * Returns `up` with `degraded: true` when not ready — this lets a /ready
   * probe pass while still surfacing the issue in the payload.
   */
  checkRedis(key = 'redis') {
    const indicator = this.health.check(key);
    if (this.events.isHealthy()) {
      return indicator.up();
    }
    // Use up() with metadata; pub/sub outage is not fatal to the API.
    return indicator.up({ degraded: true, reason: 'redis pub/sub not ready' });
  }
}
