/**
 * list-users.js — quem tem conta na plataforma e com qual papel.
 *
 * Útil antes de rodar scripts que exigem login (ingestão da biblioteca,
 * limpeza de cache): mostra se a conta existe e se tem role ADMIN.
 *
 *   node scratch/list-users.js
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
    // O model User não tem createdAt — ordena por e-mail.
    const rows = await prisma.$queryRawUnsafe(
      `SELECT email, role, plan, xp FROM "User" ORDER BY email LIMIT 30`,
    );

    if (!rows.length) {
      console.log('Nenhum usuário cadastrado.');
      console.log('Crie a conta em https://frontend-v2-lake.vercel.app/login');
      return;
    }

    console.log(`${rows.length} conta(s):\n`);
    for (const u of rows) {
      console.log(
        `  ${u.role.padEnd(10)} ${u.email}   (plano ${u.plan}, ${u.xp} XP)`,
      );
    }

    const admins = rows.filter((u) => u.role === 'ADMIN');
    console.log(
      `\n${admins.length ? `✅ ${admins.length} ADMIN` : '⚠️  nenhum ADMIN — DELETE /rag/cache exigirá promoção via SQL'}`,
    );
  } catch (err) {
    console.error('Erro:', err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
})();
