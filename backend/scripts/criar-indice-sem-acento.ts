import 'dotenv/config';
import { Client } from 'pg';
import { execSync } from 'child_process';

/**
 * Script de Criação da Função theo_unaccent e do Índice GIN Normalizado (Etapa 9.1a).
 *
 * REGRAS DE EXECUÇÃO:
 * 1. Conexão estrita via DIRECT_URL (porta 5432, pooler em modo sessão). Aborta se != 5432.
 * 2. Trava de autovacuum: aborta se houver vacuum na BibleVerse (pg_stat_progress_vacuum).
 * 3. Trava de concorrência:
 *    - Aborta se houver UPDATE ativo na BibleVerse (pg_stat_activity).
 *    - Aborta se houver workflow ingestao-diaria-embeddings.yml em status in_progress ou queued no GitHub Actions.
 * 4. Telemetria prévia: tamanho do banco, soma dos índices vetoriais HNSW e tamanho de BibleVerse_text_fts_idx.
 * 5. Criação da função theo_unaccent (em transação com lock_timeout = '5s'):
 *    - Regex com escape ASCII (\\u05BE e E'...') gravado no corpo em puro ASCII.
 *    - Conferência imediata:
 *        theo_unaccent('בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים־') -> 'בראשית ברא אלהים '
 *        theo_unaccent('graça coração fé') -> 'graca coracao fe'
 * 6. Criação do índice GIN (fora de transação, concorrente):
 *    - SET statement_timeout = '30min' antes da criação.
 *    - CREATE INDEX CONCURRENTLY IF NOT EXISTS "BibleVerse_text_fts_norm_idx" ...
 *    - RESET statement_timeout logo após o término.
 * 7. Validação de pg_index:
 *    - Se indisvalid = false, roda DROP INDEX CONCURRENTLY e aborta.
 * 8. Telemetria pós-criação: tamanho do banco e do índice novo.
 * 9. EXPLAIN (ANALYZE, BUFFERS) na NVA com statement_timeout = '15s':
 *    - Captura o Buffers: do nó raiz do plano (sem soma duplicada), separando read= e temp read=.
 * 10. Tratamento de interrupção: instruções para consultar pg_stat_progress_create_index e pg_index.
 */

interface DbTelemetry {
  dbBytes: string;
  dbPretty: string;
  hnswBytes: string;
  hnswPretty: string;
  oldFtsBytes: string;
  oldFtsPretty: string;
}

function maskHost(hostname: string): string {
  const parts = hostname.split('.');
  if (parts.length <= 2) return `${parts[0]}.***`;
  return `${parts[0]}.***.${parts.slice(-2).join('.')}`;
}

