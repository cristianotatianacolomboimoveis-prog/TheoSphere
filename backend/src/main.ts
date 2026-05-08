import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { initSentry } from './observability/sentry';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import helmet from 'helmet';

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

  app.useGlobalFilters(new GlobalExceptionFilter());

  // ─── Security headers ───────────────────────────────────────────────────
  // Helmet provides robust security headers (CSP, XSS Protection, etc.)
  app.use(helmet());

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
