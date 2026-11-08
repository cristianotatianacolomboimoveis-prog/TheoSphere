import 'dotenv/config';
import { appendFileSync } from 'fs';
import { PrismaService } from '../src/prisma.service';
import {
  EmbeddingService,
  assertPersistedBatchEmbeddings,
} from '../src/rag/embedding.service';
import {
  DAILY_EMBEDDING_DEFAULTS,
  DailyEmbeddingProbe,
  planDailyEmbedding,
} from '../src/rag/daily-embedding-budget';

/**
 * Ingestão diária de embeddings, em pequenas doses, sem derrubar o banco.
 *
 * Roda pelo GitHub Actions (.github/workflows/ingestao-diaria-embeddings.yml)
 * às 03:00 BRT. Antes de gastar cota do Gemini, confere:
 *   1. não há vacuum em "BibleVerse" (incidente de 2026-11-08);
 *   2. o banco responde rápido (Disk IO Budget do Supabase não esgotado);
 *   3. a rodada não leva as linhas mortas ao gatilho do autovacuum.
 * Durante a rodada, grava um lote por vez, com pausa, e PARA no primeiro erro
 * de gravação ou na primeira gravação lenta, porque um lote que falha ao
 * gravar desperdiça a cota já gasta no embedding.
 *
 * Uso:
 *   npx tsx scripts/ingestao-diaria-embeddings.ts            # KJV, 2000/dia
 *   npx tsx scripts/ingestao-diaria-embeddings.ts KJV,WEB 500
 *   npx tsx scripts/ingestao-diaria-embeddings.ts KJV 2000 --dry-run
 *
 * Saída: 0 = rodou ou adiou com motivo; 1 = erro (o workflow fica vermelho).
 */

const ALLOWED = new Set(['BLIVRE', 'NVA', 'KJV', 'WEB', 'WLC', 'LXX', 'TR']);
const BATCH = parseInt(process.env.EMBED_BATCH_SIZE || '25', 10);
const DELAY_MS = parseInt(process.env.EMBED_DELAY_MS || '2000', 10);
const SLOW_WRITE_MS = parseInt(process.env.EMBED_SLOW_WRITE_MS || '10000', 10);
const MAX_RUNTIME_MS = parseInt(
  process.env.EMBED_MAX_RUNTIME_MS || String(30 * 60_000),
  10,
);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function summary(lines: string[]) {
  for (const l of lines) console.log(l);
  const f = process.env.GITHUB_STEP_SUMMARY;
  if (f) appendFileSync(f, lines.join('\n') + '\n');
}

