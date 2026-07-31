/**
 * sample-chunks.js — amostra trechos indexados para avaliar QUALIDADE.
 *
 * PDF escaneado ou mal extraído gera trechos truncados, com hifenização
 * quebrada, ordem de palavras trocada ou cabeçalho/rodapé no meio do texto.
 * Isso não aparece na contagem de trechos — só lendo.
 *
 *   node scratch/sample-chunks.js                 # amostra geral
 *   node scratch/sample-chunks.js "Gruden"        # de uma obra
 */
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ quiet: true });

const filtro = process.argv[2] ?? '';

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const where = filtro
      ? `AND metadata->>'fileName' ILIKE '%${filtro.replace(/'/g, "''")}%'`
      : '';

    const rows = await prisma.$queryRawUnsafe(
      `SELECT metadata->>'fileName' AS obra, content
       FROM "UserEmbedding"
       WHERE type = 'library_book' ${where}
       ORDER BY random() LIMIT 8`,
    );

    for (const r of rows) {
      console.log(`── ${(r.obra ?? '?').slice(0, 56)}`);
      console.log(`   ${r.content.trim().replace(/\s+/g, ' ').slice(0, 260)}\n`);
    }

    // Sinais objetivos de extração ruim.
    const todos = await prisma.$queryRawUnsafe(
      `SELECT content FROM "UserEmbedding"
       WHERE type = 'library_book' ${where} LIMIT 3000`,
    );
    const n = todos.length;
    const conta = (re) => todos.filter((t) => re.test(t.content)).length;

    console.log('─'.repeat(58));
    console.log(`amostra: ${n} trechos`);
    console.log(
      `  com hifenização quebrada (ex: "justi- ficação") : ${((conta(/\w-\s+\w/) / n) * 100).toFixed(0)}%`,
    );
    console.log(
      `  com marca de paginação no meio do texto         : ${((conta(/--\s*\d+\s*of\s*\d+\s*--|\bp[áa]g\.\s*\d+/i) / n) * 100).toFixed(0)}%`,
    );
    console.log(
      `  muito curtos (<80 caracteres)                   : ${((conta(/^.{0,80}$/s) / n) * 100).toFixed(0)}%`,
    );
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
})();
