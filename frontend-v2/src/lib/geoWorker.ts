console.log("[geoWorker] Script loading...");
import * as duckdb from "@duckdb/duckdb-wasm";
import { SEED_LOCATIONS } from "../data/geoSeedData";
import { serializeTrekToBinary } from "./geoBinary";
import {
  BIBLE_BOOK_TO_ID,
  getOriginalLanguageTranslation,
  stripHtml,
} from "./bibleUtils";
import { transliterateBiblical } from "./transliteration";
import { STRONGS_GREEK } from "../data/strongsGreek";
import { STRONGS_HEBREW } from "../data/strongsHebrew";
import { OFFLINE_SEED_VERSES } from "../data/seedVerses";

let abibliaToken = "";

self.onerror = (message, source, lineno, colno, error) => {
  self.postMessage({
    type: "WORKER_ERROR",
    payload: {
      message: `Worker Global Error: ${message}`,
      source,
      lineno,
      error,
    },
  });
};

// --- Input sanitization helpers (SQL injection defense for DuckDB WASM) ---
function sanitizeStr(s: string): string {
  return s.replace(/'/g, "''").replace(/[;\-\-]/g, "");
}
function sanitizeInt(n: any): number {
  const parsed = parseInt(String(n), 10);
  return isNaN(parsed) ? 0 : parsed;
}

// --- Mapping from Bible Book ID to English book name expected by bible-api.com ---
const BIBLE_ID_TO_ENGLISH_BOOK: Record<number, string> = {
  1: "Genesis",
  2: "Exodus",
  3: "Leviticus",
  4: "Numbers",
  5: "Deuteronomy",
  6: "Joshua",
  7: "Judges",
  8: "Ruth",
  9: "1 Samuel",
  10: "2 Samuel",
  11: "1 Kings",
  12: "2 Kings",
  13: "1 Chronicles",
  14: "2 Chronicles",
  15: "Ezra",
  16: "Nehemiah",
  17: "Esther",
  18: "Job",
  19: "Psalms",
  20: "Proverbs",
  21: "Ecclesiastes",
  22: "Song of Solomon",
  23: "Isaiah",
  24: "Jeremiah",
  25: "Lamentations",
  26: "Ezekiel",
  27: "Daniel",
  28: "Hosea",
  29: "Joel",
  30: "Amos",
  31: "Obadiah",
  32: "Jonah",
  33: "Micah",
  34: "Nahum",
  35: "Habakkuk",
  36: "Zephaniah",
  37: "Haggai",
  38: "Zechariah",
  39: "Malachi",
  40: "Matthew",
  41: "Mark",
  42: "Luke",
  43: "John",
  44: "Acts",
  45: "Romans",
  46: "1 Corinthians",
  47: "2 Corinthians",
  48: "Galatians",
  49: "Ephesians",
  50: "Philippians",
  51: "Colossians",
  52: "1 Thessalonians",
  53: "2 Thessalonians",
  54: "1 Timothy",
  55: "2 Timothy",
  56: "Titus",
  57: "Philemon",
  58: "Hebrews",
  59: "James",
  60: "1 Peter",
  61: "2 Peter",
  62: "1 John",
  63: "2 John",
  64: "3 John",
  65: "Jude",
  66: "Revelation",
};

function getEnglishBookName(book: string): string {
  const id =
    BIBLE_BOOK_TO_ID[book] ||
    BIBLE_BOOK_TO_ID[
      book.charAt(0).toUpperCase() + book.slice(1).toLowerCase()
    ];
  if (id && BIBLE_ID_TO_ENGLISH_BOOK[id]) {
    return BIBLE_ID_TO_ENGLISH_BOOK[id];
  }
  return book;
}

// --- Mapping from Bible Book ID to standard Portuguese abbreviation expected by abibliadigital.com.br ---
const BIBLE_ID_TO_ABIBLIADIGITAL_BOOK: Record<number, string> = {
  1: "gn",
  2: "ex",
  3: "lv",
  4: "nm",
  5: "dt",
  6: "js",
  7: "jz",
  8: "rt",
  9: "1sm",
  10: "2sm",
  11: "1rs",
  12: "2rs",
  13: "1cr",
  14: "2cr",
  15: "ed",
  16: "ne",
  17: "et",
  18: "job",
  19: "sl",
  20: "pv",
  21: "ec",
  22: "ct",
  23: "is",
  24: "jr",
  25: "lm",
  26: "ez",
  27: "dn",
  28: "os",
  29: "jl",
  30: "am",
  31: "ob",
  32: "jn",
  33: "mq",
  34: "na",
  35: "hc",
  36: "sf",
  37: "ag",
  38: "zc",
  39: "ml",
  40: "mt",
  41: "mc",
  42: "lc",
  43: "jo",
  44: "at",
  45: "rm",
  46: "1co",
  47: "2co",
  48: "gl",
  49: "ef",
  50: "fp",
  51: "cl",
  52: "1ts",
  53: "2ts",
  54: "1tm",
  55: "2tm",
  56: "tt",
  57: "fm",
  58: "hb",
  59: "tg",
  60: "1pe",
  61: "2pe",
  62: "1jo",
  63: "2jo",
  64: "3jo",
  65: "jd",
  66: "ap",
};

function getABibliaDigitalBookName(book: string): string {
  const id =
    BIBLE_BOOK_TO_ID[book] ||
    BIBLE_BOOK_TO_ID[
      book.charAt(0).toUpperCase() + book.slice(1).toLowerCase()
    ];
  if (id && BIBLE_ID_TO_ABIBLIADIGITAL_BOOK[id]) {
    return BIBLE_ID_TO_ABIBLIADIGITAL_BOOK[id];
  }
  return book.toLowerCase();
}

// --- Mapping from Bible Book ID to standard 3-letter uppercase abbreviation expected by api.bible ---
const BIBLE_ID_TO_APIBIBLE_BOOK: Record<number, string> = {
  1: "GEN",
  2: "EXO",
  3: "LEV",
  4: "NUM",
  5: "DEU",
  6: "JOS",
  7: "JDG",
  8: "RUT",
  9: "1SA",
  10: "2SA",
  11: "1KI",
  12: "2KI",
  13: "1CH",
  14: "2CH",
  15: "EZR",
  16: "NEH",
  17: "EST",
  18: "JOB",
  19: "PSA",
  20: "PRO",
  21: "ECC",
  22: "SNG",
  23: "ISA",
  24: "JER",
  25: "LAM",
  26: "EZK",
  27: "DAN",
  28: "HOS",
  29: "JOL",
  30: "AMO",
  31: "OBA",
  32: "JON",
  33: "MIC",
  34: "NAM",
  35: "HAB",
  36: "ZEP",
  37: "HAG",
  38: "ZEC",
  39: "MAL",
  40: "MAT",
  41: "MRK",
  42: "LUK",
  43: "JHN",
  44: "ACT",
  45: "ROM",
  46: "1CO",
  47: "2CO",
  48: "GAL",
  49: "EPH",
  50: "PHP",
  51: "COL",
  52: "1TH",
  53: "2TH",
  54: "1TI",
  55: "2TI",
  56: "TIT",
  57: "PHM",
  58: "HEB",
  59: "JAS",
  60: "1PE",
  61: "2PE",
  62: "1JN",
  63: "2JN",
  64: "3JN",
  65: "JUD",
  66: "REV",
};

function getAPIBibleBookName(book: string): string {
  const id =
    BIBLE_BOOK_TO_ID[book] ||
    BIBLE_BOOK_TO_ID[
      book.charAt(0).toUpperCase() + book.slice(1).toLowerCase()
    ];
  if (id && BIBLE_ID_TO_APIBIBLE_BOOK[id]) {
    return BIBLE_ID_TO_APIBIBLE_BOOK[id];
  }
  return book.substring(0, 3).toUpperCase();
}

let db: duckdb.AsyncDuckDB;
let conn: duckdb.AsyncDuckDBConnection;
let dbReady = false;

/**
 * TheoSphere Engine: Optimized DuckDB WASM Worker
 */
async function initDB() {
  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

  const worker = new Worker(bundle.mainWorker!);
  const logger = new duckdb.ConsoleLogger();
  db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

  await db.open({ path: ":memory:" });
  conn = await db.connect();

  await conn.query(`
    CREATE TABLE IF NOT EXISTS biblical_locations (
      id VARCHAR PRIMARY KEY, canonical_name VARCHAR, lon DOUBLE, lat DOUBLE, alt DOUBLE,
      start_year INTEGER, end_year INTEGER, type VARCHAR
    );
  `);

  const checkData = await conn.query(
    `SELECT count(*) as count FROM biblical_locations`,
  );
  if (Number(checkData.toArray()[0].count) === 0) {
    const locStmt = await conn.prepare(
      `INSERT INTO biblical_locations VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const loc of SEED_LOCATIONS) {
      const l = loc as any;
      await locStmt.query(
        l.id,
        l.names.canonical,
        l.coordinates[0],
        l.coordinates[1],
        l.coordinates[2] || 0,
        l.period_start ?? l.timeline?.start_year ?? -4000,
        l.period_end ?? l.timeline?.end_year ?? 2100,
        l.type,
      );
    }
  }

  // ── Bible text cache table ──────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS bible_text (
      id VARCHAR PRIMARY KEY,
      book VARCHAR NOT NULL,
      chapter INTEGER NOT NULL,
      verse INTEGER NOT NULL,
      text TEXT NOT NULL,
      translation VARCHAR NOT NULL,
      strongs TEXT DEFAULT '{}'
    );
  `);

  // ── Lexicon & Analytics tables ───────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS lexicon (
      strong_id VARCHAR PRIMARY KEY,
      lemma VARCHAR NOT NULL,
      transliteration VARCHAR,
      definition TEXT,
      part_of_speech VARCHAR,
      morphology JSON
    );

    CREATE TABLE IF NOT EXISTS word_occurrences (
      book VARCHAR NOT NULL,
      strong_id VARCHAR NOT NULL,
      verse_id VARCHAR NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_occurrences_book_strong ON word_occurrences (book, strong_id);
    CREATE INDEX IF NOT EXISTS idx_lexicon_strong ON lexicon (strong_id);
  `);

  const bibleCheck = await conn.query(
    `SELECT count(*) as count FROM bible_text`,
  );
  if (Number(bibleCheck.toArray()[0].count) === 0) {
    for (const v of OFFLINE_SEED_VERSES) {
      const safeText = v.text.replace(/'/g, "''");
      await conn.query(`
        INSERT INTO bible_text (id, book, chapter, verse, text, translation, strongs)
        VALUES ('${v.id}', '${v.book}', ${v.chapter}, ${v.verse}, '${safeText}', '${v.translation}', '{}')
        ON CONFLICT (id) DO NOTHING
      `);
    }
  }
}

let dbPromise: Promise<void>;
try {
  dbPromise = initDB()
    .then(() => {
      dbReady = true;
    })
    .catch((err) => {
      console.warn(
        "[TheoWorker] DuckDB init failed (will work without cache):",
        err,
      );
      dbReady = false;
    });
} catch (e) {
  console.warn("[TheoWorker] DuckDB init threw (will work without cache):", e);
  dbReady = false;
  dbPromise = Promise.resolve();
}

// ---------------------------------------------------------------------------
// Helper: persist fetched verses into DuckDB cache (non-fatal)
// ---------------------------------------------------------------------------
async function cacheVersesInDuckDB(
  book: string,
  chapter: number,
  translation: string,
  verses: Array<{ verse: number; text: string; strongs?: string }>,
): Promise<void> {
  try {
    const bookKey = book.toLowerCase().replace(/\s+/g, "_");
    const trans = translation.toLowerCase();
    for (const v of verses) {
      const safeText = v.text.replace(/'/g, "''");
      const id = `${bookKey}_${chapter}_${v.verse}_${trans}`;
      await conn.query(`
        INSERT INTO bible_text (id, book, chapter, verse, text, translation, strongs)
        VALUES ('${id}', '${book}', ${chapter}, ${v.verse}, '${safeText}', '${trans}', '{}')
        ON CONFLICT (id) DO NOTHING
      `);

      // Index word occurrences for frequency analysis
      const strongsMatches = v.text.match(/<([GH]\d+)>/g);
      if (strongsMatches) {
        for (const match of strongsMatches) {
          const strongId = match.replace(/[<>]/g, "");
          await conn.query(`
            INSERT INTO word_occurrences (book, strong_id, verse_id)
            VALUES ('${sanitizeStr(book)}', '${sanitizeStr(strongId)}', '${id}')
          `);
        }
      }
    }
  } catch (cacheErr) {
    console.warn("[TheoWorker] Cache write failed (non-fatal):", cacheErr);
  }
}

// ---------------------------------------------------------------------------
// Background prefetch: downloads and caches frequently-consulted chapters
// silently, without blocking worker initialization.
// ---------------------------------------------------------------------------
const PREFETCH_LIST = [
  { book: "João", chapter: 1, translation: "almeida" },
  { book: "João", chapter: 3, translation: "almeida" },
  { book: "João", chapter: 11, translation: "almeida" },
  { book: "Romanos", chapter: 8, translation: "almeida" },
  { book: "Salmos", chapter: 23, translation: "almeida" },
  { book: "Salmos", chapter: 51, translation: "almeida" },
  { book: "Mateus", chapter: 5, translation: "almeida" },
  { book: "Gênesis", chapter: 1, translation: "almeida" },
  { book: "Isaías", chapter: 53, translation: "almeida" },
  { book: "Apocalipse", chapter: 1, translation: "almeida" },
];

async function prefetchEssentialChapters(backendUrl?: string): Promise<void> {
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  const extractVerses = (json: any): any[] => {
    if (json && json.success && json.data && Array.isArray(json.data.verses))
      return json.data.verses;
    if (Array.isArray(json)) return json;
    return [];
  };
  for (const item of PREFETCH_LIST) {
    try {
      const { book, chapter, translation } = item;
      const trans = translation.toLowerCase();
      const countResult = await conn.query(
        `SELECT count(*) as cnt FROM bible_text WHERE book = '${sanitizeStr(book)}' AND chapter = ${sanitizeInt(chapter)} AND translation = '${sanitizeStr(trans)}'`,
      );
      const cnt = Number(countResult.toArray()[0].cnt);
      if (cnt > 0) {
        continue; // already cached
      }
      const bookId = BIBLE_BOOK_TO_ID[book];
      if (!bookId) continue;

      // 1ª: Nosso backend
      let verses: any[] = [];
      try {
        const baseUrl = backendUrl || "http://localhost:3002/api/v1/bible";
        const res = await fetch(
          `${baseUrl.replace(/\/$/, "")}/chapter?book=${encodeURIComponent(book)}&chapter=${chapter}&translation=${trans}`,
        );
        if (res.ok) verses = extractVerses(await res.json());
      } catch (_) {}

      // 1.5ª: abibliadigital fallback
      if (verses.length === 0) {
        const ABIBLIA_DIGITAL_MAPPING: Record<string, string> = {
          nvipt: "nvi",
          ara: "ra",
          acf: "acf",
          almeida: "acf",
        };
        const abVersion = ABIBLIA_DIGITAL_MAPPING[trans] || "acf";
        try {
          const ptBookAbbrev = getABibliaDigitalBookName(book);
          const res = await fetch(
            `https://www.abibliadigital.com.br/api/verses/${abVersion}/${ptBookAbbrev}/${chapter}`,
            {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                Accept: "application/json",
                ...(abibliaToken
                  ? { Authorization: `Bearer ${abibliaToken}` }
                  : {}),
              },
            },
          );
          if (res.ok) {
            const data = await res.json();
            if (data.verses && Array.isArray(data.verses)) {
              verses = data.verses.map((v: any) => ({
                verse: Number(v.number),
                text: stripHtml(v.text),
              }));
            }
          }
        } catch (_) {}
      }

      // 2ª: bolls.life fallback
      if (verses.length === 0) {
        const transUpper = trans === "almeida" ? "NVIPT" : trans.toUpperCase();
        try {
          const res = await fetch(
            `https://bolls.life/get-chapter/${transUpper}/${bookId}/${chapter}/`,
          );
          if (res.ok) verses = extractVerses(await res.json());
        } catch (_) {}
      }

      // 3ª: bible-api.com fallback
      if (verses.length === 0) {
        try {
          const englishBook = getEnglishBookName(book);
          const res = await fetch(
            `https://bible-api.com/${encodeURIComponent(englishBook)}+${chapter}?translation=${trans}`,
          );
          if (res.ok) {
            const data = await res.json();
            if (data.verses && Array.isArray(data.verses)) {
              verses = data.verses.map((v: any) => ({
                verse: v.verse,
                text: stripHtml(v.text),
              }));
            }
          }
        } catch (_) {}
      }

      if (verses.length > 0) {
        const mapped = verses.map((v: any) => ({
          verse: v.verse,
          text: stripHtml(v.text),
          strongs: "{}",
        }));
        await cacheVersesInDuckDB(book, chapter, translation, mapped);
      }
    } catch (err) {
      console.warn(
        `[TheoWorker] Prefetch failed for ${item.book} ${item.chapter}:`,
        err,
      );
    }
    await sleep(2000);
  }
}

