import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Verificação rápida pós-seed: contagens de versículos e do acervo.
const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? '' });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const rows = await prisma.$queryRaw<{ translation: string; n: bigint }[]>`
    SELECT translation, COUNT(*) AS n FROM "BibleVerse"
    WHERE translation IN ('BLIVRE','NVA') GROUP BY translation`;
  for (const r of rows) console.log(`${r.translation}: ${r.n} versículos`);
  const arch = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*) AS n FROM "ArchaeologicalFind"`;
  console.log(`Acervo arqueológico: ${arch[0].n} descobertas`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
