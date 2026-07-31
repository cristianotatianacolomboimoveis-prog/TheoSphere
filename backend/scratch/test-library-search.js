/**
 * test-library-search.js — mostra a similaridade real dos trechos da
 * biblioteca para uma pergunta.
 *
 * Serve para calibrar LIBRARY_DIRECT_THRESHOLD (default 0.82): se os melhores
 * trechos ficam abaixo do limiar, a plataforma manda para a IA mesmo tendo
 * material bom no acervo.
 *
 *   node scratch/test-library-search.js "sua pergunta"
 */
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ quiet: true });

const pergunta =
  process.argv[2] ?? 'O que é a justificação pela fé segundo Grudem?';

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    // Usa o mesmo serviço de embedding do backend para não haver divergência.
    const { NestFactory } = require('@nestjs/core');
    const { AppModule } = require('../dist/app.module');
    const { EmbeddingService } = require('../dist/rag/embedding.service');

    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error'],
    });
    const embeddings = app.get(EmbeddingService);

    const vec = await embeddings.createEmbedding(pergunta);
    const literal = `[${vec.join(',')}]`;

    const rows = await prisma.$queryRawUnsafe(
      `SELECT LEFT(content, 130) AS trecho,
              metadata->>'fileName' AS obra,
              1 - (embedding <=> '${literal}'::vector) AS similaridade
       FROM "UserEmbedding"
       WHERE type = 'library_book'
       ORDER BY embedding <=> '${literal}'::vector
       LIMIT 8`,
    );

    console.log(`pergunta: ${pergunta}\n`);
    console.log('MELHORES TRECHOS DO ACERVO:\n');
    for (const r of rows) {
      const s = Number(r.similaridade);
      const marca = s >= 0.82 ? '✅' : s >= 0.7 ? '🟡' : '  ';
      console.log(
        `${marca} ${(s * 100).toFixed(1)}%  ${(r.obra ?? '?').slice(0, 42)}`,
      );
      console.log(`      ${r.trecho.replace(/\s+/g, ' ')}\n`);
    }

    const melhor = Number(rows[0]?.similaridade ?? 0);
    console.log('─'.repeat(58));
    console.log(`melhor similaridade : ${(melhor * 100).toFixed(1)}%`);
    console.log(`limiar atual        : 82.0%`);
    console.log(
      melhor >= 0.82
        ? '→ a biblioteca responderia sozinha'
        : `→ vai para a IA (faltam ${((0.82 - melhor) * 100).toFixed(1)} pontos)`,
    );

    await app.close();
  } catch (err) {
    console.error('Erro:', err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
})();
