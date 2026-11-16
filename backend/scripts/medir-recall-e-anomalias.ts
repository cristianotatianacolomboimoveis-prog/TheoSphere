import 'dotenv/config';
import { Client } from 'pg';
import { EmbeddingService } from '../src/rag/embedding.service';

/**
 * Script de Medição de Recall e Auditoria de Anomalias Vetoriais (Etapa 7.4).
 *
 * Operação 100% READ ONLY:
 * - 1 única conexão com o PostgreSQL sob statement_timeout = 15s.
 * - Transação explícita READ ONLY para garantir ausência de mutação de dados ou DDL.
 * - Varredura das 5 traduções (KJV, WEB, LXX, WLC, BLIVRE) com paginação por chave única
 *   em lotes de 1.000 versículos.
 * - Cálculo local da norma euclidiana em memória (sem sobrecarregar o banco com vector_norm).
 * - Avaliação de Recall@10 e Recall@20 da busca binária quantizada (P=200, ef_search=200,
 *   iterative_scan=relaxed_order) contra busca exata local por cosseno em 30 consultas
 *   (15 PT em BLIVRE e 15 EN na KJV).
 * - Telemetria de impacto no Supabase Nano (tamanho do banco, índices HNSW, n_dead_tup).
 */

const TARGET_TRANSLATIONS = ['KJV', 'WEB', 'LXX', 'WLC', 'BLIVRE'] as const;
type TargetTranslation = (typeof TARGET_TRANSLATIONS)[number];

const READ_BATCH_SIZE = 1000;
const MAX_QUERY_TIME_MS = 10000; // Timeout de segurança por lote (10s)

const PT_QUERIES = [
  'amor de Deus',
  'justificação pela fé',
  'o bom pastor',
  'criação dos céus e da terra',
  'graça e paz vos sejam multiplicadas',
  'o Senhor é o meu pastor e nada me faltará',
  'no princípio era o Verbo e o Verbo estava com Deus',
  'porque Deus amou o mundo de tal maneira',
  'tudo posso naquele que me fortalece',
  'a soberania de Deus nas aflições',
  'ressurreição dos mortos e vida eterna',
  'lâmpada para os meus pés é a tua palavra',
  'o salário do pecado é a morte',
  'combati o bom combate terminei a corrida guardei a fé',
  'reconciliação e perdão de pecados',
];

const EN_QUERIES = [
  'love of God',
  'justification by faith',
  'the good shepherd',
  'creation of heaven and earth',
  'the Lord is my shepherd I shall not want',
  'in the beginning was the Word and the Word was with God',
  'for God so loved the world that he gave his only begotten Son',
  'I can do all things through Christ which strengtheneth me',
  'for all have sinned and come short of the glory of God',
  'the wages of sin is death but the gift of God is eternal life',
  'all things work together for good to them that love God',
  'thy word is a lamp unto my feet and a light unto my path',
  'I have fought a good fight I have finished my course',
  'resurrection of the dead and eternal life',
  'providence and sovereignty of God in affliction',
];

interface VerseMemoryItem {
  id: string;
  vec: Float32Array;
  norm: number;
}

interface TranslationNormStats {
  translation: string;
  total: number;
  minNorm: number;
  maxNorm: number;
  avgNorm: number;
  anomaliesCount: number;
  anomalousIds: string[];
}

interface QueryRecallResult {
  query: string;
  translation: string;
  exactTop20Ids: string[];
  prodTop20Ids: string[];
  recallAt10: number;
  recallAt20: number;
  latencyMs: number;
}

interface TelemetrySnapshot {
  dbSizeBytes: number;
  dbSizePretty: string;
  hnswSizeBytes: number;
  hnswSizePretty: string;
  vectorIndexesSizeBytes: number;
  vectorIndexesSizePretty: string;
  deadTup: number;
  probeMs: number;
  probeVectorArm: string;
}

function parseVectorText(raw: string): Float32Array {
  // raw vem como "[0.012,-0.045,...]"
  const trimmed =
    raw.startsWith('[') && raw.endsWith(']') ? raw.slice(1, -1) : raw;
  const parts = trimmed.split(',');
  const arr = new Float32Array(parts.length);
  for (let i = 0; i < parts.length; i++) {
    arr[i] = parseFloat(parts[i]);
  }
  return arr;
}

function computeEuclideanNorm(vec: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < vec.length; i++) {
    sum += vec[i] * vec[i];
  }
  return Math.sqrt(sum);
}

