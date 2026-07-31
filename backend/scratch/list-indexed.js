/** list-indexed.js — quais obras estão na biblioteca e com quantos trechos. */
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ quiet: true });

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT metadata->>'fileName' AS obra,
              metadata->>'fileId'   AS id,
              COUNT(*)::int         AS n
       FROM "UserEmbedding" WHERE type = 'library_book'
       GROUP BY 1, 2 ORDER BY 3 DESC`,
    );
    let total = 0;
    for (const r of rows) {
      total += r.n;
      console.log(`${String(r.n).padStart(7)}  ${(r.obra ?? '?').slice(0, 68)}`);
    }
    console.log(`${String(total).padStart(7)}  TOTAL (${rows.length} obras)`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
})();
