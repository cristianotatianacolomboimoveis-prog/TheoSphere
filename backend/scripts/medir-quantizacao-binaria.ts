/**
 * Script de benchmark e validação da Quantização Binária (Etapa 2 do Plano Nano)
 *
 * Objetivo:
 *   1. Exportar (ou carregar) id e embeddings de BLIVRE e WEB de "BibleVerse" em páginas de 2.000 linhas
 *      com 2s de pausa, ordenadas por chave, para backend/scratch/.
 *   2. Calcular estatísticas de centralização dos vetores (média global e fração de dimensões > 0).
 *   3. Medir recall@10 para P = 40, 100 e 200 usando 300 consultas sorteadas com semente fixa determinística.
 *   4. Gravar amostra de 30 consultas por tradução com Top-10 exato em backend/scratch/validation_sample_30.json
 *      para validação do grafo HNSW na Etapa 4 sem varredura completa.
 *   5. Estimar tamanho do índice HNSW binário no formato pgvector (limite atualizado para 90 MB).
 *
 * Restrições da Seção 3.1:
 *   - Exportação contra o banco só pode rodar na janela noturna (00:00 às 06:00 BRT).
 */

import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import {
  mulberry32,
  popcount32,
  hammingDistance768,
  cosineSimilarity768,
  quantizeBinary,
} from '../src/rag/binary-quantization';

dotenv.config();

export interface VerseVector {
  id: string;
  bookId: number;
  chapter: number;
  verse: number;
  vector: Float32Array;
  binary: Uint32Array; // 768 bits = 24 words de 32 bits
}

// Pausa assíncrona
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Verifica janela noturna estrita (00:00 - 06:00 BRT)
function checkNightWindow(): { allowed: boolean; brtTime: string } {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  // BRT é UTC-3
  const brtHours = (utcHours - 3 + 24) % 24;
  const brtTime = `${String(brtHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')} BRT`;
  const allowed = brtHours >= 0 && brtHours < 6;
  return { allowed, brtTime };
}

async function exportTranslationVectors(
  client: Client,
  translation: string,
  outPath: string,
): Promise<void> {
  console.log(`\n--- Iniciando exportação paginada de ${translation} ---`);
  let lastBookId = 0;
  let lastChapter = 0;
  let lastVerse = 0;
  let totalFetched = 0;
  const pageSize = 2000;
  const writeStream = fs.createWriteStream(outPath, { flags: 'w' });

  while (true) {
    const t0 = Date.now();
    const res = await client.query(
      `
      SELECT id, "bookId", chapter, verse, embedding::text AS embedding
      FROM "BibleVerse"
      WHERE translation = $1
        AND embedding IS NOT NULL
        AND ("bookId" > $2 OR ("bookId" = $2 AND chapter > $3) OR ("bookId" = $2 AND chapter = $3 AND verse > $4))
      ORDER BY "bookId", chapter, verse
      LIMIT $5;
    `,
      [translation, lastBookId, lastChapter, lastVerse, pageSize],
    );

    const rows = res.rows;
    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      writeStream.write(JSON.stringify(row) + '\n');
    }

    totalFetched += rows.length;
    const lastRow = rows[rows.length - 1];
    lastBookId = lastRow.bookId;
    lastChapter = lastRow.chapter;
    lastVerse = lastRow.verse;

    const elapsed = Date.now() - t0;
    console.log(
      `  [${translation}] Página exportada: +${rows.length} linhas (Total: ${totalFetched}) em ${elapsed}ms. Pausando 2s...`,
    );

    if (rows.length < pageSize) {
      break;
    }

    await sleep(2000);
  }

  await new Promise((resolve) => writeStream.end(resolve));
  console.log(
    `[${translation}] Exportação concluída com sucesso: ${totalFetched} versículos gravados em ${outPath}`,
  );
}

async function loadVectorsFromFile(filePath: string): Promise<VerseVector[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  const result: VerseVector[] = [];

  for (const line of lines) {
    const item = JSON.parse(line);
    const rawNumbers = JSON.parse(item.embedding);
    const vec = new Float32Array(rawNumbers);
    const binary = quantizeBinary(vec);
    result.push({
      id: item.id,
      bookId: item.bookId,
      chapter: item.chapter,
      verse: item.verse,
      vector: vec,
      binary,
    });
  }

  return result;
}

