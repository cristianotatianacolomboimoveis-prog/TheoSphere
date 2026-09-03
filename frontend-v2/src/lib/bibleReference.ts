import { BIBLE_BOOKS, BibleBook } from "@/data/bibleBooks";

export interface ParsedBibleRef {
  book: BibleBook;
  chapter: number;
  verse?: number;
}

/**
 * Normaliza strings para comparação (remove acentos e pontuação).
 */
function normalizeStr(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Tenta parsear uma string como referência bíblica (ex: "Sl 23", "Jo 3:16", "1 Coríntios 13:1").
 * Retorna null se for uma busca textual livre (ex: "perdão dos pecados", "amor de Deus").
 */
export function parseBibleReference(input: string): ParsedBibleRef | null {
  if (!input || input.trim().length === 0) return null;

  const clean = input.trim();

  // Regex para capturar: [Prefixo numérico opcional (1-3)] [Nome ou Abreviatura do Livro] [Capítulo] [:Versículo opcional]
  // Exemplos que casam:
  // - "1 Jo 3:16", "1 João 3:16", "1Co 13:1"
  // - "Sl 23", "Salmo 23:1", "Salmos 23:1"
  // - "Gênesis 1", "Gn 1:1", "Gen 1"
  const match = clean.match(
    /^([1-3]\s*)?([a-zA-Z\u00C0-\u017F]+)\.?\s+(\d+)(?:[:.](\d+))?$/i,
  );

  if (!match) {
    // Tenta formato compactado (ex: "1Jo3:16", "Gn1:1", "Sl23")
    const compactMatch = clean.match(
      /^([1-3])?([a-zA-Z\u00C0-\u017F]+)\.?(\d+)(?:[:.](\d+))?$/i,
    );
    if (!compactMatch) return null;

    const numPrefix = compactMatch[1] ? `${compactMatch[1]} ` : "";
    const rawBookName = normalizeStr(numPrefix + compactMatch[2]);
    const chapter = parseInt(compactMatch[3], 10);
    const verse = compactMatch[4] ? parseInt(compactMatch[4], 10) : undefined;

    const book = findBook(rawBookName);
    if (book && chapter >= 1 && chapter <= book.chapters) {
      return { book, chapter, verse };
    }
    return null;
  }

  const numPrefix = match[1] ? `${match[1].trim()} ` : "";
  const rawBookName = normalizeStr(numPrefix + match[2]);
  const chapter = parseInt(match[3], 10);
  const verse = match[4] ? parseInt(match[4], 10) : undefined;

  const book = findBook(rawBookName);
  if (book && chapter >= 1 && chapter <= book.chapters) {
    return { book, chapter, verse };
  }

  return null;
}

function findBook(raw: string): BibleBook | undefined {
  return BIBLE_BOOKS.find((b) => {
    const normPt = normalizeStr(b.namePt);
    const normEn = normalizeStr(b.nameEn);
    const normAbbrevPt = normalizeStr(b.abbrevPt);
    const normAbbrevEn = normalizeStr(b.abbrevEn);

    if (
      raw === normPt ||
      raw === normEn ||
      raw === normAbbrevPt ||
      raw === normAbbrevEn
    ) {
      return true;
    }

    // Variações comuns em português:
    // Salmo / Salmos
    if (
      normPt === "salmos" &&
      (raw === "salmo" || raw === "sl" || raw === "ps")
    ) {
      return true;
    }
    // Gênesis / Genesis
    if (normPt === "genesis" && (raw === "gen" || raw === "gn")) {
      return true;
    }
    // Apocalipse / Revelação
    if (
      normPt === "apocalipse" &&
      (raw === "apoc" || raw === "ap" || raw === "rev")
    ) {
      return true;
    }
    // Mateus
    if (normPt === "mateus" && (raw === "mt" || raw === "mat")) {
      return true;
    }
    // Marcos
    if (normPt === "marcos" && (raw === "mc" || raw === "mk")) {
      return true;
    }
    // Lucas
    if (normPt === "lucas" && (raw === "lc" || raw === "lk")) {
      return true;
    }
    // João
    if (normPt === "joao" && (raw === "jo" || raw === "jn")) {
      return true;
    }
    // Atos
    if (normPt === "atos" && (raw === "at" || raw === "act")) {
      return true;
    }
    // Romanos
    if (normPt === "romanos" && (raw === "rm" || raw === "rom")) {
      return true;
    }

    return false;
  });
}
