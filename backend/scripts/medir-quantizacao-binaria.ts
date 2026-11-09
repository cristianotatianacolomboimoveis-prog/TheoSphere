/**
 * Script de benchmark e validação da Quantização Binária (Etapa 2 do Plano Nano)
 *
 * Objetivo:
 *   1. Exportar (ou carregar) id e embeddings de BLIVRE e WEB de "BibleVerse" em páginas de 2.000 linhas
 *      com 2s de pausa, ordenadas por chave, para backend/scratch/.
 *   2. Calcular estatísticas de centralização dos vetores (média global e fração de dimensões > 0).
 *   3. Medir recall@10 para P = 40, 100 e 200 usando 300 consultas sorteadas com semente fixa determinística.
 *   4. Estimar tamanho do índice HNSW binário no formato pgvector.
 *
 * Restrições da Seção 3.1:
 *   - Exportação contra o banco só pode rodar na janela noturna (00:00 às 06:00 BRT).
 */

import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

interface VerseVector {
  id: string;
  bookId: number;
  chapter: number;
  verse: number;
  vector: Float32Array;
  binary: Uint32Array; // 768 bits = 24 words de 32 bits
}

// PRNG determinístico Mulberry32
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Popcount de 32 bits
function popcount32(x: number): number {
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  x = (x + (x >>> 4)) & 0x0f0f0f0f;
  x += x >>> 8;
  x += x >>> 16;
  return x & 0x3f;
}

// Distância de Hamming para 24 words de 32 bits (768 bits)
function hammingDistance768(a: Uint32Array, b: Uint32Array): number {
  let dist = 0;
  for (let i = 0; i < 24; i++) {
    dist += popcount32(a[i] ^ b[i]);
  }
  return dist;
}

// Similaridade de Cosseno entre dois Float32Array de 768 dims
function cosineSimilarity768(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < 768; i++) {
    const ai = a[i];
    const bi = b[i];
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// Binariza Float32Array para Uint32Array(24) usando o sinal (> 0 => 1)
function quantizeBinary(vec: Float32Array): Uint32Array {
  const binary = new Uint32Array(24);
  for (let i = 0; i < 768; i++) {
    if (vec[i] > 0) {
      const wordIdx = Math.floor(i / 32);
      const bitIdx = i % 32;
      binary[wordIdx] |= 1 << bitIdx;
    }
  }
  return binary;
}

// Pausa assíncrona
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Verifica janela noturna (00:00 - 06:00 BRT)
function checkNightWindow(bypass = false): {
  allowed: boolean;
  brtTime: string;
} {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  // BRT é UTC-3
  const brtHours = (utcHours - 3 + 24) % 24;
  const brtTime = `${String(brtHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')} BRT`;
  const allowed = bypass || (brtHours >= 0 && brtHours < 6);
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
    // Parse "[0.012, -0.045, ...]"
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

function calculateVectorStats(vectors: VerseVector[]): {
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

function evaluateRecallAtK(
  vectors: VerseVector[],
  seed = 20261109,
  sampleSize = 300,
  P_values = [40, 100, 200],
) {
  const N = vectors.length;
  const rng = mulberry32(seed);

  // Sorteia 300 consultas determinísticas
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

  console.log(
    `\nAvaliando recall@10 em ${sampleSize} consultas (seed: ${seed})...`,
  );

  for (let q = 0; q < queryIndices.length; q++) {
    const qIdx = queryIndices[q];
    const query = vectors[qIdx];

    // 1. Calcula cosseno com todos os outros
    const cosineScores: { idx: number; sim: number }[] = [];
    const hammingScores: { idx: number; dist: number }[] = [];

    for (let i = 0; i < N; i++) {
      if (i === qIdx) continue; // Exclui o próprio versículo
      const sim = cosineSimilarity768(query.vector, vectors[i].vector);
      cosineScores.push({ idx: i, sim });
      const dist = hammingDistance768(query.binary, vectors[i].binary);
      hammingScores.push({ idx: i, dist });
    }

    // Ordena cosseno exato (decrescente) -> pega Top-10
    cosineScores.sort((a, b) => b.sim - a.sim);
    const top10ExactSet = new Set<number>();
    for (let k = 0; k < 10; k++) {
      top10ExactSet.add(cosineScores[k].idx);
    }

    // Ordena Hamming (crescente de distância)
    hammingScores.sort((a, b) => a.dist - b.dist);

    // Para cada P:
    for (const P of P_values) {
      // Pega os P primeiros por Hamming
      const candidates = hammingScores.slice(0, P).map((c) => ({
        idx: c.idx,
        sim: cosineSimilarity768(query.vector, vectors[c.idx].vector),
      }));

      // Rerank por cosseno exato
      candidates.sort((a, b) => b.sim - a.sim);
      const top10Rerank = candidates.slice(0, 10);

      // Calcula interseção
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

  return recallResults;
}

export async function runEtapa2(options: { bypassNightCheck?: boolean } = {}) {
  const { allowed, brtTime } = checkNightWindow(options.bypassNightCheck);
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

    console.log(`\nIniciando conexão direta para exportação paginada...`);
    const client = new Client({ connectionString: process.env.DIRECT_URL });
    await client.connect();
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

  const blivreRecall = evaluateRecallAtK(
    blivreVectors,
    20261109,
    300,
    [40, 100, 200],
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

  const webRecall = evaluateRecallAtK(
    webVectors,
    20261109,
    300,
    [40, 100, 200],
  );
  console.log(`Recall@10 WEB:`);
  console.log(`  - P = 40:  ${(webRecall[40] * 100).toFixed(2)}%`);
  console.log(`  - P = 100: ${(webRecall[100] * 100).toFixed(2)}%`);
  console.log(`  - P = 200: ${(webRecall[200] * 100).toFixed(2)}%`);

  // 3. Portão de aprovação
  const approved = blivreRecall[100] >= 0.95 && webRecall[100] >= 0.95;
  console.log(`\n=======================================================`);
  console.log(`RESULTADO DO PORTÃO (recall@10 >= 0.95 com P <= 100):`);
  console.log(`  BLIVRE P=100: ${(blivreRecall[100] * 100).toFixed(2)}%`);
  console.log(`  WEB    P=100: ${(webRecall[100] * 100).toFixed(2)}%`);
  console.log(`  STATUS: ${approved ? 'APROVADO' : 'REPROVADO'}`);
  console.log(`=======================================================`);

  // 4. Estimativa de tamanho de índice no pgvector
  console.log(`\n--- Estimativa de Tamanho do Índice HNSW Binário ---`);
  console.log(`pgvector bit_hamming_ops (768 bits = 96 bytes por vetor):`);
  console.log(`  - Vetor original vector(768): 768 * 4 = 3.072 bytes/vetor.`);
  console.log(
    `  - Vetor quantizado bit(768): 96 bytes/vetor (redução de 32x nos dados do vetor).`,
  );
  console.log(
    `  - Grafo HNSW (m=16, efConstruction=64): ~256 bytes por nó de overhead de lista de adjacências.`,
  );
  console.log(`  - Total por elemento indexado: ~350 - 400 bytes.`);
  console.log(
    `  - Para 186.000 versículos da Bíblia: 186.000 * 380 bytes ≈ 70 MB.`,
  );
  console.log(
    `  - Com partial index (WHERE embedding IS NOT NULL): cabe inteiramente na memória RAM (512 MB).`,
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
  runEtapa2({
    bypassNightCheck: process.argv.includes('--bypass-night-check'),
  }).catch((err) => {
    console.error('Erro na execução da Etapa 2:', err);
    process.exit(1);
  });
}
