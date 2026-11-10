import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

interface ValidationItem {
  translation: string;
  queryId: string;
  bookId: number;
  chapter: number;
  verse: number;
  queryVector: number[];
  top10Exact: Array<{
    id: string;
    bookId: number;
    chapter: number;
    verse: number;
    sim: number;
  }>;
}

async function runRecallValidation(
  client: Client,
  samples: ValidationItem[],
  P: number,
  efSearch: number,
) {
  let totalRecall = 0;
  const translationStats: Record<string, { total: number; sumRecall: number }> =
    {};

  for (const item of samples) {
    const literal = `[${item.queryVector.map((n) => (Number.isFinite(n) ? n : 0)).join(',')}]`;

    // Executa em transação para SET LOCAL hnsw.ef_search
    await client.query('BEGIN');
    await client.query(`SET LOCAL hnsw.ef_search = ${efSearch};`);

    // Na geração do ground-truth (medir-quantizacao-binaria.ts:237), o versículo da própria consulta
    // é excluído (if (i === qIdx) continue;). No banco, filtramos id != item.queryId para avaliar
    // exatamente a recuperação dos 10 vizinhos mais próximos distintos da própria consulta.
    const sql = `
      WITH candidatos AS (
        SELECT id, embedding
        FROM "BibleVerse"
        WHERE translation = $1 AND id != $2 AND embedding IS NOT NULL
        ORDER BY (binary_quantize(embedding)::bit(768)) <~> binary_quantize('${literal}'::vector)::bit(768)
        LIMIT ${P}
      )
      SELECT id, (embedding <=> '${literal}'::vector) AS distance
      FROM candidatos
      ORDER BY distance ASC
      LIMIT 10;
    `;

    const res = await client.query(sql, [item.translation, item.queryId]);
    await client.query('COMMIT');

    const retrievedIds = new Set(res.rows.map((r: any) => r.id));
    const exactIds = new Set(item.top10Exact.map((x) => x.id));

    let common = 0;
    for (const id of exactIds) {
      if (retrievedIds.has(id)) common++;
    }

    const recall = common / exactIds.size;
    totalRecall += recall;

    if (!translationStats[item.translation]) {
      translationStats[item.translation] = { total: 0, sumRecall: 0 };
    }
    translationStats[item.translation].total++;
    translationStats[item.translation].sumRecall += recall;
  }

  const meanOverall = totalRecall / samples.length;
  return {
    meanOverall,
    translationStats: Object.fromEntries(
      Object.entries(translationStats).map(([t, s]) => [
        t,
        s.sumRecall / s.total,
      ]),
    ),
  };
}

