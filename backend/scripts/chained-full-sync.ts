import { exec } from 'child_process';

/**
 * 🔗 TheoSphere Chained Sync
 * Aguarda a ingestão de texto e dispara o RAG.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Prisma 7 exige um driver adapter explícito no constructor — `new PrismaClient()`
// sem opções lança PrismaClientInitializationError e o script nunca roda.
const connectionString =
  process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function waitAndBootstrap() {
  console.log('⏳ [CHAINED] Aguardando conclusão da ingestão de texto...');

  let isDone = false;
  while (!isDone) {
    // Verifica se os últimos livros do NT (Apocalipse) já têm dados para a ARA
    const count = await prisma.bibleVerse.count({
      where: { translation: 'ARA', bookId: 66 },
    });

    if (count > 0) {
      isDone = true;
      console.log(
        '✅ [CHAINED] Ingestão de texto detectada como concluída (Apocalipse ARA presente).',
      );
    } else {
      process.stdout.write('.');
      await new Promise((r) => setTimeout(r, 30000)); // Espera 30s
    }
  }

  console.log('🚀 [CHAINED] Disparando Full RAG Bootstrap...');

  const child = exec('npx ts-node scripts/full-rag-bootstrap.ts', {
    cwd: './backend',
  });

  child.stdout?.on('data', (data) => console.log(data));
  child.stderr?.on('data', (data) => console.error(data));

  child.on('close', (code) => {
    console.log(`🏁 [CHAINED] Bootstrap finalizado com código ${code}`);
  });
}

waitAndBootstrap().catch(console.error);
