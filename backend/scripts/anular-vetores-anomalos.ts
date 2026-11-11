import 'dotenv/config';
import { appendFileSync, writeFileSync } from 'fs';
import { Client } from 'pg';
import {
  ANOMALY_NORM_BOUNDS,
  SQL_QUERIES,
  validateAnomalousCounts,
  validateHeadroom,
} from '../src/rag/anular-vetores-anomalos.logic';

/**
 * Script de Anulação Controlada de Embeddings Fora do Espaço Gemini (Item 7.1).
 *
 * Executa em duas fases estritas:
 * 1. Fase 1 (Leitura): Varredura das versões livres (BLIVRE, NVA, TR) em lotes de 5.000 IDs
 *    sob statement_timeout = 15s. Identifica vetores com norma fora de [0.20, 0.85].
 * 2. Fase 2 (Escrita - desativada com --dry-run): Anula os vetores em lotes curtos de 1.000 IDs
 *    por transação com statement_timeout = 15s.
 *
 * Parâmetros CLI:
 *   --dry-run        Executa apenas a Fase 1 (sem alterações no banco).
 *   --max-linhas N   Limita a varredura total na Fase 1 a N linhas (para simulação/teste).
 */

const TARGET_TRANSLATIONS = ['BLIVRE', 'NVA', 'TR'];
const READ_BATCH_SIZE = 5000;
const WRITE_BATCH_SIZE = 1000;
const MAX_QUERY_TIME_MS = 10000; // Lote acima de 10s aborta

const isDryRun = process.argv.includes('--dry-run');
const maxLinhasArgIdx = process.argv.indexOf('--max-linhas');
const maxLinhas =
  maxLinhasArgIdx !== -1 && process.argv[maxLinhasArgIdx + 1]
    ? parseInt(process.argv[maxLinhasArgIdx + 1], 10)
    : Infinity;

function summary(lines: string[]) {
  for (const l of lines) console.log(l);
  const f = process.env.GITHUB_STEP_SUMMARY;
  if (f) appendFileSync(f, lines.join('\n') + '\n');
}

async function assertNoVacuum(
  client: Client,
  phaseLabel: string,
): Promise<void> {
  const res = await client.query<{ count: string | number }>(
    'SELECT count(*)::int AS count FROM pg_stat_progress_vacuum;',
  );
  const count = Number(res.rows[0]?.count ?? 0);
  if (count > 0) {
    throw new Error(
      `[TRAVA DE SEGURANÇA] Autovacuum em andamento no banco (${count} processos) antes de ${phaseLabel}. Abortando com código 1.`,
    );
  }
}

async function getAutovacuumHeadroom(client: Client): Promise<{
  headroom: number;
  dead: number;
  live: number;
  trigger: number;
}> {
  const res = await client.query<{
    live: number;
    dead: number;
    thr: number;
    sf: number;
  }>(`
    SELECT c.reltuples::float8 AS live,
           s.n_dead_tup::float8 AS dead,
           coalesce((SELECT option_value::float8 FROM pg_options_to_table(c.reloptions)
                     WHERE option_name = 'autovacuum_vacuum_threshold'),
                    current_setting('autovacuum_vacuum_threshold')::float8) AS thr,
           coalesce((SELECT option_value::float8 FROM pg_options_to_table(c.reloptions)
                     WHERE option_name = 'autovacuum_vacuum_scale_factor'),
                    current_setting('autovacuum_vacuum_scale_factor')::float8) AS sf
    FROM pg_class c JOIN pg_stat_user_tables s ON s.relid = c.oid
    WHERE c.oid = '"BibleVerse"'::regclass;
  `);

  const r = res.rows[0];
  const live = Number(r.live);
  const dead = Number(r.dead);
  const thr = Number(r.thr);
  const sf = Number(r.sf);
  const trigger = thr + sf * live;
  const headroom = Math.max(0, Math.floor(trigger * 0.9) - dead);
  return { headroom, dead, live, trigger };
}

