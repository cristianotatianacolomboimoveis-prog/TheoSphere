import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { SearchService } from '../src/search/search.service';
import { EmbeddingService } from '../src/rag/embedding.service';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const embeddingService = new EmbeddingService(prisma as any);
const searchService = new SearchService(prisma as any, embeddingService);

async function main() {
  console.log('--- TEST: Translation Case-Insensitive Search & Reference ---');

  // 1. Reference lookup com lowercase
  const refResults = await searchService.hybridSearchVerses('João 3:16', {
    translation: 'blivre',
  });
  console.log(`Reference 'João 3:16' com translation='blivre': ${refResults.length} hits`);
  if (refResults.length > 0) {
    console.log(`  Hit translation: ${refResults[0].translation}, text: ${refResults[0].text.substring(0, 40)}...`);
  }

  // 2. Keyword/Hybrid search com lowercase
  const searchKjv = await searchService.hybridSearchVerses('light in the darkness', {
    translation: 'kjv',
    limit: 3,
  });
  console.log(`Hybrid search com translation='kjv': ${searchKjv.length} hits`);
  if (searchKjv.length > 0) {
    console.log(`  Hit translation: ${searchKjv[0].translation}, text: ${searchKjv[0].text.substring(0, 40)}...`);
  }

  // 3. Advanced search com structured filter
  const advResults = await searchService.advancedSearch('book:John chapter:1 luz', {
    translation: 'nva',
    limit: 3,
  });
  console.log(`Advanced search com translation='nva': ${advResults.hits.length} hits`);
  if (advResults.hits.length > 0) {
    console.log(`  Hit translation: ${advResults.hits[0].translation}, text: ${advResults.hits[0].text.substring(0, 40)}...`);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
