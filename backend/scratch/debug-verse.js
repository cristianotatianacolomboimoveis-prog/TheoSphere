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
  try {
    const v = await prisma.bibleVerse.findFirst({
      where: { bookId: 43, chapter: 3, verse: 1 }
    });
    console.log(JSON.stringify(v, null, 2));
  } catch (e) {
    console.log(e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
