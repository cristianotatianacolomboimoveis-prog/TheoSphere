/**
 * Bible Utilities
 * Centralized mapping and formatting for biblical data.
 */

export const BIBLE_BOOK_TO_ID: Record<string, number> = {
  // Antigo Testamento
  "Genesis": 1, "Gênesis": 1, "Exodus": 2, "Êxodo": 2, "Leviticus": 3, "Levítico": 3,
  "Numbers": 4, "Números": 4, "Deuteronomy": 5, "Deuteronômio": 5,
  "Joshua": 6, "Josué": 6, "Judges": 7, "Juízes": 7, "Ruth": 8, "Rute": 8,
  "1 Samuel": 9, "2 Samuel": 10, "1 Kings": 11, "1 Reis": 11, "2 Kings": 12, "2 Reis": 12,
  "1 Chronicles": 13, "1 Crônicas": 13, "2 Chronicles": 14, "2 Crônicas": 14,
  "Ezra": 15, "Esdras": 15, "Nehemiah": 16, "Neemias": 16, "Esther": 17, "Ester": 17,
  "Job": 18, "Jó": 18, "Psalms": 19, "Salmos": 19, "Proverbs": 20, "Provérbios": 20,
  "Ecclesiastes": 21, "Eclesiastes": 21, "Song of Solomon": 22, "Cantares": 22,
  "Isaiah": 23, "Isaías": 23, "Jeremiah": 24, "Jeremias": 24, "Lamentations": 25, "Lamentações": 25,
  "Ezekiel": 26, "Ezequiel": 26, "Daniel": 27, "Hosea": 28, "Oséias": 28,
  "Joel": 29, "Amos": 30, "Amós": 30, "Obadiah": 31, "Obadias": 31, "Jonah": 32, "Jonas": 32,
  "Micah": 33, "Miquéias": 33, "Nahum": 34, "Naum": 34, "Habakkuk": 35, "Habacuque": 35,
  "Zephaniah": 36, "Sofonias": 36, "Haggai": 37, "Ageu": 37, "Zechariah": 38, "Zacarias": 38, "Malachi": 39, "Malaquias": 39,

  // Novo Testamento
  "Matthew": 40, "Mateus": 40, "Mark": 41, "Marcos": 41, "Luke": 42, "Lucas": 42,
  "John": 43, "João": 43, "Acts": 44, "Atos": 44, "Romans": 45, "Romanos": 45,
  "1 Corinthians": 46, "1 Coríntios": 46, "2 Corinthians": 47, "2 Coríntios": 47,
  "Galatians": 48, "Gálatas": 48, "Ephesians": 49, "Efésios": 49,
  "Philippians": 50, "Filipenses": 50, "Colossians": 51, "Colossenses": 51,
  "1 Thessalonians": 52, "1 Tessalonicenses": 52, "2 Thessalonians": 53, "2 Tessalonicenses": 53,
  "1 Timothy": 54, "1 Timóteo": 54, "2 Timothy": 55, "2 Timóteo": 55,
  "Titus": 56, "Tito": 56, "Philemon": 57, "Filemom": 57,
  "Hebrews": 58, "Hebreus": 58, "James": 59, "Tiago": 59,
  "1 Peter": 60, "1 Pedro": 60, "2 Peter": 61, "2 Pedro": 61,
  "1 John": 62, "1 João": 62, "2 John": 63, "2 João": 63, "3 John": 64, "3 João": 64,
  "Jude": 65, "Judas": 65, "Revelation": 66, "Apocalipse": 66
};

export function isNewTestament(bookName: string): boolean {
  const id = BIBLE_BOOK_TO_ID[bookName];
  return id >= 40;
}

export function getOriginalLanguageTranslation(bookName: string): 'TR' | 'WLC' {
  return isNewTestament(bookName) ? 'TR' : 'WLC';
}

export function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, '');
}