async function main() {
  const connectionString =
    process.env.DIRECT_DB_URL ||
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL;

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 30000,
    connectionTimeoutMillis: 15000,
  });

  await client.connect();

  try {
    console.log(
      '=== 1. Validação de Recall@10 do Índice Real contra validation_sample_30.json ===',
    );
    const samplePath = path.resolve(
      __dirname,
      '../scratch/validation_sample_30.json',
    );
    if (!fs.existsSync(samplePath)) {
      throw new Error(`Arquivo não encontrado: ${samplePath}`);
    }

    const samples: ValidationItem[] = JSON.parse(
      fs.readFileSync(samplePath, 'utf8'),
    );
    console.log(`Carregadas ${samples.length} consultas de validação.`);

    // Teste 1: P = 200, ef_search = 200
    console.log('\n--- Medindo com P = 200, ef_search = 200 ---');
    let resRecall = await runRecallValidation(client, samples, 200, 200);
    console.log(
      `Recall@10 Médio Geral (P=200, ef=200): ${(resRecall.meanOverall * 100).toFixed(2)}%`,
    );
    for (const [tr, r] of Object.entries(resRecall.translationStats)) {
      console.log(`  - ${tr}: ${(r * 100).toFixed(2)}%`);
    }

    // Se recall for menor que 0.95, tenta ef_search = 400
    if (resRecall.meanOverall < 0.95) {
      console.warn(
        '\nRecall abaixo de 95%! Testando com ef_search = 400, P = 200...',
      );
      const resRecall400 = await runRecallValidation(client, samples, 200, 400);
      console.log(
        `Recall@10 Médio Geral (P=200, ef=400): ${(resRecall400.meanOverall * 100).toFixed(2)}%`,
      );
      for (const [tr, r] of Object.entries(resRecall400.translationStats)) {
        console.log(`  - ${tr}: ${(r * 100).toFixed(2)}%`);
      }
      resRecall = resRecall400;
    }

    if (resRecall.meanOverall < 0.95) {
      console.error(`[FALHA] Recall@10 não atingiu o limiar de 0,95!`);
    } else {
      console.log(
        `[APROVADO] Recall@10 atingiu o limiar aprovado de >= 95% (${(resRecall.meanOverall * 100).toFixed(2)}%).`,
      );
    }

    console.log(
      '\n=== 2. Comparação dos Modos FULL vs BINARY em 10 Buscas com Palavras Novas ===',
    );
    // Inclui consultas em português, inglês e originais (LXX grego, WLC hebraico, TR grego)
    const testQueries = [
      { term: 'misericórdia e justiça', translation: 'BLIVRE' },
      { term: 'ressurreição dos mortos', translation: 'NVA' },
      { term: 'covenant of peace', translation: 'KJV' },
      { term: 'everlasting kingdom', translation: 'WEB' },
      { term: 'δικαιοσύνη', translation: 'LXX' },
      { term: 'שָׁלוֹם', translation: 'WLC' },
      { term: 'λόγος', translation: 'TR' },
      { term: 'espírito e verdade', translation: 'BLIVRE' },
      { term: 'tabernacle of David', translation: 'KJV' },
      { term: 'χάρις καὶ ἀλήθεια', translation: 'TR' },
    ];

    // Precisamos de embedding para cada uma: chamamos a API ou geramos via embeddingService
    const { EmbeddingService } = require('../src/rag/embedding.service');
    const embeddingService = new EmbeddingService();

    const comparisonTable: Array<{
      termo: string;
      traducao: string;
      tempoFullMs: number;
      tempoBinaryMs: number;
      sobreposicaoTop10: string;
      pctSobreposicao: string;
    }> = [];

    for (const tq of testQueries) {
      const embRes = await embeddingService.createEmbedding(tq.term);
      const vector = embRes.vector || embRes;
      const literal = `[${vector.map((n: number) => (Number.isFinite(n) ? n : 0)).join(',')}]`;

      // 1. Modo Full (Cosseno no índice de precisão total ou seq scan)
      const t0Full = Date.now();
      const qFull = await client.query(
        `
        SELECT id, translation, "bookId", chapter, verse, text,
               (embedding <=> '${literal}'::vector) AS distance
        FROM "BibleVerse"
        WHERE translation = $1 AND embedding IS NOT NULL
        ORDER BY embedding <=> '${literal}'::vector
        LIMIT 10;
      `,
        [tq.translation],
      );
      const elapsedFull = Date.now() - t0Full;

      // 2. Modo Binary (duas fases: Hamming bit(768) + re-ranking cosseno)
      const t0Binary = Date.now();
      await client.query('BEGIN');
      await client.query('SET LOCAL hnsw.ef_search = 200;');
      const qBinary = await client.query(
        `
        WITH candidatos AS (
          SELECT id, translation, "bookId", chapter, verse, text, embedding
          FROM "BibleVerse"
          WHERE translation = $1 AND embedding IS NOT NULL
          ORDER BY (binary_quantize(embedding)::bit(768)) <~> binary_quantize('${literal}'::vector)::bit(768)
          LIMIT 200
        )
        SELECT id, translation, "bookId", chapter, verse, text,
               (embedding <=> '${literal}'::vector) AS distance
        FROM candidatos
        ORDER BY distance ASC
        LIMIT 10;
      `,
        [tq.translation],
      );
      await client.query('COMMIT');
      const elapsedBinary = Date.now() - t0Binary;

      const setFull = new Set(qFull.rows.map((r: any) => r.id));
      let matches = 0;
      for (const r of qBinary.rows) {
        if (setFull.has(r.id)) matches++;
      }

      comparisonTable.push({
        termo: tq.term,
        traducao: tq.translation,
        tempoFullMs: elapsedFull,
        tempoBinaryMs: elapsedBinary,
        sobreposicaoTop10: `${matches} / 10`,
        pctSobreposicao: `${matches * 10}%`,
      });
    }

    console.table(comparisonTable);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[ERRO NA VALIDAÇÃO]', err);
  process.exit(1);
});
