import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BIBLE_BOOKS = [
  { id: 1,  namePt: "Gênesis",         nameEn: "Genesis",         abbreviation: "Gn",  chapters: 50, testament: "OT", yearStart: -2100 },
  { id: 2,  namePt: "Êxodo",           nameEn: "Exodus",          abbreviation: "Ex",  chapters: 40, testament: "OT", yearStart: -1446 },
  { id: 3,  namePt: "Levítico",        nameEn: "Leviticus",       abbreviation: "Lv",  chapters: 27, testament: "OT", yearStart: -1445 },
  { id: 4,  namePt: "Números",         nameEn: "Numbers",         abbreviation: "Nm",  chapters: 36, testament: "OT", yearStart: -1440 },
  { id: 5,  namePt: "Deuteronômio",    nameEn: "Deuteronomy",     abbreviation: "Dt",  chapters: 34, testament: "OT", yearStart: -1406 },
  { id: 6,  namePt: "Josué",           nameEn: "Joshua",          abbreviation: "Js",  chapters: 24, testament: "OT", yearStart: -1400 },
  { id: 7,  namePt: "Juízes",          nameEn: "Judges",          abbreviation: "Jz",  chapters: 21, testament: "OT", yearStart: -1380 },
  { id: 8,  namePt: "Rute",            nameEn: "Ruth",            abbreviation: "Rt",  chapters: 4,  testament: "OT", yearStart: -1100 },
  { id: 9,  namePt: "1 Samuel",        nameEn: "1 Samuel",        abbreviation: "1Sm", chapters: 31, testament: "OT", yearStart: -1050 },
  { id: 10, namePt: "2 Samuel",        nameEn: "2 Samuel",        abbreviation: "2Sm", chapters: 24, testament: "OT", yearStart: -1010 },
  { id: 11, namePt: "1 Reis",          nameEn: "1 Kings",         abbreviation: "1Rs", chapters: 22, testament: "OT", yearStart: -970 },
  { id: 12, namePt: "2 Reis",          nameEn: "2 Kings",         abbreviation: "2Kgs", chapters: 25, testament: "OT", yearStart: -850 },
  { id: 13, namePt: "1 Crônicas",      nameEn: "1 Chronicles",    abbreviation: "1Cr", chapters: 29, testament: "OT" },
  { id: 14, namePt: "2 Crônicas",      nameEn: "2 Chronicles",    abbreviation: "2Cr", chapters: 36, testament: "OT" },
  { id: 15, namePt: "Esdras",          nameEn: "Ezra",            abbreviation: "Ed",  chapters: 10, testament: "OT" },
  { id: 16, namePt: "Neemias",         nameEn: "Nehemiah",        abbreviation: "Ne",  chapters: 13, testament: "OT" },
  { id: 17, namePt: "Ester",           nameEn: "Esther",          abbreviation: "Et",  chapters: 10, testament: "OT" },
  { id: 18, namePt: "Jó",              nameEn: "Job",             abbreviation: "Jó",  chapters: 42, testament: "OT" },
  { id: 19, namePt: "Salmos",          nameEn: "Psalms",          abbreviation: "Sl",  chapters: 150, testament: "OT" },
  { id: 20, namePt: "Provérbios",      nameEn: "Proverbs",        abbreviation: "Pv",  chapters: 31, testament: "OT" },
  { id: 21, namePt: "Eclesiastes",     nameEn: "Ecclesiastes",    abbreviation: "Ec",  chapters: 12, testament: "OT" },
  { id: 22, namePt: "Cantares",        nameEn: "Song of Solomon", abbreviation: "Ct",  chapters: 8,  testament: "OT" },
  { id: 23, namePt: "Isaías",          nameEn: "Isaiah",          abbreviation: "Is",  chapters: 66, testament: "OT" },
  { id: 24, namePt: "Jeremias",        nameEn: "Jeremiah",        abbreviation: "Jr",  chapters: 52, testament: "OT" },
  { id: 25, namePt: "Lamentações",     nameEn: "Lamentations",    abbreviation: "Lm",  chapters: 5,  testament: "OT" },
  { id: 26, namePt: "Ezequiel",        nameEn: "Ezekiel",         abbreviation: "Ez",  chapters: 48, testament: "OT" },
  { id: 27, namePt: "Daniel",          nameEn: "Daniel",          abbreviation: "Dn",  chapters: 12, testament: "OT" },
  { id: 28, namePt: "Oséias",          nameEn: "Hosea",           abbreviation: "Os",  chapters: 14, testament: "OT" },
  { id: 29, namePt: "Joel",            nameEn: "Joel",            abbreviation: "Jl",  chapters: 3,  testament: "OT" },
  { id: 30, namePt: "Amós",            nameEn: "Amos",            abbreviation: "Am",  chapters: 9,  testament: "OT" },
  { id: 31, namePt: "Obadias",         nameEn: "Obadiah",         abbreviation: "Ob",  chapters: 1,  testament: "OT" },
  { id: 32, namePt: "Jonas",           nameEn: "Jonah",           abbreviation: "Jn",  chapters: 4,  testament: "OT" },
  { id: 33, namePt: "Miquéias",        nameEn: "Micah",           abbreviation: "Mq",  chapters: 7,  testament: "OT" },
  { id: 34, namePt: "Naum",            nameEn: "Nahum",           abbreviation: "Na",  chapters: 3,  testament: "OT" },
  { id: 35, namePt: "Habacuque",       nameEn: "Habakkuk",        abbreviation: "Hc",  chapters: 3,  testament: "OT" },
  { id: 36, namePt: "Sofonias",        nameEn: "Zephaniah",       abbreviation: "Sf",  chapters: 3,  testament: "OT" },
  { id: 37, namePt: "Ageu",            nameEn: "Haggai",          abbreviation: "Ag",  chapters: 2,  testament: "OT" },
  { id: 38, namePt: "Zacarias",        nameEn: "Zechariah",       abbreviation: "Zc",  chapters: 14, testament: "OT" },
  { id: 39, namePt: "Malaquias",       nameEn: "Malachi",         abbreviation: "Ml",  chapters: 4,  testament: "OT" },
  { id: 40, namePt: "Mateus",          nameEn: "Matthew",         abbreviation: "Mt",  chapters: 28, testament: "NT", yearStart: 28 },
  { id: 41, namePt: "Marcos",          nameEn: "Mark",            abbreviation: "Mc",  chapters: 16, testament: "NT", yearStart: 27 },
  { id: 42, namePt: "Lucas",           nameEn: "Luke",            abbreviation: "Lc",  chapters: 24, testament: "NT", yearStart: 26 },
  { id: 43, namePt: "João",            nameEn: "John",            abbreviation: "Jo",  chapters: 21, testament: "NT", yearStart: 29 },
  { id: 44, namePt: "Atos",            nameEn: "Acts",            abbreviation: "At",  chapters: 28, testament: "NT", yearStart: 30 },
  { id: 45, namePt: "Romanos",         nameEn: "Romans",          abbreviation: "Rm",  chapters: 16, testament: "NT" },
  { id: 46, namePt: "1 Coríntios",     nameEn: "1 Corinthians",   abbreviation: "1Co", chapters: 16, testament: "NT" },
  { id: 47, namePt: "2 Coríntios",     nameEn: "2 Corinthians",   abbreviation: "2Co", chapters: 13, testament: "NT" },
  { id: 48, namePt: "Gálatas",         nameEn: "Galatians",       abbreviation: "Gl",  chapters: 6,  testament: "NT" },
  { id: 49, namePt: "Efésios",         nameEn: "Ephesians",       abbreviation: "Ef",  chapters: 6,  testament: "NT" },
  { id: 50, namePt: "Filipenses",      nameEn: "Philippians",     abbreviation: "Fp",  chapters: 4,  testament: "NT" },
  { id: 51, namePt: "Colossenses",     nameEn: "Colossians",      abbreviation: "Cl",  chapters: 4,  testament: "NT" },
  { id: 52, namePt: "1 Tessalonicenses", nameEn: "1 Thessalonians", abbreviation: "1Ts", chapters: 5, testament: "NT" },
  { id: 53, namePt: "2 Tessalonicenses", nameEn: "2 Thessalonians", abbreviation: "2Ts", chapters: 3, testament: "NT" },
  { id: 54, namePt: "1 Timóteo",       nameEn: "1 Timothy",       abbreviation: "1Tm", chapters: 6,  testament: "NT" },
  { id: 55, namePt: "2 Timóteo",       nameEn: "2 Timothy",       abbreviation: "2Tm", chapters: 4,  testament: "NT" },
  { id: 56, namePt: "Tito",            nameEn: "Titus",           abbreviation: "Tt",  chapters: 3,  testament: "NT" },
  { id: 57, namePt: "Filemom",         nameEn: "Philemon",        abbreviation: "Fm",  chapters: 1,  testament: "NT" },
  { id: 58, namePt: "Hebreus",         nameEn: "Hebrews",         abbreviation: "Hb",  chapters: 13, testament: "NT" },
  { id: 59, namePt: "Tiago",           nameEn: "James",           abbreviation: "Tg",  chapters: 5,  testament: "NT" },
  { id: 60, namePt: "1 Pedro",         nameEn: "1 Peter",         abbreviation: "1Pe", chapters: 5,  testament: "NT" },
  { id: 61, namePt: "2 Pedro",         nameEn: "2 Peter",         abbreviation: "2Pe", chapters: 3,  testament: "NT" },
  { id: 62, namePt: "1 João",          nameEn: "1 John",          abbreviation: "1Jo", chapters: 5,  testament: "NT" },
  { id: 63, namePt: "2 João",          nameEn: "2 John",          abbreviation: "2Jo", chapters: 1,  testament: "NT" },
  { id: 64, namePt: "3 João",          nameEn: "3 John",          abbreviation: "3Jo", chapters: 1,  testament: "NT" },
  { id: 65, namePt: "Judas",           nameEn: "Jude",            abbreviation: "Jd",  chapters: 1,  testament: "NT" },
  { id: 66, namePt: "Apocalipse",      nameEn: "Revelation",      abbreviation: "Ap",  chapters: 22, testament: "NT" },
];

async function main() {
  console.log('Seed Enterprise: Populando 66 Livros da Bíblia...');
  for (const book of BIBLE_BOOKS) {
    await prisma.book.upsert({
      where: { id: book.id },
      update: book,
      create: book,
    });
  }
  console.log('Seed Enterprise: Concluído!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