/**
 * downloadFullBible — Baixa e guarda no DuckDB todos os capítulos de todos os livros
 * para que a Bíblia esteja 100% disponível offline.
 */
async function downloadFullBible(backendUrl?: string) {
  const books = [
    { name: "Genesis", chapters: 50 },
    { name: "Exodus", chapters: 40 },
    { name: "Leviticus", chapters: 27 },
    { name: "Numbers", chapters: 36 },
    { name: "Deuteronomy", chapters: 34 },
    { name: "Joshua", chapters: 24 },
    { name: "Judges", chapters: 21 },
    { name: "Ruth", chapters: 4 },
    { name: "1 Samuel", chapters: 31 },
    { name: "2 Samuel", chapters: 24 },
    { name: "1 Kings", chapters: 22 },
    { name: "2 Kings", chapters: 25 },
    { name: "1 Chronicles", chapters: 29 },
    { name: "2 Chronicles", chapters: 36 },
    { name: "Ezra", chapters: 10 },
    { name: "Nehemiah", chapters: 13 },
    { name: "Esther", chapters: 10 },
    { name: "Job", chapters: 18 },
    { name: "Psalms", chapters: 150 },
    { name: "Proverbs", chapters: 31 },
    { name: "Ecclesiastes", chapters: 12 },
    { name: "Song of Solomon", chapters: 8 },
    { name: "Isaiah", chapters: 66 },
    { name: "Jeremiah", chapters: 52 },
    { name: "Lamentations", chapters: 5 },
    { name: "Ezekiel", chapters: 48 },
    { name: "Daniel", chapters: 12 },
    { name: "Hosea", chapters: 14 },
    { name: "Joel", chapters: 3 },
    { name: "Amos", chapters: 9 },
    { name: "Obadiah", chapters: 1 },
    { name: "Jonah", chapters: 4 },
    { name: "Micah", chapters: 7 },
    { name: "Nahum", chapters: 3 },
    { name: "Habakkuk", chapters: 3 },
    { name: "Zephaniah", chapters: 3 },
    { name: "Haggai", chapters: 2 },
    { name: "Zechariah", chapters: 14 },
    { name: "Malachi", chapters: 4 },
    { name: "Matthew", chapters: 28 },
    { name: "Mark", chapters: 16 },
    { name: "Luke", chapters: 24 },
    { name: "John", chapters: 21 },
    { name: "Acts", chapters: 28 },
    { name: "Romans", chapters: 16 },
    { name: "1 Corinthians", chapters: 16 },
    { name: "2 Corinthians", chapters: 13 },
    { name: "Galatians", chapters: 6 },
    { name: "Ephesians", chapters: 6 },
    { name: "Philippians", chapters: 4 },
    { name: "Colossians", chapters: 4 },
    { name: "1 Thessalonians", chapters: 5 },
    { name: "2 Thessalonians", chapters: 3 },
    { name: "1 Timothy", chapters: 6 },
    { name: "2 Timothy", chapters: 4 },
    { name: "Titus", chapters: 3 },
    { name: "Philemon", chapters: 1 },
    { name: "Hebrews", chapters: 13 },
    { name: "James", chapters: 5 },
    { name: "1 Peter", chapters: 5 },
    { name: "2 Peter", chapters: 3 },
    { name: "1 John", chapters: 5 },
    { name: "2 John", chapters: 1 },
    { name: "3 John", chapters: 1 },
    { name: "Jude", chapters: 1 },
    { name: "Revelation", chapters: 22 },
  ];

  const extractVerses = (json: any): any[] => {
    if (json && json.success && json.data && Array.isArray(json.data.verses))
      return json.data.verses;
    if (Array.isArray(json)) return json;
    return [];
  };

  const totalChapters = books.reduce((acc, b) => acc + b.chapters, 0);
  let chaptersDownloaded = 0;
  const translation = "almeida";

  for (const book of books) {
    for (let chapter = 1; chapter <= book.chapters; chapter++) {
      try {
        const trans = translation.toLowerCase();
        const check = await conn.query(
          `SELECT count(*) as cnt FROM bible_text WHERE book = '${sanitizeStr(book.name)}' AND chapter = ${sanitizeInt(chapter)} AND translation = '${sanitizeStr(trans)}'`,
        );
        const count = Number(check.toArray()[0].cnt);

        if (count === 0) {
          const bookId = BIBLE_BOOK_TO_ID[book.name];
          let rawVerses: any[] = [];

          // 1ª: nosso backend (query params)
          if (backendUrl) {
            try {
              const res = await fetch(
                `${backendUrl}/chapter?book=${encodeURIComponent(book.name)}&chapter=${chapter}&translation=${trans}`,
              );
              if (res.ok) rawVerses = extractVerses(await res.json());
            } catch (_) {}
          }

          // 1.5ª: abibliadigital fallback
          if (rawVerses.length === 0) {
            const ABIBLIA_DIGITAL_MAPPING: Record<string, string> = {
              nvipt: "nvi",
              ara: "ra",
              acf: "acf",
              almeida: "acf",
            };
            const abVersion = ABIBLIA_DIGITAL_MAPPING[trans] || "acf";
            try {
              const ptBookAbbrev = getABibliaDigitalBookName(book.name);
              const res = await fetch(
                `https://www.abibliadigital.com.br/api/verses/${abVersion}/${ptBookAbbrev}/${chapter}`,
                {
                  headers: {
                    "User-Agent":
                      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    Accept: "application/json",
                    ...(abibliaToken
                      ? { Authorization: `Bearer ${abibliaToken}` }
                      : {}),
                  },
                },
              );
              if (res.ok) {
                const data = await res.json();
                if (data.verses && Array.isArray(data.verses)) {
                  rawVerses = data.verses.map((v: any) => ({
                    verse: Number(v.number),
                    text: stripHtml(v.text),
                  }));
                }
              }
            } catch (_) {}
          }

          // 2ª: bolls.life fallback
          if (rawVerses.length === 0 && bookId) {
            const transUpper =
              trans === "almeida" ? "NVIPT" : trans.toUpperCase();
            try {
              const res = await fetch(
                `https://bolls.life/get-chapter/${transUpper}/${bookId}/${chapter}/`,
              );
              if (res.ok) rawVerses = extractVerses(await res.json());
            } catch (_) {}
          }

          // 3ª: bible-api.com fallback
          if (rawVerses.length === 0) {
            try {
              const englishBook = getEnglishBookName(book.name);
              const res = await fetch(
                `https://bible-api.com/${encodeURIComponent(englishBook)}+${chapter}?translation=${trans}`,
              );
              if (res.ok) {
                const data = await res.json();
                if (data.verses && Array.isArray(data.verses)) {
                  rawVerses = data.verses.map((v: any) => ({
                    verse: v.verse,
                    text: stripHtml(v.text),
                  }));
                }
              }
            } catch (_) {}
          }

          if (rawVerses.length > 0) {
            const verses = rawVerses.map((v: any) => ({
              verse: v.verse,
              text: stripHtml(v.text),
              strongs: "{}",
            }));
            await cacheVersesInDuckDB(book.name, chapter, translation, verses);
          }

          await new Promise((r) => setTimeout(r, 300)); // Gentle pacing
        }

        chaptersDownloaded++;
        const progress = Math.round((chaptersDownloaded / totalChapters) * 100);

        self.postMessage({
          type: "SYNC_PROGRESS",
          payload: {
            progress,
            currentBook: book.name,
            currentChapter: chapter,
            totalChapters,
          },
        });
      } catch (err) {
        console.error(`[Sync Error] ${book.name} ${chapter}:`, err);
      }
    }
  }

  self.postMessage({ type: "SYNC_COMPLETE", payload: { totalChapters } });
}

