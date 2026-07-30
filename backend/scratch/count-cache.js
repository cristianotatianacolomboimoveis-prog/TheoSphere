/**
 * count-cache.js — conta as entradas do cache semântico.
 *
 * Companheiro do clear-cache.js: rode antes e depois para saber quantas
 * entradas foram removidas. Usa o DATABASE_URL do .env, igual ao backend.
 *
 *   node scratch/count-cache.js
 */
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

(async () => {
  const connectionString =
    process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '';
  if (!connectionString) {
    console.error('Sem DATABASE_URL/DIRECT_URL no .env');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const [total, global, user] = await Promise.all([
      prisma.semanticCacheEntry.count(),
      prisma.semanticCacheEntry.count({ where: { scope: 'global' } }),
      prisma.semanticCacheEntry.count({ where: { scope: 'user' } }),
    ]);
    console.log(
      `CACHE: total=${total} | global=${global} | user=${user}`,
    );
  } catch (err) {
    console.error('Erro ao contar:', err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
})();
