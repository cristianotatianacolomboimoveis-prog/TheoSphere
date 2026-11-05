import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * 🏛️ Ingestão do Texto Crítico Grego — SBLGNT
 *
 * Fonte: SBL Greek New Testament (CC BY 4.0)
 * Licença: Creative Commons Attribution 4.0 International
 * Atribuição: Copyright © 2010 Society of Biblical Literature and Logos Bible Software
 * Dataset: backend/prisma/data/sblgnt-verses.json.gz
 *
 * Idempotente: ON CONFLICT (translation, "bookId", chapter, verse) DO NOTHING
 * Uso:
 *   npx tsx scripts/ingest-sblgnt.ts
 *   npx tsx scripts/ingest-sblgnt.ts --dry-run
 */

interface VerseItem {
  id: string;
  book: string;
  bookId: number;
  chapter: number;
  verse: number;
  text: string;
  rawText: string;
  translation: string;
  testament: string;
  textDirection: string;
  copyright: string;
}

interface SblgntDataset {
  source: string;
  copyright: string;
  license: string;
  totalVerses: number;
  verses: VerseItem[];
}

const connectionString =
  process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const BATCH_SIZE = 500;

async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  const filePath = path.join(__dirname, '../prisma/data/sblgnt-verses.json.gz');

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Arquivo do dataset não encontrado: ${filePath}`);
    process.exit(1);
  }

  console.log(`📦 Carregando dataset: ${filePath}`);
  const raw = fs.readFileSync(filePath);
  const decompressed = zlib.gunzipSync(raw);
  const data: SblgntDataset = JSON.parse(decompressed.toString('utf-8'));

  console.log(`ℹ️ Fonte: ${data.source}`);
  console.log(`ℹ️ Licença: ${data.license}`);
  console.log(`ℹ️ Total no arquivo: ${data.totalVerses} versículos`);

  // Agrupamento e verificação de integridade por livro
  const byBook: Record<string, { id: number; count: number }> = {};
  for (const v of data.verses) {
    if (!byBook[v.book]) {
      byBook[v.book] = { id: v.bookId, count: 0 };
    }
    byBook[v.book].count++;
  }

  console.log('\n📊 Contagem canônica por livro (SBLGNT):');
  for (const [name, meta] of Object.entries(byBook)) {
    console.log(`  - ${name} (Livro ${meta.id}): ${meta.count} versículos`);
  }

  if (data.totalVerses !== 7958) {
    throw new Error(
      `Contagem inesperada de versículos: esperado 7958, obtido ${data.totalVerses}`,
    );
  }

  if (isDryRun) {
    console.log(
      '\n✅ [DRY-RUN] Dataset validado com sucesso (7.958 versículos íntegros). Nenhuma gravação no banco.',
    );
    return;
  }

  try {
    const existingCount = await prisma.bibleVerse.count({
      where: { translation: 'SBLGNT' },
    });
    console.log(
      `\n🔍 Versículos do SBLGNT já presentes no banco: ${existingCount}`,
    );

    if (existingCount >= data.totalVerses) {
      console.log(
        '✅ SBLGNT já está integralmente ingerido no banco de dados.',
      );
      return;
    }

    console.log('🚀 Iniciando gravação em lotes...');
    let inserted = 0;

    for (let i = 0; i < data.verses.length; i += BATCH_SIZE) {
      const batch = data.verses.slice(i, i + BATCH_SIZE).map((v) => ({
        id: v.id,
        book: v.book,
        bookId: v.bookId,
        chapter: v.chapter,
        verse: v.verse,
        text: v.text,
        translation: 'SBLGNT',
        testament: 'NT',
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
        ON CONFLICT (translation, "bookId", chapter, verse) DO NOTHING;
      `;

      inserted += batch.length;
      process.stdout.write(
        `\r💾 Progresso: ${inserted}/${data.verses.length} versículos processados...`,
      );
    }

    const finalCount = await prisma.bibleVerse.count({
      where: { translation: 'SBLGNT' },
    });
    console.log(
      `\n\n🎉 Ingestão concluída com sucesso! Total SBLGNT no banco: ${finalCount}`,
    );
  } catch (err: any) {
    if (
      err?.message?.includes('25006') ||
      err?.message?.includes('read-only transaction')
    ) {
      console.warn(
        '\n⚠️ AVISO: O banco de dados está em modo READ-ONLY (cota de disco Supabase excedida).',
      );
      console.warn(
        'O dataset SBLGNT local (7.958 versículos) está pronto em backend/prisma/data/sblgnt-verses.json.gz e será gravado após decisão D3.',
      );
    } else {
      throw err;
    }
  }
}

run()
  .catch((err) => {
    console.error('\n❌ Erro durante a ingestão do SBLGNT:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