function computeCosineDistance(
  qVec: Float32Array,
  qNorm: number,
  vVec: Float32Array,
  vNorm: number,
): number {
  if (qNorm === 0 || vNorm === 0) return 1.0;
  let dot = 0;
  for (let i = 0; i < qVec.length; i++) {
    dot += qVec[i] * vVec[i];
  }
  const cosSim = dot / (qNorm * vNorm);
  return 1 - cosSim;
}

async function collectTelemetry(client: Client): Promise<TelemetrySnapshot> {
  const dbRes = await client.query<{ bytes: string; pretty: string }>(
    'SELECT pg_database_size(current_database()) AS bytes, pg_size_pretty(pg_database_size(current_database())) AS pretty;',
  );
  const hnswRes = await client.query<{ bytes: string; pretty: string }>(
    'SELECT pg_relation_size(\'"BibleVerse_embedding_bq_hnsw_idx"\') AS bytes, pg_size_pretty(pg_relation_size(\'"BibleVerse_embedding_bq_hnsw_idx"\')) AS pretty;',
  );
  const vecSumRes = await client.query<{ bytes: string; pretty: string }>(`
    SELECT sum(pg_relation_size(c.oid))::bigint AS bytes,
           pg_size_pretty(sum(pg_relation_size(c.oid))) AS pretty
    FROM pg_class c
    JOIN pg_am am ON am.oid = c.relam
    WHERE am.amname = 'hnsw';
  `);
  const deadRes = await client.query<{ n_dead_tup: string }>(`
    SELECT n_dead_tup
    FROM pg_stat_user_tables
    WHERE relname = 'BibleVerse';
  `);

  let probeMs = 0;
  let probeVectorArm = 'error';
  try {
    const t0 = Date.now();
    const resp = await fetch(
      'https://theosphere.onrender.com/api/v1/search/verses?q=Deus',
    );
    probeMs = Date.now() - t0;
    if (resp.ok) {
      const data = (await resp.json()) as any;
      probeVectorArm = data?.meta?.vectorArm ?? 'desconhecido';
    }
  } catch {
    probeVectorArm = 'unreachable';
  }

  return {
    dbSizeBytes: Number(dbRes.rows[0].bytes),
    dbSizePretty: dbRes.rows[0].pretty,
    hnswSizeBytes: Number(hnswRes.rows[0].bytes),
    hnswSizePretty: hnswRes.rows[0].pretty,
    vectorIndexesSizeBytes: Number(vecSumRes.rows[0].bytes),
    vectorIndexesSizePretty: vecSumRes.rows[0].pretty,
    deadTup: Number(deadRes.rows[0]?.n_dead_tup ?? 0),
    probeMs,
    probeVectorArm,
  };
}

async function assertNoVacuum(client: Client): Promise<void> {
  const res = await client.query<{ count: string }>(
    'SELECT count(*)::int AS count FROM pg_stat_progress_vacuum;',
  );
  const count = Number(res.rows[0]?.count ?? 0);
  if (count > 0) {
    throw new Error(
      `[TRAVA DE SEGURANÇA] Autovacuum em andamento no banco (${count} processo(s)). Abortando com código 1.`,
    );
  }
}

