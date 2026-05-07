import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
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
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    try {
      const result = await this.authService.login(dto.email, dto.password);
      await this.audit.log({
        actorId: result.user.id,
        action: 'auth.login',
        resource: 'User',
        resourceId: result.user.id,
        payload: { email: dto.email, success: true },
        req,
      });
      return result;
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
}
