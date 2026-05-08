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

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // ─── Observability ───────────────────────────────────────────────────────
    // Capture unhandled 5xx errors in Sentry. We skip 4xx (expected client errors)
    // to keep the Sentry quota clean and focused on real system failures.
    if (status >= 500) {
      this.logger.error(
        `[${status}] ${request.method} ${request.url}: ${
          exception instanceof Error ? exception.message : 'Unknown error'
        }`,
        exception instanceof Error ? exception.stack : undefined,
      );
      Sentry.captureException(exception);
    } else {
      this.logger.warn(`[${status}] ${request.method} ${request.url}: ${JSON.stringify(message)}`);
    }

    // ─── Uniform Response ────────────────────────────────────────────────────
    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: typeof message === 'string' ? message : (message as any).error,
      message: typeof message === 'string' ? message : (message as any).message,
    });
  }
}
