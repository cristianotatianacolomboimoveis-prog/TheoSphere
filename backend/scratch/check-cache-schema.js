/**
 * check-cache-schema.js — confirma que a migration do match exato foi
 * aplicada no banco de produção (coluna queryHash + índices).
 *
 *   node scratch/check-cache-schema.js
 */
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ quiet: true });

(async () => {
  const connectionString =
    process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '';
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const cols = await prisma.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'SemanticCacheEntry' AND column_name = 'queryHash'`,
    );
    console.log(
      cols.length
        ? 'queryHash: PRESENTE'
        : 'queryHash: AUSENTE (migration ainda nao rodou)',
    );

    const idx = await prisma.$queryRawUnsafe(
      `SELECT indexname FROM pg_indexes
       WHERE tablename = 'SemanticCacheEntry' AND indexname LIKE '%queryHash%'`,
    );
    console.log(
      'indices:',
      idx.map((r) => r.indexname).join(', ') || 'nenhum',
    );

    // SQL cru de propósito: o client do Prisma local pode estar desatualizado
    // (gerado antes da migration) e falharia num where tipado por queryHash.
    const [{ total, com_hash: comHash }] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS total,
              COUNT("queryHash")::int AS com_hash
       FROM "SemanticCacheEntry"`,
    );
    console.log(`entradas: ${total} (com hash: ${comHash})`);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
})();