function checkGitHubWorkflowRuns(): void {
  try {
    const output = execSync(
      'gh run list --workflow=ingestao-diaria-embeddings.yml --limit 5 --json status,conclusion,databaseId,createdAt',
      { encoding: 'utf-8' },
    );
    const runs = JSON.parse(output) as Array<{
      status: string;
      conclusion: string;
      databaseId: number;
      createdAt: string;
    }>;
    const activeRun = runs.find(
      (r) => r.status === 'in_progress' || r.status === 'queued',
    );
    if (activeRun) {
      throw new Error(
        `[TRAVA DE CONCORRÊNCIA] Workflow ingestao-diaria-embeddings.yml ativo no GitHub Actions (Run ${activeRun.databaseId}, status: ${activeRun.status}). Abortando.`,
      );
    }
    console.log(
      '✓ GitHub Actions verificado: nenhuma execução ativa ou na fila para ingestao-diaria-embeddings.yml.',
    );
    if (runs.length > 0) {
      const last = runs[0];
      console.log(
        `  Última execução: Run ${last.databaseId} (status: ${last.status}, conclusion: ${last.conclusion}, iniciada em: ${last.createdAt}).`,
      );
    }
  } catch (err: any) {
    if (err.message.includes('[TRAVA DE CONCORRÊNCIA]')) {
      throw err;
    }
    console.warn(
      `⚠️ Aviso: Não foi possível checar GitHub Actions via gh CLI (${err.message}). Prosseguindo com verificações no banco.`,
    );
  }
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

async function assertNoActiveUpdatesOnBibleVerse(
  client: Client,
): Promise<void> {
  const res = await client.query<{
    pid: number;
    query: string;
    duration: string;
  }>(`
    SELECT pid, query, age(clock_timestamp(), query_start)::text AS duration
    FROM pg_stat_activity
    WHERE pid <> pg_backend_pid()
      AND state = 'active'
      AND query ILIKE '%UPDATE%"BibleVerse"%';
  `);
  if (res.rows.length > 0) {
    const act = res.rows[0];
    throw new Error(
      `[TRAVA DE CONCORRÊNCIA] UPDATE ativo detectado na BibleVerse (PID: ${act.pid}, duração: ${act.duration}, query: ${act.query.slice(0, 80)}...). Abortando.`,
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

  // 1. Validação da Conexão DIRECT_URL (porta 5432 estrita)
  const connectionString = process.env.DIRECT_URL;
  if (!connectionString) {
    console.error('ERRO CRÍTICO: DIRECT_URL ausente em .env.');
    process.exit(1);
  }

  const parsedUrl = new URL(connectionString);
  if (parsedUrl.port !== '5432') {
    console.error(
      `ERRO CRÍTICO: A porta da DIRECT_URL deve ser estritamente 5432 (recebido: "${parsedUrl.port}").`,
    );
    console.error(
      'O pooler em modo transação (porta 6543 / DATABASE_URL) é proibido para CREATE INDEX CONCURRENTLY.',
    );
    process.exit(1);
  }

  const maskedHost = maskHost(parsedUrl.hostname);
  console.log(
    `✓ Conexão configurada via DIRECT_URL (host: ${maskedHost}, porta: ${parsedUrl.port}, modo sessão).`,
  );

  // 2. Trava GitHub Actions contra ingestão diária simultânea
  checkGitHubWorkflowRuns();

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('✓ Conectado ao PostgreSQL (1 única conexão via DIRECT_URL).');

  // 3. Travas no Banco de Dados
  await assertNoVacuumOnBibleVerse(client);
  console.log(
    '✓ pg_stat_progress_vacuum verificado: nenhum vacuum ativo na BibleVerse.',
  );

  await assertNoActiveUpdatesOnBibleVerse(client);
  console.log(
    '✓ pg_stat_activity verificado: nenhum UPDATE ativo na BibleVerse.',
  );

  // 4. Telemetria Prévia
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

  // 5. Criação da Função theo_unaccent (em transação com lock_timeout = 5s)
  console.log('\n--- 1. Criação da Função public.theo_unaccent(text) ---');
  try {
    await client.query('BEGIN;');
    await client.query("SET LOCAL lock_timeout = '5s';");

    // Expressão com escapes ASCII literais no corpo SQL para não gerar caracteres invisíveis
    const createFunctionSql = `
      CREATE OR REPLACE FUNCTION public.theo_unaccent(text)
      RETURNS text
      LANGUAGE sql
      IMMUTABLE PARALLEL SAFE STRICT
      AS $function$
        SELECT regexp_replace(
          regexp_replace(
            normalize($1, NFD),
            E'[\\u05BE\\u05C0\\u05C3\\u05C6]', ' ', 'g'
          ),
          E'[\\u0300-\\u036F\\u0591-\\u05BD\\u05BF\\u05C1\\u05C2\\u05C4\\u05C5\\u05C7]', '', 'g'
        );
      $function$;
    `;
    await client.query(createFunctionSql);
    await client.query('COMMIT;');
    console.log(
      '✓ Função public.theo_unaccent criada com sucesso (lock_timeout = 5s, escape ASCII puro).',
    );
  } catch (err) {
    await client.query('ROLLBACK;').catch(() => {});
    console.error('❌ Falha ao criar a função public.theo_unaccent:', err);
    throw err;
  }

  // Conferência imediata da função theo_unaccent
  console.log('\n--- Validação Factual de public.theo_unaccent ---');
  const verifyRes = await client.query<{ he: string; pt: string }>(`
    SELECT
      public.theo_unaccent('בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים־') AS he,
      public.theo_unaccent('graça coração fé') AS pt;
  `);
  const { he, pt } = verifyRes.rows[0];
  console.log(`- theo_unaccent('בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים־') -> "${he}"`);
  console.log(`- theo_unaccent('graça coração fé')            -> "${pt}"`);

  if (he !== 'בראשית ברא אלהים ') {
    throw new Error(
      `❌ Validação hebraica falhou! Esperado "בראשית ברא אלהים ", recebido "${he}".`,
    );
  }
  if (pt !== 'graca coracao fe') {
    throw new Error(
      `❌ Validação portuguesa falhou! Esperado "graca coracao fe", recebido "${pt}".`,
    );
  }
  console.log('✓ Ambas as conferências de normalização foram confirmadas.');

  // 6. Criação do Índice GIN CONCURRENTLY (fora de transação)
  console.log(
    '\n--- 2. Criação do Índice GIN CONCURRENTLY (fora de transação) ---',
  );
  console.log("Aplicando SET statement_timeout = '30min'...");
  await client.query("SET statement_timeout = '30min';");

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
    console.error(
      '⚠️ ATENÇÃO: Se o processo foi interrompido, consulte pg_stat_progress_create_index e pg_index.indisvalid no servidor!',
    );
    await checkIndexProgressAndDropIfInvalid(client);
    throw err;
  } finally {
    // Resetar o timeout de sessão logo após a criação do índice
    await client.query('RESET statement_timeout;');
    console.log('✓ RESET statement_timeout executado.');
  }

  // 7. Validação de indisvalid em pg_index
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

  // 8. Telemetria Pós-Criação
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

  // 9. EXPLAIN (ANALYZE, BUFFERS) com timeout de 15s
  console.log('\n--- 5. EXPLAIN (ANALYZE, BUFFERS) na NVA ("graca e paz") ---');
  await client.query("SET statement_timeout = '15s';");

  const explainSql = `
    EXPLAIN (ANALYZE, BUFFERS)
    SELECT id, "bookId", chapter, verse, text
    FROM "BibleVerse"
    WHERE translation = 'NVA'
      AND to_tsvector('simple', public.theo_unaccent(text)) @@ plainto_tsquery('simple', public.theo_unaccent('graca e paz'));
  `;

  try {
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

    // Extrair Buffers exclusivamente do nó raiz (primeira menção de Buffers:)
    const rootBufferLine = planLines.find((l) => l.includes('Buffers:'));
    if (rootBufferLine) {
      console.log(`\nBuffers do nó raiz: ${rootBufferLine.trim()}`);
      const hitMatch = rootBufferLine.match(/shared hit=(\d+)/);
      const readMatch = rootBufferLine.match(/read=(\d+)/);
      const tempReadMatch = rootBufferLine.match(/temp read=(\d+)/);

      const hit = hitMatch ? hitMatch[1] : '0';
      const read = readMatch ? readMatch[1] : '0';
      const tempRead = tempReadMatch ? tempReadMatch[1] : '0';

      console.log(`  - shared hit: ${hit}`);
      console.log(`  - read:       ${read}`);
      console.log(`  - temp read:  ${tempRead}`);
    }

    const execTimeMatch = planText.match(/Execution Time: ([\d.]+) ms/);
    if (execTimeMatch) {
      console.log(`Tempo de execução: ${execTimeMatch[1]} ms`);
    }
  } finally {
    await client.query('RESET statement_timeout;');
  }

  await client.end();
  console.log('\n✓ Conexão fechada.');
  const totalDurationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Tempo total da Etapa 9.1a: ${totalDurationSec} s.`);
}

async function checkIndexProgressAndDropIfInvalid(
  client: Client,
): Promise<void> {
  try {
    const progRes = await client.query(`
      SELECT * FROM pg_stat_progress_create_index;
    `);
    if (progRes.rows.length > 0) {
      console.log(
        'pg_stat_progress_create_index ativo no servidor:',
        progRes.rows,
      );
    }

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
  } catch (err) {
    console.error('Erro ao verificar status do índice após falha:', err);
  }
}

main().catch((err) => {
  console.error('\n❌ ERRO NA ETAPA 9.1a:', err);
  process.exit(1);
});
