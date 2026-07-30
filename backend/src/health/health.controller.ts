import { Controller, Get, HttpCode } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { TheoHealthIndicators } from './health.indicators';
import { RagService } from '../rag/rag.service';

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
    private readonly rag: RagService,
  ) {}

  /**
   * GET /api/v1/health/ai — estado do subsistema de IA.
   *
   * O /health principal só olha banco e Redis, então em 29/07/2026 ele ficou
   * verde durante dias enquanto o Gemini devolvia 429 por teto de gastos e a
   * plataforma servia texto pré-escrito como se fosse resposta. Este endpoint
   * responde **503 quando a última chamada à IA falhou**, para que a
   * verificação diária e qualquer monitor externo enxerguem.
   */
  @Get('ai')
  @HttpCode(200)
  aiHealth() {
    const state = this.rag.getAiHealth();
    const healthy = state.configured && !state.lastFailure;
    return {
      status: healthy ? 'ok' : 'degraded',
      provider: state.provider,
      configured: state.configured,
      lastFailure: state.lastFailure,
      hint: state.configured
        ? (state.lastFailure?.friendly ?? null)
        : 'Defina GEMINI_API_KEY ou OPENAI_API_KEY no ambiente',
    };
  }

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
