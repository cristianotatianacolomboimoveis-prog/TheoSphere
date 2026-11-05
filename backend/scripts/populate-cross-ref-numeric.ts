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
  process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '';
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
    const pendingCount = await prisma.crossReference.count({
      where: {
        OR: [{ sourceNumRef: null }, { targetNumRef: null }],
      },
    });

    console.log(`📊 Total de CrossReferences: ${totalCount}`);
    console.log(`⏳ Pendentes de migração numérica: ${pendingCount}`);

    if (pendingCount === 0) {
      console.log(
        '✅ Todas as referências cruzadas já possuem colunas numéricas populadas.',
      );
      return;
    }

    if (isDryRun) {
      console.log(
        '✅ [DRY-RUN] Auditoria finalizada. Nenhuma alteração aplicada.',
      );
      return;
    }

    console.log('🚀 Processando em lotes de 1.000...');
    let processed = 0;

    while (true) {
      const batch = await prisma.crossReference.findMany({
        where: {
          OR: [{ sourceNumRef: null }, { targetNumRef: null }],
        },
        take: BATCH_SIZE,
        select: { id: true, sourceRef: true, targetRef: true },
      });

      if (batch.length === 0) break;

      for (const item of batch) {
        const sourceNum = parseRefToCanonical(item.sourceRef);
        const targetNum = parseRefToCanonical(item.targetRef);

        if (sourceNum || targetNum) {
          await prisma.crossReference.update({
            where: { id: item.id },
            data: {
              sourceNumRef: sourceNum || undefined,
              targetNumRef: targetNum || undefined,
            },
          });
        }
      }

      processed += batch.length;
      process.stdout.write(`\r💾 Progresso: ${processed}/${pendingCount}...`);
    }

    console.log(
      `\n🎉 Migração concluída com sucesso! Processados: ${processed}`,
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
  .finally(() => prisma.$disconnect());
