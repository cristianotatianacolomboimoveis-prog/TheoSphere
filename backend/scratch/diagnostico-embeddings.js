/**
 * Diagnóstico SOMENTE LEITURA do estado dos embeddings em produção.
 *
 * Responde três perguntas que ficaram sem medição enquanto o ambiente de
 * verificação não tinha acesso ao Postgres:
 *
 *   1. Quantos versículos têm embedding? (busca híbrida roda com um braço só?)
 *   2. Quantos trechos o acervo do Drive realmente tem? (/rag/stats mente —
 *      reporta cache em memória do processo, que zera a cada restart)
 *   3. O índice HNSW existe?
 *
 * Não escreve nada. Não gasta cota de IA. Rode à vontade.
 *
 * Uso: node scratch/diagnostico-embeddings.js
 */
require('dotenv').config();
const { Client } = require('pg');

const QUERIES = [
  {
    titulo: 'EMBEDDINGS DA BÍBLIA (por tradução)',
    sql: `SELECT translation,
                 count(*) FILTER (WHERE embedding IS NOT NULL) AS com_embedding,
                 count(*) AS total
          FROM "BibleVerse"
          GROUP BY translation
          ORDER BY translation;`,
  },
  {
    titulo: 'ACERVO DO DRIVE (UserEmbedding por tipo)',
    sql: `SELECT type,
                 count(*) AS trechos,
                 count(DISTINCT "userId") AS donos
          FROM "UserEmbedding"
          GROUP BY type
          ORDER BY trechos DESC;`,
  },
  {
    titulo: 'ÍNDICES VETORIAIS (HNSW)',
    sql: `SELECT tablename, indexname
          FROM pg_indexes
          WHERE indexdef ILIKE '%hnsw%'
          ORDER BY tablename;`,
  },
];

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL ausente. Rode a partir de backend/ com .env presente.');
    process.exit(1);
  }

  // Supabase pooler exige TLS, mas usa certificado próprio.
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    // Nunca imprima a connection string — ela carrega a senha.
    console.log('Conectado ao banco de produção.\n');

    for (const { titulo, sql } of QUERIES) {
      console.log('='.repeat(60));
      console.log(titulo);
      console.log('='.repeat(60));
      try {
        const { rows } = await client.query(sql);
        if (rows.length === 0) {
          console.log('(nenhuma linha)\n');
        } else {
          console.table(rows);
          console.log();
        }
      } catch (err) {
        // Uma query que falha não deve abortar as outras — o quadro parcial
        // ainda informa mais que nenhum quadro.
        console.log(`ERRO nesta query: ${err.message}\n`);
      }
    }
  } catch (err) {
    console.error(`Falha de conexão: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
})();
