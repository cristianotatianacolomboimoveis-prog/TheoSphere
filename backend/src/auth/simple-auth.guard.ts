import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/**
 * SimpleAuthGuard — Proteção básica para endpoints sensíveis.
 * Realiza uma validação mínima: o X-User-ID deve existir no banco de dados.
 */
@Injectable()
export class SimpleAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userIdHeader = request.headers['x-user-id'];

    if (!userIdHeader) {
      throw new UnauthorizedException('X-User-ID header is missing');
    }

    // Validação Real: O usuário precisa existir no banco de dados
    const user = await this.prisma.user.findUnique({
      where: { id: userIdHeader },
      select: { id: true, email: true, plan: true },
    });

    if (!user) {
      throw new UnauthorizedException(
        `User with ID ${userIdHeader} not found. Access denied.`,
      );
    }

    // Adiciona o objeto do usuário ao request para uso nos controllers
    request.user = user;

    return true;
  }
}