async function main() {
  const startTime = Date.now();
  console.log(
    '═══════════════════════════════════════════════════════════════════════════════',
  );
  console.log(
    '  ETAPA 7.4: AUDITORIA NOTURNA DE RECALL E ANOMALIAS VETORIAIS (READ ONLY)',
  );
  console.log(
    '═══════════════════════════════════════════════════════════════════════════════\n',
  );

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERRO: DATABASE_URL ausente.');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 15000,
  });

  await client.connect();
  console.log('✓ Conectado ao PostgreSQL (1 única conexão).');

  // Trava de segurança inicial
  await assertNoVacuum(client);
  console.log(
    '✓ pg_stat_progress_vacuum verificado: nenhum vacuum em andamento.',
  );

  // Telemetria ANTES
  console.log('\n--- Telemetria Inicial ---');
  const telemetryBefore = await collectTelemetry(client);
  console.log(
    `- Tamanho do Banco: ${telemetryBefore.dbSizePretty} (${telemetryBefore.dbSizeBytes} bytes)`,
  );
  console.log(
    `- Índice BibleVerse_embedding_bq_hnsw_idx: ${telemetryBefore.hnswSizePretty}`,
  );
  console.log(
    `- Soma de Todos os Índices HNSW: ${telemetryBefore.vectorIndexesSizePretty}`,
  );
  console.log(`- Linhas Mortas (n_dead_tup): ${telemetryBefore.deadTup}`);
  console.log(
    `- Sondagem Produção: ${telemetryBefore.probeMs} ms (vectorArm: ${telemetryBefore.probeVectorArm})`,
  );

  // Iniciar transação READ ONLY com timeout de 15s
  await client.query('BEGIN READ ONLY;');
  await client.query("SET statement_timeout = '15s';");
  console.log('\n✓ Transação READ ONLY iniciada com statement_timeout = 15s.');

  const embeddingService = new EmbeddingService();
  const allNormStats: TranslationNormStats[] = [];
  const allRecallResults: QueryRecallResult[] = [];

  try {
    for (const translation of TARGET_TRANSLATIONS) {
      console.log(
        `\n─────────────────────────────────────────────────────────────────────────────`,
      );
      console.log(`[1/2] Varredura da Tradução: ${translation}`);
      console.log(
        `─────────────────────────────────────────────────────────────────────────────`,
      );

      let cursor = { bookId: 0, chapter: 0, verse: 0 };
      let hasMore = true;
      let totalScanned = 0;
      let minNorm = Infinity;
      let maxNorm = -Infinity;
      let sumNorm = 0;
      const anomalousIds: string[] = [];
      let batchIndex = 0;
      let maxBatchMs = 0;

      const needsInMemory = translation === 'BLIVRE' || translation === 'KJV';
      const inMemoryVectors: VerseMemoryItem[] = [];

      const tTrStart = Date.now();

      while (hasMore) {
        batchIndex++;
        const t0 = Date.now();

        const res = await client.query<{
          id: string;
          bookId: number;
          chapter: number;
          verse: number;
          embedding: string;
        }>(
          `
          SELECT id, "bookId", chapter, verse, embedding::text AS embedding
          FROM "BibleVerse"
          WHERE translation = $1 AND ("bookId", chapter, verse) > ($2, $3, $4)
            AND embedding IS NOT NULL
          ORDER BY "bookId", chapter, verse
          LIMIT $5;
        `,
          [
            translation,
            cursor.bookId,
            cursor.chapter,
            cursor.verse,
            READ_BATCH_SIZE,
          ],
        );

        const elapsed = Date.now() - t0;
        if (elapsed > maxBatchMs) maxBatchMs = elapsed;

        if (elapsed > MAX_QUERY_TIME_MS) {
          throw new Error(
            `[TIMEOUT DE SEGURANÇA] Lote ${batchIndex} de ${translation} levou ${elapsed}ms (> ${MAX_QUERY_TIME_MS}ms).`,
          );
        }

        const rows = res.rows;
        if (rows.length === 0) {
          hasMore = false;
          break;
        }

        for (const row of rows) {
          totalScanned++;
          const vec = parseVectorText(row.embedding);
          const norm = computeEuclideanNorm(vec);

          if (norm < minNorm) minNorm = norm;
          if (norm > maxNorm) maxNorm = norm;
          sumNorm += norm;

          if (norm < 0.2 || norm > 0.85) {
            anomalousIds.push(row.id);
          }

          if (needsInMemory) {
            inMemoryVectors.push({
              id: row.id,
              vec,
              norm,
            });
          }
        }

        const lastRow = rows[rows.length - 1];
        cursor = {
          bookId: lastRow.bookId,
          chapter: lastRow.chapter,
          verse: lastRow.verse,
        };

        if (rows.length < READ_BATCH_SIZE) {
          hasMore = false;
        }

        if (batchIndex % 5 === 0 || !hasMore) {
          process.stdout.write(
            `  Lote ${batchIndex} | ${totalScanned} versículos | último lote: ${elapsed}ms (máx: ${maxBatchMs}ms)\r`,
          );
        }
      }

      const avgNorm = totalScanned > 0 ? sumNorm / totalScanned : 0;
      const trDurationSec = ((Date.now() - tTrStart) / 1000).toFixed(1);

      console.log(`\n  Concluído em ${trDurationSec}s (${batchIndex} lotes).`);
      console.log(`  Total de versículos com embedding: ${totalScanned}`);
      console.log(
        `  Norma: mín = ${minNorm.toFixed(4)}, máx = ${maxNorm.toFixed(4)}, média = ${avgNorm.toFixed(4)}`,
      );
      console.log(`  Anomalias (fora de [0.20, 0.85]): ${anomalousIds.length}`);
      if (anomalousIds.length > 0) {
        console.log(
          `  Primeiros IDs anômalos (até 20): ${anomalousIds.slice(0, 20).join(', ')}`,
        );
      }

      allNormStats.push({
        translation,
        total: totalScanned,
        minNorm: minNorm === Infinity ? 0 : minNorm,
        maxNorm: maxNorm === -Infinity ? 0 : maxNorm,
        avgNorm,
        anomaliesCount: anomalousIds.length,
        anomalousIds: anomalousIds.slice(0, 20),
      });

      // ─────────────────────────────────────────────────────────────────────────────
      // [2/2] Avaliação de Recall da Busca Binária para BLIVRE ou KJV
      // ─────────────────────────────────────────────────────────────────────────────
      if (needsInMemory) {
        const queries = translation === 'BLIVRE' ? PT_QUERIES : EN_QUERIES;
        console.log(
          `\n─────────────────────────────────────────────────────────────────────────────`,
        );
        console.log(
          `[2/2] Avaliação de Recall@10 e Recall@20: ${translation} (${queries.length} consultas)`,
        );
        console.log(
          `─────────────────────────────────────────────────────────────────────────────`,
        );

        for (let qIdx = 0; qIdx < queries.length; qIdx++) {
          const qText = queries[qIdx];
          process.stdout.write(
            `  [${qIdx + 1}/${queries.length}] "${qText}"... `,
          );

          // 1. Gerar embedding da consulta via Gemini
          const qEmbRes = await embeddingService.createEmbedding(qText);
          const qVec = new Float32Array(qEmbRes.vector);
          const qNorm = computeEuclideanNorm(qVec);
          const qLiteral = `[${Array.from(qVec).join(',')}]`;

          // 2. Busca exata local sobre os vetores em memória
          const scored = inMemoryVectors.map((item) => ({
            id: item.id,
            dist: computeCosineDistance(qVec, qNorm, item.vec, item.norm),
          }));
          scored.sort((a, b) => a.dist - b.dist);
          const exactTop20 = scored.slice(0, 20).map((s) => s.id);
          const exactTop10 = exactTop20.slice(0, 10);

          // 3. Busca binária de produção no banco (SQL exato de binaryVectorSearch)
          await client.query('SET LOCAL hnsw.ef_search = 200;');
          await client.query(
            "SET LOCAL hnsw.iterative_scan = 'relaxed_order';",
          );

          const tQuery0 = Date.now();
          const prodRes = await client.query<{ id: string }>(
            `
            WITH candidatos AS (
              SELECT id, "bookId", chapter, verse, translation, text, embedding
              FROM "BibleVerse"
              WHERE embedding IS NOT NULL
                AND translation = $1
              ORDER BY binary_quantize(embedding)::bit(768) <~> binary_quantize($2::vector)::bit(768)
              LIMIT 200
            )
            SELECT id, (embedding <=> $2::vector) AS distance
            FROM candidatos
            ORDER BY distance
            LIMIT 20;
          `,
            [translation, qLiteral],
          );
          const queryElapsedMs = Date.now() - tQuery0;

          const prodTop20 = prodRes.rows.map((r) => r.id);
          const prodTop10 = prodTop20.slice(0, 10);

          // 4. Cálculo do Recall
          const exactTop10Set = new Set(exactTop10);
          const exactTop20Set = new Set(exactTop20);

          let hitsAt10 = 0;
          for (const id of prodTop10) {
            if (exactTop10Set.has(id)) hitsAt10++;
          }
          const recallAt10 = hitsAt10 / 10;

          let hitsAt20 = 0;
          for (const id of prodTop20) {
            if (exactTop20Set.has(id)) hitsAt20++;
          }
          const recallAt20 = hitsAt20 / 20;

          console.log(
            `Recall@10: ${(recallAt10 * 100).toFixed(0)}% | Recall@20: ${(recallAt20 * 100).toFixed(0)}% | Latência: ${queryElapsedMs}ms`,
          );

          allRecallResults.push({
            query: qText,
            translation,
            exactTop20Ids: exactTop20,
            prodTop20Ids: prodTop20,
            recallAt10,
            recallAt20,
            latencyMs: queryElapsedMs,
          });
        }

        // Liberar vetores da memória após a avaliação da tradução
        inMemoryVectors.length = 0;
      }
    }

    // Finalizar transação READ ONLY
    await client.query('COMMIT;');
    console.log('\n✓ Transação READ ONLY finalizada com sucesso (COMMIT).');
  } catch (err) {
    await client.query('ROLLBACK;').catch(() => {});
    console.error('\n❌ ERRO DURANTE A MEDIÇÃO:', (err as Error).message);
    throw err;
  } finally {
    // Trava de segurança pós-execução
    await assertNoVacuum(client);

    // Telemetria DEPOIS
    console.log('\n--- Telemetria Final ---');
    const telemetryAfter = await collectTelemetry(client);
    console.log(
      `- Tamanho do Banco: ${telemetryAfter.dbSizePretty} (${telemetryAfter.dbSizeBytes} bytes)`,
    );
    console.log(
      `- Índice BibleVerse_embedding_bq_hnsw_idx: ${telemetryAfter.hnswSizePretty}`,
    );
    console.log(
      `- Soma de Todos os Índices HNSW: ${telemetryAfter.vectorIndexesSizePretty}`,
    );
    console.log(`- Linhas Mortas (n_dead_tup): ${telemetryAfter.deadTup}`);
    console.log(
      `- Sondagem Produção: ${telemetryAfter.probeMs} ms (vectorArm: ${telemetryAfter.probeVectorArm})`,
    );

    await client.end();
    console.log('✓ Conexão encerrada.');
  }

  const totalDurationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  // ─────────────────────────────────────────────────────────────────────────────
  // Resumo Formatado
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(
    '\n═══════════════════════════════════════════════════════════════════════════════',
  );
  console.log(`  RESUMO DA AUDITORIA (Duração total: ${totalDurationSec}s)`);
  console.log(
    '═══════════════════════════════════════════════════════════════════════════════\n',
  );

  console.log('### TABELA 1: Auditoria de Normas e Anomalias por Tradução\n');
  console.log(
    '| Tradução | Total com Vetor | Norma Mín | Norma Máx | Norma Média | Anomalias (<0.20 ou >0.85) |',
  );
  console.log(
    '|:---------|----------------:|----------:|----------:|------------:|---------------------------:|',
  );
  for (const s of allNormStats) {
    console.log(
      `| ${s.translation.padEnd(8)} | ${s.total.toString().padStart(15)} | ${s.minNorm.toFixed(4).padStart(9)} | ${s.maxNorm.toFixed(4).padStart(9)} | ${s.avgNorm.toFixed(4).padStart(11)} | ${s.anomaliesCount.toString().padStart(26)} |`,
    );
  }

  for (const s of allNormStats) {
    if (s.anomaliesCount > 0) {
      console.log(`\nIDs anômalos em ${s.translation} (até 20):`);
      console.log(s.anomalousIds.map((id) => `  - ${id}`).join('\n'));
    }
  }

  console.log(
    '\n### TABELA 2: Recall da Busca Binária Quantizada (HNSW Bit 768d vs Exato)\n',
  );
  console.log(
    '| Tradução | Consulta | Recall@10 | Recall@20 | Latência (ms) |',
  );
  console.log(
    '|:---------|:---------|----------:|----------:|--------------:|',
  );
  for (const r of allRecallResults) {
    console.log(
      `| ${r.translation.padEnd(8)} | ${r.query.slice(0, 40).padEnd(40)} | ${(r.recallAt10 * 100).toFixed(0).padStart(8)}% | ${(r.recallAt20 * 100).toFixed(0).padStart(8)}% | ${r.latencyMs.toString().padStart(13)} |`,
    );
  }

  // Médias de Recall e Latência por Tradução
  for (const tr of ['BLIVRE', 'KJV'] as const) {
    const trResults = allRecallResults.filter((r) => r.translation === tr);
    if (trResults.length > 0) {
      const avgR10 =
        trResults.reduce((acc, r) => acc + r.recallAt10, 0) / trResults.length;
      const avgR20 =
        trResults.reduce((acc, r) => acc + r.recallAt20, 0) / trResults.length;
      const latencies = trResults.map((r) => r.latencyMs).sort((a, b) => a - b);
      const medianLat = latencies[Math.floor(latencies.length / 2)];
      const maxLat = latencies[latencies.length - 1];

      console.log(`\n--- Métricas Agregadas [${tr}] ---`);
      console.log(`- Média Recall@10: ${(avgR10 * 100).toFixed(1)}%`);
      console.log(`- Média Recall@20: ${(avgR20 * 100).toFixed(1)}%`);
      console.log(
        `- Latência da Busca Binária: Mediana = ${medianLat} ms | Máxima = ${maxLat} ms`,
      );
    }
  }

  console.log(
    '\n═══════════════════════════════════════════════════════════════════════════════',
  );
}

main().catch((err) => {
  console.error('Falha fatal na execução:', err);
  process.exit(1);
});
