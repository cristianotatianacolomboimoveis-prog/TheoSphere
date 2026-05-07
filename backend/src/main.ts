import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { initSentry } from './observability/sentry';

// Initialize Sentry BEFORE Nest spins up — captures bootstrap-time errors too.
initSentry();

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // ConfigModule's Joi schema (AppModule) already validated all required
  // env vars before NestFactory.create returns. If anything was missing or
  // malformed, the process aborts with a descriptive error before this point.
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const allowedOrigins =
    config
      .get<string>('ALLOWED_ORIGINS')
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
    ];

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

  // ─── Security headers ───────────────────────────────────────────────────
  // Lightweight Helmet-equivalent without the dependency. These are the
  // headers that actually matter for an API (no HTML to protect with CSP);
  // the frontend gets stricter CSP from Next/Cloudflare.
  app.use((_req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.removeHeader('X-Powered-By'); // don't advertise Express
    next();
  });

  const port = config.get<number>('PORT') ?? 3002;
  await app.listen(port);
  logger.log(`✅ TheoSphere backend up on :${port} (${config.get('NODE_ENV')})`);
  logger.log(`   CORS origins: ${allowedOrigins.join(', ')}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ Failed to bootstrap TheoSphere backend:', err);
  process.exit(1);
});
