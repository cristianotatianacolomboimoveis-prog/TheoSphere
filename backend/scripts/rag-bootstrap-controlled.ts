/**
 * TheoSphere — Povoamento controlado de embeddings.
 *
 * Alternativa segura ao `scripts/full-rag-bootstrap.ts` (que dispara 5
 * traduções × 32.000 versículos numa única passada — o mesmo padrão que
 * estourou o teto de gastos do Gemini em 2026-07-29, documentado no
 * AGENTS.md §7).
 *
 * Este script recebe --translation e --limit, faz DRY-RUN por padrão para
 * medir custo antes de gastar, checa /health/ai a cada N versículos, e
 * para no primeiro sinal de degradação.
 *
 * Uso:
 *   # 1. Estimativa (não gasta cota, só conta o backlog):
 *   npx tsx scripts/rag-bootstrap-controlled.ts --translation=KJV --dry-run
 *
 *   # 2. Lote pequeno para medir custo real por versículo:
 *   npx tsx scripts/rag-bootstrap-controlled.ts --translation=KJV --limit=50
 *
 *   # 3. Lote grande (executa até o limite ou até health degradar):
 *   npx tsx scripts/rag-bootstrap-controlled.ts --translation=KJV --limit=5000
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { EmbeddingService } from '../src/rag/embedding.service';

const HEALTH_CHECK_URL = 'http://localhost:3002/api/v1/health/ai';
const HEALTH_CHECK_EVERY = 200; // versículos entre health-checks

interface Args {
  translation: string;
  limit: number;
  dryRun: boolean;
}

function parseArgs(): Args {
  const out: Args = { translation: '', limit: 100, dryRun: false };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--translation='))
      out.translation = arg.slice(14).toUpperCase();
    else if (arg.startsWith('--limit=')) out.limit = parseInt(arg.slice(8), 10);
    else if (arg === '--dry-run') out.dryRun = true;
  }
  if (!out.translation) {
    console.error('Uso: --translation=KJV [--limit=100] [--dry-run]');
    process.exit(1);
  }
  return out;
}

async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(HEALTH_CHECK_URL);
    const data = (await res.json()) as {
      status?: string;
      lastFailure?: unknown;
    };
    if (data.status !== 'ok') {
      console.warn(`⚠️  /health/ai status = ${data.status}; parando.`);
      return false;
    }
    if (data.lastFailure) {
      console.warn(
        `⚠️  /health/ai lastFailure = ${JSON.stringify(data.lastFailure)}; parando.`,
      );
      return false;
    }
    return true;
  } catch (err) {
    console.warn(
      `⚠️  /health/ai inacessível: ${(err as Error).message}. Seguindo sem check.`,
    );
    return true; // Não bloquear se o backend não está rodando local
  }
}

async function main() {
  const args = parseArgs();
  console.log(
    `🔧 tradução=${args.translation} limit=${args.limit} dryRun=${args.dryRun}`,
  );

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const embeddings = app.get(EmbeddingService);

  // Contagens antes
  const [comEmbedding, total] = await Promise.all([
    prisma.bibleVerse.count({
      where: {
        translation: args.translation,
        embedding: { not: null } as never,
      },
    }),
    prisma.bibleVerse.count({ where: { translation: args.translation } }),
  ]);
  const backlog = total - comEmbedding;
  console.log(
    `📊 estado atual: ${comEmbedding.toLocaleString()}/${total.toLocaleString()} ` +
      `(${((comEmbedding / total) * 100).toFixed(2)}%)`,
  );
  console.log(
    `📊 backlog: ${backlog.toLocaleString()} versículos sem embedding`,
  );

  if (args.dryRun) {
    console.log(
      `🏁 dry-run: nada foi gerado. Passe --limit=<N> para executar.`,
    );
    await app.close();
    return;
  }

  if (backlog === 0) {
    console.log(`✅ ${args.translation} já está 100% povoada. Nada a fazer.`);
    await app.close();
    return;
  }

  const target = Math.min(args.limit, backlog);
  console.log(`🚀 gerando ${target.toLocaleString()} embeddings...`);

  // Pega N versículos sem embedding, em ordem canônica (bookId, chapter, verse)
  const rows = await prisma.bibleVerse.findMany({
    where: { translation: args.translation, embedding: null },
    orderBy: [{ bookId: 'asc' }, { chapter: 'asc' }, { verse: 'asc' }],
    take: target,
    select: { id: true, text: true },
  });

  const started = Date.now();
  let done = 0;
  let failed = 0;
  const timings: number[] = [];

  for (const row of rows) {
    if (done > 0 && done % HEALTH_CHECK_EVERY === 0) {
      const healthy = await checkHealth();
      if (!healthy) {
        console.warn(
          `⛔ health degradou após ${done} versículos. Parando antes do limite.`,
        );
        break;
      }
    }

    const t0 = Date.now();
    try {
      const vec = await embeddings.createEmbedding(row.text);
      const literal = `[${vec.map((n) => (Number.isFinite(n) ? n : 0)).join(',')}]`;
      await prisma.$executeRawUnsafe(
        `UPDATE "BibleVerse" SET embedding = '${literal}'::vector WHERE id = $1`,
        row.id,
      );
      done += 1;
      timings.push(Date.now() - t0);
      if (done % 50 === 0) {
        const p50 = timings.slice().sort((a, b) => a - b)[
          Math.floor(timings.length / 2)
        ];
        const elapsed = ((Date.now() - started) / 1000).toFixed(1);
        console.log(
          `  progresso: ${done}/${target} (${((done / target) * 100).toFixed(1)}%) ` +
            `p50=${p50}ms/verso, elapsed=${elapsed}s`,
        );
      }
    } catch (err) {
      failed += 1;
      console.warn(`  ❌ ${row.id}: ${(err as Error).message}`);
      if (failed > 10) {
        console.warn(`⛔ mais de 10 falhas seguidas. Parando.`);
        break;
      }
    }
  }

  const totalTime = ((Date.now() - started) / 1000).toFixed(1);
  const avgMs = timings.length
    ? (timings.reduce((a, b) => a + b) / timings.length).toFixed(0)
    : '?';
  console.log(
    `\n🏁 concluído: ${done} sucesso, ${failed} falha, ${totalTime}s, avg ${avgMs}ms/verso`,
  );
  console.log(
    `📈 se o backlog inteiro de ${backlog} rodar nesse ritmo: ` +
      `~${((backlog * Number(avgMs)) / 1000 / 60).toFixed(1)} minutos`,
  );

  await app.close();
}

main().catch((err) => {
  console.error('❌ erro fatal:', err);
  process.exit(1);
});
