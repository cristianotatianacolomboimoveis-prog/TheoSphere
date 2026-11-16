import 'dotenv/config';
import { Client } from 'pg';

/**
 * Script de Criação da Função theo_unaccent e do Índice GIN Normalizado (Etapa 9.1a).
 *
 * EXECUÇÃO NOTURNA OBRIGATÓRIA (após 23h BRT):
 * - 1 única conexão ao banco Supabase.
 * - Trava de segurança: pg_stat_progress_vacuum (aborta se houver vacuum na BibleVerse).
 * - Medição prévia: tamanho do banco, soma dos índices vetoriais e tamanho de BibleVerse_text_fts_idx.
 * - Dentro de transação com SET lock_timeout = '5s':
 *     CREATE OR REPLACE FUNCTION public.theo_unaccent(text) RETURNS text ...
 * - Fora de transação:
 *     SET statement_timeout = 0 (somente nesta sessão e só à noite)
 *     CREATE INDEX CONCURRENTLY IF NOT EXISTS "BibleVerse_text_fts_norm_idx"
 *       ON "BibleVerse" USING GIN (to_tsvector('simple', public.theo_unaccent(text)));
 * - Verificação de pg_index.indisvalid:
 *     Se indisvalid = false, roda DROP INDEX CONCURRENTLY e aborta.
 * - Medição posterior: tamanho do banco e do índice novo.
 * - EXPLAIN (ANALYZE, BUFFERS) na NVA para validação de Bitmap Index Scan.
 * - Não altera search.service.ts e não remove o índice antigo.
 */

interface DbTelemetry {
  dbBytes: string;
  dbPretty: string;
  hnswBytes: string;
  hnswPretty: string;
  oldFtsBytes: string;
  oldFtsPretty: string;
}

async function assertNoVacuumOnBibleVerse(client: Client): Promise<void> {
  const res = await client.query<{ relname: string }>(`
    SELECT relid::regclass::text AS relname
    FROM pg_stat_progress_vacuum;
  `);
  const activeVacuums = res.rows.map((r) => r.relname);
  const isBibleVerse = activeVacuums.some(
    (name) =>
      name === 'BibleVerse' ||
      name === '"BibleVerse"' ||
      name.includes('BibleVerse'),
  );
  if (isBibleVerse) {
    throw new Error(
      `[TRAVA DE SEGURANÇA] Autovacuum em andamento na BibleVerse (${activeVacuums.join(', ')}). Abortando imediatamente.`,
    );
  }
}

async function collectDbTelemetry(client: Client): Promise<DbTelemetry> {
  const res = await client.query<{
    db_bytes: string;
    db_pretty: string;
    hnsw_bytes: string;
    hnsw_pretty: string;
    old_fts_bytes: string;
    old_fts_pretty: string;
  }>(`
    SELECT
      pg_database_size(current_database())::text AS db_bytes,
      pg_size_pretty(pg_database_size(current_database())) AS db_pretty,
      (SELECT sum(pg_relation_size(c.oid))::bigint::text FROM pg_class c JOIN pg_am am ON am.oid = c.relam WHERE am.amname = 'hnsw') AS hnsw_bytes,
      pg_size_pretty((SELECT sum(pg_relation_size(c.oid))::bigint FROM pg_class c JOIN pg_am am ON am.oid = c.relam WHERE am.amname = 'hnsw')) AS hnsw_pretty,
      pg_relation_size('"BibleVerse_text_fts_idx"')::text AS old_fts_bytes,
      pg_size_pretty(pg_relation_size('"BibleVerse_text_fts_idx"')) AS old_fts_pretty;
  `);
  const r = res.rows[0];
  return {
    dbBytes: r.db_bytes,
    dbPretty: r.db_pretty,
    hnswBytes: r.hnsw_bytes,
    hnswPretty: r.hnsw_pretty,
    oldFtsBytes: r.old_fts_bytes,
    oldFtsPretty: r.old_fts_pretty,
  };
}

