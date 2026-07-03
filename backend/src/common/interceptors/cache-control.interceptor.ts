import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Interceptor que adiciona o header Cache-Control às respostas HTTP.
 * Usado em endpoints com dados imutáveis (ex.: capítulos bíblicos, versões).
 */
@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  constructor(
    private readonly maxAge: number,
    private readonly isPublic = true,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        const directive = this.isPublic ? 'public' : 'private';
        res.header(
          'Cache-Control',
          `${directive}, max-age=${this.maxAge}, stale-while-revalidate=86400`,
        );
      }),
    );
  }
}
