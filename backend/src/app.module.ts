import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RagModule } from './rag/rag.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { BibleModule } from './bible.module';
import { OrchestratorService } from './orchestrator.service';
import { GeospatialModule } from './geospatial/geospatial.module';
import { LinguisticsModule } from './linguistics/linguistics.module';
import { SearchModule } from './search/search.module';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3002),
        DATABASE_URL: Joi.string()
          .uri({ scheme: ['postgresql', 'postgres'] })
          .required(),
        DIRECT_URL: Joi.string()
          .uri({ scheme: ['postgresql', 'postgres'] })
          .required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string().default('7d'),
        ALLOWED_ORIGINS: Joi.string().optional(),
        OPENAI_API_KEY: Joi.string().optional().allow(''),
        GEMINI_API_KEY: Joi.string().optional().allow(''),
        REDIS_URL: Joi.string().optional().allow(''),
        SENTRY_DSN: Joi.string().uri().optional().allow(''),
        SENTRY_RELEASE: Joi.string().optional().allow(''),
        SENTRY_TRACES_SAMPLE_RATE: Joi.number().min(0).max(1).optional(),
      }).custom((env, helpers) => {
        if (
          env.NODE_ENV === 'production' &&
          !env.OPENAI_API_KEY &&
          !env.GEMINI_API_KEY
        ) {
          return helpers.error('any.invalid', {
            message:
              'OPENAI_API_KEY or GEMINI_API_KEY is required in production',
          });
        }
        return env;
      }),
      validationOptions: { abortEarly: false, allowUnknown: true },
    }),
    // Distributed throttler — Redis-backed sliding-window. The previous
    // in-memory bucket was per-pod, so 3 backend replicas allowed 3× the
    // intended rate. With shared Redis storage every pod sees the same
    // counter, so brute-force/burst limits hold globally.
    //
    // If REDIS_URL is unset, we transparently fall back to the in-memory
    // bucket (dev / single-pod). Production MUST set REDIS_URL.
    ThrottlerModule.forRootAsync({
      useFactory: () => {
        const redisUrl = process.env.REDIS_URL;
        const base = {
          throttlers: [{ ttl: 60_000, limit: 20 }], // 20/min default
        } as any;
        if (redisUrl) {
          base.storage = new ThrottlerStorageRedisService(new Redis(redisUrl));
        }
        return base;
      },
    }),
    PrismaModule,
    EventsModule,
    AuditModule,
    HealthModule,
    RagModule,
    AuthModule,
    BibleModule,
    LinguisticsModule,
    GeospatialModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    AppService,
    OrchestratorService,
  ],
})
export class AppModule {}