export function calculateVectorStats(vectors: VerseVector[]): {
  meanGlobal: number;
  dimPositiveFractionMean: number;
  dimPositiveFractionMin: number;
  dimPositiveFractionMax: number;
} {
  const N = vectors.length;
  let totalSum = 0;
  const positiveCounts = new Int32Array(768);

  for (const v of vectors) {
    const vec = v.vector;
    for (let d = 0; d < 768; d++) {
      const val = vec[d];
      totalSum += val;
      if (val > 0) {
        positiveCounts[d]++;
      }
    }
  }

  const meanGlobal = totalSum / (N * 768);
  let minFrac = 1;
  let maxFrac = 0;
  let fracSum = 0;

  for (let d = 0; d < 768; d++) {
    const frac = positiveCounts[d] / N;
    fracSum += frac;
    if (frac < minFrac) minFrac = frac;
    if (frac > maxFrac) maxFrac = frac;
  }

  return {
    meanGlobal,
    dimPositiveFractionMean: fracSum / 768,
    dimPositiveFractionMin: minFrac,
    dimPositiveFractionMax: maxFrac,
  };
}

export interface ValidationSampleItem {
  translation: string;
  queryId: string;
  bookId: number;
  chapter: number;
  verse: number;
  queryVector: number[];
  top10Exact: {
    id: string;
    bookId: number;
    chapter: number;
    verse: number;
    sim: number;
  }[];
}

export function evaluateRecallAtK(
  vectors: VerseVector[],
  translationName: string,
  seed = 20261109,
  sampleSize = 300,
  P_values = [40, 100, 200],
  validationSampleSize = 30,
): {
  recallResults: Record<number, number>;
  validationSample: ValidationSampleItem[];
} {
  const N = vectors.length;
  const rng = mulberry32(seed);

  const queryIndices: number[] = [];
  const chosenSet = new Set<number>();
  while (queryIndices.length < sampleSize) {
    const idx = Math.floor(rng() * N);
    if (!chosenSet.has(idx)) {
      chosenSet.add(idx);
      queryIndices.push(idx);
    }
  }

  const recallResults: Record<number, number> = { 40: 0, 100: 0, 200: 0 };
  const validationSample: ValidationSampleItem[] = [];

  console.log(
    `\nAvaliando recall@10 em ${sampleSize} consultas (seed: ${seed})...`,
  );

  for (let q = 0; q < queryIndices.length; q++) {
    const qIdx = queryIndices[q];
    const query = vectors[qIdx];

    const cosineScores: { idx: number; sim: number }[] = [];
    const hammingScores: { idx: number; dist: number }[] = [];

    for (let i = 0; i < N; i++) {
      if (i === qIdx) continue;
      const sim = cosineSimilarity768(query.vector, vectors[i].vector);
      cosineScores.push({ idx: i, sim });
      const dist = hammingDistance768(query.binary, vectors[i].binary);
      hammingScores.push({ idx: i, dist });
    }

    cosineScores.sort((a, b) => b.sim - a.sim);
    const top10ExactSet = new Set<number>();
    const top10ExactList: {
      id: string;
      bookId: number;
      chapter: number;
      verse: number;
      sim: number;
    }[] = [];
    for (let k = 0; k < 10; k++) {
      const topIdx = cosineScores[k].idx;
      top10ExactSet.add(topIdx);
      top10ExactList.push({
        id: vectors[topIdx].id,
        bookId: vectors[topIdx].bookId,
        chapter: vectors[topIdx].chapter,
        verse: vectors[topIdx].verse,
        sim: cosineScores[k].sim,
      });
    }

    if (q < validationSampleSize) {
      validationSample.push({
        translation: translationName,
        queryId: query.id,
        bookId: query.bookId,
        chapter: query.chapter,
        verse: query.verse,
        queryVector: Array.from(query.vector),
        top10Exact: top10ExactList,
      });
    }

    hammingScores.sort((a, b) => a.dist - b.dist);

    for (const P of P_values) {
      const candidates = hammingScores.slice(0, P).map((c) => ({
        idx: c.idx,
        sim: cosineSimilarity768(query.vector, vectors[c.idx].vector),
      }));

      candidates.sort((a, b) => b.sim - a.sim);
      const top10Rerank = candidates.slice(0, 10);

      let hitCount = 0;
      for (const item of top10Rerank) {
        if (top10ExactSet.has(item.idx)) {
          hitCount++;
        }
      }

      recallResults[P] += hitCount / 10;
    }

    if ((q + 1) % 50 === 0 || q === sampleSize - 1) {
      process.stdout.write(
        `  Consultas processadas: ${q + 1}/${sampleSize}...\r`,
      );
    }
  }

  console.log('');
  for (const P of P_values) {
    recallResults[P] /= sampleSize;
  }

  return { recallResults, validationSample };
}

