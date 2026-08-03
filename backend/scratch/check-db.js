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
  const count = await prisma.bibleVerse.count({
    where: {
      bookId: 1,
      chapter: 1
    }
  });
  console.log(`Versículos em Gênesis 1: ${count}`);
  
  const samples = await prisma.bibleVerse.findMany({
    where: { bookId: 1, chapter: 1 },
    take: 3,
    select: { translation: true, verse: true }
  });
  console.log('Amostras:', JSON.stringify(samples));
}

main().catch(console.error).finally(() => prisma.$disconnect());
