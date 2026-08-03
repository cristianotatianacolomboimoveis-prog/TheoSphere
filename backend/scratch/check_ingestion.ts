import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Prisma 7 exige driver adapter explicito no constructor.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '',
});

const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function checkProgress() {
  const total = await prisma.bibleVerse.count();
  const translations = await prisma.bibleVerse.groupBy({
    by: ['translation'],
    _count: {
      _all: true,
    },
  });

  console.log('--- TheoSphere Ingestion Progress ---');
  console.log(`Total verses: ${total}`);
  console.log('Breakdown by translation:');
  translations.forEach((t) => {
    console.log(`- ${t.translation}: ${t._count._all} verses`);
  });
  console.log('------------------------------------');
}

checkProgress()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