async function main(): Promise<number> {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DIRECT_URL/DATABASE_URL não configurada.');
    return 1;
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 15000,
    connectionTimeoutMillis: 10000,
  });

  const summaryLines: string[] = [
    `# Anulação de Vetores Anômalos na BibleVerse (Item 7.1)`,
    `- Modo: ${isDryRun ? 'DRY-RUN (somente leitura)' : 'PRODUÇÃO (escrita controlada)'}`,
    `- Limite de varredura: ${isFinite(maxLinhas) ? `${maxLinhas} linhas` : 'integral (toda a tabela)'}`,
    `- Início: ${new Date().toISOString()}`,
  ];

  try {
    await client.connect();

    // ── TRAVA 1: Checagem inicial de vacuum ──
    await assertNoVacuum(client, 'Fase 1 (Leitura)');

    // ── FASE 1: Leitura em lotes de 5.000 por ID ──
    summaryLines.push(`\n## Fase 1 — Varredura e Identificação de Anomalias`);

    const anomalousIdsByTranslation: Record<string, string[]> = {
      BLIVRE: [],
      NVA: [],
      TR: [],
    };
    const allAnomalousIds: string[] = [];
    let totalLinesScanned = 0;

    for (const translation of TARGET_TRANSLATIONS) {
      if (totalLinesScanned >= maxLinhas) break;

      let lastId = '';
      let hasMore = true;
      let translationScanned = 0;

      while (hasMore && totalLinesScanned < maxLinhas) {
        const batchLimit = Math.min(
          READ_BATCH_SIZE,
          maxLinhas - totalLinesScanned,
        );
        const t0 = Date.now();

        const res = await client.query<{ id: string; n: number }>(
          SQL_QUERIES.SCAN_BATCH,
          [translation, lastId, batchLimit],
        );
        const elapsed = Date.now() - t0;

        if (elapsed > MAX_QUERY_TIME_MS) {
          throw new Error(
            `[TIMEOUT DE SEGURANÇA] Consulta de varredura [${translation}] excedeu ${MAX_QUERY_TIME_MS}ms (${elapsed}ms). Abortando com código 1.`,
          );
        }

        const rows = res.rows;
        if (rows.length === 0) {
          hasMore = false;
          break;
        }

        for (const row of rows) {
          const norm = Number(row.n);
          if (
            norm < ANOMALY_NORM_BOUNDS.min ||
            norm > ANOMALY_NORM_BOUNDS.max
          ) {
            anomalousIdsByTranslation[translation].push(row.id);
            allAnomalousIds.push(row.id);
          }
        }

        translationScanned += rows.length;
        totalLinesScanned += rows.length;
        lastId = rows[rows.length - 1].id;

        if (rows.length < batchLimit) {
          hasMore = false;
        }
      }

      console.log(
        `[Fase 1] ${translation}: ${translationScanned} versículos lidos | ${anomalousIdsByTranslation[translation].length} anômalos encontrados.`,
      );
    }

    const counts: Record<string, number> = {
      BLIVRE: anomalousIdsByTranslation.BLIVRE.length,
      NVA: anomalousIdsByTranslation.NVA.length,
      TR: anomalousIdsByTranslation.TR.length,
    };
    const totalAnomalous = allAnomalousIds.length;

    summaryLines.push(
      `- Linhas lidas: ${totalLinesScanned}`,
      `- BLIVRE anômalos: ${counts.BLIVRE}`,
      `- NVA anômalos: ${counts.NVA}`,
      `- TR anômalos: ${counts.TR}`,
      `- Total de anômalos encontrados: ${totalAnomalous}`,
    );

    // Salvar lista de IDs em arquivo local fora de commits
    const exportPayload = {
      timestamp: new Date().toISOString(),
      total: totalAnomalous,
      counts,
      ids: allAnomalousIds,
    };
    writeFileSync('anomalos-ids.json', JSON.stringify(exportPayload, null, 2));
    summaryLines.push(
      `- Arquivo salvo: \`anomalos-ids.json\` (${totalAnomalous} IDs gravados).`,
    );

    // Total zero -> nada a anular, sai com código 0
    if (totalAnomalous === 0) {
      summaryLines.push(`\n**Resultado:** nada a anular. Base já está limpa.`);
      summary(summaryLines);
      return 0;
    }

    // Validação de Faixas Esperadas
    const isLimited = isFinite(maxLinhas);
    const countCheck = validateAnomalousCounts(counts, isLimited);
    if (!countCheck.ok) {
      throw new Error(`[CRITÉRIO DE FAIXA VIOLADO] ${countCheck.reason}`);
    }

    // Validação da Folga de Autovacuum
    const headroomStats = await getAutovacuumHeadroom(client);
    const headroomCheck = validateHeadroom(
      headroomStats.headroom,
      totalAnomalous,
    );

    summaryLines.push(
      `\n## Verificação da Folga de Autovacuum`,
      `- Linhas vivas (reltuples): ${Math.round(headroomStats.live)}`,
      `- Linhas mortas atuais (n_dead_tup): ${Math.round(headroomStats.dead)}`,
      `- Gatilho de autovacuum: ${Math.round(headroomStats.trigger)} tuplas`,
      `- Folga disponível: ${headroomStats.headroom} tuplas`,
      `- Folga necessária (anulados + 2000 margem): ${headroomCheck.required} tuplas`,
    );

    if (!headroomCheck.ok) {
      throw new Error(`[FOLGA INSUFICIENTE] ${headroomCheck.reason}`);
    }

    // Se for Dry-Run, encerra com sucesso aqui
    if (isDryRun) {
      summaryLines.push(
        `\n**Status:** ✅ Simulação de Fase 1 aprovada (dry-run, nada escrito no banco).`,
      );
      summary(summaryLines);
      return 0;
    }

    // ── FASE 2: Escrita Controlada em Lotes de 1.000 IDs ──
    summaryLines.push(
      `\n## Fase 2 — Anulação em Lotes (UPDATE SET embedding = NULL)`,
    );

    // Trava de vacuum antes de iniciar a Fase 2
    await assertNoVacuum(client, 'Fase 2 (Escrita)');

    let totalUpdated = 0;
    const writeTimesMs: number[] = [];

    for (let i = 0; i < allAnomalousIds.length; i += WRITE_BATCH_SIZE) {
      const batchIds = allAnomalousIds.slice(i, i + WRITE_BATCH_SIZE);
      const batchNum = Math.floor(i / WRITE_BATCH_SIZE) + 1;
      const t0 = Date.now();

      await client.query('BEGIN');
      try {
        const updateRes = await client.query(SQL_QUERIES.UPDATE_BATCH, [
          batchIds,
        ]);
        const elapsed = Date.now() - t0;
        writeTimesMs.push(elapsed);

        if (elapsed > MAX_QUERY_TIME_MS) {
          await client.query('ROLLBACK');
          throw new Error(
            `[TIMEOUT DE ESCRITA] Lote ${batchNum} levou ${elapsed}ms (> 10s). Transação abortada.`,
          );
        }

        if (updateRes.rowCount !== batchIds.length) {
          await client.query('ROLLBACK');
          throw new Error(
            `[DIVERGÊNCIA DE LINHAS] Lote ${batchNum}: esperado=${batchIds.length}, afetado=${updateRes.rowCount}. Transação abortada.`,
          );
        }

        await client.query('COMMIT');
        totalUpdated += updateRes.rowCount;
        console.log(
          `[Fase 2] Lote ${batchNum}: ${updateRes.rowCount} versículos anulados em ${elapsed}ms.`,
        );
      } catch (writeErr) {
        await client.query('ROLLBACK').catch(() => {});
        throw writeErr;
      }
    }

    summaryLines.push(
      `- Total de versículos anulados com sucesso: ${totalUpdated}`,
      `- Lotes executados: ${writeTimesMs.length}`,
      `- Tempo médio por lote: ${(writeTimesMs.reduce((a, b) => a + b, 0) / (writeTimesMs.length || 1)).toFixed(0)} ms`,
    );

    // ── CONFERÊNCIA FINAL ──
    summaryLines.push(`\n## Conferência Pós-Anulação`);

    for (const t of TARGET_TRANSLATIONS) {
      const pRes = await client.query<{ count: string | number }>(
        SQL_QUERIES.PENDING_COUNT,
        [t, 50000],
      );
      const pendingCount = Number(pRes.rows[0]?.count ?? 0);
      summaryLines.push(
        `- Pendentes com embedding NULL em ${t}: ${pendingCount}`,
      );
    }

    // Varredura de confirmação (deve retornar 0 anômalos)
    let recheckAnomalous = 0;
    for (const t of TARGET_TRANSLATIONS) {
      const checkRes = await client.query<{ count: string | number }>(
        `
        SELECT count(*)::int AS count
        FROM "BibleVerse"
        WHERE translation = $1
          AND embedding IS NOT NULL
          AND vector_norm(embedding) NOT BETWEEN 0.20 AND 0.85;
      `,
        [t],
      );
      recheckAnomalous += Number(checkRes.rows[0]?.count ?? 0);
    }

    summaryLines.push(
      `- Varredura de rechecagem: ${recheckAnomalous} anômalos remanescentes (esperado 0).`,
    );

    if (recheckAnomalous > 0) {
      throw new Error(
        `[FALHA NA CONFERÊNCIA] Encontrados ${recheckAnomalous} versículos anômalos após anulação!`,
      );
    }

    summaryLines.push(
      `\n**Status:** ✅ Anulação concluída com 100% de sucesso.`,
    );
    summary(summaryLines);
    return 0;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`❌ ERRO FATAL: ${errorMsg}`);
    summaryLines.push(`\n**ERRO FATAL:** ❌ ${errorMsg}`);
    summary(summaryLines);
    return 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('Unhandled exception:', err);
    process.exit(1);
  });
