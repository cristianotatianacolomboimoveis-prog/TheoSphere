import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { AiService } from './src/common/ai/ai.service';
import 'dotenv/config';

async function bootstrap() {
  console.log('--- STARTING NESTJS INTEGRATION TEST WITH FASTAPI ---');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const aiService = app.get(AiService);

    console.log('Testing centroid calculation...');
    const coords = [
      [35.2137, 31.7683], // Jerusalem
      [34.7818, 32.0853], // Tel Aviv
      [34.9896, 32.794], // Haifa
    ];
    const centroid = await aiService.getCentroid(coords);
    console.log(
      '✅ Centroid computed successfully by Python service:',
      centroid,
    );

    console.log('Testing RAG Query...');
    const query = 'Qual a importância teológica do Monte das Oliveiras?';
    const answer = await aiService.queryRAG(query, ['doc1.txt', 'doc2.txt']);
    console.log('✅ RAG Response from Python service:', answer);

    console.log('--- ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
  } catch (error) {
    console.error('❌ Integration test failed:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
