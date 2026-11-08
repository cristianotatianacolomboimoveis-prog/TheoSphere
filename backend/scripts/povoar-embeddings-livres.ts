import 'dotenv/config';
import { PrismaService } from '../src/prisma.service';
import {
  EmbeddingService,
  assertPersistedBatchEmbeddings,
  PersistedBatchEmbeddings,
} from '../src/rag/embedding.service';

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

async function checkProductionAiHealth(
  scriptStartedAtIso: string,
): Promise<{ degradedByQuota: boolean; rawStatus: string }> {
  try {
    const res = await fetch('https://theosphere.onrender.com/api/v1/health/ai', {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return { degradedByQuota: false, rawStatus: `HTTP_${res.status}` };
    }
    const body = (await res.json()) as {
      status?: string;
      lastFailure?: { message?: string; at?: string };
    };
    const lastAt = body.lastFailure?.at ?? '';
    const lastMsg = (body.lastFailure?.message ?? '').toLowerCase();
    const isNewFailure = lastAt > scriptStartedAtIso;
    const isQuotaFailure =
      isNewFailure &&
      (lastMsg.includes('429') ||
        lastMsg.includes('quota') ||
        lastMsg.includes('resource_exhausted'));
    return {
      degradedByQuota: isQuotaFailure,
      rawStatus: `${body.status ?? 'unknown'}${isNewFailure ? ` (lastFailure at ${lastAt})` : ''}`,
    };
  } catch {
    return { degradedByQuota: false, rawStatus: 'unreachable' };
  }
}

async function run() {
  const rawTargets = (process.argv[2] || 'KJV')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
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

  for (const t of rawTargets) {
    if (!ALLOWED_FREE.has(t)) {
      console.error(
        `❌ Erro: A tradução '${t}' não pertence à lista de versões livres autorizadas: ${[...ALLOWED_FREE].join(', ')}`,
      );
      process.exit(1);
    }
  }

  const scriptStartedAtIso = new Date().toISOString();
  if (process.env.DIRECT_URL) {
    const directUrl = new URL(process.env.DIRECT_URL);
    directUrl.searchParams.set(
      'options',
      '-c statement_timeout=0 -c synchronous_commit=off',
    );
    process.env.DATABASE_URL = directUrl.toString();
  }
  console.log(
    `🌟 [POVOAMENTO SEGURO] Inicializando Prisma e EmbeddingService para [${rawTargets.join(' -> ')}]...`,
  );
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  const embeddingService = new EmbeddingService();

  const BATCH_SIZE = parseInt(process.env.EMBED_BATCH_SIZE || '100', 10);
  let delayBetweenBatchesMs = parseInt(
    process.env.EMBED_DELAY_MS || '400',
    10,
  );

  for (const targetTranslation of rawTargets) {
    console.log(
      `\n🔍 Buscando versículos sem embedding para a versão '${targetTranslation}' (Limite: ${maxLimit})...`,
    );

    const verses = await prisma.$queryRaw<Array<{ id: string; text: string }>>`
      SELECT id, text
      FROM "BibleVerse"
      WHERE translation = ${targetTranslation}
        AND embedding IS NULL
      ORDER BY "bookId" ASC, chapter ASC, verse ASC
      LIMIT ${maxLimit}
    `;

    console.log(
      `📊 [${targetTranslation}] Encontrados ${verses.length} versículos pendentes.`,
    );

    if (verses.length === 0) {
      console.log(
        `✅ A tradução '${targetTranslation}' já está 100% povoada com embeddings!`,
      );
      continue;
    }

    let totalProcessed = 0;
    let errorCount = 0;
    let rateLimit429Count = 0;
    const startedAt = Date.now();
    const pendingDbWrites: Promise<void>[] = [];

    for (let i = 0; i < verses.length; i += BATCH_SIZE) {
      const batch = verses.slice(i, i + BATCH_SIZE);
      const texts = batch.map((v) => v.text);

      let embeddings: PersistedBatchEmbeddings | null = null;
      let retries = 0;
      const MAX_RETRIES = 4;

      while (retries <= MAX_RETRIES && !embeddings) {
        try {
          embeddings = await embeddingService.createBatchEmbeddings(texts);
          // Guarda inegociável T0.2 / B1: aborta imediatamente se o provedor ou dimensão divergir
          assertPersistedBatchEmbeddings(embeddings, batch.length);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.startsWith('Guarda de espaço vetorial:')) {
            console.error(`🛑 ABORTO DE SEGURANÇA (T0.2/B1): ${msg}`);
            await Promise.allSettled(pendingDbWrites);
            await prisma.onModuleDestroy();
            await embeddingService.onModuleDestroy();
            process.exit(1);
          }
          if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
            rateLimit429Count++;
            delayBetweenBatchesMs = Math.min(delayBetweenBatchesMs + 500, 5000);
          }
          retries++;
          console.warn(
            `⚠️ Warning: Falha no lote [${targetTranslation}] em i=${i} (Tentativa ${retries}/${MAX_RETRIES}): ${msg}`,
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
        assertPersistedBatchEmbeddings(embeddings, batch.length);
        const providerTag = `${embeddings.provider}:${embeddings.model}:${embeddings.dimensions}`;
        const batchLen = batch.length;
        const batchOffset = i;

        if (pendingDbWrites.length >= 2) {
          await pendingDbWrites.shift();
        }

        const writePromise = (async () => {
          const DB_SUB_CHUNK = 25;
          for (let sub = 0; sub < batch.length; sub += DB_SUB_CHUNK) {
            const subSlice = batch.slice(sub, sub + DB_SUB_CHUNK);
            const subEmbs = embeddings.slice(sub, sub + DB_SUB_CHUNK);
            const ids = subSlice.map((v) => v.id);
            const embStrings = subEmbs.map((e) => JSON.stringify(e));

            let dbSaved = false;
            for (let dbTry = 1; dbTry <= 5 && !dbSaved; dbTry++) {
              try {
                await prisma.$executeRawUnsafe(`
                  UPDATE "BibleVerse" AS bv
                  SET embedding = v.embedding::vector
                  FROM (
                    SELECT unnest($1::text[]) AS id,
                           unnest($2::text[]) AS embedding
                  ) AS v
                  WHERE bv.id = v.id
                `, ids, embStrings);
                dbSaved = true;
                totalProcessed += subSlice.length;
              } catch (dbErr) {
                if (dbTry === 5) {
                  errorCount++;
                  console.error(
                    `❌ Erro ao salvar embeddings no banco (lote i=${batchOffset + sub}):`,
                    dbErr,
                  );
                } else {
                  await sleep(dbTry * 3000);
                }
              }
            }
          }

          const elapsedSec = (Date.now() - startedAt) / 1000;
          const ratePerMin =
            elapsedSec > 0 ? Math.round((totalProcessed / elapsedSec) * 60) : 0;

          if (
            totalProcessed % 200 === 0 ||
            batchOffset + batchLen >= verses.length
          ) {
            console.log(
              `🚀 Progresso [${targetTranslation}]: ${totalProcessed}/${verses.length} (${ratePerMin} vv/min | 429s: ${rateLimit429Count} | provider=${providerTag}).`,
            );
          }
        })();

        pendingDbWrites.push(writePromise);

        // A cada 2000 versículos enfileirados, aguarda escritas e verifica /api/v1/health/ai em produção (regra B3)
        if ((i + batchLen) % 2000 === 0) {
          await Promise.all(pendingDbWrites);
          pendingDbWrites.length = 0;
          const health = await checkProductionAiHealth(scriptStartedAtIso);
          console.log(
            `🩺 [Health Check Produção] /api/v1/health/ai => ${health.rawStatus}`,
          );
          if (health.degradedByQuota) {
            delayBetweenBatchesMs = Math.min(
              delayBetweenBatchesMs + 1000,
              5000,
            );
            console.warn(
              `⏸️ Detectado alerta de cota no /health/ai de produção! Pausando 30s e elevando delay para ${delayBetweenBatchesMs}ms...`,
            );
            await sleep(30000);
          }
        }
      }

      await sleep(delayBetweenBatchesMs);
    }

    await Promise.all(pendingDbWrites);
    pendingDbWrites.length = 0;

    const totalElapsedSec = ((Date.now() - startedAt) / 1000).toFixed(2);
    const finalRatePerMin =
      Number(totalElapsedSec) > 0
        ? Math.round((totalProcessed / Number(totalElapsedSec)) * 60)
        : 0;
    console.log(`\n🎉 Resumo do Povoamento para '${targetTranslation}':`);
    console.log(`   - Versículos salvos nesta rodada: ${totalProcessed}`);
    console.log(
      `   - Tempo total: ${totalElapsedSec}s (${finalRatePerMin} versículos/min)`,
    );
    console.log(`   - Ocorrências HTTP 429: ${rateLimit429Count}`);
    console.log(`   - Lotes com erro: ${errorCount}`);

    const healthAfter = await checkProductionAiHealth(scriptStartedAtIso);
    console.log(
      `🩺 [Health Check Pós-${targetTranslation}] /api/v1/health/ai => ${healthAfter.rawStatus}`,
    );
  }

  await prisma.onModuleDestroy();
  await embeddingService.onModuleDestroy();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Erro fatal no povoamento:', err);
  process.exit(1);
});
