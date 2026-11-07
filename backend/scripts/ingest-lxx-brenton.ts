import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Ingestão da Septuaginta Grega (LXX Brenton — Domínio Público)
 *
 * Fonte: The Greek Septuagint, compiled by Sir Lancelot C. L. Brenton (1851)
 * Pacote: https://ebible.org/Scriptures/grcbrent_vpl.zip (Public Domain)
 * Licença documentada em: docs/licenses/LXX-BRENTON.md
 * Dataset: backend/prisma/data/lxx-brenton-verses.json.gz
 *
 * Fluxo seguro (A2):
 *   1. Grava primeiro na tradução temporária `LXXB` (sem sobrescrever `LXX`).
 *   2. Confere a contagem por livro (`Fonte × Banco`). Se houver divergência, aborta.
 *   3. Promove atomicamente `LXXB` -> `LXX` (apagando o `LXX` lematizado antigo).
 */

interface LxxVerseItem {
  id: string;
  book: string;
  bookId: number;
  chapter: number;
  verse: number;
  text: string;
  translation: string;
  testament: string;
  textDirection: string;
  copyright: string;
}

interface BookStat {
  bookId: number;
  book: string;
  sourceLines: number;
  mergedVerses: number;
  subVersesMerged: number;
}

interface LxxDataset {
  source: string;
  edition: string;
  license: string;
  licenseUrl: string;
  verifiedAt: string;
  totalSourceLines: number;
  totalSubVersesMerged: number;
  totalVerses: number;
  bookStats: BookStat[];
  verses: LxxVerseItem[];
}

const connectionString =
  process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const BATCH_SIZE = 500;
const STAGING_TRANSLATION = 'LXXB';
const FINAL_TRANSLATION = 'LXX';

export function hasLemmatizedDefect(text: string): boolean {
  // Detecta junções quebradas de preposição + lema da bolls.life (ex.: ἐκὁμολογέω, διαἡ, καθὁράω)
  // ou a sequência literal de lemas em Sl 9:2
  if (text.includes('ἐκὁ') || text.includes('διαἡ')) {
    return true;
  }
  if (text.includes('ἐκὁμολογέω σύ κύριος')) {
    return true;
  }
  const brokenPrepositionJoin =
    /(?:^|\s)(?:ἐκ|ἐξ|ἐν|εἰς|δι[αὰ]|κατ[αὰ]|καθ|μετ[αὰ]|παρ[αὰ]|περ[ιὶ]|πρ[οὸ]ς|σ[υὺ]ν|ὑπ[εὲ]ρ|ὑπ[οὸ]|ἀν[αὰ]|ἀπ[οὸ]|ἐπ[ιὶ])[ἀἁἂἃἄἅἆἇἐἑἒἓἔἕἠἡἢἣἤἥἦἧἰἱἲἳἴἵἶἷὀὁὂὃὄὅὐὑὒὓὔὕὖὗὠὡὢὣὤὥὦὧ]/u;
  return brokenPrepositionJoin.test(text);
}

