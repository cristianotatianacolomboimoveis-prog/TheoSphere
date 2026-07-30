import { BIBLE_BOOKS, type BibleBook } from "@/data/bibleBooks";

/**
 * Interpretação de referências bíblicas em texto livre.
 *
 * Existe porque o `parseRef` de useCrossRefs aceita apenas `[A-Za-z]` e exige
 * o versículo — ele serve para as refs canônicas do TSK, mas descarta o que a
 * IA devolve em PT-BR ("Gênesis 14:18") e o que o usuário digita abreviado
 * ("Hb 7:1"). Usado pelo Factbook e pela concordância do Word Study.
 */

export interface ParsedBibleRef {
  book: BibleBook;
  chapter: number;
  verse?: number;
}

/** Normaliza acentuação para comparar nomes de livros ("Gênesis" ≡ "genesis"). */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Aceita "Gênesis 14:18", "Hebrews 7:1", "Hb 7:1-3" (usa o versículo inicial),
 * "1 Samuel 17:45" e "Salmos 110" (só capítulo).
 *
 * Devolve `null` quando o livro não existe ou o capítulo está fora do
 * intervalo real do livro — a IA às vezes inventa "Judas 5:2", e é melhor não
 * navegar do que levar o leitor para lugar nenhum.
 */
export function parseBibleRef(ref: string): ParsedBibleRef | null {
  if (!ref || typeof ref !== "string") return null;

  const match = ref
    .trim()
    .match(/^([1-3]?\s*[\p{L}][\p{L}\s.]*?)\s+(\d+)(?::\s*(\d+))?/u);
  if (!match) return null;

  const rawBook = normalize(match[1]).replace(/\.$/, "");
  const book = BIBLE_BOOKS.find(
    (b) =>
      normalize(b.namePt) === rawBook ||
      normalize(b.nameEn) === rawBook ||
      normalize(b.abbrevPt) === rawBook ||
      normalize(b.abbrevEn) === rawBook,
  );
  if (!book) return null;

  const chapter = parseInt(match[2], 10);
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) {
    return null;
  }

  const verse = match[3] ? parseInt(match[3], 10) : undefined;
  return { book, chapter, verse };
}

/** Identificador de versículo no formato usado pelo store ("Genesis 1:1"). */
export function verseIdOf(parsed: ParsedBibleRef): string | null {
  if (!parsed.verse) return null;
  return `${parsed.book.nameEn} ${parsed.chapter}:${parsed.verse}`;
}
