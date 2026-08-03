import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Prisma 7 exige driver adapter explicito no constructor.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '',
});

const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function checkCount() {
  try {
    await prisma.$connect();
    const total = await prisma.userEmbedding.count({
      where: {
        type: 'library_book',
      },
    });

    const byFile = await prisma.$queryRaw`
      select metadata->>'fileName' as file, count(*)::int as chunks 
      from "UserEmbedding" 
      where type = 'library_book'
      group by metadata->>'fileName'
    `;

    console.log('--- 📊 GOOGLE DRIVE INGESTION STATUS ---');
    console.log(`Total Library Chunks Embedded: ${total}`);
    console.log('Processed Files and Chunks:');
    (byFile as any[]).forEach((row, i) => {
      console.log(`[${i + 1}] ${row.file} (${row.chunks} chunks)`);
    });
  } catch (err) {
    console.error('Failed to query DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkCount();
