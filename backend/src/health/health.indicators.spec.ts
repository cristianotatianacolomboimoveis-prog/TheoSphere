import { HealthIndicatorService } from '@nestjs/terminus';
import { TheoHealthIndicators } from './health.indicators';
import { PrismaService } from '../prisma.service';
import { EventBusService } from '../events/event-bus.service';

/**
 * Testes dos três estados do checkRedis():
 *   - disabled  → REDIS_URL não configurada (up + pubsub: 'disabled')
 *   - healthy   → conectado (up limpo)
 *   - degraded  → configurado mas fora do ar (up + degraded: true)
 */
describe('TheoHealthIndicators.checkRedis()', () => {
  // Stub mínimo do HealthIndicatorService do Terminus.
  const health = {
    check: (key: string) => ({
      up: (data?: Record<string, unknown>) => ({
        [key]: { status: 'up', ...data },
      }),
      down: (data?: Record<string, unknown>) => ({
        [key]: { status: 'down', ...data },
      }),
    }),
  } as unknown as HealthIndicatorService;

  const prisma = {} as PrismaService;

  const makeIndicators = (enabled: boolean, healthy: boolean) =>
    new TheoHealthIndicators(
      prisma,
      {
        isEnabled: () => enabled,
        isHealthy: () => healthy,
      } as unknown as EventBusService,
      health,
    );

  it('reporta pubsub disabled quando REDIS_URL não está configurada', () => {
    const result = makeIndicators(false, false).checkRedis() as Record<
      string,
      Record<string, unknown>
    >;
    expect(result.redis.status).toBe('up');
    expect(result.redis.pubsub).toBe('disabled');
    expect(result.redis.degraded).toBeUndefined();
  });

  it('reporta up limpo quando conectado', () => {
    const result = makeIndicators(true, true).checkRedis() as Record<
      string,
      Record<string, unknown>
    >;
    expect(result.redis.status).toBe('up');
    expect(result.redis.degraded).toBeUndefined();
    expect(result.redis.pubsub).toBeUndefined();
  });

  it('reporta degraded quando configurado mas indisponível', () => {
    const result = makeIndicators(true, false).checkRedis() as Record<
      string,
      Record<string, unknown>
    >;
    expect(result.redis.status).toBe('up');
    expect(result.redis.degraded).toBe(true);
    expect(result.redis.reason).toBe('redis pub/sub not ready');
  });
});
