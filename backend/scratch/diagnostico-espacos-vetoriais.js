/**
 * diagnostico-espacos-vetoriais.js — Diagnóstico de Somente Leitura (T0.2)
 *
 * Avalia se há contaminação de espaços vetoriais no banco de dados (BibleVerse,
 * UserEmbedding, SemanticCacheEntry).
 *
 * Distinção analítica:
 * - Vetor denso neural (Gemini 768 dims): >98% das posições são não-nulas (|v| > 1e-6).
 * - Vetor esparso de hash local (fallback determinístico): como apenas algumas dezenas
 *   de palavras geram índices, >80% das posições são exatamente 0.0.
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function main() {
  console.log('=== DIAGNÓSTICO DE ESPAÇOS VETORIAIS (SOMENTE LEITURA) ===');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERRO: DATABASE_URL não definida.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. BibleVerse
    console.log('\nAnalisando BibleVerse...');
    const bibleVerseStats = await prisma.$queryRaw`
      SELECT 
        COUNT(*)::int as total,
        COUNT(embedding)::int as com_embedding
      FROM "BibleVerse";
    `;
    console.log(`Total de versículos: ${bibleVerseStats[0].total}`);
    console.log(`Com embedding: ${bibleVerseStats[0].com_embedding}`);

    if (bibleVerseStats[0].com_embedding > 0) {
      // Amostra vetorial para verificar esparsidade
      const sample = await prisma.$queryRaw`
        SELECT id, translation, "bookId", chapter, verse, (embedding)::text as emb_str
        FROM "BibleVerse"
        WHERE embedding IS NOT NULL
        LIMIT 50;
      `;
      let sparseCount = 0;
      for (const row of sample) {
        if (!row.emb_str) continue;
        const vals = row.emb_str.replace(/[\[\]]/g, '').split(',').map(Number);
        const zeros = vals.filter(v => Math.abs(v) < 1e-6).length;
        if (zeros > 100) sparseCount++;
      }
      console.log(`Amostra de 50 versículos com embedding: ${sparseCount} vetores esparsos (hash) detectados.`);
    }

    // 2. UserEmbedding
    console.log('\nAnalisando UserEmbedding (Acervo clássico e embeddings de usuário)...');
    const userEmbStats = await prisma.$queryRaw`
      SELECT 
        COUNT(*)::int as total,
        COUNT(embedding)::int as com_embedding
      FROM "UserEmbedding";
    `;
    console.log(`Total de registros: ${userEmbStats[0].total}`);
    console.log(`Com embedding: ${userEmbStats[0].com_embedding}`);

    if (userEmbStats[0].com_embedding > 0) {
      const sample = await prisma.$queryRaw`
        SELECT id, (embedding)::text as emb_str
        FROM "UserEmbedding"
        WHERE embedding IS NOT NULL
        LIMIT 100;
      `;
      let sparseCount = 0;
      for (const row of sample) {
        if (!row.emb_str) continue;
        const vals = row.emb_str.replace(/[\[\]]/g, '').split(',').map(Number);
        const zeros = vals.filter(v => Math.abs(v) < 1e-6).length;
        if (zeros > 100) sparseCount++;
      }
      console.log(`Amostra de 100 UserEmbeddings: ${sparseCount} vetores esparsos (hash) detectados.`);
    }

    // 3. SemanticCacheEntry
    console.log('\nAnalisando SemanticCacheEntry...');
    const cacheStats = await prisma.$queryRaw`
      SELECT 
        COUNT(*)::int as total,
        COUNT(embedding)::int as com_embedding
      FROM "SemanticCacheEntry";
    `;
    console.log(`Total de entradas em cache: ${cacheStats[0].total}`);
    console.log(`Com embedding: ${cacheStats[0].com_embedding}`);

    if (cacheStats[0].com_embedding > 0) {
      const sample = await prisma.$queryRaw`
        SELECT id, (embedding)::text as emb_str
        FROM "SemanticCacheEntry"
        WHERE embedding IS NOT NULL
        LIMIT 50;
      `;
      let sparseCount = 0;
      for (const row of sample) {
        if (!row.emb_str) continue;
        const vals = row.emb_str.replace(/[\[\]]/g, '').split(',').map(Number);
        const zeros = vals.filter(v => Math.abs(v) < 1e-6).length;
        if (zeros > 100) sparseCount++;
      }
      console.log(`Amostra de 50 entradas de cache: ${sparseCount} vetores esparsos (hash) detectados.`);
    }

    console.log('\nDiagnóstico concluído com sucesso.');
  } catch (err) {
    console.error('Falha ao executar diagnóstico:', err.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
