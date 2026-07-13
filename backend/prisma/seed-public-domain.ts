import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Seed de traduções em licença livre (Fase 0 — Beta Gratuito).
 *
 * Fontes (arquivos gerados em prisma/data/, commitados no repo):
 *   - BLIVRE.json — Bíblia Livre, edição Textus Receptus (CC BY 3.0 BR)
 *   - NVA.json    — Nova Versão de Acesso Livre (CC BY-SA 4.0)
 *
 * Formato dos arquivos: { translation, copyright, verses: [[bookId, chapter, verse, text], ...] }
 * bookId segue o cânon protestante (1–66), idêntico à tabela Book.
 *
 * Uso: npm run db:seed:free-bibles
 * Idempotente: usa createMany com skipDuplicates (unique translation+bookId+chapter+verse).
 */

const connectionString = process.env.DATABASE_URL ?? '';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const BATCH_SIZE = 2000;

type VerseTuple = [number, number, number, string];

interface TranslationFile {
  translation: string;
  copyright: string;
  verses: VerseTuple[];
}

async function seedTranslation(fileName: string) {
  const filePath = path.join(__dirname, 'data', fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`[seed] Arquivo não encontrado, pulando: ${filePath}`);
    return;
  }

  const payload = JSON.parse(
    fs.readFileSync(filePath, 'utf-8'),
  ) as TranslationFile;
  const { translation, copyright } = payload;

  // Mapa bookId → nome (para o campo desnormalizado `book`)
  const books = await prisma.book.findMany({
    select: { id: true, nameEn: true },
  });
  const bookName = new Map(books.map((b) => [b.id, b.nameEn]));
  if (books.length < 66) {
    throw new Error(
      '[seed] Tabela Book incompleta — rode o seed de livros (seed-books) antes.',
    );
  }

  const existing = await prisma.bibleVerse.count({ where: { translation } });
  console.log(
    `[seed] ${translation}: ${payload.verses.length} versículos no arquivo, ${existing} já no banco.`,
  );

  let inserted = 0;
  for (let i = 0; i < payload.verses.length; i += BATCH_SIZE) {
    const batch = payload.verses
      .slice(i, i + BATCH_SIZE)
      .map(([bookId, chapter, verse, text]) => ({
        book: bookName.get(bookId) ?? String(bookId),
        bookId,
        chapter,
        verse,
        text,
        translation,
        testament: bookId <= 39 ? 'OT' : 'NT',
        copyright,
      }));
    const res = await prisma.bibleVerse.createMany({
      data: batch,
      skipDuplicates: true,
    });
    inserted += res.count;
    if ((i / BATCH_SIZE) % 5 === 0) {
      console.log(
        `[seed] ${translation}: ${i + batch.length}/${payload.verses.length}...`,
      );
    }
  }
  console.log(
    `[seed] ${translation}: concluído — ${inserted} novos versículos inseridos.`,
  );
}

async function main() {
  await seedTranslation('BLIVRE.json');
  await seedTranslation('NVA.json');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