async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  const stagingOnly = process.argv.includes('--staging-only');
  const filePath = path.join(
    __dirname,
    '../prisma/data/lxx-brenton-verses.json.gz',
  );

  if (!fs.existsSync(filePath)) {
    throw new Error(`Dataset não encontrado: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath);
  const decompressed = zlib.gunzipSync(raw);
  const data: LxxDataset = JSON.parse(decompressed.toString('utf-8'));

  console.log(`Fonte: ${data.edition}`);
  console.log(`Licença: ${data.license} (${data.licenseUrl})`);
  console.log(
    `Total na fonte: ${data.totalSourceLines} linhas (${data.totalSubVersesMerged} sub-versos mesclados = ${data.totalVerses} versículos inteiros)`,
  );

  if (data.totalVerses !== 22942 || data.bookStats.length !== 39) {
    throw new Error(
      `Dataset inválido: esperado 22942 versículos em 39 livros, obtido ${data.totalVerses} em ${data.bookStats.length} livros.`,
    );
  }

  for (const v of data.verses) {
    if (hasLemmatizedDefect(v.text)) {
      throw new Error(
        `Defeito de lematização detectado em ${v.book} ${v.chapter}:${v.verse}: ${v.text}`,
      );
    }
  }

  if (isDryRun) {
    console.table(data.bookStats);
    console.log('[DRY-RUN] Dataset validado sem defeitos de lematização.');
    return;
  }

  // Verificar se LXX já está atualizado e íntegro
  const currentLxxCount = await prisma.bibleVerse.count({
    where: { translation: FINAL_TRANSLATION },
  });
  const samplePs9 = await prisma.bibleVerse.findFirst({
    where: {
      translation: FINAL_TRANSLATION,
      bookId: 19,
      chapter: 9,
      verse: 2,
    },
  });

  if (
    currentLxxCount === data.totalVerses &&
    samplePs9 &&
    !hasLemmatizedDefect(samplePs9.text) &&
    samplePs9.text.includes('Ἐξομολογήσομαι')
  ) {
    console.log(
      `LXX já está com o texto real de Brenton (${currentLxxCount} versículos) e sem defeitos.`,
    );
    return;
  }

  // 1. Limpar eventual resíduo anterior de LXXB e gravar na tradução de staging LXXB
  await prisma.bibleVerse.deleteMany({
    where: { translation: STAGING_TRANSLATION },
  });

  console.log(`Gravando ${data.verses.length} versículos em ${STAGING_TRANSLATION}...`);
  let inserted = 0;

  for (let i = 0; i < data.verses.length; i += BATCH_SIZE) {
    const batch = data.verses.slice(i, i + BATCH_SIZE).map((v) => ({
      id: `lxxb-${v.bookId}-${v.chapter}-${v.verse}`,
      book: v.book,
      bookId: v.bookId,
      chapter: v.chapter,
      verse: v.verse,
      text: v.text,
      translation: STAGING_TRANSLATION,
      testament: 'AT',
      copyright: v.copyright,
      textDirection: 'ltr',
    }));

    const payload = JSON.stringify(batch);

    await prisma.$executeRaw`
      INSERT INTO "BibleVerse" (id, book, "bookId", chapter, verse, text, translation, testament, copyright, "textDirection")
      SELECT
        v.id, v.book, v."bookId", v.chapter, v.verse, v.text, v.translation, v.testament, v.copyright, v."textDirection"
      FROM jsonb_to_recordset(${payload}::jsonb) AS v(
        id text, book text, "bookId" integer, chapter integer, verse integer, text text, translation text, testament text, copyright text, "textDirection" text
      )
      ON CONFLICT (translation, "bookId", chapter, verse) DO UPDATE SET
        text = EXCLUDED.text,
        book = EXCLUDED.book,
        copyright = EXCLUDED.copyright;
    `;

    inserted += batch.length;
    process.stdout.write(
      `\rProgresso (${STAGING_TRANSLATION}): ${inserted}/${data.verses.length}`,
    );
  }
  console.log('\nConferindo contagem por livro em LXXB...');

  // 2. Conferir contagem por livro no banco vs fonte
  const dbCounts = await prisma.$queryRaw<
    Array<{ bookId: number; book: string; count: number }>
  >`
    SELECT "bookId", book, count(*)::int AS count
    FROM "BibleVerse"
    WHERE translation = ${STAGING_TRANSLATION}
    GROUP BY "bookId", book
    ORDER BY "bookId" ASC
  `;

  const dbMap = new Map<number, number>();
  for (const row of dbCounts) {
    dbMap.set(row.bookId, row.count);
  }

  const comparisonTable = data.bookStats.map((stat) => {
    const inDb = dbMap.get(stat.bookId) ?? 0;
    const diff = inDb - stat.mergedVerses;
    return {
      bookId: stat.bookId,
      livro: stat.book,
      linhasFonte: stat.sourceLines,
      subVersosMesclados: stat.subVersesMerged,
      esperadoBanco: stat.mergedVerses,
      gravadoBanco: inDb,
      diferenca: diff,
    };
  });

  console.table(comparisonTable);

  const mismatches = comparisonTable.filter((r) => r.diferenca !== 0);
  if (mismatches.length > 0) {
    throw new Error(
      `Divergência de contagem em ${mismatches.length} livro(s). Abortando antes de tocar em LXX.`,
    );
  }

  if (stagingOnly) {
    console.log(
      `[STAGING-ONLY] ${STAGING_TRANSLATION} conferido com 0 divergências. LXX mantido intocado.`,
    );
    return;
  }

  // 3. Promover LXXB -> LXX em transação atômica
  console.log('Promovendo LXXB -> LXX em transação atômica...');
  await prisma.$transaction(
    async (tx) => {
      const deleted = await tx.bibleVerse.deleteMany({
        where: { translation: FINAL_TRANSLATION },
      });
      console.log(`Removidos ${deleted.count} versículos antigos lematizados de LXX.`);

      await tx.$executeRaw`
        UPDATE "BibleVerse"
        SET translation = ${FINAL_TRANSLATION},
            id = regexp_replace(id, '^lxxb-', 'lxx-')
        WHERE translation = ${STAGING_TRANSLATION}
      `;
    },
    { timeout: 60_000 },
  );

  const finalCount = await prisma.bibleVerse.count({
    where: { translation: FINAL_TRANSLATION },
  });
  console.log(`Promoção concluída. Total final em LXX: ${finalCount} versículos.`);
}

if (require.main === module) {
  run()
    .catch((err) => {
      console.error('Erro na ingestão LXX:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
