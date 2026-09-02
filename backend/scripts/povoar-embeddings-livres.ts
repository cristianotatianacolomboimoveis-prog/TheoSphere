import 'dotenv/config';
import { PrismaService } from '../src/prisma.service';
import { EmbeddingService } from '../src/rag/embedding.service';

/**
 * 🚀 Povoamento Seguro de Embeddings para Traduções Livres
 *
 * Processa versículos livres em lotes pequenos com desaceleração (throttle)
 * e retentativa em caso de limite de requisição (HTTP 429).
 *
 * Uso:
 *   npx tsx scripts/povoar-embeddings-livres.ts [VERSAO] [LIMIT]
 * Exemplo:
 *   npx tsx scripts/povoar-embeddings-livres.ts KJV 1000
 */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const targetTranslation = (process.argv[2] || 'KJV').toUpperCase();
  const maxLimit = parseInt(process.argv[3] || '5000', 10);

  const ALLOWED_FREE = new Set([
    'BLIVRE',
    'NVA',
    'KJV',
    'WEB',
    'WLC',
    'LXX',
    'TR',
  ]);

  if (!ALLOWED_FREE.has(targetTranslation)) {
    console.error(
      `❌ Erro: A tradução '${targetTranslation}' não pertence à lista de versões livres autorizadas: ${[...ALLOWED_FREE].join(', ')}`,
    );
    process.exit(1);
  }

  console.log(
    `🌟 [POVOAMENTO SEGURO] Inicializando Prisma e EmbeddingService...`,
  );
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  const embeddingService = new EmbeddingService();

  console.log(
    `🔍 Buscando versículos sem embedding para a versão '${targetTranslation}' (Limite: ${maxLimit})...`,
  );

  const verses = await prisma.$queryRaw<Array<{ id: string; text: string }>>`
    SELECT id, text
    FROM "BibleVerse"
    WHERE translation = ${targetTranslation}
      AND embedding IS NULL
    LIMIT ${maxLimit}
  `;

  console.log(`📊 Encontrados ${verses.length} versículos pendentes.`);

  if (verses.length === 0) {
    console.log(
      `✅ A tradução '${targetTranslation}' já está 100% povoada com embeddings!`,
    );
    await prisma.onModuleDestroy();
    return;
  }

  const BATCH_SIZE = 20; // 20 versículos por lote
  const DELAY_BETWEEN_BATCHES_MS = 300; // 300ms de pausa para não estourar a cota da API
  let totalProcessed = 0;
  let errorCount = 0;

  for (let i = 0; i < verses.length; i += BATCH_SIZE) {
    const batch = verses.slice(i, i + BATCH_SIZE);
    const texts = batch.map((v) => v.text);

    let embeddings: number[][] | null = null;
    let retries = 0;
    const MAX_RETRIES = 3;

    while (retries <= MAX_RETRIES && !embeddings) {
      try {
        embeddings = await embeddingService.createBatchEmbeddings(texts);
      } catch (err) {
        retries++;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(
          `⚠️ Warning: Falha no lote em i=${i} (Tentativa ${retries}/${MAX_RETRIES}): ${msg}`,
        );
        if (retries <= MAX_RETRIES) {
          const waitTime = retries * 5000;
          console.log(
            `⏳ Aguardando ${waitTime / 1000}s antes de tentar novamente...`,
          );
          await sleep(waitTime);
        } else {
          console.error(
            `❌ Excedido limite de retentativas para o lote em i=${i}. Pulando...`,
          );
          errorCount++;
        }
      }
    }

    if (embeddings && embeddings.length === batch.length) {
      const ids = batch.map((v) => v.id);
      const embStrings = embeddings.map((e) => JSON.stringify(e));

      try {
        await prisma.$executeRaw`
          UPDATE "BibleVerse" AS bv
          SET embedding = v.embedding::vector
          FROM (
            SELECT unnest(${ids}::text[]) AS id,
                   unnest(${embStrings}::text[]) AS embedding
          ) AS v
          WHERE bv.id = v.id
        `;
        totalProcessed += batch.length;
        console.log(
          `🚀 Progresso [${targetTranslation}]: ${i + batch.length}/${verses.length} versículos processados (${totalProcessed} salvos no banco).`,
        );
      } catch (dbErr) {
        console.error(
          `❌ Erro ao salvar embeddings no banco (lote i=${i}):`,
          dbErr,
        );
      }
    }

    // Delay consciente entre requisições de batch para respeitar a cota da API
    await sleep(DELAY_BETWEEN_BATCHES_MS);
  }

  console.log(`\n🎉 Resumo do Povoamento para '${targetTranslation}':`);
  console.log(`   - Versículos salvos nesta rodada: ${totalProcessed}`);
  console.log(`   - Lotes com erro: ${errorCount}`);

  await prisma.onModuleDestroy();
  await embeddingService.onModuleDestroy();
}

run().catch((err) => {
  console.error('❌ Erro fatal no povoamento:', err);
  process.exit(1);
});
