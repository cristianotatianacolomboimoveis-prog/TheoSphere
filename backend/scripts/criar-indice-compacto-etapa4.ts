import { Client } from 'pg';
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function probeSearch(iteration: number): Promise<void> {
  const t0 = Date.now();
  try {
    const res = await axios.get(
      'https://theosphere.onrender.com/api/v1/search/verses',
      {
        params: { q: 'graca', limit: 5 },
        timeout: 30000,
      },
    );
    const elapsed = Date.now() - t0;
    console.log(
      `[Sondagem ${iteration} - ${new Date().toISOString()}] Busca em produção: HTTP ${res.status} em ${elapsed}ms | vectorArm: ${res.data?.meta?.vectorArm ?? 'n/a'}`,
    );
  } catch (err: any) {
    const elapsed = Date.now() - t0;
    console.warn(
      `[Sondagem ${iteration} - ${new Date().toISOString()}] Busca em produção: FALHA em ${elapsed}ms (${err.message})`,
    );
  }
}

async function main() {
  const connectionString =
    process.env.DIRECT_DB_URL ||
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('DATABASE_URL ausente.');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 0, // sem timeout para DDL concorrente
    connectionTimeoutMillis: 15000,
  });

  const notices: string[] = [];
  client.on('notice', (msg) => {
    const text = msg.message || String(msg);
    notices.push(text);
    console.log(`[PG NOTICE] ${text}`);
  });

  console.log(`[Etapa 4 - DDL] Conectando ao banco de dados...`);
  await client.connect();

  // Iniciar timer de sondagem a cada 15 minutos (900.000 ms)
  let probeIteration = 0;
  await probeSearch(++probeIteration); // sondagem inicial

  const probeInterval = setInterval(
    async () => {
      await probeSearch(++probeIteration);
    },
    15 * 60 * 1000,
  );

  const tStart = Date.now();
  console.log(
    `[Etapa 4 - DDL] Início da criação do índice: ${new Date().toISOString()}`,
  );

  try {
    await client.query(`SET statement_timeout = 0;`);
    await client.query(`SET maintenance_work_mem = '64MB';`);
    console.log(`[Etapa 4 - DDL] maintenance_work_mem configurado para 64MB.`);

    const createSql = `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "BibleVerse_embedding_bq_hnsw_idx"
        ON "BibleVerse"
        USING hnsw ((binary_quantize(embedding)::bit(768)) bit_hamming_ops)
        WHERE embedding IS NOT NULL;
    `;
    console.log(`[Etapa 4 - DDL] Executando CREATE INDEX CONCURRENTLY...`);
    await client.query(createSql);

    const tEnd = Date.now();
    const durationSec = Math.round((tEnd - tStart) / 1000);
    console.log(
      `[Etapa 4 - DDL] CREATE INDEX CONCURRENTLY concluído com sucesso em ${durationSec}s (${(durationSec / 60).toFixed(1)} min).`,
    );

    // Validação de indisvalid e tamanho
    const qCheck = await client.query(`
      SELECT indisvalid,
             pg_relation_size(indexrelid) AS size_bytes,
             pg_size_pretty(pg_relation_size(indexrelid)) AS size_pretty
      FROM pg_index
      WHERE indexrelid = '"BibleVerse_embedding_bq_hnsw_idx"'::regclass;
    `);

    const row = qCheck.rows[0];
    const isValid = row?.indisvalid === true;
    const sizeBytes = Number(row?.size_bytes || 0);
    const sizePretty = row?.size_pretty;
    const sizeMb = sizeBytes / (1024 * 1024);

    console.log(`\n=== Resultado do Índice Compacto ===`);
    console.log(`Válido (indisvalid): ${isValid}`);
    console.log(`Tamanho:            ${sizePretty} (${sizeMb.toFixed(2)} MB)`);
    console.log(`Tempo de Criação:   ${durationSec}s`);
    console.log(`Notices capturados: ${notices.length}`);
    if (notices.length > 0) {
      console.log('Notices:', notices);
    }

    // Conferência do limite de 90 MB
    if (sizeMb > 90) {
      console.error(
        `[ERRO] Tamanho do índice (${sizeMb.toFixed(2)} MB) ultrapassou o teto estrito de 90 MB!`,
      );
      process.exit(1);
    }

    if (!isValid) {
      console.error(
        `[ERRO] O índice foi criado com indisvalid = false! Necessário DROP e recriação.`,
      );
      process.exit(1);
    }

    console.log(`[SUCESSO] Índice válido e dentro do teto de 90 MB.`);
  } finally {
    clearInterval(probeInterval);
    await client.end();
  }
}

main().catch((err) => {
  console.error('[ERRO FATAL NA ETAPA 4]', err);
  process.exit(1);
});
