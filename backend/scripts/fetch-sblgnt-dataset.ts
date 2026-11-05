import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import axios from 'axios';

interface BibleBookDef {
  id: number;
  name: string;
  chapters: number;
}

const NT_BOOKS: BibleBookDef[] = [
  { id: 40, name: 'Mateus', chapters: 28 },
  { id: 41, name: 'Marcos', chapters: 16 },
  { id: 42, name: 'Lucas', chapters: 24 },
  { id: 43, name: 'João', chapters: 21 },
  { id: 44, name: 'Atos', chapters: 28 },
  { id: 45, name: 'Romanos', chapters: 16 },
  { id: 46, name: '1 Coríntios', chapters: 16 },
  { id: 47, name: '2 Coríntios', chapters: 13 },
  { id: 48, name: 'Gálatas', chapters: 6 },
  { id: 49, name: 'Efésios', chapters: 6 },
  { id: 50, name: 'Filipenses', chapters: 4 },
  { id: 51, name: 'Colossenses', chapters: 4 },
  { id: 52, name: '1 Tessalonicenses', chapters: 5 },
  { id: 53, name: '2 Tessalonicenses', chapters: 3 },
  { id: 54, name: '1 Timóteo', chapters: 6 },
  { id: 55, name: '2 Timóteo', chapters: 4 },
  { id: 56, name: 'Tito', chapters: 3 },
  { id: 57, name: 'Filemom', chapters: 1 },
  { id: 58, name: 'Hebreus', chapters: 13 },
  { id: 59, name: 'Tiago', chapters: 5 },
  { id: 60, name: '1 Pedro', chapters: 5 },
  { id: 61, name: '2 Pedro', chapters: 3 },
  { id: 62, name: '1 João', chapters: 5 },
  { id: 63, name: '2 João', chapters: 1 },
  { id: 64, name: '3 João', chapters: 1 },
  { id: 65, name: 'Judas', chapters: 1 },
  { id: 66, name: 'Apocalipse', chapters: 22 },
];

export interface SblgntVerseItem {
  id: string; // SBLGNT-40-1-1
  book: string;
  bookId: number;
  chapter: number;
  verse: number;
  text: string; // Grego limpo
  rawText: string; // Grego com tags
  translation: 'SBLGNT';
  testament: 'NT';
  textDirection: 'ltr';
  copyright: string;
  words: {
    position: number;
    word: string;
    strong: string | null;
    morph: string | null;
  }[];
}

const COPYRIGHT_NOTICE =
  'Scripture quotations marked SBLGNT are from the SBL Greek New Testament. Copyright © 2010 Society of Biblical Literature and Logos Bible Software. Licensed under CC BY 4.0.';

function cleanGreekText(rawText: string): string {
  return rawText
    .replace(/<S>[^<]*<\/S>/g, '')
    .replace(/<m>[^<]*<\/m>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseWords(rawText: string) {
  const regex = /([^\s<]+)(?:<S>([^<]*)<\/S>)?(?:<m>([^<]*)<\/m>)?/g;
  let match: RegExpExecArray | null;
  const words: {
    position: number;
    word: string;
    strong: string | null;
    morph: string | null;
  }[] = [];
  let pos = 1;

  while ((match = regex.exec(rawText)) !== null) {
    const rawWord = match[1];
    // Limpa pontuações adjacentes para obter a forma de palavra pura
    const cleanWord = rawWord.replace(/<[^>]+>/g, '');
    if (cleanWord) {
      words.push({
        position: pos++,
        word: cleanWord,
        strong: match[2] ? `G${match[2]}` : null,
        morph: match[3] || null,
      });
    }
  }
  return words;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('🏁 Baixando dataset oficial do SBLGNT (27 livros do NT)...');
  const allVerses: SblgntVerseItem[] = [];
  const bookCounts: Record<string, number> = {};

  for (const book of NT_BOOKS) {
    let bookVerseCount = 0;
    process.stdout.write(
      `📖 ${book.name} (ID ${book.id}) [${book.chapters} cap]: `,
    );

    for (let ch = 1; ch <= book.chapters; ch++) {
      let retries = 3;
      let success = false;

      while (retries > 0 && !success) {
        try {
          const url = `https://bolls.life/get-chapter/SBLGNT/${book.id}/${ch}/`;
          const res = await axios.get(url, { timeout: 15000 });
          const rawVerses = res.data;

          if (Array.isArray(rawVerses)) {
            for (const item of rawVerses) {
              const clean = cleanGreekText(item.text);
              const words = parseWords(item.text);

              allVerses.push({
                id: `SBLGNT-${book.id}-${ch}-${item.verse}`,
                book: book.name,
                bookId: book.id,
                chapter: ch,
                verse: item.verse,
                text: clean,
                rawText: item.text,
                translation: 'SBLGNT',
                testament: 'NT',
                textDirection: 'ltr',
                copyright: COPYRIGHT_NOTICE,
                words,
              });
              bookVerseCount++;
            }
            process.stdout.write('.');
            success = true;
          } else {
            throw new Error(`Resposta não é array no cap ${ch}`);
          }
          await sleep(100);
        } catch (err: any) {
          retries--;
          console.warn(
            `\n⚠️ Erro em ${book.name} ${ch} (${err.message}), retentando (${retries})...`,
          );
          await sleep(1500);
        }
      }

      if (!success) {
        throw new Error(`Falha definitiva ao baixar ${book.name} ${ch}`);
      }
    }

    bookCounts[book.name] = bookVerseCount;
    console.log(` ✅ (${bookVerseCount} versículos)`);
  }

  console.log('\n📊 Resumo da Ingestão do SBLGNT:');
  console.table(bookCounts);
  console.log(`\nTotal de versículos baixados: ${allVerses.length}`);

  const outputDir = path.join(__dirname, '../prisma/data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'sblgnt-verses.json.gz');
  const payload = {
    source: 'SBL Greek New Testament (CC BY 4.0)',
    editor: 'Michael W. Holmes (2010)',
    copyright: COPYRIGHT_NOTICE,
    license: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
    licenseUrl: 'https://github.com/Faithlife/SBLGNT/blob/master/LICENSE',
    verificationDate: '2026-11-05',
    totalVerses: allVerses.length,
    verses: allVerses,
  };

  const jsonStr = JSON.stringify(payload);
  const compressed = zlib.gzipSync(Buffer.from(jsonStr, 'utf-8'));
  fs.writeFileSync(outputPath, compressed);

  const stats = fs.statSync(outputPath);
  console.log(
    `\n💾 Arquivo salvo com sucesso: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`,
  );
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
