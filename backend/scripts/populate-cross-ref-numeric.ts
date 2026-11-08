import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { parseRefToCanonical } from '../src/common/canonical-ref';

/**
 * 🔢 Script de Migração Idempotente de Referências Canônicas Numéricas (T1.3)
 * Popula sourceNumRef e targetNumRef (BBCCCVVV) na tabela CrossReference.
 *
 * Uso:
 *   npx tsx scripts/populate-cross-ref-numeric.ts
 *   npx tsx scripts/populate-cross-ref-numeric.ts --dry-run
 */

const connectionString =
  process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const BATCH_SIZE = 1000;

async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(
    '🏁 Iniciando migração de referências cruzadas para formato numérico (BBCCCVVV)...',
  );

  try {
    const totalCount = await prisma.crossReference.count();
    const pendingRows = await prisma.crossReference.findMany({
      where: {
        OR: [{ sourceNumRef: null }, { targetNumRef: null }],
      },
      select: { id: true, sourceRef: true, targetRef: true },
    });

    console.log(`📊 Total de CrossReferences: ${totalCount}`);
    console.log(`⏳ Pendentes de migração numérica: ${pendingRows.length}`);

    const unparseable = new Set<string>();
    const updates: Array<{
      id: string;
      sourceNum: number | null;
      targetNum: number | null;
    }> = [];

    for (const item of pendingRows) {
      const sourceNum = parseRefToCanonical(item.sourceRef);
      const targetNum = parseRefToCanonical(item.targetRef);
      if (!sourceNum) unparseable.add(`sourceRef="${item.sourceRef}"`);
      if (!targetNum) unparseable.add(`targetRef="${item.targetRef}"`);
      if (sourceNum || targetNum) {
        updates.push({ id: item.id, sourceNum, targetNum });
      }
    }

    if (unparseable.size > 0) {
      console.log(
        `⚠️ Referências não interpretadas (${unparseable.size}): ${Array.from(unparseable).slice(0, 20).join(', ')}`,
      );
    } else {
      console.log(`✅ 0 referências não interpretadas.`);
    }

    if (pendingRows.length === 0) {
      console.log(
        '✅ Todas as referências cruzadas já possuem colunas numéricas populadas.',
      );
      return;
    }

    if (isDryRun) {
      console.log(
        `✅ [DRY-RUN] Auditoria finalizada. Preenchíveis: ${updates.length}/${pendingRows.length}. Nenhuma alteração aplicada.`,
      );
      return;
    }

    console.log(`🚀 Atualizando ${updates.length} linhas em lotes de ${BATCH_SIZE}...`);
    let processed = 0;

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const slice = updates.slice(i, i + BATCH_SIZE);
      const valuesSql: string[] = [];
      const params: any[] = [];
      let pIdx = 1;

      for (const u of slice) {
        valuesSql.push(`($${pIdx++}::text, $${pIdx++}::int, $${pIdx++}::int)`);
        params.push(u.id, u.sourceNum, u.targetNum);
      }

      await (prisma as any).$executeRawUnsafe(
        `UPDATE "CrossReference" AS cr
            SET "sourceNumRef" = COALESCE(v.src_num, cr."sourceNumRef"),
                "targetNumRef" = COALESCE(v.tgt_num, cr."targetNumRef")
           FROM (VALUES ${valuesSql.join(', ')}) AS v(id, src_num, tgt_num)
          WHERE cr.id = v.id;`,
        ...params,
      );

      processed += slice.length;
      process.stdout.write(`\r💾 Progresso: ${processed}/${updates.length}...`);
    }

    const finalFilled = await prisma.crossReference.count({
      where: {
        sourceNumRef: { not: null },
        targetNumRef: { not: null },
      },
    });

    console.log(
      `\n🎉 Migração concluída! Preenchidas: ${finalFilled} / ${totalCount} (Não interpretadas: ${unparseable.size})`,
    );
  } catch (err: any) {
    if (
      err?.message?.includes('25006') ||
      err?.message?.includes('read-only transaction')
    ) {
      console.warn(
        '\n⚠️ AVISO: O banco está em modo READ-ONLY. As colunas numéricas foram adicionadas ao schema e o código opera com degradação/compatibilidade retroativa.',
      );
    } else {
      throw err;
    }
  }
}

run()
  .catch((err) => {
    console.error('❌ Erro:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
