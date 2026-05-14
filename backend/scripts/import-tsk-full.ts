/**
 * Importa o dataset completo de cross-references do openbible.info.
 *
 * Origem oficial (CC-BY 4.0):
 *   https://a.openbible.info/data/cross-references.zip
 *
 * Formato CSV após unzip (cross-references.txt, tab-delimited):
 *   "From Verse"  "To Verse"  "Votes"   "Source(s)"
 *   "Gen.1.1"     "Job.38.4"  "12"      "TSK"
 *
 * Uso:
 *   1. baixe o ZIP, descompacte
 *   2. ts-node backend/scripts/import-tsk-full.ts cross-references.txt
 *
 * Idempotente: upsert por (sourceRef, targetRef). Re-rodar atualiza
 * votes/rank sem duplicar.
 *
 * Performance: ~340k rows. Usamos createMany com skipDuplicates=true
 * em lotes de 5k pra evitar pressão de transação.
 */

import { PrismaClient } from '@prisma/client';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

const prisma = new PrismaClient();

// openbible.info usa o formato OSIS-like: "Gen.1.1", "1Cor.13.4".
// Convertemos para o canônico "Genesis 1:1", "1 Corinthians 13:4" pra casar
// com o frontend.
const OSIS_TO_NAME: Record<string, string> = {
  Gen: 'Genesis', Exod: 'Exodus', Lev: 'Leviticus', Num: 'Numbers', Deut: 'Deuteronomy',
  Josh: 'Joshua', Judg: 'Judges', Ruth: 'Ruth', '1Sam': '1 Samuel', '2Sam': '2 Samuel',
  '1Kgs': '1 Kings', '2Kgs': '2 Kings', '1Chr': '1 Chronicles', '2Chr': '2 Chronicles',
  Ezra: 'Ezra', Neh: 'Nehemiah', Esth: 'Esther', Job: 'Job', Ps: 'Psalms',
  Prov: 'Proverbs', Eccl: 'Ecclesiastes', Song: 'Song of Solomon', Isa: 'Isaiah',
  Jer: 'Jeremiah', Lam: 'Lamentations', Ezek: 'Ezekiel', Dan: 'Daniel',
  Hos: 'Hosea', Joel: 'Joel', Amos: 'Amos', Obad: 'Obadiah', Jonah: 'Jonah',
  Mic: 'Micah', Nah: 'Nahum', Hab: 'Habakkuk', Zeph: 'Zephaniah',
  Hag: 'Haggai', Zech: 'Zechariah', Mal: 'Malachi',
  Matt: 'Matthew', Mark: 'Mark', Luke: 'Luke', John: 'John', Acts: 'Acts',
  Rom: 'Romans', '1Cor': '1 Corinthians', '2Cor': '2 Corinthians',
  Gal: 'Galatians', Eph: 'Ephesians', Phil: 'Philippians', Col: 'Colossians',
  '1Thess': '1 Thessalonians', '2Thess': '2 Thessalonians',
  '1Tim': '1 Timothy', '2Tim': '2 Timothy', Titus: 'Titus', Phlm: 'Philemon',
  Heb: 'Hebrews', Jas: 'James', '1Pet': '1 Peter', '2Pet': '2 Peter',
  '1John': '1 John', '2John': '2 John', '3John': '3 John', Jude: 'Jude',
  Rev: 'Revelation',
};

function osisToCanonical(osis: string): string | null {
  // Single-verse "Gen.1.1" — handle range-strip ("Gen.1.1-Gen.1.2" → first).
  const first = osis.split('-')[0];
  const parts = first.split('.');
  if (parts.length !== 3) return null;
  const [book, chapter, verse] = parts;
  const name = OSIS_TO_NAME[book];
  if (!name) return null;
  return `${name} ${chapter}:${verse}`;
}

interface Row {
  sourceRef: string;
  targetRef: string;
  votes: number | null;
}

async function* readRows(path: string): AsyncGenerator<Row> {
  const stream = createReadStream(path);
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  let header = true;
  for await (const line of rl) {
    if (header) {
      header = false;
      continue;
    }
    if (!line.trim()) continue;
    const cells = line.split('\t').map((c) => c.replace(/^"|"$/g, ''));
    if (cells.length < 3) continue;
    const [from, to, votesStr] = cells;
    const sourceRef = osisToCanonical(from);
    const targetRef = osisToCanonical(to);
    if (!sourceRef || !targetRef) continue;
    yield {
      sourceRef,
      targetRef,
      votes: votesStr ? parseInt(votesStr, 10) || null : null,
    };
  }
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Uso: ts-node scripts/import-tsk-full.ts <cross-references.txt>');
    process.exit(2);
  }
  console.log(`📥 Importando TSK de ${file}…`);

  const BATCH = 5_000;
  let batch: Row[] = [];
  let total = 0;
  let skipped = 0;

  const flush = async () => {
    if (batch.length === 0) return;
    const result = await prisma.crossReference.createMany({
      data: batch.map((r) => ({
        sourceRef: r.sourceRef,
        targetRef: r.targetRef,
        votes: r.votes,
      })),
      skipDuplicates: true,
    });
    total += result.count;
    skipped += batch.length - result.count;
    batch = [];
    if (total % 50_000 === 0 || total < 10_000) {
      console.log(`   …${total.toLocaleString()} inseridas / ${skipped.toLocaleString()} duplicadas`);
    }
  };

  for await (const row of readRows(file)) {
    batch.push(row);
    if (batch.length >= BATCH) await flush();
  }
  await flush();

  console.log(
    `✅ Import TSK concluído. inserted=${total.toLocaleString()} skipped=${skipped.toLocaleString()}`,
  );
}

main()
  .catch((err) => {
    console.error('❌ Import falhou:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
