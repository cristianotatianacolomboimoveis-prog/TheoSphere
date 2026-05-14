import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DriveRagService } from './src/rag/drive-rag.service';

async function bootstrap() {
  // Desabilitamos logging para não poluir o terminal
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const driveRagService = app.get(DriveRagService);

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '1prLd1VZAE0NVnNiZqlIgkGqsWmrM_mPp';
  const userId = 'e850cb80-d129-4810-957b-bc94d1fe2aee';

  console.log('--- 🚀 INICIANDO INGESTÃO DA BIBLIOTECA NO DRIVE ---');
  console.log(`Pasta: ${folderId}`);
  
  try {
    const result = await driveRagService.ingestFolder(folderId, userId, 'Geral');
    console.log('--- ✅ SUCESSO ---');
    console.log('Resultado:', result);
  } catch (error) {
    console.error('--- ❌ ERRO NA INGESTÃO ---');
    console.error(error);
  } finally {
    await app.close();
  }
}

bootstrap();
