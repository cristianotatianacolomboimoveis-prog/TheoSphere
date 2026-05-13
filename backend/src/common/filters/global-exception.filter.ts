import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Sentry } from '../../observability/sentry';

/**
 * Global exception filter.
 *
 * In production:
 *   • 5xx responses ship a generic message — never expose stack traces,
 *     filesystem paths, or DB error text to clients (CWE-209).
 *   • 4xx responses preserve the original validation message because that's
 *     what tells the user what to fix; we still strip any nested object
 *     `cause` / stack fragments that class-validator sometimes returns.
 *   • Full detail (stack, raw exception) is logged server-side and
 *     forwarded to Sentry for 5xx only.
 *
 * In development we expose more — helps debugging.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly isProd = process.env.NODE_ENV === 'production';

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawMessage =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // ─── Observability ───────────────────────────────────────────────────
    if (status >= 500) {
      this.logger.error(
        `[${status}] ${request.method} ${request.url}: ${
          exception instanceof Error ? exception.message : 'Unknown error'
        }`,
        exception instanceof Error ? exception.stack : undefined,
      );
      Sentry.captureException(exception);
    } else {
      this.logger.warn(
        `[${status}] ${request.method} ${request.url}: ${JSON.stringify(
          rawMessage,
        )}`,
      );
    }

    // ─── Uniform Response ────────────────────────────────────────────────
    const payload = this.buildPayload(status, rawMessage, request.url);
    response.status(status).json(payload);
  }

  private buildPayload(status: number, raw: unknown, path: string) {
    // 5xx in prod → opaque message. Don't leak internals to attackers.
    if (status >= 500 && this.isProd) {
      return {
        success: false,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path,
        error: 'Internal Server Error',
        message: 'Erro interno do servidor.',
      };
    }

    const { error, message } = this.normalize(raw);
    return {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path,
      error,
      message,
    };
  }

  private normalize(raw: unknown): { error: string; message: unknown } {
    if (typeof raw === 'string') {
      return { error: raw, message: raw };
    }
    if (raw && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      return {
        error: typeof obj.error === 'string' ? obj.error : 'Error',
        // class-validator returns `message: string[]` — that's fine to pass
        // through. Avoid leaking `stack`, `cause`, or constructor names.
        message: obj.message ?? obj.error ?? 'Error',
      };
    }
    return { error: 'Error', message: 'Error' };
  }
}
