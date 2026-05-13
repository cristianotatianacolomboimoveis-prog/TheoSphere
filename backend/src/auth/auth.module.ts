import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../prisma.service';
// AuditService is provided by the global AuditModule (no import needed in
// `imports`); listed here for clarity of the dependency graph only.

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is not configured');
        }
        // SEC-004 partial mitigation: until refresh tokens land, keep the
        // access-token lifetime short so a stolen token (XSS, log leak) has
        // a 1-hour window instead of a week. Override via JWT_EXPIRES_IN if
        // you genuinely need longer-lived tokens for a specific environment.
        const expiresIn = config.get<string>('JWT_EXPIRES_IN') ?? '1h';
        return {
          secret,
          // `expiresIn` accepts a vercel/ms string ("7d", "15m", ...) or a
          // number of seconds. Joi already validated the value.
          signOptions: { expiresIn } as JwtModuleOptions['signOptions'],
        };
      },
    }),
  ],
  providers: [AuthService, JwtStrategy, PrismaService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