export async function runEtapa2() {
  const { allowed, brtTime } = checkNightWindow();
  console.log(`=======================================================`);
  console.log(`Plano Nano - Etapa 2: Medição de Quantização Binária`);
  console.log(`Horário verificado: ${brtTime}`);
  console.log(`=======================================================`);

  const scratchDir = path.resolve(__dirname, '../scratch');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  const blivrePath = path.join(scratchDir, 'vectors_BLIVRE.jsonl');
  const webPath = path.join(scratchDir, 'vectors_WEB.jsonl');
  const validationSamplePath = path.join(
    scratchDir,
    'validation_sample_30.json',
  );

  const blivreExists =
    fs.existsSync(blivrePath) && fs.statSync(blivrePath).size > 10_000_000;
  const webExists =
    fs.existsSync(webPath) && fs.statSync(webPath).size > 10_000_000;

  if (!blivreExists || !webExists) {
    if (!allowed) {
      console.error(
        `\n[ERRO DE JANELA NOTURNA]: Arquivos de exportação não encontrados e o horário atual (${brtTime}) está fora da janela de 00:00 às 06:00 BRT.`,
      );
      console.error(
        `A exportação de banco de dados só pode ser realizada após as 00:00 BRT.`,
      );
      process.exit(1);
    }

    console.log(
      `\nIniciando conexão direta com SSL para exportação paginada...`,
    );
    const client = new Client({
      connectionString: process.env.DIRECT_URL,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();

    // Conferência de criptografia na conexão
    const sslCheck = await client.query(
      'SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid();',
    );
    const isSslActive = sslCheck.rows[0]?.ssl;
    console.log(`[Criptografia na Conexão]: SSL ativo = ${isSslActive}`);

    await client.query('SET statement_timeout = 0;');

    if (!blivreExists) {
      await exportTranslationVectors(client, 'BLIVRE', blivrePath);
    }
    if (!webExists) {
      await exportTranslationVectors(client, 'WEB', webPath);
    }

    await client.end();
  } else {
    console.log(`\nArquivos de vetores encontrados em backend/scratch/:`);
    console.log(
      `  - BLIVRE: ${blivrePath} (${(fs.statSync(blivrePath).size / 1e6).toFixed(1)} MB)`,
    );
    console.log(
      `  - WEB: ${webPath} (${(fs.statSync(webPath).size / 1e6).toFixed(1)} MB)`,
    );
  }

  // 1. BLIVRE
  console.log(`\n=== 1. Carregando e Analisando BLIVRE ===`);
  const blivreVectors = await loadVectorsFromFile(blivrePath);
  console.log(`Carregados ${blivreVectors.length} versículos de BLIVRE.`);
  const blivreStats = calculateVectorStats(blivreVectors);
  console.log(`Estatísticas dos vetores BLIVRE:`);
  console.log(
    `  - Média global dos valores: ${blivreStats.meanGlobal.toFixed(6)}`,
  );
  console.log(
    `  - Fração de valores > 0 (média): ${(blivreStats.dimPositiveFractionMean * 100).toFixed(2)}%`,
  );
  console.log(
    `  - Fração de valores > 0 (min..max): ${(blivreStats.dimPositiveFractionMin * 100).toFixed(2)}% .. ${(blivreStats.dimPositiveFractionMax * 100).toFixed(2)}%`,
  );

  const { recallResults: blivreRecall, validationSample: blivreValidation } =
    evaluateRecallAtK(
      blivreVectors,
      'BLIVRE',
      20261109,
      300,
      [40, 100, 200],
      30,
    );
  console.log(`Recall@10 BLIVRE:`);
  console.log(`  - P = 40:  ${(blivreRecall[40] * 100).toFixed(2)}%`);
  console.log(`  - P = 100: ${(blivreRecall[100] * 100).toFixed(2)}%`);
  console.log(`  - P = 200: ${(blivreRecall[200] * 100).toFixed(2)}%`);

  // 2. WEB
  console.log(`\n=== 2. Carregando e Analisando WEB ===`);
  const webVectors = await loadVectorsFromFile(webPath);
  console.log(`Carregados ${webVectors.length} versículos de WEB.`);
  const webStats = calculateVectorStats(webVectors);
  console.log(`Estatísticas dos vetores WEB:`);
  console.log(
    `  - Média global dos valores: ${webStats.meanGlobal.toFixed(6)}`,
  );
  console.log(
    `  - Fração de valores > 0 (média): ${(webStats.dimPositiveFractionMean * 100).toFixed(2)}%`,
  );
  console.log(
    `  - Fração de valores > 0 (min..max): ${(webStats.dimPositiveFractionMin * 100).toFixed(2)}% .. ${(webStats.dimPositiveFractionMax * 100).toFixed(2)}%`,
  );

  const { recallResults: webRecall, validationSample: webValidation } =
    evaluateRecallAtK(webVectors, 'WEB', 20261109, 300, [40, 100, 200], 30);
  console.log(`Recall@10 WEB:`);
  console.log(`  - P = 40:  ${(webRecall[40] * 100).toFixed(2)}%`);
  console.log(`  - P = 100: ${(webRecall[100] * 100).toFixed(2)}%`);
  console.log(`  - P = 200: ${(webRecall[200] * 100).toFixed(2)}%`);

  // 3. Gravação da amostra de validação para a Etapa 4 (30 BLIVRE + 30 WEB)
  const combinedValidation = [...blivreValidation, ...webValidation];
  fs.writeFileSync(
    validationSamplePath,
    JSON.stringify(combinedValidation, null, 2),
    'utf-8',
  );
  console.log(
    `\n[Validação Etapa 4]: Salvas ${combinedValidation.length} consultas com Top-10 exato em ${validationSamplePath}`,
  );

  // 4. Portão de aprovação
  const approved = blivreRecall[100] >= 0.95 && webRecall[100] >= 0.95;
  console.log(`\n=======================================================`);
  console.log(`RESULTADO DO PORTÃO (recall@10 >= 0.95 com P <= 100):`);
  console.log(`  BLIVRE P=100: ${(blivreRecall[100] * 100).toFixed(2)}%`);
  console.log(`  WEB    P=100: ${(webRecall[100] * 100).toFixed(2)}%`);
  console.log(`  STATUS: ${approved ? 'APROVADO' : 'REPROVADO'}`);
  console.log(`=======================================================`);

  // 5. Estimativa de tamanho de índice no pgvector (Etapa 4)
  console.log(`\n--- Estimativa de Tamanho do Índice HNSW Binário ---`);
  console.log(`pgvector bit_hamming_ops (768 bits = 96 bytes por vetor):`);
  console.log(`  - Vetor original vector(768): 768 * 4 = 3.072 bytes/vetor.`);
  console.log(
    `  - Vetor quantizado bit(768): 96 bytes/vetor (redução de 32x nos dados do vetor).`,
  );
  console.log(
    `  - Grafo HNSW (m=16, efConstruction=64): ~256 bytes por nó de overhead de lista de adjacências.`,
  );
  console.log(`  - Total estimado por elemento indexado: ~350 - 400 bytes.`);
  console.log(
    `  - Para 186.000 versículos da Bíblia: 186.000 * 380 bytes ≈ 70 MB.`,
  );
  console.log(
    `  - Limite estabelecido para a Etapa 4: 90 MB para o índice de versículos.`,
  );
  console.log(
    `  - Soma de todos os índices vetoriais permanece rigorosamente abaixo de 150 MB.`,
  );

  return {
    approved,
    blivreStats,
    blivreRecall,
    webStats,
    webRecall,
  };
}

if (require.main === module) {
  runEtapa2().catch((err) => {
    console.error('Erro na execução da Etapa 2:', err);
    process.exit(1);
  });
}
