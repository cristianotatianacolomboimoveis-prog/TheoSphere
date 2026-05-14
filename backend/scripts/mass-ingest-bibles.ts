import { PrismaClient } from '@prisma/client';
import axios from 'axios';

/**
 * 🚀 TheoSphere Mass Ingestion Script
 * Este script baixa versões inteiras do Bolls.life e salva no PostgreSQL.
 */

const prisma = new PrismaClient();

const TRANSLATIONS_TO_INGEST = [
  'ARA',   // Almeida Revista e Atualizada (PT)
  'ARC',   // Almeida Revista e Corrigida (PT)
  'KJV',   // King James Version (EN)
  'WEB',   // World English Bible (EN)
  'WLC',   // Westminster Leningrad Codex (Hebrew)
  'LXX',   // Septuagint (Greek)
  'TR',    // Textus Receptus (Greek)
];

const BOOKS = [
  { id: 1, name: "Gênesis", chapters: 50 }, { id: 2, name: "Êxodo", chapters: 40 },
  { id: 3, name: "Levítico", chapters: 27 }, { id: 4, name: "Números", chapters: 36 },
  { id: 5, name: "Deuteronômio", chapters: 34 }, { id: 6, name: "Josué", chapters: 24 },
  { id: 7, name: "Juízes", chapters: 21 }, { id: 8, name: "Rute", chapters: 4 },
  { id: 9, name: "1 Samuel", chapters: 31 }, { id: 10, name: "2 Samuel", chapters: 24 },
  { id: 11, name: "1 Reis", chapters: 22 }, { id: 12, name: "2 Reis", chapters: 25 },
  { id: 13, name: "1 Crônicas", chapters: 29 }, { id: 14, name: "2 Crônicas", chapters: 36 },
  { id: 15, name: "Esdras", chapters: 10 }, { id: 16, name: "Neemias", chapters: 13 },
  { id: 17, name: "Ester", chapters: 10 }, { id: 18, name: "Jó", chapters: 18 },
  { id: 19, name: "Salmos", chapters: 150 }, { id: 20, name: "Provérbios", chapters: 31 },
  { id: 21, name: "Eclesiastes", chapters: 12 }, { id: 22, name: "Cantares", chapters: 8 },
  { id: 23, name: "Isaías", chapters: 66 }, { id: 24, name: "Jeremias", chapters: 52 },
  { id: 25, name: "Lamentações", chapters: 5 }, { id: 26, name: "Ezequiel", chapters: 48 },
  { id: 27, name: "Daniel", chapters: 12 }, { id: 28, name: "Oséias", chapters: 14 },
  { id: 29, name: "Joel", chapters: 3 }, { id: 30, name: "Amós", chapters: 9 },
  { id: 31, name: "Obadias", chapters: 1 }, { id: 32, name: "Jonas", chapters: 4 },
  { id: 33, name: "Miquéias", chapters: 7 }, { id: 34, name: "Naum", chapters: 3 },
  { id: 35, name: "Habacuque", chapters: 3 }, { id: 36, name: "Sofonias", chapters: 3 },
  { id: 37, name: "Ageu", chapters: 2 }, { id: 38, name: "Zacarias", chapters: 14 },
  { id: 39, name: "Malaquias", chapters: 4 }, { id: 40, name: "Mateus", chapters: 28 },
  { id: 41, name: "Marcos", chapters: 16 }, { id: 42, name: "Lucas", chapters: 24 },
  { id: 43, name: "João", chapters: 21 }, { id: 44, name: "Atos", chapters: 28 },
  { id: 45, name: "Romanos", chapters: 16 }, { id: 46, name: "1 Coríntios", chapters: 16 },
  { id: 47, name: "2 Coríntios", chapters: 13 }, { id: 48, name: "Gálatas", chapters: 6 },
  { id: 49, name: "Efésios", chapters: 6 }, { id: 50, name: "Filipenses", chapters: 4 },
  { id: 51, name: "Colossenses", chapters: 4 }, { id: 52, name: "1 Tessalonicenses", chapters: 5 },
  { id: 53, name: "2 Tessalonicenses", chapters: 3 }, { id: 54, name: "1 Timóteo", chapters: 6 },
  { id: 55, name: "2 Timóteo", chapters: 4 }, { id: 56, name: "Tito", chapters: 3 },
  { id: 57, name: "Filemom", chapters: 1 }, { id: 58, name: "Hebreus", chapters: 13 },
  { id: 59, name: "Tiago", chapters: 5 }, { id: 60, name: "1 Pedro", chapters: 5 },
  { id: 61, name: "2 Pedro", chapters: 3 }, { id: 62, name: "1 João", chapters: 5 },
  { id: 63, name: "2 João", chapters: 1 }, { id: 64, name: "3 João", chapters: 1 },
  { id: 65, name: "Judas", chapters: 1 }, { id: 66, name: "Apocalipse", chapters: 22 }
];

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, '');
}

async function ingest() {
  console.log('🏁 Iniciando Ingestão em Massa TheoSphere...');

  for (const translation of TRANSLATIONS_TO_INGEST) {
    console.log(`\n📦 Processando versão: ${translation}`);
    
    for (const book of BOOKS) {
      for (let chapter = 1; chapter <= book.chapters; chapter++) {
        try {
          // Check if already in DB to avoid redundant fetches
          const existing = await prisma.bibleVerse.count({
            where: { translation, bookId: book.id, chapter }
          });

          if (existing > 0) {
            process.stdout.write('.');
            continue;
          }

          const url = `https://bolls.life/get-chapter/${translation}/${book.id}/${chapter}/`;
          const response = await axios.get(url, { timeout: 10000 });
          const data = response.data;

          if (Array.isArray(data)) {
            const versesToSave = data.map((v: any) => ({
              id: `${translation}-${book.id}-${chapter}-${v.verse}`,
              book: book.name,
              bookId: book.id,
              chapter: chapter,
              verse: v.verse,
              text: stripHtml(v.text),
              translation: translation,
              testament: book.id >= 40 ? 'NT' : 'AT',
              textDirection: (translation === 'WLC') ? 'rtl' : 'ltr'
            }));

            // Bulk Upsert using raw SQL for performance
            const payload = JSON.stringify(versesToSave);
            // Usamos $executeRaw para evitar problemas de escape com aspas simples no JSON
            await prisma.$executeRaw`
              INSERT INTO "BibleVerse" (id, book, "bookId", chapter, verse, text, translation, testament, "textDirection")
              SELECT 
                v.id, v.book, v."bookId", v.chapter, v.verse, v.text, v.translation, v.testament, v."textDirection"
              FROM jsonb_to_recordset(${payload}::jsonb) AS v(
                id text, book text, "bookId" integer, chapter integer, verse integer, text text, translation text, testament text, "textDirection" text
              )
              ON CONFLICT (translation, "bookId", chapter, verse) DO NOTHING;
            `;

            process.stdout.write('✓');
          }

          // Gentle pacing to avoid rate limiting
          await sleep(200);
        } catch (error: any) {
          console.error(`\n❌ Erro em ${book.name} ${chapter} (${translation}): ${error.message}`);
          await sleep(2000); // Wait longer on error
        }
      }
      console.log(`\n✅ ${book.name} concluído.`);
    }
  }

  console.log('\n🏁 Ingestão Finalizada!');
}

ingest().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
