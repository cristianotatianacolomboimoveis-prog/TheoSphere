/**
 * inspect-cache.js — mostra o que está no cache semântico, sem despejar as
 * respostas inteiras. Serve para checar se texto de fallback voltou a ser
 * cacheado (ver rag.service: resposta degradada não deve entrar no cache).
 *
 *   node scratch/inspect-cache.js
 */
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ quiet: true });

(async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '',
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT scope,
              LEFT("queryText", 70)  AS pergunta,
              LEFT(response, 60)     AS inicio_resposta,
              ("queryHash" IS NOT NULL) AS tem_hash,
              "hitCount",
              "createdAt"
       FROM "SemanticCacheEntry"
       ORDER BY "createdAt" DESC
       LIMIT 20`,
    );

    if (!rows.length) {
      console.log('cache vazio');
      return;
    }

    for (const r of rows) {
      const enlatado =
        r.inicio_resposta.includes('Análise Teológica') ||
        r.inicio_resposta.includes('Perspectiva Reformada') ||
        r.inicio_resposta.includes('"verse":"Gênesis 1:1"');
      console.log(
        `[${r.scope}] hash=${r.tem_hash ? 'sim' : 'nao'} hits=${r.hitCount} ${enlatado ? '⚠️ ENLATADO' : 'ok'}`,
      );
      console.log(`   P: ${r.pergunta.replace(/\s+/g, ' ')}`);
      console.log(`   R: ${r.inicio_resposta.replace(/\s+/g, ' ')}`);
    }
  } catch (err) {
    console.error('Erro:', err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
})();
