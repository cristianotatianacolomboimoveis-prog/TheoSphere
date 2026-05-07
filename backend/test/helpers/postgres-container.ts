import { execSync } from 'node:child_process';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

/**
 * Spin up a Postgres + pgvector container, apply Prisma migrations, and
 * hand back a connection URL ready for `PrismaClient`.
 *
 * Why a helper, not @nestjs/testing?
 *   We want to assert on raw SQL behavior (the `<=>` operator, FTS GIN
 *   index, partial pgvector queries). The Nest DI graph would only get in
 *   the way for these tests; the service layer is exercised separately
 *   via Prisma directly.
 *
 * Performance:
 *   The container reuses the prebuilt `pgvector/pgvector:pg16` image.
 *   First run pulls (~80MB). Subsequent runs reuse the local image.
 *   Migrations apply in ~3-5s.
 */
export interface TestDb {
  url: string;
  container: StartedPostgreSqlContainer;
  stop: () => Promise<void>;
}

export async function setupTestDatabase(): Promise<TestDb> {
  // imresamu/postgis-pgvector is a public combined image bundling both
  // PostGIS and pgvector — it's what we need to apply ALL migrations
  // (including Location's geography column). Falls back to env-pinned tag
  // so users can override in CI without editing code.
  const image =
    process.env.TEST_POSTGRES_IMAGE ?? 'imresamu/postgis-pgvector:16-3.4-0.8.0';
  const container = await new PostgreSqlContainer(image)
    .withUsername('theosphere')
    .withPassword('test')
    .withDatabase('theosphere_test')
    .withStartupTimeout(120_000)
    .start();

  const url = container.getConnectionUri();

  // Apply the migrations against the live container. We use `prisma migrate
  // deploy` rather than `db push` so the test exercises the same SQL that
  // production runs.
  // The 0000-prefixed migration enables `vector`; PostGIS is intentionally
  // skipped (the pgvector image doesn't ship it) — Location-related tests
  // should not run in this suite.
  execSync(`npx prisma migrate deploy`, {
    env: {
      ...process.env,
      DATABASE_URL: url,
      DIRECT_URL: url,
    },
    stdio: 'inherit',
  });

  return {
    url,
    container,
    stop: async () => {
      await container.stop();
    },
  };
}
