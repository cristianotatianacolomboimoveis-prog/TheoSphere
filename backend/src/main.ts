import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { initSentry } from './observability/sentry';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
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
  ];
  
  app.use(cookieParser());

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

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
  await app.listen(port);
  logger.log(
    `✅ TheoSphere backend up on :${port} (${config.get('NODE_ENV')})`,
  );
  logger.log(`   CORS origins: ${allowedOrigins.join(', ')}`);
}

bootstrap().catch((err) => {
  console.error('❌ Failed to bootstrap TheoSphere backend:', err);
  process.exit(1);
});
