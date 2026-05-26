import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 moved `url` and `directUrl` from schema.prisma to this
 * external config. The schema now only declares `provider`; the connection
 * comes from here at runtime, read from env (.env / .env.local).
 *
 * Docs: https://pris.ly/d/config-datasource
 */
export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: './prisma/migrations',
  },
  datasource: {
    // For Prisma 7, use only 'url' for the direct (non-pooled) connection string.
    // This is used by prisma migrate, prisma db, and prisma generate.
    // DIRECT_URL should be set in production; DATABASE_URL is fallback for dev/CI.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
