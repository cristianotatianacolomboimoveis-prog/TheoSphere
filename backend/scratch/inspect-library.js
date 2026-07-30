/**
 * inspect-library.js — o que existe na biblioteca RAG do Drive.
 *
 * Responder direto da biblioteca (sem chamar a IA) só faz sentido se ela
 * tiver acervo. Este script mostra volume, obras e cobertura.
 *
 *   node scratch/inspect-library.js
 */
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ quiet: true });

(async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '',
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const porTipo = await prisma.$queryRawUnsafe(
      `SELECT type, COUNT(*)::int AS n, COUNT(DISTINCT "userId")::int AS usuarios
       FROM "UserEmbedding"
       GROUP BY type
       ORDER BY n DESC`,
    );
    console.log('=== UserEmbedding por tipo ===');
    if (!porTipo.length) console.log('(tabela vazia)');
    for (const r of porTipo) {
      console.log(`  ${r.type.padEnd(16)} ${String(r.n).padStart(6)} trechos · ${r.usuarios} usuário(s)`);
    }

    console.log('\n=== Obras na biblioteca (library_book) ===');
    const obras = await prisma.$queryRawUnsafe(
      `SELECT COALESCE(metadata->>'fileName', metadata->>'title', '(sem nome)') AS obra,
              COUNT(*)::int AS trechos
       FROM "UserEmbedding"
       WHERE type = 'library_book'
       GROUP BY 1
       ORDER BY trechos DESC
       LIMIT 25`,
    );
    if (!obras.length) {
      console.log('  (nenhuma obra indexada)');
    } else {
      for (const o of obras) {
        console.log(`  ${String(o.trechos).padStart(5)} trechos · ${o.obra}`);
      }
    }

    const [{ total }] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS total FROM "UserEmbedding" WHERE type = 'library_book'`,
    );
    console.log(`\ntotal de trechos indexados: ${total}`);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
})();
