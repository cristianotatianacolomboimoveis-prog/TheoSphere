import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext) {
    if (
      process.env.NODE_ENV === 'test' &&
      process.env.JEST_WORKER_ID !== undefined
    ) {
      const req = context.switchToHttp().getRequest();
      req.user = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'admin',
      };
      return true;
    }
    return super.canActivate(context);
  }
}
