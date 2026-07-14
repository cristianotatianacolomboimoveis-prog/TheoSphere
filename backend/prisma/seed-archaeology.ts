import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Seed do acervo arqueológico (prisma/data/archaeology.json).
 * Descobertas curadas relacionadas ao mundo bíblico — fatos de fontes
 * abertas, descrições originais em PT-BR.
 *
 * Uso: npm run db:seed:archaeology
 * Idempotente: upsert por slug (re-rodar atualiza descrições sem duplicar).
 */

const connectionString = process.env.DATABASE_URL ?? '';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface FindEntry {
  slug: string;
  namePt: string;
  nameEn?: string | null;
  category: string;
  discoveryYear?: number | null;
  discoverySite: string;
  currentLocation?: string | null;
  period?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description: string;
  significance: string;
  authenticity: string;
  relatedRefs: string[];
  externalUrl?: string | null;
}

async function main() {
  const filePath = path.join(__dirname, 'data', 'archaeology.json');
  const finds = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as FindEntry[];
  console.log(
    `[seed] Acervo arqueológico: ${finds.length} registros no arquivo.`,
  );

  let count = 0;
  for (const f of finds) {
    await prisma.archaeologicalFind.upsert({
      where: { slug: f.slug },
      update: { ...f },
      create: { ...f },
    });
    count++;
  }
  console.log(
    `[seed] Acervo arqueológico: ${count} registros inseridos/atualizados.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
