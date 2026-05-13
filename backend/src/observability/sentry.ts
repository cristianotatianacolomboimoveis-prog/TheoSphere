import * as Sentry from '@sentry/node';

/**
 * Sentry bootstrap.
 *
 * Called from `main.ts` BEFORE NestFactory.create so that errors thrown
 * during module init are also captured. Initialization is a no-op if
 * `SENTRY_DSN` is not set — Sentry calls (`captureException`, `setTag`)
 * become silent stubs, so the rest of the codebase doesn't have to branch.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: parseFloat(
      process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1',
    ),
    // Drop noisy infra warnings; keep app errors and LLM failures.
    ignoreErrors: [
      'ECONNRESET',
      'ETIMEDOUT',
      'ERR_HTTP_CONTENT_LENGTH_MISMATCH',
    ],
    beforeSend(event) {
      // Defensive redaction: strip secret-bearing headers AND any field
      // in the request body that looks like a credential. Sentry default
      // PII scrubbing is on, but we add a belt-and-suspenders pass for
      // our known field names (DTO `password`, JWT `token`, etc.).
      const SECRET_KEYS = new Set([
        'password',
        'passwordHash',
        'token',
        'refreshToken',
        'accessToken',
        'apiKey',
        'api_key',
        'authorization',
        'cookie',
        'jwt',
        'secret',
      ]);

      if (event.request?.headers) {
        for (const k of Object.keys(event.request.headers)) {
          if (SECRET_KEYS.has(k.toLowerCase())) {
            event.request.headers[k] = '[REDACTED]';
          }
        }
      }
      const data = event.request?.data;
      if (data && typeof data === 'object') {
        for (const k of Object.keys(data)) {
          if (SECRET_KEYS.has(k)) {
            (data as Record<string, unknown>)[k] = '[REDACTED]';
          }
        }
      }
      return event;
    },
  });
}

export { Sentry };