self.addEventListener("message", async (event) => {
  try {
    const { type, payload } = event.data;
    const BACKEND_URL =
      payload?.backendUrl || "http://localhost:3002/api/v1/bible";

    if (type === "INIT") {
      if (payload?.abibliaDigitalToken) {
        abibliaToken = payload.abibliaDigitalToken;
      }
      await dbPromise;
      if (dbReady) {
        await prefetchEssentialChapters(BACKEND_URL);
        setTimeout(() => downloadFullBible(BACKEND_URL), 30000);
      }
      return;
    }

    if (type === "TRIGGER_SYNC") {
      await downloadFullBible(BACKEND_URL);
      return;
    }
    if (type === "FETCH_BIBLE_CHAPTER") {
      const {
        book,
        chapter,
        translation,
        isSecondary,
        apiBibleKey,
        apiBibleId,
        abibliaDigitalToken,
      } = payload;
      if (abibliaDigitalToken) {
        abibliaToken = abibliaDigitalToken;
      }
      let verses: Array<{ verse: number; text: string; strongs?: string }> = [];
      let source: "cache" | "api" = "api";

      // ── 1. Try Local Database First (Priority) ───────────────────────
      const trans = translation.toLowerCase();
      const bookName = book; // Já normalizado para português com acento

      if (dbReady) {
        try {
          await dbPromise;
          const cached = await conn.query(`
            SELECT verse, text FROM bible_text 
            WHERE book = '${sanitizeStr(bookName)}' AND chapter = ${sanitizeInt(chapter)} AND translation = '${sanitizeStr(trans)}'
            ORDER BY verse
          `);
          const rows = cached.toArray();
          if (rows.length > 0) {
            verses = rows.map((r: any) => ({
              verse: Number(r.verse),
              text: String(r.text),
            }));
            source = "cache";
          }
        } catch (dbErr) {
          console.warn("[TheoWorker] DuckDB read failed:", dbErr);
        }
      }

      // ── 1.2 Direct Fetch from api.scripture.api.bible/v1 (Priority API if Key Available) ──
      if (verses.length === 0) {
        const isApiBible =
          (trans === "kjv" && apiBibleKey) || trans === "apibible";
        if (isApiBible) {
          const apiKey = apiBibleKey || "";
          const bibleId =
            trans === "kjv" ? "de4e12af7f28f599-01" : apiBibleId || "";

          if (apiKey && bibleId) {
            try {
              const apiBookName = getAPIBibleBookName(bookName);
              const abUrl = `https://api.scripture.api.bible/v1/bibles/${bibleId}/chapters/${apiBookName}.${chapter}?content-type=html`;
              const res = await fetch(abUrl, {
                headers: {
                  "api-key": apiKey,
                  Accept: "application/json",
                },
              });
              if (res.ok) {
                const json = await res.json();
                if (json.data && json.data.content) {
                  const htmlContent = json.data.content;
                  const parsedVerses: Array<{
                    verse: number;
                    text: string;
                    strongs?: string;
                  }> = [];
                  const regex =
                    /<span[^>]*class="v"[^>]*id="[^"]*"\s*>(\d+)<\/span>([\s\S]*?)(?=<span[^>]*class="v"[^>]*id="[^"]*"|$)/g;
                  let match;
                  while ((match = regex.exec(htmlContent)) !== null) {
                    const verseNum = Number(match[1]);
                    const verseText = stripHtml(match[2]);
                    parsedVerses.push({
                      verse: verseNum,
                      text: verseText.trim(),
                      strongs: "{}",
                    });
                  }
                  if (parsedVerses.length > 0) {
                    verses = parsedVerses;
                    source = "api";
                    if (dbReady) {
                      cacheVersesInDuckDB(
                        bookName,
                        chapter,
                        translation,
                        verses,
                      ).catch(() => {});
                    }
                  }
                }
              } else {
                console.warn(
                  `[TheoWorker] api.bible responded with status: ${res.status}`,
                );
              }
            } catch (e) {
              console.warn(
                "[TheoWorker] api.scripture.api.bible fetch failed, trying fallbacks:",
                e,
              );
            }
          }
        }
      }

      // ── 1.3 Direct Fetch from bible-api.com if supported ────────────────────────────
      if (verses.length === 0) {
        const BIBLE_API_TRANSLATIONS = [
          "almeida",
          "web",
          "kjv",
          "asv",
          "bbe",
          "darby",
          "dra",
          "ylt",
          "cherokee",
          "cuv",
          "bkr",
          "oeb-cw",
          "webbe",
          "oeb-us",
          "clementine",
          "rccv",
          "synodal",
        ];
        if (BIBLE_API_TRANSLATIONS.includes(trans)) {
          try {
            const englishBook = getEnglishBookName(bookName);
            const bibleApiUrl = `https://bible-api.com/${encodeURIComponent(englishBook)}+${chapter}?translation=${trans}`;
            const res = await fetch(bibleApiUrl);
            if (res.ok) {
              const data = await res.json();
              if (data.verses && Array.isArray(data.verses)) {
                verses = data.verses.map((v: any) => ({
                  verse: Number(v.verse),
                  text: stripHtml(v.text),
                  strongs: "{}",
                }));
                source = "api";
                if (dbReady) {
                  cacheVersesInDuckDB(
                    bookName,
                    chapter,
                    translation,
                    verses,
                  ).catch(() => {});
                }
              }
            }
          } catch (e) {
            console.warn(
              "[TheoWorker] bible-api.com fetch failed, trying fallbacks:",
              e,
            );
          }
        }
      }

      // ── 1.4 Direct Fetch from abibliadigital.com.br if requested ────────────────────
      if (verses.length === 0) {
        const ABIBLIA_DIGITAL_MAPPING: Record<string, string> = {
          nvipt: "nvi",
          ara: "ra",
          acf: "acf",
        };
        const abVersion = ABIBLIA_DIGITAL_MAPPING[trans];
        if (abVersion) {
          try {
            const ptBookAbbrev = getABibliaDigitalBookName(bookName);
            const abUrl = `https://www.abibliadigital.com.br/api/verses/${abVersion}/${ptBookAbbrev}/${chapter}`;
            const res = await fetch(abUrl, {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                Accept: "application/json",
                ...(abibliaDigitalToken || abibliaToken
                  ? {
                      Authorization: `Bearer ${abibliaDigitalToken || abibliaToken}`,
                    }
                  : {}),
              },
            });
            if (res.ok) {
              const data = await res.json();
              if (data.verses && Array.isArray(data.verses)) {
                verses = data.verses.map((v: any) => ({
                  verse: Number(v.number),
                  text: stripHtml(v.text),
                  strongs: "{}",
                }));
                source = "api";
                if (dbReady) {
                  cacheVersesInDuckDB(
                    bookName,
                    chapter,
                    translation,
                    verses,
                  ).catch(() => {});
                }
              }
            }
          } catch (e) {
            console.warn(
              "[TheoWorker] abibliadigital.com.br fetch failed, trying fallbacks:",
              e,
            );
          }
        }
      }

      // ── 1.5 Try Backend API (PostgreSQL or Sefaria) ──────────────────────────────
      if (verses.length === 0) {
        try {
          const endpoint =
            trans === "sefaria"
              ? `${BACKEND_URL}/sefaria/${encodeURIComponent(bookName)}%20${chapter}`
              : `${BACKEND_URL}/chapter?book=${encodeURIComponent(bookName)}&chapter=${chapter}&translation=${trans}`;

          const backendRes = await fetch(endpoint);
          if (backendRes.ok) {
            const json = await backendRes.json();
            if (
              json.success &&
              json.data &&
              (Array.isArray(json.data.verses) ||
                (json.data.verses && Array.isArray(json.data.verses)))
            ) {
              verses = json.data.verses.map((v: any) => ({
                verse: v.verse,
                text: stripHtml(v.text),
                strongs: "{}",
              }));
              source = "cache";

              if (dbReady && trans !== "sefaria") {
                cacheVersesInDuckDB(
                  bookName,
                  chapter,
                  translation,
                  verses,
                ).catch(() => {});
              }
            }
          }
        } catch (e) {
          console.warn("[TheoWorker] Backend API unreachable:", e);
        }
      }

      // ── 2. Fetch from API if cache miss ───────────────────────────────
      if (verses.length === 0) {
        try {
          const bookId = BIBLE_BOOK_TO_ID[book];
          // Our backend uses query params: /chapter?book=&chapter=&translation=
          const transParam = translation.toLowerCase();

          // Helper: normaliza resposta do nosso backend OU do bolls.life
          const extractVerses = (
            json: any,
          ): Array<{ verse: number; text: string }> => {
            // Nosso backend: { success: true, data: { verses: [...] } }
            if (
              json &&
              json.success &&
              json.data &&
              Array.isArray(json.data.verses)
            ) {
              return json.data.verses;
            }
            // bolls.life: array direto
            if (Array.isArray(json)) return json;
            return [];
          };

          // 1ª tentativa: nosso backend próprio (formato query-param)
          let rawData: any = [];
          try {
            const backendRes = await fetch(
              `${BACKEND_URL}/chapter?book=${encodeURIComponent(book)}&chapter=${chapter}&translation=${transParam}`,
            );
            if (backendRes.ok) {
              rawData = extractVerses(await backendRes.json());
            }
          } catch (_) {
            /* segue para fallback */
          }

          // 1.5ª tentativa: abibliadigital fallback
          if (rawData.length === 0) {
            const ABIBLIA_DIGITAL_MAPPING: Record<string, string> = {
              nvipt: "nvi",
              ara: "ra",
              acf: "acf",
            };
            const abVersion = ABIBLIA_DIGITAL_MAPPING[transParam] || "acf";
            try {
              const ptBookAbbrev = getABibliaDigitalBookName(book);
              const abUrl = `https://www.abibliadigital.com.br/api/verses/${abVersion}/${ptBookAbbrev}/${chapter}`;
              const res = await fetch(abUrl, {
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                  Accept: "application/json",
                  ...(abibliaToken
                    ? { Authorization: `Bearer ${abibliaToken}` }
                    : {}),
                },
              });
              if (res.ok) {
                const data = await res.json();
                if (data.verses && Array.isArray(data.verses)) {
                  rawData = data.verses.map((v: any) => ({
                    verse: Number(v.number),
                    text: stripHtml(v.text),
                  }));
                }
              }
            } catch (_) {
              /* segue para fallback */
            }
          }

          // 2ª tentativa: bolls.life (formato antigo path-param)
          if (rawData.length === 0 && bookId) {
            const transUpper =
              transParam === "almeida" ? "NVIPT" : transParam.toUpperCase();
            try {
              const bollsRes = await fetch(
                `https://bolls.life/get-chapter/${transUpper}/${bookId}/${chapter}/`,
              );
              if (bollsRes.ok) {
                rawData = extractVerses(await bollsRes.json());
              }
            } catch (_) {
              /* sem internet */
            }
          }

          // 3ª tentativa: bible-api.com ultimate fallback
          if (rawData.length === 0) {
            try {
              const englishBook = getEnglishBookName(book);
              const fallbackTrans = ["ara", "nvipt", "almeida"].includes(
                transParam,
              )
                ? "almeida"
                : "web";
              const bibleApiRes = await fetch(
                `https://bible-api.com/${encodeURIComponent(englishBook)}+${chapter}?translation=${fallbackTrans}`,
              );
              if (bibleApiRes.ok) {
                const data = await bibleApiRes.json();
                if (data.verses && Array.isArray(data.verses)) {
                  rawData = data.verses;
                }
              }
            } catch (_) {
              /* sem internet */
            }
          }

          if (rawData.length > 0) {
            verses = rawData.map((v: any) => ({
              verse: v.verse,
              text: stripHtml(v.text),
              strongs: "{}",
            }));
            source = "api";
            if (dbReady) {
              await cacheVersesInDuckDB(
                book,
                chapter,
                translation,
                verses,
              ).catch(() => {});
            }
          }
        } catch (e) {
          console.error("Bible fetch error:", e);
        }
      }

      const messageType = isSecondary
        ? "BIBLE_SECONDARY_DATA"
        : "BIBLE_CHAPTER_DATA";
      self.postMessage({
        type: messageType,
        payload: { book, chapter, verses, source },
      });
      return;
    }

    // --- SLOW PATH: GIS & INTERLINEAR (DB or Heavy Logic) ---
    if (type === "FETCH_INTERLINEAR_CHAPTER") {
      const { book, chapter } = payload;
      // Normalização PhD: garantir que o nome do livro bata com o mapa mesmo com espaços ou casing diferente
      const normalizedBook = book.trim();
      const bookId =
        BIBLE_BOOK_TO_ID[normalizedBook] ||
        BIBLE_BOOK_TO_ID[
          normalizedBook.charAt(0).toUpperCase() +
            normalizedBook.slice(1).toLowerCase()
        ];

      const isNT = bookId ? bookId >= 40 : false;
      const originalTrans = getOriginalLanguageTranslation(normalizedBook);

      try {
        // Helper: normaliza resposta do nosso backend OU do bolls.life
        const extractVerses = (
          json: any,
        ): Array<{ verse: number; text: string }> => {
          if (
            json &&
            json.success &&
            json.data &&
            Array.isArray(json.data.verses)
          ) {
            return json.data.verses;
          }
          if (Array.isArray(json)) return json;
          return [];
        };

        const [originalRes, ptRes] = await Promise.all([
          fetch(
            `${BACKEND_URL}/chapter?book=${encodeURIComponent(book)}&chapter=${chapter}&translation=${originalTrans.toLowerCase()}`,
          ),
          fetch(
            `${BACKEND_URL}/chapter?book=${encodeURIComponent(book)}&chapter=${chapter}&translation=nvipt`,
          ),
        ]);

        const originalDataRaw = await originalRes.json();
        const ptDataRaw = await ptRes.json();

        let originalData = extractVerses(originalDataRaw);
        let ptData = extractVerses(ptDataRaw);

        // Fallback para bolls.life se backend falhar
        if (originalData.length === 0 && bookId) {
          const oRes = await fetch(
            `https://bolls.life/get-chapter/${originalTrans.toUpperCase()}/${bookId}/${chapter}/`,
          );
          if (oRes.ok) originalData = extractVerses(await oRes.json());
        }
        if (ptData.length === 0 && bookId) {
          const pRes = await fetch(
            `https://bolls.life/get-chapter/NVIPT/${bookId}/${chapter}/`,
          );
          if (pRes.ok) ptData = extractVerses(await pRes.json());
        }

        // Validação primária para evitar crashes
        if (!Array.isArray(originalData) || originalData.length === 0)
          throw new Error("Dados originais inválidos da API");

        const interlinearMap: Record<number, any[]> = {};

        originalData.forEach((ov: any, idx: number) => {
          const ptVerse = ptData[idx] || { text: "" };
          // Regex to find word followed by <Gxxxx> or similar tags
          const wordRegex = /([^\s<]+)(?:<([GH]\d+)>)?/g;
          const oMatches = [...(ov.text || "").matchAll(wordRegex)];
          const pWords = stripHtml(ptVerse.text || "")
            .split(/\s+/)
            .filter((w) => w.length > 0);

          interlinearMap[ov.verse || idx + 1] = oMatches.map((match, i) => {
            const [full, ow, strongTag] = match;
            const cleanWord = ow.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
            const translit = transliterateBiblical(cleanWord, isNT);

            // If no tag found, use a blank or try to match if possible
            const strongId = strongTag || "";

            return {
              original: ow,
              translit,
              root: ow,
              rootTrans: translit,
              translations: [pWords[i] || "..."],
              morphology: isNT ? `Grego: ${ow}` : `Hebraico: ${ow}`,
              strong: strongId,
            };
          });
        });
        self.postMessage({
          type: "INTERLINEAR_CHAPTER_DATA",
          payload: { book, chapter, interlinearMap },
        });
      } catch (err: any) {
        self.postMessage({
          type: "WORKER_ERROR",
          payload: { message: err.message },
        });
      }
      return;
    }

    if (type === "FETCH_STRONGS") {
      const { strongId, book } = payload;

      try {
        if (dbReady) {
          // 1. Get Lexical Data
          const lexQuery = await conn.query(`
            SELECT * FROM lexicon WHERE strong_id = '${sanitizeStr(strongId)}'
          `);
          const lexRows = lexQuery.toArray();
          let entry = lexRows.length > 0 ? lexRows[0] : null;

          // 2. Calculate Frequencies (Global and Book-specific)
          const freqQuery = await conn.query(`
            SELECT 
              (SELECT count(*) FROM word_occurrences WHERE strong_id = '${sanitizeStr(strongId)}') as global_freq,
              (SELECT count(*) FROM word_occurrences WHERE strong_id = '${sanitizeStr(strongId)}' AND book = '${sanitizeStr(book || "")}') as book_freq
          `);
          const freqRows = freqQuery.toArray();
          const freqs = freqRows[0];

          if (entry) {
            self.postMessage({
              type: "STRONGS_DATA",
              payload: {
                ...entry,
                occurrences: Number(freqs.global_freq),
                bookOccurrences: Number(freqs.book_freq),
              },
            });
            return;
          }
        }
      } catch (err) {
        console.warn("[TheoWorker] DuckDB Lexicon query failed:", err);
      }

      // 2. Cache Miss: Try Backend API
      try {
        const res = await fetch(
          `${BACKEND_URL}/lexicon/${encodeURIComponent(strongId)}`,
        );
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const entry = json.data;
            const payload = {
              strong_id: entry.strongId,
              lemma: entry.word,
              transliteration: entry.morphology?.transliteration || "",
              definition: entry.definition,
              part_of_speech: entry.morphology?.partOfSpeech || "",
              occurrences: entry.morphology?.occurrences || 0,
              bookOccurrences: 0, // Calculate if needed
            };

            // Save to DuckDB for future cache hits
            if (dbReady) {
              await conn.query(`
                INSERT INTO lexicon (strong_id, lemma, transliteration, definition, part_of_speech)
                VALUES ('${sanitizeStr(payload.strong_id)}', '${sanitizeStr(payload.lemma)}', 
                        '${sanitizeStr(payload.transliteration)}', '${sanitizeStr(payload.definition)}', 
                        '${sanitizeStr(payload.part_of_speech)}')
                ON CONFLICT (strong_id) DO NOTHING
              `);
            }

            self.postMessage({ type: "STRONGS_DATA", payload });
            return;
          }
        }
      } catch (e) {
        console.warn("[TheoWorker] Backend Lexicon API unreachable:", e);
      }

      // 3. Last Resort: Fallback to static data
      const isGreek = strongId.startsWith("G");
      const data = isGreek ? STRONGS_GREEK : STRONGS_HEBREW;
      const staticEntry = Object.values(data).find(
        (e: any) => e.number === strongId,
      );

      if (staticEntry) {
        self.postMessage({
          type: "STRONGS_DATA",
          payload: {
            ...staticEntry,
            strong_id: staticEntry.number,
            lemma: staticEntry.lemma,
            definition: staticEntry.definitionPt || staticEntry.definition,
            bookOccurrences: 0, // Cannot calculate without DB
          },
        });
      } else {
        self.postMessage({
          type: "WORKER_ERROR",
          payload: { message: "Strong ID not found" },
        });
      }
      return;
    }

    if (dbReady) {
      await dbPromise;
    }

    if (type === "FILTER_BY_TIME") {
      const { startYear, endYear } = payload;
      const safeStart = sanitizeInt(startYear);
      const safeEnd = sanitizeInt(endYear);
      if (dbReady) {
        const results = await conn.query(
          `SELECT * FROM biblical_locations WHERE start_year <= ${safeEnd} AND end_year >= ${safeStart}`,
        );
        const locations = results.toArray().map((row: any) => ({
          id: row.id,
          canonical_name: row.canonical_name,
          coordinates: [row.lon, row.lat, row.alt],
          period_start: row.start_year,
          period_end: row.end_year,
          type: row.type,
        }));
        self.postMessage({
          type: "FILTERED_DATA_BINARY",
          payload: { locations, routes: [] },
        });
      } else {
        // Fallback: filter in-memory seed data
        const locations = SEED_LOCATIONS.filter((loc: any) => {
          const ps = loc.period_start ?? loc.timeline?.start_year ?? -4000;
          const pe = loc.period_end ?? loc.timeline?.end_year ?? 2100;
          return ps <= safeEnd && pe >= safeStart;
        }).map((loc: any) => ({
          id: loc.id,
          canonical_name: loc.names.canonical,
          coordinates: loc.coordinates,
          period_start: loc.period_start ?? -4000,
          period_end: loc.period_end ?? 2100,
          type: loc.type,
        }));
        self.postMessage({
          type: "FILTERED_DATA_BINARY",
          payload: { locations, routes: [] },
        });
      }
    }

    if (type === "FIND_LOCATIONS_BY_VERSE") {
      const { verseRef } = payload;
      const matched = SEED_LOCATIONS.filter((loc) =>
        loc.id.includes(verseRef.toLowerCase()),
      );
      self.postMessage({
        type: "VERSE_LOCATIONS",
        payload: { locations: matched },
      });
    }
  } catch (error: any) {
    self.postMessage({
      type: "WORKER_ERROR",
      payload: { message: error.message },
    });
  }
});
