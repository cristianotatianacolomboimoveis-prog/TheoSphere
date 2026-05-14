import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma.service';
import { hashPassword, needsRehash, verifyPassword } from './password.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(email: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('E-mail já cadastrado.');
    }

    // SHA-256 → bcrypt(12). The pre-hash eliminates the bcrypt 72-byte
    // truncation surface (DT-6). See password.util.ts.
    const passwordHash = await hashPassword(password);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        plan: 'FREE',
      },
    });

    return {
      message: 'Usuário registrado com sucesso.',
      userId: user.id,
    };
  }

  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const isMatch = await verifyPassword(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    // Transparent upgrade: legacy bcrypt-only hashes get re-hashed with
    // the SHA-256→bcrypt scheme on the next successful login. Failure to
    // upgrade must not break the login flow itself.
    if (needsRehash(user.passwordHash)) {
      try {
        const upgraded = await hashPassword(pass);
        await this.prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: upgraded },
        });
        this.logger.debug(`[auth] upgraded password hash for ${user.id}`);
      } catch (err) {
        this.logger.warn(
          `[auth] hash upgrade failed for ${user.id}: ${
            err instanceof Error ? err.message : 'unknown'
          }`,
        );
      }
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        xp: user.xp,
      },
    };
  }

  async generateRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });

    return token;
  }

  async refresh(token: string) {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!refreshToken || refreshToken.revokedAt || refreshToken.expiresAt < new Date()) {
      // Security: if token is reused/invalid, revoke all tokens for this user
      if (refreshToken && refreshToken.revokedAt) {
        await this.prisma.refreshToken.updateMany({
          where: { userId: refreshToken.userId },
          data: { revokedAt: new Date() },
        });
        throw new UnauthorizedException('Token de atualização reutilizado detectado. Todas as sessões revogadas.');
      }
      throw new UnauthorizedException('Token de atualização inválido ou expirado.');
    }

    // Rotate token: revoke old one and create new one
    const newToken = crypto.randomBytes(40).toString('hex');
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await this.prisma.refreshToken.update({
      where: { id: refreshToken.id },
      data: {
        revokedAt: new Date(),
        replacedBy: newToken,
      },
    });

    await this.prisma.refreshToken.create({
      data: {
        token: newToken,
        userId: refreshToken.userId,
        expiresAt: newExpiresAt,
      },
    });

    const payload = { sub: refreshToken.user.id, email: refreshToken.user.email };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: newToken,
    };
  }
}
