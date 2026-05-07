import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { TheoHealthIndicators } from './health.indicators';

/**
 * Health endpoints exposed at `/api/v1/health/*`.
 *
 *   GET /api/v1/health        full check (DB + Redis)
 *   GET /api/v1/health/live   liveness  — answers 200 if the process is alive
 *   GET /api/v1/health/ready  readiness — 200 only when DB is reachable
 *                             (Redis outage degrades but does NOT fail readiness)
 *
 * Designed for orchestrators (Docker, Railway, Kubernetes). The container
 * HEALTHCHECK and compose `depends_on: condition: service_healthy` chains
 * point at /live for the cheapest possible probe.
 */
@SkipThrottle()
@Controller('api/v1/health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicators: TheoHealthIndicators,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.indicators.checkDatabase(),
      () => this.indicators.checkRedis(),
    ]);
  }

  @Get('live')
  @HealthCheck()
  liveness() {
    // No external deps — just confirms the event loop is responsive.
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([() => this.indicators.checkDatabase()]);
  }
}
