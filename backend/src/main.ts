import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { initSentry } from './observability/sentry';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

// Initialize Sentry BEFORE Nest spins up — captures bootstrap-time errors too.
initSentry();

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // ConfigModule's Joi schema (AppModule) already validated all required
  // env vars before NestFactory.create returns. If anything was missing or
  // malformed, the process aborts with a descriptive error before this point.
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const allowedOrigins = config
    .get<string>('ALLOWED_ORIGINS')
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean) ?? [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
  ];

  app.use(cookieParser());

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const isLocalhost =
        /^(https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);
      // Accept any Vercel preview/production URL for this project
      const isVercel = /^https:\/\/frontend-v2[\w-]*\.vercel\.app$/.test(
        origin,
      );
      if (isLocalhost || isVercel || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ─── Security headers ───────────────────────────────────────────────────
  // Explicit CSP (DT-7). This is an API — no HTML responses — so the policy
  // is defense-in-depth for any docs/Swagger surface served from the same
  // origin. The frontend (Next.js) ships its own CSP separately.
  //
  // crossOriginResourcePolicy is loosened to 'cross-origin' so cached
  // chapter responses can be consumed by the frontend running on a
  // different origin (Vercel) and the Cesium tile worker.
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: ["'self'", 'https:', 'wss:'],
          workerSrc: ["'self'", 'blob:'],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const port = config.get<number>('PORT') ?? 3002;
  // Bind explicitly to 0.0.0.0 so PaaS routers (Railway/Render/Fly) can reach
  // the container. Sem host explícito, alguns ambientes bindam só em
  // localhost/IPv6 e o domínio público retorna 502.
  await app.listen(port, '0.0.0.0');
  logger.log(
    `✅ TheoSphere backend up on 0.0.0.0:${port} (${config.get('NODE_ENV')})`,
  );
  logger.log(`   CORS origins: ${allowedOrigins.join(', ')}`);
}

bootstrap().catch((err) => {
  console.error('❌ Failed to bootstrap TheoSphere backend:', err);
  process.exit(1);
});
