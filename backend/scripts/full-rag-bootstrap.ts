import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { BibleIngestionService } from '../src/bible-ingestion.service';
import { DriveRagService } from '../src/rag/drive-rag.service';

/**
 * 🚀 TheoSphere Full RAG Bootstrap
 * Injeta Bíblias e Biblioteca do Drive com profundidade total.
 */

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const bibleService = app.get(BibleIngestionService);
  const driveService = app.get(DriveRagService);

  console.log('🌟 [BOOTSTRAP] Iniciando Ingestão Total TheoSphere...');

  // 1. Ingestão de Bíblias e Embeddings
  const versions = ['ARA', 'WLC', 'TR', 'LXX', 'KJV'];
  for (const v of versions) {
    console.log(`🧠 [RAG-BÍBLIA] Processando ${v}...`);
    // O texto deve ser ingerido primeiro via script mass-ingest ou no fluxo normal
    await bibleService.massGenerateEmbeddings(v, 32000); // Indexa toda a Bíblia (~31k versículos)
  }

  // 2. Reindexação Full do Drive
  console.log('📚 [RAG-DRIVE] Iniciando reindexação total da biblioteca...');
  const userId = 'e850cb80-d129-4810-957b-bc94d1fe2aee'; // Usuário Admin
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  
  if (folderId) {
    await driveService.reindex(folderId, userId, 'Geral');
    console.log('✅ [RAG-DRIVE] Reindexação concluída.');
  } else {
    console.warn('⚠️ [RAG-DRIVE] GOOGLE_DRIVE_FOLDER_ID não configurado. Pulando...');
  }

  console.log('🏁 [BOOTSTRAP] Processamento concluído com sucesso.');
  await app.close();
}

bootstrap().catch(err => {
  console.error('❌ Erro no Bootstrap:', err);
  process.exit(1);
});
