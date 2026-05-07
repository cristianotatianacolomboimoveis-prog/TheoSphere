import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma.service';
import { Role, ROLES_KEY } from './roles.decorator';

/**
 * RolesGuard
 *
 * Reads the `@Roles(...)` metadata, fetches the caller's current role from
 * the database (single point of truth — JWT carries `userId` only, never
 * stale role claims), and authorizes if the user holds at least one of the
 * required roles.
 *
 * MUST run AFTER JwtAuthGuard so `request.user.userId` is populated. Order
 * matters: `@UseGuards(JwtAuthGuard, RolesGuard)` — JwtAuthGuard first.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true; // no policy = allow

    const req = ctx.switchToHttp().getRequest();
    const userId: string | undefined = req.user?.userId;
    if (!userId) throw new ForbiddenException('not authenticated');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) throw new ForbiddenException('user not found');

    if (!required.includes(user.role as Role)) {
      throw new ForbiddenException(
        `requires one of [${required.join(', ')}]; have ${user.role}`,
      );
    }
    // Surface the resolved role to downstream handlers without an extra query.
    req.user.role = user.role;
    return true;
  }
}
