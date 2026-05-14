import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function run() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    console.log('Adding HNSW index to TheologyEmbedding...');
    // We use vector_cosine_ops for tradition search
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_theology_embedding_hnsw 
      ON "TheologyEmbedding" 
      USING hnsw (embedding vector_cosine_ops);
    `);
    console.log('✅ HNSW index added successfully!');

  } catch (err) {
    console.error('❌ Failed to add HNSW index:', err);
  } finally {
    await client.end();
  }
}

run();
