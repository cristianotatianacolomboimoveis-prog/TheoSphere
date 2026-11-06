import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Como o JwtAuthGuard, mas não exige login: com token válido preenche
 * `req.user`; sem token (ou com token inválido) segue com `req.user = null`.
 * Use só em rotas que precisam aceitar visitantes (ex.: feedback de quem não
 * conseguiu se cadastrar). O userId continua vindo apenas do JWT.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      // Sem token ou token inválido: segue como visitante.
    }
    return true;
  }

  override handleRequest<TUser = unknown>(_err: unknown, user: TUser): TUser {
    return (user || null) as TUser;
  }
}
