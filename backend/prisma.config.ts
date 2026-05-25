import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 movimentou `url` e `directUrl` do schema.prisma para esta
 * config externa. O schema agora declara apenas `provider`; a conexão
 * vem daqui em runtime, lida do env (.env / .env.local).
 *
 * Docs: https://pris.ly/d/config-datasource
 */
export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: './prisma/migrations',
  },
  datasource: {
    // url = pooled connection (PgBouncer) — used at runtime by the app.
    // directUrl = non-pooled — used by `prisma migrate deploy` & introspection.
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
