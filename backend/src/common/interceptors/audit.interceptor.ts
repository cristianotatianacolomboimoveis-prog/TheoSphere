import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user, ip, headers } = request;
    const userAgent = headers['user-agent'];
    const startTime = Date.now();

    return next.handle().pipe(
      tap(async () => {
        const duration = Date.now() - startTime;
        
        if (['POST', 'PUT', 'DELETE'].includes(method) || url.includes('/ai/') || url.includes('/enterprise/')) {
          try {
            await this.prisma.auditLog.create({
              data: {
                actorId: user?.id || 'anonymous',
                action: `${method} ${url}`,
                resource: url.split('/')[3] || 'unknown',
                // metadata: JSON.stringify({ ip, userAgent, duration }) // Se o schema suportar Json
              },
            });
            this.logger.debug(`Audit log created for ${method} ${url}`);
          } catch (e) {
            this.logger.warn(`Failed to create audit log: ${e.message}`);
          }
        }
      }),
    );
  }
}
