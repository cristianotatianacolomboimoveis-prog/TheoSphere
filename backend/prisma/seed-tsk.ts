/**
 * Seed do corpus TSK inicial.
 *
 *   • `npm run db:seed:tsk`        — popula ~30 versos curados (rápido, ~150 rows).
 *   • `npm run tsk:import [file]`  — importa o CSV completo do openbible.info
 *                                    (~340k rows; faz upsert para sobrescrever
 *                                    ranks dos curados com os do TSK oficial).
 *
 * Idempotente: usa upsert por (sourceRef, targetRef) — re-rodar é seguro.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { TSK_SEED } from '../src/bible/tsk-seed';

// Prisma 7 exige um driver adapter explícito no constructor — `new PrismaClient()`
// sem opções lança PrismaClientInitializationError e o seed nunca roda.
const connectionString =
  process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const totalSources = TSK_SEED.length;
  const totalRefs = TSK_SEED.reduce((acc, e) => acc + e.targets.length, 0);
  console.log(
    `🌱 Seeding TSK: ${totalSources} fontes → ${totalRefs} cross-refs…`,
  );

  let inserted = 0;
  let skipped = 0;

  for (const entry of TSK_SEED) {
    for (let i = 0; i < entry.targets.length; i++) {
      const target = entry.targets[i];
      try {
        await prisma.crossReference.upsert({
          where: {
            sourceRef_targetRef: {
              sourceRef: entry.source,
              targetRef: target,
            },
          },
          create: {
            sourceRef: entry.source,
            targetRef: target,
            // Posição na lista curada vira rank inicial (lower = better).
            // O import oficial sobrescreve com TSK rank quando disponível.
            rank: i + 1,
          },
          update: {},
        });
        inserted++;
      } catch (err) {
        skipped++;
        console.warn(
          `  ⚠️  ${entry.source} → ${target}: ${
            err instanceof Error ? err.message : 'unknown'
          }`,
        );
      }
    }
  }

  console.log(`✅ TSK seed completo. inserted=${inserted} skipped=${skipped}`);
}

main()
  .catch((err) => {
    console.error('❌ Seed TSK falhou:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
