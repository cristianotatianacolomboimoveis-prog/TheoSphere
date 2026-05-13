import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { AuditService, AUDIT_ACTIONS } from '../audit/audit.service';

/**
 * Auth endpoints.
 *
 * Hardenings vs. the previous version:
 *   - Routes live under `/api/v1/auth/*` (matches the rest of the API).
 *   - DTOs (class-validator) replace `{ email; passwordHash }` literals,
 *     so the global ValidationPipe enforces format/strength.
 *   - Field name is `password` (plaintext over TLS, hashed server-side).
 *   - `/login` has its own strict throttle (5 attempts / 15 min) on top
 *     of the global limit — anti-brute-force.
 *   - Successes and failures are written to AuditLog with IP + UA.
 */
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly audit: AuditService,
  ) {}

  @Post('register')
  // 10 registrations / hour / IP — generous for shared-NAT scenarios but
  // tight enough to throttle account-creation farms.
  @Throttle({ default: { ttl: 3_600_000, limit: 10 } })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const result = await this.authService.register(dto.email, dto.password);
    await this.audit.log({
      actorId: result.userId,
      action: 'auth.register',
      resource: 'User',
      resourceId: result.userId,
      payload: { email: dto.email },
      req,
    });
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  // 5 attempts / 15 min / IP. Dedicated bucket; survives the global one.
  @Throttle({ default: { ttl: 900_000, limit: 5 } })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.authService.login(dto.email, dto.password);

      // Set Refresh Token in httpOnly cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        // secure must be false in dev (HTTP) — browsers silently drop
        // Secure cookies on plain HTTP, breaking the refresh flow.
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/v1/auth/refresh', // Only send to refresh endpoint
      });

      await this.audit.log({
        actorId: result.user.id,
        action: 'auth.login',
        resource: 'User',
        resourceId: result.user.id,
        payload: { email: dto.email, success: true },
        req,
      });

      // Remove refreshToken from response body for extra safety
      const { refreshToken, ...responseBody } = result;
      return responseBody;
    } catch (err) {
      // Audit failed attempts (no password — DTO param is not persisted).
      await this.audit.log({
        actorId: null,
        action: AUDIT_ACTIONS.AUTH_LOGIN_FAIL,
        resource: 'User',
        resourceId: null,
        payload: { email: dto.email, success: false },
        req,
      });
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('credenciais inválidas');
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refreshToken'];
    if (!refreshToken) {
      throw new UnauthorizedException('Nenhum token de atualização encontrado.');
    }

    try {
      const result = await this.authService.refresh(refreshToken);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth/refresh',
      });

      return { accessToken: result.accessToken };
    } catch (err) {
      res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
      throw err;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
    return { message: 'Sessão encerrada com sucesso.' };
  }
}
