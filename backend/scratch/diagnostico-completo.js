require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL ausente.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('=== DIAGNÓSTICO COMPLETO DO BANCO DE DADOS (SOMENTE-LEITURA) ===\n');

    // 1. Contagem geral de todas as tabelas
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    const { rows: tables } = await client.query(tablesQuery);

    console.log('--- RESUMO DE TODAS AS TABELAS ---');
    const tableSummaries = [];
    for (const { table_name } of tables) {
      if (table_name.startsWith('_')) continue;
      const countRes = await client.query(`SELECT count(*) FROM "${table_name}";`);
      tableSummaries.push({ Tabela: table_name, Registros: parseInt(countRes.rows[0].count, 10) });
    }
    console.table(tableSummaries);
    console.log();

    // 2. Detalhamento de Embeddings por Tabela
    console.log('--- DETALHAMENTO DE EMBEDDINGS (VETORES DE IA) ---');
    const embeddingQueries = [
      {
        tabela: 'BibleVerse',
        sql: `SELECT translation, 
                     count(*) FILTER (WHERE embedding IS NOT NULL) AS com_embedding,
                     count(*) FILTER (WHERE embedding IS NULL) AS sem_embedding,
                     count(*) AS total
              FROM "BibleVerse"
              GROUP BY translation
              ORDER BY total DESC;`
      },
      {
        tabela: 'TheologyEmbedding',
        sql: `SELECT count(*) FILTER (WHERE embedding IS NOT NULL) AS com_embedding,
                     count(*) FILTER (WHERE embedding IS NULL) AS sem_embedding,
                     count(*) AS total
              FROM "TheologyEmbedding";`
      },
      {
        tabela: 'UserEmbedding',
        sql: `SELECT type,
                     count(*) FILTER (WHERE embedding IS NOT NULL) AS com_embedding,
                     count(*) FILTER (WHERE embedding IS NULL) AS sem_embedding,
                     count(*) AS total
              FROM "UserEmbedding"
              GROUP BY type;`
      },
      {
        tabela: 'SemanticCacheEntry',
        sql: `SELECT count(*) FILTER (WHERE embedding IS NOT NULL) AS com_embedding,
                     count(*) FILTER (WHERE embedding IS NULL) AS sem_embedding,
                     count(*) AS total
              FROM "SemanticCacheEntry";`
      }
    ];

    for (const eq of embeddingQueries) {
      console.log(`> Tabela: ${eq.tabela}`);
      const res = await client.query(eq.sql);
      console.table(res.rows);
      console.log();
    }

    // 3. Outros conteúdos (Léxico, Comentários, Conteúdo Teológico)
    console.log('--- DETALHAMENTO DE CONTEÚDO TEOLÓGICO / LÉXICO ---');
    const lexQuery = await client.query(`SELECT language, count(*) FROM "LexicalEntry" GROUP BY language;`);
    console.log('> LexicalEntry (Léxico / Dicionário Strong):');
    console.table(lexQuery.rows);

    const commQuery = await client.query(`SELECT author, count(*) FROM "TechnicalCommentary" GROUP BY author;`);
    console.log('\n> TechnicalCommentary (Comentários Teológicos):');
    console.table(commQuery.rows);

    const theoQuery = await client.query(`SELECT type, count(*) FROM "TheologicalContent" GROUP BY type;`);
    console.log('\n> TheologicalContent (Obras / Documentos Teológicos):');
    console.table(theoQuery.rows);

    const interlinearQuery = await client.query(`SELECT translation, count(*) FROM "InterlinearWord" GROUP BY translation;`);
    console.log('\n> InterlinearWord (Interlinear):');
    console.table(interlinearQuery.rows);

  } catch (err) {
    console.error('Erro ao executar diagnóstico:', err);
  } finally {
    await client.end().catch(() => {});
  }
})();
