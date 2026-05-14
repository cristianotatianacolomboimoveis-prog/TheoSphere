import { exec } from 'child_process';
import { PrismaClient } from '@prisma/client';

/**
 * 🔗 TheoSphere Chained Sync
 * Aguarda a ingestão de texto e dispara o RAG.
 */

const prisma = new PrismaClient();

async function waitAndBootstrap() {
  console.log('⏳ [CHAINED] Aguardando conclusão da ingestão de texto...');
  
  let isDone = false;
  while (!isDone) {
    // Verifica se os últimos livros do NT (Apocalipse) já têm dados para a ARA
    const count = await prisma.bibleVerse.count({
      where: { translation: 'ARA', bookId: 66 }
    });
    
    if (count > 0) {
      isDone = true;
      console.log('✅ [CHAINED] Ingestão de texto detectada como concluída (Apocalipse ARA presente).');
    } else {
      process.stdout.write('.');
      await new Promise(r => setTimeout(r, 30000)); // Espera 30s
    }
  }

  console.log('🚀 [CHAINED] Disparando Full RAG Bootstrap...');
  
  const child = exec('npx ts-node scripts/full-rag-bootstrap.ts', { cwd: './backend' });
  
  child.stdout?.on('data', (data) => console.log(data));
  child.stderr?.on('data', (data) => console.error(data));
  
  child.on('close', (code) => {
    console.log(`🏁 [CHAINED] Bootstrap finalizado com código ${code}`);
  });
}

waitAndBootstrap().catch(console.error);
