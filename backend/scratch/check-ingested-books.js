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
  const userId = 'e850cb80-d129-4810-957b-bc94d1fe2aee';
  const embeddings = await prisma.userEmbedding.findMany({
    where: {
      userId: userId,
      type: 'library_book'
    },
    select: {
      metadata: true
    }
  });

  console.log(`Total library book chunks for user ${userId}:`, embeddings.length);
  
  const files = new Set();
  embeddings.forEach(e => {
    if (e.metadata && e.metadata.fileName) {
      files.add(e.metadata.fileName);
    }
  });

  console.log('Unique files processed:');
  files.forEach(f => console.log(`- ${f}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
