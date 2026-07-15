import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

/**
 * Seed do interlinear palavra-a-palavra.
 * Fonte: STEP Bible TAGNT (Tyndale House, CC BY 4.0) — NT grego, ~141k palavras.
 * Arquivo: prisma/data/interlinear-nt.json.gz
 *   { fields: [...], words: [[bookId,ch,v,pos,word,translit,gloss,strongId,morph,lemma,lemmaGloss,glossEs], ...] }
 *
 * Uso: npm run db:seed:interlinear
 * Idempotente: createMany com skipDuplicates (unique bookId+chapter+verse+position).
 * Duração esperada: 2-4 min (141k linhas em lotes de 5k).
 */

const connectionString = process.env.DATABASE_URL ?? '';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const BATCH = 5000;

type Row = [
  number,
  number,
  number,
  number,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

async function seedFile(fileName: string) {
  const filePath = path.join(__dirname, 'data', fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`[seed] Arquivo não encontrado, pulando: ${fileName}`);
    return;
  }
  const payload = JSON.parse(
    zlib.gunzipSync(fs.readFileSync(filePath)).toString('utf-8'),
  ) as { source: string; words: Row[] };

  console.log(
    `[seed] Interlinear: ${payload.words.length} palavras (${payload.source})`,
  );

  let inserted = 0;
  for (let i = 0; i < payload.words.length; i += BATCH) {
    const batch = payload.words.slice(i, i + BATCH).map((r) => ({
      bookId: r[0],
      chapter: r[1],
      verse: r[2],
      position: r[3],
      word: r[4],
      translit: r[5],
      gloss: r[6],
      strongId: r[7],
      morph: r[8] || null,
      lemma: r[9] || null,
      lemmaGloss: r[10] || null,
      glossEs: r[11] || null,
    }));
    const res = await prisma.interlinearWord.createMany({
      data: batch,
      skipDuplicates: true,
    });
    inserted += res.count;
    console.log(
      `[seed] ${Math.min(i + BATCH, payload.words.length)}/${payload.words.length}...`,
    );
  }
  console.log(`[seed] ${fileName}: concluído — ${inserted} novas palavras.`);
}

async function main() {
  const existing = await prisma.interlinearWord.count();
  console.log(`[seed] Já no banco: ${existing}`);
  await seedFile('interlinear-nt.json.gz'); // TAGNT — NT grego
  await seedFile('interlinear-ot.json.gz'); // TAHOT — AT hebraico
  const total = await prisma.interlinearWord.count();
  console.log(`[seed] Total no banco: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
