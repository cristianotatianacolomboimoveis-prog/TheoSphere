const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ quiet: true });

// Prisma 7 exige driver adapter explicito no constructor.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '',
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const start = Date.now();
  try {
    const one = await prisma.$queryRaw`SELECT 1 as result`;
    const count = await prisma.bibleVerse.count();
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      status: 'SUCCESS',
      one: one[0].result,
      verseCount: count,
      latencyMs: duration
    }));
  } catch (e) {
    console.log(JSON.stringify({
      status: 'ERROR',
      message: e.message
    }));
  } finally {
    await prisma.$disconnect();
  }
}

main();
