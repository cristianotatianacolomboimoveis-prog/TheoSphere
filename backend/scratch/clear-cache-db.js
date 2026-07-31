/**
 * clear-cache-db.js — esvazia o cache semântico do RAG direto no banco.
 *
 * Necessário depois de remover obras da biblioteca: uma resposta em cache pode
 * ter sido montada sobre trechos que já não existem, e continuaria sendo
 * servida — com citação e tudo — como se a fonte ainda estivesse lá.
 */
require('dotenv').config({ quiet: true });

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const [{ n }] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS n FROM "SemanticCacheEntry"`,
    );
    if (n === 0) {
      console.log('cache já vazio.');
      return;
    }
    await prisma.$executeRawUnsafe(`DELETE FROM "SemanticCacheEntry"`);
    console.log(`${n} resposta(s) em cache removidas.`);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
})();
