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
    // For Prisma 7, the CLI uses the `url` specified here for migrations and introspection.
    // Therefore, it must point to the direct (non-pooled) connection string.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
