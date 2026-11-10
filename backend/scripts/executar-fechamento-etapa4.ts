import { Client } from 'pg';
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function run() {
  const connectionString =
    process.env.DIRECT_DB_URL ||
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL;

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 0, // será configurado para 60min via SET
  });

  const verboseLogs: string[] = [];
  client.on('notice', (msg) => {
    const text = msg.message || String(msg);
    verboseLogs.push(text);
    console.log(`[PG NOTICE] ${text}`);
  });

  await client.connect();

  console.log('=== Início do Fechamento da Etapa 4 ===');
  console.log('Timestamp:', new Date().toISOString());

  // 1. Configurar statement_timeout para 60min nesta sessão
  await client.query("SET statement_timeout = '60min';");
  console.log("statement_timeout configurado para '60min'.");

  // 2. Executar VACUUM (VERBOSE, ANALYZE) "BibleVerse";
  console.log('\n--- Executando VACUUM (VERBOSE, ANALYZE) "BibleVerse" ---');
  const t0Vacuum = Date.now();
  await client.query('VACUUM (VERBOSE, ANALYZE) "BibleVerse";');
  const vacuumDurationMs = Date.now() - t0Vacuum;
  const vacuumDurationSec = (vacuumDurationMs / 1000).toFixed(2);
  console.log(
    `VACUUM concluído em ${vacuumDurationMs} ms (${vacuumDurationSec} s).`,
  );

  // 3. Resetar as opções de autovacuum presentes em reloptions
  console.log('\n--- Resetando opções de autovacuum em "BibleVerse" ---');
  const resetSql = `
    ALTER TABLE "BibleVerse" RESET (
      autovacuum_enabled,
      autovacuum_vacuum_threshold,
      autovacuum_vacuum_scale_factor,
      autovacuum_vacuum_cost_delay,
      autovacuum_vacuum_cost_limit
    );
  `;
  await client.query(resetSql);
  console.log('ALTER TABLE RESET executado.');

  // 4. Coletar métricas pós-fechamento
  console.log('\n--- Métricas pós-fechamento ---');
  const qTup = await client.query(`
    SELECT n_live_tup, n_dead_tup, last_vacuum, last_autovacuum
    FROM pg_stat_user_tables
    WHERE relname = 'BibleVerse';
  `);
  console.table(qTup.rows);

  const qOpt = await client.query(`
    SELECT relname, reloptions
    FROM pg_class
    WHERE relname = 'BibleVerse';
  `);
  console.log('reloptions:', qOpt.rows[0].reloptions);

  const qSizes = await client.query(`
    SELECT 
      c.relname AS name,
      CASE WHEN c.relkind = 'r' THEN 'table' ELSE 'index' END AS type,
      pg_relation_size(c.oid) AS bytes,
      pg_size_pretty(pg_relation_size(c.oid)) AS pretty_size
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND (c.relname = 'BibleVerse' 
           OR c.oid IN (SELECT indexrelid FROM pg_index WHERE indrelid = 'public."BibleVerse"'::regclass))
    ORDER BY c.relkind DESC, pg_relation_size(c.oid) DESC;
  `);
  console.table(qSizes.rows);

  const qDb = await client.query(`
    SELECT pg_database_size(current_database()) AS bytes,
           pg_size_pretty(pg_database_size(current_database())) AS pretty_size;
  `);
  console.table(qDb.rows);

  await client.end();

  // 5. Duas buscas com palavras novas em produção
  console.log('\n--- Executando 2 buscas com palavras novas em produção ---');
  const queries = [
    { term: 'estrela da manha reluzente', translation: undefined },
    { term: 'aguas vivas do santuario', translation: 'BLIVRE' },
  ];

  for (const q of queries) {
    const t0 = Date.now();
    const params: any = { q: q.term, limit: 5 };
    if (q.translation) params.translation = q.translation;

    const res = await axios.get(
      'https://theosphere.onrender.com/api/v1/search/verses',
      {
        params,
        timeout: 30000,
      },
    );
    const totalMs = Date.now() - t0;
    const vectorMs = res.data?.meta?.timing?.vectorMs ?? 'n/a';
    const keywordMs = res.data?.meta?.timing?.keywordMs ?? 'n/a';
    const vectorArm = res.data?.meta?.vectorArm ?? 'n/a';
    const count = res.data?.count ?? 0;

    console.log({
      query: q.term,
      translation: q.translation || '(geral)',
      totalMs,
      vectorMs,
      keywordMs,
      vectorArm,
      count,
    });
  }

  console.log('\n=== Fechamento concluído com sucesso ===');
}

run().catch((err) => {
  console.error('[ERRO NO FECHAMENTO]', err);
  process.exit(1);
});
