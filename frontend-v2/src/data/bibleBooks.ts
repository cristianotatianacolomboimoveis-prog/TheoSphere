export interface BibleBook {
  id: number;
  namePt: string;
  nameEn: string;
  abbrevPt: string;
  abbrevEn: string;
  chapters: number;
  testament: "AT" | "NT";
  group: string;
  yearStart?: number; // Ano aproximado (AC é negativo)
}

export const BIBLE_BOOKS: BibleBook[] = [
  // ── Antigo Testamento ──────────────────────────────────────
  // Pentateuco
  { id: 1,  namePt: "Gênesis",         nameEn: "Genesis",         abbrevPt: "Gn",  abbrevEn: "Gen",  chapters: 50, testament: "AT", group: "Pentateuco", yearStart: -2100 },
  { id: 2,  namePt: "Êxodo",           nameEn: "Exodus",          abbrevPt: "Ex",  abbrevEn: "Exod", chapters: 40, testament: "AT", group: "Pentateuco", yearStart: -1446 },
  { id: 3,  namePt: "Levítico",        nameEn: "Leviticus",       abbrevPt: "Lv",  abbrevEn: "Lev",  chapters: 27, testament: "AT", group: "Pentateuco", yearStart: -1445 },
  { id: 4,  namePt: "Números",         nameEn: "Numbers",         abbrevPt: "Nm",  abbrevEn: "Num",  chapters: 36, testament: "AT", group: "Pentateuco", yearStart: -1440 },
  { id: 5,  namePt: "Deuteronômio",    nameEn: "Deuteronomy",     abbrevPt: "Dt",  abbrevEn: "Deut", chapters: 34, testament: "AT", group: "Pentateuco", yearStart: -1406 },
  // Históricos
  { id: 6,  namePt: "Josué",           nameEn: "Joshua",          abbrevPt: "Js",  abbrevEn: "Josh", chapters: 24, testament: "AT", group: "Históricos", yearStart: -1400 },
  { id: 7,  namePt: "Juízes",          nameEn: "Judges",          abbrevPt: "Jz",  abbrevEn: "Judg", chapters: 21, testament: "AT", group: "Históricos", yearStart: -1380 },
  { id: 8,  namePt: "Rute",            nameEn: "Ruth",            abbrevPt: "Rt",  abbrevEn: "Ruth", chapters: 4,  testament: "AT", group: "Históricos", yearStart: -1100 },
  { id: 9,  namePt: "1 Samuel",        nameEn: "1 Samuel",        abbrevPt: "1Sm", abbrevEn: "1Sam", chapters: 31, testament: "AT", group: "Históricos", yearStart: -1050 },
  { id: 10, namePt: "2 Samuel",        nameEn: "2 Samuel",        abbrevPt: "2Sm", abbrevEn: "2Sam", chapters: 24, testament: "AT", group: "Históricos", yearStart: -1010 },
  { id: 11, namePt: "1 Reis",          nameEn: "1 Kings",         abbrevPt: "1Rs", abbrevEn: "1Kgs", chapters: 22, testament: "AT", group: "Históricos", yearStart: -970 },
  { id: 12, namePt: "2 Reis",          nameEn: "2 Kings",         abbrevPt: "2Rs", abbrevEn: "2Kgs", chapters: 25, testament: "AT", group: "Históricos", yearStart: -850 },
  { id: 13, namePt: "1 Crônicas",      nameEn: "1 Chronicles",    abbrevPt: "1Cr", abbrevEn: "1Chr", chapters: 29, testament: "AT", group: "Históricos" },
  { id: 14, namePt: "2 Crônicas",      nameEn: "2 Chronicles",    abbrevPt: "2Cr", abbrevEn: "2Chr", chapters: 36, testament: "AT", group: "Históricos" },
  { id: 15, namePt: "Esdras",          nameEn: "Ezra",            abbrevPt: "Ed",  abbrevEn: "Ezra", chapters: 10, testament: "AT", group: "Históricos" },
  { id: 16, namePt: "Neemias",         nameEn: "Nehemiah",        abbrevPt: "Ne",  abbrevEn: "Neh",  chapters: 13, testament: "AT", group: "Históricos" },
  { id: 17, namePt: "Ester",           nameEn: "Esther",          abbrevPt: "Et",  abbrevEn: "Esth", chapters: 10, testament: "AT", group: "Históricos" },
  // Poéticos
  { id: 18, namePt: "Jó",              nameEn: "Job",             abbrevPt: "Jó",  abbrevEn: "Job",  chapters: 42, testament: "AT", group: "Poéticos" },
  { id: 19, namePt: "Salmos",          nameEn: "Psalms",          abbrevPt: "Sl",  abbrevEn: "Ps",   chapters: 150, testament: "AT", group: "Poéticos" },
  { id: 20, namePt: "Provérbios",      nameEn: "Proverbs",        abbrevPt: "Pv",  abbrevEn: "Prov", chapters: 31, testament: "AT", group: "Poéticos" },
  { id: 21, namePt: "Eclesiastes",     nameEn: "Ecclesiastes",    abbrevPt: "Ec",  abbrevEn: "Eccl", chapters: 12, testament: "AT", group: "Poéticos" },
  { id: 22, namePt: "Cantares",        nameEn: "Song of Solomon", abbrevPt: "Ct",  abbrevEn: "Song", chapters: 8,  testament: "AT", group: "Poéticos" },
  // Profetas Maiores
  { id: 23, namePt: "Isaías",          nameEn: "Isaiah",          abbrevPt: "Is",  abbrevEn: "Isa",  chapters: 66, testament: "AT", group: "Profetas Maiores" },
  { id: 24, namePt: "Jeremias",        nameEn: "Jeremiah",        abbrevPt: "Jr",  abbrevEn: "Jer",  chapters: 52, testament: "AT", group: "Profetas Maiores" },
  { id: 25, namePt: "Lamentações",     nameEn: "Lamentations",    abbrevPt: "Lm",  abbrevEn: "Lam",  chapters: 5,  testament: "AT", group: "Profetas Maiores" },
  { id: 26, namePt: "Ezequiel",        nameEn: "Ezekiel",         abbrevPt: "Ez",  abbrevEn: "Ezek", chapters: 48, testament: "AT", group: "Profetas Maiores" },
  { id: 27, namePt: "Daniel",          nameEn: "Daniel",          abbrevPt: "Dn",  abbrevEn: "Dan",  chapters: 12, testament: "AT", group: "Profetas Maiores" },
  // Profetas Menores
  { id: 28, namePt: "Oséias",          nameEn: "Hosea",           abbrevPt: "Os",  abbrevEn: "Hos",  chapters: 14, testament: "AT", group: "Profetas Menores" },
  { id: 29, namePt: "Joel",            nameEn: "Joel",            abbrevPt: "Jl",  abbrevEn: "Joel", chapters: 3,  testament: "AT", group: "Profetas Menores" },
  { id: 30, namePt: "Amós",            nameEn: "Amos",            abbrevPt: "Am",  abbrevEn: "Amos", chapters: 9,  testament: "AT", group: "Profetas Menores" },
  { id: 31, namePt: "Obadias",         nameEn: "Obadiah",         abbrevPt: "Ob",  abbrevEn: "Obad", chapters: 1,  testament: "AT", group: "Profetas Menores" },
  { id: 32, namePt: "Jonas",           nameEn: "Jonah",           abbrevPt: "Jn",  abbrevEn: "Jonah",chapters: 4,  testament: "AT", group: "Profetas Menores" },
  { id: 33, namePt: "Miquéias",        nameEn: "Micah",           abbrevPt: "Mq",  abbrevEn: "Mic",  chapters: 7,  testament: "AT", group: "Profetas Menores" },
  { id: 34, namePt: "Naum",            nameEn: "Nahum",           abbrevPt: "Na",  abbrevEn: "Nah",  chapters: 3,  testament: "AT", group: "Profetas Menores" },
  { id: 35, namePt: "Habacuque",       nameEn: "Habakkuk",        abbrevPt: "Hc",  abbrevEn: "Hab",  chapters: 3,  testament: "AT", group: "Profetas Menores" },
  { id: 36, namePt: "Sofonias",        nameEn: "Zephaniah",       abbrevPt: "Sf",  abbrevEn: "Zeph", chapters: 3,  testament: "AT", group: "Profetas Menores" },
  { id: 37, namePt: "Ageu",            nameEn: "Haggai",          abbrevPt: "Ag",  abbrevEn: "Hag",  chapters: 2,  testament: "AT", group: "Profetas Menores" },
  { id: 38, namePt: "Zacarias",        nameEn: "Zechariah",       abbrevPt: "Zc",  abbrevEn: "Zech", chapters: 14, testament: "AT", group: "Profetas Menores" },
  { id: 39, namePt: "Malaquias",       nameEn: "Malachi",         abbrevPt: "Ml",  abbrevEn: "Mal",  chapters: 4,  testament: "AT", group: "Profetas Menores" },

  // ── Novo Testamento ────────────────────────────────────────
  // Evangelhos
  { id: 40, namePt: "Mateus",          nameEn: "Matthew",         abbrevPt: "Mt",  abbrevEn: "Matt", chapters: 28, testament: "NT", group: "Evangelhos", yearStart: 28 },
  { id: 41, namePt: "Marcos",          nameEn: "Mark",            abbrevPt: "Mc",  abbrevEn: "Mark", chapters: 16, testament: "NT", group: "Evangelhos", yearStart: 27 },
  { id: 42, namePt: "Lucas",           nameEn: "Luke",            abbrevPt: "Lc",  abbrevEn: "Luke", chapters: 24, testament: "NT", group: "Evangelhos", yearStart: 26 },
  { id: 43, namePt: "João",            nameEn: "John",            abbrevPt: "Jo",  abbrevEn: "John", chapters: 21, testament: "NT", group: "Evangelhos", yearStart: 29 },
  // Histórico
  { id: 44, namePt: "Atos",            nameEn: "Acts",            abbrevPt: "At",  abbrevEn: "Acts", chapters: 28, testament: "NT", group: "Histórico", yearStart: 30 },
  // Epístolas Paulinas
  { id: 45, namePt: "Romanos",         nameEn: "Romans",          abbrevPt: "Rm",  abbrevEn: "Rom",  chapters: 16, testament: "NT", group: "Epístolas Paulinas" },
  { id: 46, namePt: "1 Coríntios",     nameEn: "1 Corinthians",   abbrevPt: "1Co", abbrevEn: "1Cor", chapters: 16, testament: "NT", group: "Epístolas Paulinas" },
  { id: 47, namePt: "2 Coríntios",     nameEn: "2 Corinthians",   abbrevPt: "2Co", abbrevEn: "2Cor", chapters: 13, testament: "NT", group: "Epístolas Paulinas" },
  { id: 48, namePt: "Gálatas",         nameEn: "Galatians",       abbrevPt: "Gl",  abbrevEn: "Gal",  chapters: 6,  testament: "NT", group: "Epístolas Paulinas" },
  { id: 49, namePt: "Efésios",         nameEn: "Ephesians",       abbrevPt: "Ef",  abbrevEn: "Eph",  chapters: 6,  testament: "NT", group: "Epístolas Paulinas" },
  { id: 50, namePt: "Filipenses",      nameEn: "Philippians",     abbrevPt: "Fp",  abbrevEn: "Phil", chapters: 4,  testament: "NT", group: "Epístolas Paulinas" },
  { id: 51, namePt: "Colossenses",     nameEn: "Colossians",      abbrevPt: "Cl",  abbrevEn: "Col",  chapters: 4,  testament: "NT", group: "Epístolas Paulinas" },
  { id: 52, namePt: "1 Tessalonicenses", nameEn: "1 Thessalonians", abbrevPt: "1Ts", abbrevEn: "1Thess", chapters: 5, testament: "NT", group: "Epístolas Paulinas" },
  { id: 53, namePt: "2 Tessalonicenses", nameEn: "2 Thessalonians", abbrevPt: "2Ts", abbrevEn: "2Thess", chapters: 3, testament: "NT", group: "Epístolas Paulinas" },
  { id: 54, namePt: "1 Timóteo",       nameEn: "1 Timothy",       abbrevPt: "1Tm", abbrevEn: "1Tim", chapters: 6,  testament: "NT", group: "Epístolas Paulinas" },
  { id: 55, namePt: "2 Timóteo",       nameEn: "2 Timothy",       abbrevPt: "2Tm", abbrevEn: "2Tim", chapters: 4,  testament: "NT", group: "Epístolas Paulinas" },
  { id: 56, namePt: "Tito",            nameEn: "Titus",           abbrevPt: "Tt",  abbrevEn: "Titus",chapters: 3,  testament: "NT", group: "Epístolas Paulinas" },
  { id: 57, namePt: "Filemom",         nameEn: "Philemon",        abbrevPt: "Fm",  abbrevEn: "Phlm", chapters: 1,  testament: "NT", group: "Epístolas Paulinas" },
  // Epístolas Gerais
  { id: 58, namePt: "Hebreus",         nameEn: "Hebrews",         abbrevPt: "Hb",  abbrevEn: "Heb",  chapters: 13, testament: "NT", group: "Epístolas Gerais" },
  { id: 59, namePt: "Tiago",           nameEn: "James",           abbrevPt: "Tg",  abbrevEn: "Jas",  chapters: 5,  testament: "NT", group: "Epístolas Gerais" },
  { id: 60, namePt: "1 Pedro",         nameEn: "1 Peter",         abbrevPt: "1Pe", abbrevEn: "1Pet", chapters: 5,  testament: "NT", group: "Epístolas Gerais" },
  { id: 61, namePt: "2 Pedro",         nameEn: "2 Peter",         abbrevPt: "2Pe", abbrevEn: "2Pet", chapters: 3,  testament: "NT", group: "Epístolas Gerais" },
  { id: 62, namePt: "1 João",          nameEn: "1 John",          abbrevPt: "1Jo", abbrevEn: "1John",chapters: 5,  testament: "NT", group: "Epístolas Gerais" },
  { id: 63, namePt: "2 João",          nameEn: "2 John",          abbrevPt: "2Jo", abbrevEn: "2John",chapters: 1,  testament: "NT", group: "Epístolas Gerais" },
  { id: 64, namePt: "3 João",          nameEn: "3 John",          abbrevPt: "3Jo", abbrevEn: "3John",chapters: 1,  testament: "NT", group: "Epístolas Gerais" },
  { id: 65, namePt: "Judas",           nameEn: "Jude",            abbrevPt: "Jd",  abbrevEn: "Jude", chapters: 1,  testament: "NT", group: "Epístolas Gerais" },
  // Profético
  { id: 66, namePt: "Apocalipse",      nameEn: "Revelation",      abbrevPt: "Ap",  abbrevEn: "Rev",  chapters: 22, testament: "NT", group: "Profético" },
];

export const BOOK_GROUPS_AT = [
  "Pentateuco", "Históricos", "Poéticos", "Profetas Maiores", "Profetas Menores"
];

export const BOOK_GROUPS_NT = [
  "Evangelhos", "Histórico", "Epístolas Paulinas", "Epístolas Gerais", "Profético"
];

export function getBookByName(name: string): BibleBook | undefined {
  const lower = name.toLowerCase();
  return BIBLE_BOOKS.find(
    b => b.namePt.toLowerCase() === lower ||
         b.nameEn.toLowerCase() === lower ||
         b.abbrevPt.toLowerCase() === lower ||
         b.abbrevEn.toLowerCase() === lower
  );
}

export function getBooksByTestament(testament: "AT" | "NT"): BibleBook[] {
  return BIBLE_BOOKS.filter(b => b.testament === testament);
}

export function getBooksByGroup(group: string): BibleBook[] {
  return BIBLE_BOOKS.filter(b => b.group === group);
}
