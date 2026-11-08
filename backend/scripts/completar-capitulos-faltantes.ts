import 'dotenv/config';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { cleanBollsText } from '../src/bible/bolls-text';

/**
 * Completa capítulos que faltam numa tradução, baixando da bolls.life.
 *
 * Achado de 2026-11-08: KJV, WEB e WLC não tinham Jó 19–42 (a ingestão em
 * massa parou no meio do livro) e o WLC não tinha Joel 4 (o MT tem 4
 * capítulos em Joel; a NVA, com 3, não serve de referência nesse caso).
 *
 * Os capítulos esperados vêm da NVA (completa, 31.094 vv.), por `bookId`,
 * mais os extras pedidos em EXTRA_CHAPTERS. Só insere: ON CONFLICT DO
 * NOTHING; nunca altera um versículo existente. Embedding fica NULL e é
 * gerado depois por `povoar-embeddings-livres.ts`.
 *
 * Uso:
 *   npx tsx scripts/completar-capitulos-faltantes.ts KJV --dry-run
 *   npx tsx scripts/completar-capitulos-faltantes.ts KJV
 */

// Capítulos que existem no esquema MT/LXX mas não na NVA.
const EXTRA_CHAPTERS: Record<string, Array<[number, number]>> = {
  WLC: [[29, 4]], // Joel 4 (MT) = Joel 3 (KJV)
};

// Capítulos da NVA que não existem no esquema MT (o conteúdo está noutro capítulo).
const SKIP_CHAPTERS: Record<string, Array<[number, number]>> = {
  WLC: [[39, 4]], // Ml 4 (KJV) = Ml 3:19-24 (MT)
};

const ALLOWED = new Set(['KJV', 'WEB', 'WLC']);

async function run() {
  const translation = (process.argv[2] || '').toUpperCase();
  const dryRun = process.argv.includes('--dry-run');
  if (!ALLOWED.has(translation)) {
    console.error(`Uso: completar-capitulos-faltantes.ts <${[...ALLOWED].join('|')}> [--dry-run]`);
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const expected = await prisma.$queryRaw<{ bookId: number; chapter: number }[]>`
      SELECT DISTINCT "bookId", chapter FROM "BibleVerse"
      WHERE translation = 'NVA'
        AND "bookId" IN (SELECT DISTINCT "bookId" FROM "BibleVerse" WHERE translation = ${translation})`;
    const have = await prisma.$queryRaw<{ bookId: number; chapter: number }[]>`
      SELECT DISTINCT "bookId", chapter FROM "BibleVerse" WHERE translation = ${translation}`;
    const haveSet = new Set(have.map((r) => `${r.bookId}:${r.chapter}`));
    const books = await prisma.$queryRaw<{ bookId: number; book: string }[]>`
      SELECT DISTINCT ON ("bookId") "bookId", book FROM "BibleVerse"
      WHERE translation = ${translation} ORDER BY "bookId"`;
    const bookName = new Map(books.map((b) => [b.bookId, b.book]));

    const wanted = [
      ...expected.map((r) => [r.bookId, r.chapter] as [number, number]),
      ...(EXTRA_CHAPTERS[translation] ?? []),
    ];
    const skip = new Set(
      (SKIP_CHAPTERS[translation] ?? []).map(([b, c]) => `${b}:${c}`),
    );
    const missing = wanted
      .filter(([b, c]) => !haveSet.has(`${b}:${c}`) && !skip.has(`${b}:${c}`))
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);

    console.log(`[${translation}] capítulos faltando: ${missing.length}`);
    if (missing.length === 0) return;
    console.log('   ', missing.map(([b, c]) => `${b}:${c}`).join(' '));
    if (dryRun) return;

    let inserted = 0;
    for (const [bookId, chapter] of missing) {
      const url = `https://bolls.life/get-chapter/${translation}/${bookId}/${chapter}/`;
      const { data } = await axios.get<{ verse: number; text: string }[]>(url, {
        timeout: 20_000,
      });
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error(`bolls.life sem versículos em ${url}`);
      }
      const rows = data.map((v) => ({
        id: `${translation}-${bookId}-${chapter}-${v.verse}`,
        book: bookName.get(bookId) ?? `Book_${bookId}`,
        bookId,
        chapter,
        verse: v.verse,
        text: cleanBollsText(v.text),
        translation,
        testament: bookId >= 40 ? 'NT' : 'AT',
        textDirection: translation === 'WLC' ? 'rtl' : 'ltr',
      }));
      if (rows.some((r) => /\d/.test(r.text) && translation === 'KJV')) {
        throw new Error(`Texto ainda com dígitos em ${url} — limpeza falhou`);
      }
      const n = await prisma.$executeRaw`
        INSERT INTO "BibleVerse" (id, book, "bookId", chapter, verse, text, translation, testament, "textDirection")
        SELECT v.id, v.book, v."bookId", v.chapter, v.verse, v.text, v.translation, v.testament, v."textDirection"
        FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS v(
          id text, book text, "bookId" integer, chapter integer, verse integer,
          text text, translation text, testament text, "textDirection" text)
        ON CONFLICT (translation, "bookId", chapter, verse) DO NOTHING`;
      inserted += n;
      console.log(`   ${bookId}:${chapter} → ${n}/${rows.length} inseridos`);
      await new Promise((r) => setTimeout(r, 300));
    }
    console.log(`[${translation}] total inserido: ${inserted}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
