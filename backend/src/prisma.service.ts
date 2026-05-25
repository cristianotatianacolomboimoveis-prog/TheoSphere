import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// ─── Singleton Pattern ──────────────────────────────────────────────────────
// Em desenvolvimento, o NestJS realiza hot-reloads frequentes. Se criarmos uma
// nova instância do PrismaClient a cada reload, esgotaremos o pool de
// conexões do PostgreSQL rapidamente. O objeto global persiste entre reloads.
//
// Prisma 7 exige um driver adapter explícito no constructor (antes a URL
// vinha do schema). O adapter para Postgres direto é `@prisma/adapter-pg`,
// que envelopa o driver `pg` (8.x) já presente nas deps.
// ─────────────────────────────────────────────────────────────────────────────

function buildClient(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '';
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || buildClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private pool: Pool;

  constructor() {
    const connectionString =
      process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '';
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    if (this.pool) {
      await this.pool.end();
    }
  }
}