async function main() {
  const startTime = Date.now();
  console.log(
    '═══════════════════════════════════════════════════════════════════════════════',
  );
  console.log(
    '  ETAPA 9.1a: CRIAÇÃO DA FUNÇÃO theo_unaccent E ÍNDICE GIN NORMALIZADO',
  );
  console.log(
    '═══════════════════════════════════════════════════════════════════════════════\n',
  );

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERRO: DATABASE_URL ausente em .env.');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('✓ Conectado ao PostgreSQL (1 única conexão).');

  // 1. Trava de segurança contra vacuum
  await assertNoVacuumOnBibleVerse(client);
  console.log(
    '✓ pg_stat_progress_vacuum verificado: nenhum vacuum ativo na BibleVerse.',
  );

  // 2. Medição inicial
  console.log('\n--- Telemetria Inicial ---');
  const tBefore = await collectDbTelemetry(client);
  console.log(
    `- Tamanho total do banco:       ${tBefore.dbPretty} (${tBefore.dbBytes} bytes)`,
  );
  console.log(
    `- Soma dos índices vetoriais:   ${tBefore.hnswPretty} (${tBefore.hnswBytes} bytes)`,
  );
  console.log(
    `- Tamanho de text_fts_idx:      ${tBefore.oldFtsPretty} (${tBefore.oldFtsBytes} bytes)`,
  );

  // 3. Criação da função DENTRO de transação com lock_timeout de 5s
  console.log('\n--- 1. Criação da Função public.theo_unaccent(text) ---');
  try {
    await client.query('BEGIN;');
    await client.query("SET LOCAL lock_timeout = '5s';");

    const createFunctionSql = `
      CREATE OR REPLACE FUNCTION public.theo_unaccent(text)
      RETURNS text
      LANGUAGE sql
      IMMUTABLE PARALLEL SAFE STRICT
      AS $$
        SELECT regexp_replace(
          regexp_replace(
            normalize($1, NFD),
            '[\u05BE\u05C0\u05C3\u05C6]', ' ', 'g'
          ),
          '[\u0300-\u036F\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]', '', 'g'
        );
      $$;
    `;
    await client.query(createFunctionSql);
    await client.query('COMMIT;');
    console.log(
      '✓ Função public.theo_unaccent criada com sucesso (lock_timeout = 5s).',
    );
  } catch (err) {
    await client.query('ROLLBACK;').catch(() => {});
    console.error('❌ Falha ao criar a função public.theo_unaccent:', err);
    throw err;
  }

  // 4. Criação do índice GIN CONCURRENTLY (FORA de transação)
  console.log(
    '\n--- 2. Criação do Índice GIN CONCURRENTLY (fora de transação) ---',
  );
  console.log(
    'Aplicando SET statement_timeout = 0 (apenas para esta sessão noturna)...',
  );
  await client.query('SET statement_timeout = 0;');

  const tIndexStart = Date.now();
  console.log(
    'Iniciando CREATE INDEX CONCURRENTLY IF NOT EXISTS "BibleVerse_text_fts_norm_idx"...',
  );
  try {
    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "BibleVerse_text_fts_norm_idx"
        ON "BibleVerse"
        USING GIN (to_tsvector('simple', public.theo_unaccent(text)));
    `);
    const indexDurationSec = ((Date.now() - tIndexStart) / 1000).toFixed(1);
    console.log(
      `✓ Comando CREATE INDEX CONCURRENTLY finalizado em ${indexDurationSec} s.`,
    );
  } catch (err) {
    console.error('❌ Erro durante o CREATE INDEX CONCURRENTLY:', err);
    // Verificar se o índice existe inválido
    await dropInvalidIndexIfAny(client);
    throw err;
  }

  // 5. Validação de indisvalid em pg_index
  console.log('\n--- 3. Validação do Índice em pg_index ---');
  const validRes = await client.query<{
    indisvalid: boolean;
    indisready: boolean;
  }>(`
    SELECT indisvalid, indisready
    FROM pg_index
    WHERE indexrelid = '"BibleVerse_text_fts_norm_idx"'::regclass;
  `);

  if (validRes.rows.length === 0) {
    throw new Error(
      '❌ ERRO CRÍTICO: Índice "BibleVerse_text_fts_norm_idx" não encontrado em pg_index!',
    );
  }

  const { indisvalid, indisready } = validRes.rows[0];
  console.log(`- indisvalid: ${indisvalid}`);
  console.log(`- indisready: ${indisready}`);

  if (!indisvalid) {
    console.error(
      '⚠️ ALERTA: Índice criado com indisvalid = false! Executando DROP INDEX CONCURRENTLY...',
    );
    await client.query(
      'DROP INDEX CONCURRENTLY IF EXISTS "BibleVerse_text_fts_norm_idx";',
    );
    throw new Error(
      '[FALHA NA ETAPA 9.1a] Índice ficou inválido. DROP INDEX CONCURRENTLY executado. Não tentar novamente na mesma noite.',
    );
  }
  console.log('✓ Índice validado: indisvalid = true.');

  // 6. Medição após a criação do índice
  console.log('\n--- 4. Telemetria Pós-Criação ---');
  const tAfter = await collectDbTelemetry(client);
  const newIdxRes = await client.query<{ bytes: string; pretty: string }>(`
    SELECT
      pg_relation_size('"BibleVerse_text_fts_norm_idx"')::text AS bytes,
      pg_size_pretty(pg_relation_size('"BibleVerse_text_fts_norm_idx"')) AS pretty;
  `);
  const newIdxPretty = newIdxRes.rows[0].pretty;
  const newIdxBytes = newIdxRes.rows[0].bytes;

  console.log(
    `- Tamanho total do banco:       ${tAfter.dbPretty} (${tAfter.dbBytes} bytes)`,
  );
  console.log(
    `- Tamanho do índice novo:       ${newIdxPretty} (${newIdxBytes} bytes)`,
  );
  console.log(
    `- Tamanho do índice antigo:     ${tAfter.oldFtsPretty} (${tAfter.oldFtsBytes} bytes)`,
  );
  console.log(
    `- Soma dos índices vetoriais:   ${tAfter.hnswPretty} (${tAfter.hnswBytes} bytes)`,
  );

  // 7. EXPLAIN (ANALYZE, BUFFERS)
  console.log('\n--- 5. EXPLAIN (ANALYZE, BUFFERS) na NVA ("graca e paz") ---');
  const explainSql = `
    EXPLAIN (ANALYZE, BUFFERS)
    SELECT id, "bookId", chapter, verse, text
    FROM "BibleVerse"
    WHERE translation = 'NVA'
      AND to_tsvector('simple', public.theo_unaccent(text)) @@ plainto_tsquery('simple', public.theo_unaccent('graca e paz'));
  `;
  const explainRes = await client.query<{ 'QUERY PLAN': string }>(explainSql);
  const planLines = explainRes.rows.map((r) => r['QUERY PLAN']);
  const planText = planLines.join('\n');
  console.log(planText);

  // Verificar se usou o índice novo
  const usedIndex = planText.includes('BibleVerse_text_fts_norm_idx');
  if (usedIndex) {
    console.log(
      '\n✓ Bitmap Index Scan on "BibleVerse_text_fts_norm_idx" CONFIRMADO.',
    );
  } else {
    console.warn(
      '\n⚠️ ATENÇÃO: Bitmap Index Scan no índice novo NÃO apareceu no plano!',
    );
  }

  // Extrair buffers
  let sharedHit = 0;
  let sharedRead = 0;
  for (const line of planLines) {
    const hitMatch = line.match(/shared hit=(\d+)/);
    if (hitMatch) sharedHit += Number(hitMatch[1]);
    const readMatch = line.match(/read=(\d+)/);
    if (readMatch) sharedRead += Number(readMatch[1]);
  }
  console.log(`Buffers totais: hit=${sharedHit}, read=${sharedRead}`);

  await client.end();
  console.log('\n✓ Conexão fechada.');
  const totalDurationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Tempo total da Etapa 9.1a: ${totalDurationSec} s.`);
}

async function dropInvalidIndexIfAny(client: Client): Promise<void> {
  try {
    const res = await client.query<{ indisvalid: boolean }>(`
      SELECT indisvalid
      FROM pg_index
      WHERE indexrelid = '"BibleVerse_text_fts_norm_idx"'::regclass;
    `);
    if (res.rows.length > 0 && !res.rows[0].indisvalid) {
      console.log('Limpando índice inválido com DROP INDEX CONCURRENTLY...');
      await client.query(
        'DROP INDEX CONCURRENTLY IF EXISTS "BibleVerse_text_fts_norm_idx";',
      );
      console.log('✓ Índice inválido removido.');
    }
  } catch {
    // Se o índice nem chegou a ser catalogado, nada a fazer
  }
}

main().catch((err) => {
  console.error('\n❌ ERRO NA ETAPA 9.1a:', err);
  process.exit(1);
});
