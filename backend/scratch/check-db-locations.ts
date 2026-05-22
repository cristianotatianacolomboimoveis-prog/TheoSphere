import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL ?? '';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Printing All DB Locations ---');
  try {
    const locations = await prisma.location.findMany({
      select: { era: true, category: true, name: true },
      orderBy: { era: 'asc' },
    });

    console.log(`Total: ${locations.length} locations`);
    locations.forEach((loc, idx) => {
      console.log(
        `${idx + 1}. [Era: ${loc.era}] [Cat: ${loc.category}] ${loc.name}`,
      );
    });
  } catch (err) {
    console.error('Database query failed:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