async function run(): Promise<number> {
  const targets = (process.argv[2] || 'KJV')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const dailyLimit = parseInt(
    process.argv[3] || String(DAILY_EMBEDDING_DEFAULTS.dailyLimit),
    10,
  );
  const dryRun = process.argv.includes('--dry-run');

  const bad = targets.filter((t) => !ALLOWED.has(t));
  if (bad.length) {
    console.error(`Tradução não autorizada: ${bad.join(', ')}`);
    return 1;
  }
  if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) {
    console.error('DIRECT_URL/DATABASE_URL ausente (segredo SUPABASE_DIRECT_URL no GitHub).');
    return 1;
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY ausente.');
    return 1;
  }

  // Timeout curto de propósito: uma gravação presa é sinal para parar.
  const url = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL!);
  url.searchParams.set('options', '-c statement_timeout=30000');
  process.env.DATABASE_URL = url.toString();

  const prisma = new PrismaService();
  await prisma.onModuleInit();
  const embeddings = new EmbeddingService();

  const vacuumRunning = async () =>
    Number(
      (
        await prisma.$queryRaw<{ n: bigint }[]>`
          SELECT count(*) AS n FROM pg_stat_progress_vacuum
          WHERE relid = '"BibleVerse"'::regclass`
      )[0].n,
    ) > 0;

  try {
    // ── Sondagem ──────────────────────────────────────────────────────────
    const lat: number[] = [];
    for (let k = 0; k < 3; k++) {
      const t0 = Date.now();
      await prisma.$queryRaw`
        SELECT id FROM "BibleVerse"
        WHERE translation = 'KJV' AND "bookId" = ${1 + Math.floor(Math.random() * 66)}
          AND chapter = 1 AND verse = 1`;
      lat.push(Date.now() - t0);
    }
    lat.sort((a, b) => a - b);

    const [stats] = await prisma.$queryRaw<
      { live: number; dead: number; thr: number; sf: number }[]
    >`
      SELECT c.reltuples::float8 AS live,
             s.n_dead_tup::float8 AS dead,
             coalesce((SELECT option_value::float8 FROM pg_options_to_table(c.reloptions)
                       WHERE option_name = 'autovacuum_vacuum_threshold'),
                      current_setting('autovacuum_vacuum_threshold')::float8) AS thr,
             coalesce((SELECT option_value::float8 FROM pg_options_to_table(c.reloptions)
                       WHERE option_name = 'autovacuum_vacuum_scale_factor'),
                      current_setting('autovacuum_vacuum_scale_factor')::float8) AS sf
      FROM pg_class c JOIN pg_stat_user_tables s ON s.relid = c.oid
      WHERE c.oid = '"BibleVerse"'::regclass`;

    const [{ pending }] = await prisma.$queryRaw<{ pending: number }[]>`
      SELECT count(*)::int AS pending FROM "BibleVerse"
      WHERE translation = ANY(${targets}::text[]) AND embedding IS NULL`;

    const probe: DailyEmbeddingProbe = {
      vacuumRunning: await vacuumRunning(),
      deadTuples: stats.dead,
      liveTuples: stats.live,
      vacuumThreshold: stats.thr,
      vacuumScaleFactor: stats.sf,
      probeLatencyMs: lat[1],
      pending,
    };
    const plan = planDailyEmbedding(probe, {
      ...DAILY_EMBEDDING_DEFAULTS,
      dailyLimit,
    });

    summary([
      `## Ingestão diária de embeddings (${targets.join(', ')})`,
      `- pendentes: ${pending}`,
      `- vacuum em andamento: ${probe.vacuumRunning ? 'sim' : 'não'}`,
      `- latência da sondagem (mediana de 3): ${lat[1]} ms`,
      `- linhas mortas: ${Math.round(stats.dead)} · folga até o gatilho: ${plan.headroom}`,
      `- decisão: ${plan.run ? `rodar ${plan.limit}` : `adiar: ${plan.reason}`}${dryRun ? ' (dry-run)' : ''}`,
    ]);
    if (!plan.run || dryRun) return 0;

    // ── Rodada ────────────────────────────────────────────────────────────
    const verses = await prisma.$queryRaw<{ id: string; text: string }[]>`
      SELECT id, text FROM "BibleVerse"
      WHERE translation = ANY(${targets}::text[]) AND embedding IS NULL
      ORDER BY translation, "bookId", chapter, verse
      LIMIT ${plan.limit}`;

    const started = Date.now();
    let saved = 0;
    let stopReason = 'concluído';
    let exitCode = 0;

    for (let i = 0; i < verses.length; i += BATCH) {
      if (Date.now() - started > MAX_RUNTIME_MS) {
        stopReason = 'tempo máximo da rodada atingido';
        break;
      }
      if (i > 0 && (i / BATCH) % 10 === 0 && (await vacuumRunning())) {
        stopReason = 'vacuum começou durante a rodada';
        break;
      }

      const batch = verses.slice(i, i + BATCH);
      let vecs;
      try {
        vecs = await embeddings.createBatchEmbeddings(batch.map((v) => v.text));
        assertPersistedBatchEmbeddings(vecs, batch.length);
      } catch (err) {
        stopReason = `falha no embedding: ${err instanceof Error ? err.message : String(err)}`;
        exitCode = 1;
        break;
      }

      const t0 = Date.now();
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "BibleVerse" AS bv SET embedding = v.embedding::vector
           FROM (SELECT unnest($1::text[]) AS id, unnest($2::text[]) AS embedding) AS v
           WHERE bv.id = v.id AND bv.embedding IS NULL`,
          batch.map((v) => v.id),
          vecs.map((e) => JSON.stringify(e)),
        );
      } catch (err) {
        stopReason = `falha ao gravar (lote ${i}): ${err instanceof Error ? err.message : String(err)}`;
        exitCode = 1;
        break;
      }
      saved += batch.length;
      const writeMs = Date.now() - t0;
      if (writeMs > SLOW_WRITE_MS) {
        stopReason = `gravação lenta (${writeMs} ms): banco sob pressão`;
        break;
      }
      await sleep(DELAY_MS);
    }

    summary([
      `- gravados: ${saved} de ${verses.length} em ${Math.round((Date.now() - started) / 1000)} s`,
      `- parada: ${stopReason}`,
      `- restam: ${pending - saved}`,
    ]);
    return exitCode;
  } finally {
    await prisma.onModuleDestroy();
    await embeddings.onModuleDestroy();
  }
}

run()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('Erro fatal na ingestão diária:', err);
    process.exit(1);
  });
