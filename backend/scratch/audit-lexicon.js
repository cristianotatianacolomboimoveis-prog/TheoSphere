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
    const count = await prisma.lexicalEntry.count();
    const entries = await prisma.lexicalEntry.findMany({ take: 5 });
    console.log(JSON.stringify({ count, entries }, null, 2));
  } catch (e) {
    console.log(e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
