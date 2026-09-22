import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function diagnose() {
  const result = await prisma.bibleVerse.groupBy({
    by: ['translation'],
    _count: {
      id: true,
    },
  });
  console.log('Translations in database:', result);
}

diagnose().catch(console.error).finally(() => pool.end());
