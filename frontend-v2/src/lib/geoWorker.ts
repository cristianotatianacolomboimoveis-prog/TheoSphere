import * as duckdb from '@duckdb/duckdb-wasm';
import { SEED_LOCATIONS } from "../data/geoSeedData";
import { serializeTrekToBinary } from "./geoBinary";
import { BIBLE_BOOK_TO_ID, getOriginalLanguageTranslation, stripHtml } from "./bibleUtils";
import { transliterateBiblical } from "./transliteration";
import { STRONGS_GREEK } from "../data/strongsGreek";
import { STRONGS_HEBREW } from "../data/strongsHebrew";
import { OFFLINE_SEED_VERSES } from "../data/seedVerses";

// --- Input sanitization helpers (SQL injection defense for DuckDB WASM) ---
function sanitizeStr(s: string): string {
  return s.replace(/'/g, "''").replace(/[;\-\-]/g, '');
}
function sanitizeInt(n: any): number {
  const parsed = parseInt(String(n), 10);
  return isNaN(parsed) ? 0 : parsed;
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

  await db.open({ path: ':memory:' });
  conn = await db.connect();

  await conn.query(`
    CREATE TABLE IF NOT EXISTS biblical_locations (
      id VARCHAR PRIMARY KEY, canonical_name VARCHAR, lon DOUBLE, lat DOUBLE, alt DOUBLE,
      start_year INTEGER, end_year INTEGER, type VARCHAR
    );
  `);

  const checkData = await conn.query(`SELECT count(*) as count FROM biblical_locations`);
  if (Number(checkData.toArray()[0].count) === 0) {
    const locStmt = await conn.prepare(`INSERT INTO biblical_locations VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
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
        l.type
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

  const bibleCheck = await conn.query(`SELECT count(*) as count FROM bible_text`);
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

  // ── Seed Lexicon from static data ────────────────────────────────────────
  const lexCheck = await conn.query(`SELECT count(*) as count FROM lexicon`);
  if (Number(lexCheck.toArray()[0].count) === 0) {
    const lexStmt = await conn.prepare(`
      INSERT INTO lexicon (strong_id, lemma, transliteration, definition, part_of_speech, morphology)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (strong_id) DO NOTHING
    `);
    
    // Seed Greek
    for (const entry of Object.values(STRONGS_GREEK)) {
      await lexStmt.query(
        entry.number,
        entry.lemma,
        entry.transliteration,
        entry.definitionPt || entry.definition,
        entry.partOfSpeech,
        JSON.stringify({})
      );
    }
    // Seed Hebrew (if available in current imports)
    for (const entry of Object.values(STRONGS_HEBREW)) {
      await lexStmt.query(
        entry.number,
        entry.lemma,
        entry.transliteration,
        entry.definitionPt || entry.definition,
        entry.partOfSpeech,
        JSON.stringify({})
      );
    }
  }
}

let dbPromise: Promise<void>;
try {
  dbPromise = initDB().then(() => {
    dbReady = true;
    prefetchEssentialChapters(); // fire and forget
  }).catch(err => {
    console.warn("[TheoWorker] DuckDB init failed (will work without cache):", err);
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
  verses: Array<{ verse: number; text: string; strongs?: string }>
): Promise<void> {
  try {
    const bookKey = book.toLowerCase().replace(/\s+/g, '_');
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
  { book: "João",       chapter: 1,  translation: "almeida" },
  { book: "João",       chapter: 3,  translation: "almeida" },
  { book: "João",       chapter: 11, translation: "almeida" },
  { book: "Romanos",     chapter: 8,  translation: "almeida" },
  { book: "Salmos",     chapter: 23, translation: "almeida" },
  { book: "Salmos",     chapter: 51, translation: "almeida" },
  { book: "Mateus",    chapter: 5,  translation: "almeida" },
  { book: "Gênesis",    chapter: 1,  translation: "almeida" },
  { book: "Isaías",     chapter: 53, translation: "almeida" },
  { book: "Apocalipse", chapter: 1,  translation: "almeida" },
];

async function prefetchEssentialChapters(): Promise<void> {
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const extractVerses = (json: any): any[] => {
    if (json && json.success && json.data && Array.isArray(json.data.verses)) return json.data.verses;
    if (Array.isArray(json)) return json;
    return [];
  };
  for (const item of PREFETCH_LIST) {
    try {
      const { book, chapter, translation } = item;
      const trans = translation.toLowerCase();
      const countResult = await conn.query(
        `SELECT count(*) as cnt FROM bible_text WHERE book = '${sanitizeStr(book)}' AND chapter = ${sanitizeInt(chapter)} AND translation = '${sanitizeStr(trans)}'`
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
        const res = await fetch(`http://localhost:3002/api/v1/bible/chapter?book=${encodeURIComponent(book)}&chapter=${chapter}&translation=${trans}`);
        if (res.ok) verses = extractVerses(await res.json());
      } catch (_) {}

      // 2ª: bolls.life fallback
      if (verses.length === 0) {
        const transUpper = trans === "almeida" ? "NVIPT" : trans.toUpperCase();
        try {
          const res = await fetch(`https://bolls.life/get-chapter/${transUpper}/${bookId}/${chapter}/`);
          if (res.ok) verses = extractVerses(await res.json());
        } catch (_) {}
      }

      if (verses.length > 0) {
        const mapped = verses.map((v: any) => ({ verse: v.verse, text: stripHtml(v.text), strongs: "{}" }));
        await cacheVersesInDuckDB(book, chapter, translation, mapped);
      }
    } catch (err) {
      console.warn(`[TheoWorker] Prefetch failed for ${item.book} ${item.chapter}:`, err);
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
    { name: "Genesis", chapters: 50 }, { name: "Exodus", chapters: 40 }, { name: "Leviticus", chapters: 27 },
    { name: "Numbers", chapters: 36 }, { name: "Deuteronomy", chapters: 34 }, { name: "Joshua", chapters: 24 },
    { name: "Judges", chapters: 21 }, { name: "Ruth", chapters: 4 }, { name: "1 Samuel", chapters: 31 },
    { name: "2 Samuel", chapters: 24 }, { name: "1 Kings", chapters: 22 }, { name: "2 Kings", chapters: 25 },
    { name: "1 Chronicles", chapters: 29 }, { name: "2 Chronicles", chapters: 36 }, { name: "Ezra", chapters: 10 },
    { name: "Nehemiah", chapters: 13 }, { name: "Esther", chapters: 10 }, { name: "Job", chapters: 18 },
    { name: "Psalms", chapters: 150 }, { name: "Proverbs", chapters: 31 }, { name: "Ecclesiastes", chapters: 12 },
    { name: "Song of Solomon", chapters: 8 }, { name: "Isaiah", chapters: 66 }, { name: "Jeremiah", chapters: 52 },
    { name: "Lamentations", chapters: 5 }, { name: "Ezekiel", chapters: 48 }, { name: "Daniel", chapters: 12 },
    { name: "Hosea", chapters: 14 }, { name: "Joel", chapters: 3 }, { name: "Amos", chapters: 9 },
    { name: "Obadiah", chapters: 1 }, { name: "Jonah", chapters: 4 }, { name: "Micah", chapters: 7 },
    { name: "Nahum", chapters: 3 }, { name: "Habakkuk", chapters: 3 }, { name: "Zephaniah", chapters: 3 },
    { name: "Haggai", chapters: 2 }, { name: "Zechariah", chapters: 14 }, { name: "Malachi", chapters: 4 },
    { name: "Matthew", chapters: 28 }, { name: "Mark", chapters: 16 }, { name: "Luke", chapters: 24 },
    { name: "John", chapters: 21 }, { name: "Acts", chapters: 28 }, { name: "Romans", chapters: 16 },
    { name: "1 Corinthians", chapters: 16 }, { name: "2 Corinthians", chapters: 13 }, { name: "Galatians", chapters: 6 },
    { name: "Ephesians", chapters: 6 }, { name: "Philippians", chapters: 4 }, { name: "Colossians", chapters: 4 },
    { name: "1 Thessalonians", chapters: 5 }, { name: "2 Thessalonians", chapters: 3 }, { name: "1 Timothy", chapters: 6 },
    { name: "2 Timothy", chapters: 4 }, { name: "Titus", chapters: 3 }, { name: "Philemon", chapters: 1 },
    { name: "Hebrews", chapters: 13 }, { name: "James", chapters: 5 }, { name: "1 Peter", chapters: 5 },
    { name: "2 Peter", chapters: 3 }, { name: "1 John", chapters: 5 }, { name: "2 John", chapters: 1 },
    { name: "3 John", chapters: 1 }, { name: "Jude", chapters: 1 }, { name: "Revelation", chapters: 22 }
  ];

  const extractVerses = (json: any): any[] => {
    if (json && json.success && json.data && Array.isArray(json.data.verses)) return json.data.verses;
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
          `SELECT count(*) as cnt FROM bible_text WHERE book = '${sanitizeStr(book.name)}' AND chapter = ${sanitizeInt(chapter)} AND translation = '${sanitizeStr(trans)}'`
        );
        const count = Number(check.toArray()[0].cnt);

        if (count === 0) {
          const bookId = BIBLE_BOOK_TO_ID[book.name];
          let rawVerses: any[] = [];

          // 1ª: nosso backend (query params)
          if (backendUrl) {
            try {
              const res = await fetch(`${backendUrl}/chapter?book=${encodeURIComponent(book.name)}&chapter=${chapter}&translation=${trans}`);
              if (res.ok) rawVerses = extractVerses(await res.json());
            } catch (_) {}
          }

          // 2ª: bolls.life fallback
          if (rawVerses.length === 0 && bookId) {
            const transUpper = trans === "almeida" ? "NVIPT" : trans.toUpperCase();
            try {
              const res = await fetch(`https://bolls.life/get-chapter/${transUpper}/${bookId}/${chapter}/`);
              if (res.ok) rawVerses = extractVerses(await res.json());
            } catch (_) {}
          }

          if (rawVerses.length > 0) {
            const verses = rawVerses.map((v: any) => ({ verse: v.verse, text: stripHtml(v.text), strongs: "{}" }));
            await cacheVersesInDuckDB(book.name, chapter, translation, verses);
          }

          await new Promise(r => setTimeout(r, 300)); // Gentle pacing
        }

        chaptersDownloaded++;
        const progress = Math.round((chaptersDownloaded / totalChapters) * 100);

        self.postMessage({
          type: "SYNC_PROGRESS",
          payload: {
            progress,
            currentBook: book.name,
            currentChapter: chapter,
            totalChapters
          }
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
    const BACKEND_URL = payload?.backendUrl || "http://localhost:3002/api/v1/bible";

    if (type === "INIT") {
      await dbPromise;
      if (dbReady) {
        await prefetchEssentialChapters();
        setTimeout(() => downloadFullBible(BACKEND_URL), 30000);
      }
      return;
    }

    if (type === "TRIGGER_SYNC") {
      await downloadFullBible(BACKEND_URL);
      return;
    }
    if (type === "FETCH_BIBLE_CHAPTER") {
      const { book, chapter, translation, isSecondary } = payload;
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
            verses = rows.map((r: any) => ({ verse: Number(r.verse), text: String(r.text) }));
            source = "cache";
          }
        } catch (dbErr) {
          console.warn("[TheoWorker] DuckDB read failed:", dbErr);
        }
      }

      // ── 1.5 Try Backend API (PostgreSQL or Sefaria) ──────────────────────────────
      if (verses.length === 0) {
        try {
          const endpoint = trans === 'sefaria' 
            ? `${BACKEND_URL}/sefaria/${encodeURIComponent(bookName)}%20${chapter}`
            : `${BACKEND_URL}/chapter?book=${encodeURIComponent(bookName)}&chapter=${chapter}&translation=${trans}`;

          const backendRes = await fetch(endpoint);
          if (backendRes.ok) {
            const json = await backendRes.json();
            if (json.success && json.data && (Array.isArray(json.data.verses) || (json.data.verses && Array.isArray(json.data.verses)))) {
              verses = json.data.verses.map((v: any) => ({ 
                verse: v.verse, 
                text: stripHtml(v.text),
                strongs: "{}" 
              }));
              source = "cache"; 
              
              if (dbReady && trans !== 'sefaria') {
                cacheVersesInDuckDB(bookName, chapter, translation, verses).catch(() => {});
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
          const extractVerses = (json: any): Array<{verse: number; text: string}> => {
            // Nosso backend: { success: true, data: { verses: [...] } }
            if (json && json.success && json.data && Array.isArray(json.data.verses)) {
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
              `${BACKEND_URL}/chapter?book=${encodeURIComponent(book)}&chapter=${chapter}&translation=${transParam}`
            );
            if (backendRes.ok) {
              rawData = extractVerses(await backendRes.json());
            }
          } catch (_) { /* segue para fallback */ }

          // 2ª tentativa: bolls.life (formato antigo path-param)
          if (rawData.length === 0 && bookId) {
            const transUpper = transParam === "almeida" ? "NVIPT" : transParam.toUpperCase();
            try {
              const bollsRes = await fetch(`https://bolls.life/get-chapter/${transUpper}/${bookId}/${chapter}/`);
              if (bollsRes.ok) {
                rawData = extractVerses(await bollsRes.json());
              }
            } catch (_) { /* sem internet */ }
          }

          if (rawData.length > 0) {
            verses = rawData.map((v: any) => ({ verse: v.verse, text: stripHtml(v.text), strongs: "{}" }));
            source = "api";
            if (dbReady) {
              await cacheVersesInDuckDB(book, chapter, translation, verses).catch(() => {});
            }
          }

        } catch (e) {
          console.error("Bible fetch error:", e);
        }
      }

      const messageType = isSecondary ? "BIBLE_SECONDARY_DATA" : "BIBLE_CHAPTER_DATA";
      self.postMessage({ type: messageType, payload: { book, chapter, verses, source } });
      return;
    }

    // --- SLOW PATH: GIS & INTERLINEAR (DB or Heavy Logic) ---
    if (type === "FETCH_INTERLINEAR_CHAPTER") {
      const { book, chapter } = payload;
      const bookId = BIBLE_BOOK_TO_ID[book];
      const originalTrans = getOriginalLanguageTranslation(book);
      const isNT = bookId >= 40;

      try {
        // Helper: normaliza resposta do nosso backend OU do bolls.life
        const extractVerses = (json: any): Array<{verse: number; text: string}> => {
          if (json && json.success && json.data && Array.isArray(json.data.verses)) {
            return json.data.verses;
          }
          if (Array.isArray(json)) return json;
          return [];
        };

        const [originalRes, ptRes] = await Promise.all([
          fetch(`${BACKEND_URL}/chapter?book=${encodeURIComponent(book)}&chapter=${chapter}&translation=${originalTrans.toLowerCase()}`),
          fetch(`${BACKEND_URL}/chapter?book=${encodeURIComponent(book)}&chapter=${chapter}&translation=nvipt`)
        ]);

        const originalDataRaw = await originalRes.json();
        const ptDataRaw = await ptRes.json();
        
        let originalData = extractVerses(originalDataRaw);
        let ptData = extractVerses(ptDataRaw);

        // Fallback para bolls.life se backend falhar
        if (originalData.length === 0 && bookId) {
           const oRes = await fetch(`https://bolls.life/get-chapter/${originalTrans.toUpperCase()}/${bookId}/${chapter}/`);
           if(oRes.ok) originalData = extractVerses(await oRes.json());
        }
        if (ptData.length === 0 && bookId) {
           const pRes = await fetch(`https://bolls.life/get-chapter/NVIPT/${bookId}/${chapter}/`);
           if(pRes.ok) ptData = extractVerses(await pRes.json());
        }

        // Validação primária para evitar crashes
        if (!Array.isArray(originalData) || originalData.length === 0) throw new Error("Dados originais inválidos da API");

        const interlinearMap: Record<number, any[]> = {};

        originalData.forEach((ov: any, idx: number) => {
          const ptVerse = ptData[idx] || { text: "" };
          // Regex to find word followed by <Gxxxx> or similar tags
          const wordRegex = /([^\s<]+)(?:<([GH]\d+)>)?/g;
          const oMatches = [...(ov.text || "").matchAll(wordRegex)];
          const pWords = stripHtml(ptVerse.text || "").split(/\s+/).filter(w => w.length > 0);

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
              strong: strongId
            };
          });
        });
        self.postMessage({ type: "INTERLINEAR_CHAPTER_DATA", payload: { book, chapter, interlinearMap } });
      } catch (err: any) {
        self.postMessage({ type: "WORKER_ERROR", payload: { message: err.message } });
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
                bookOccurrences: Number(freqs.book_freq)
              } 
            });
            return;
          }
        }
      } catch (err) {
        console.warn("[TheoWorker] DuckDB Lexicon query failed:", err);
      }

      // Fallback to static data if DB fails or entry not found
      const isGreek = strongId.startsWith("G");
      const data = isGreek ? STRONGS_GREEK : STRONGS_HEBREW;
      const staticEntry = Object.values(data).find((e: any) => e.number === strongId);
      
      if (staticEntry) {
        self.postMessage({ 
          type: "STRONGS_DATA", 
          payload: { 
            ...staticEntry, 
            strong_id: staticEntry.number,
            lemma: staticEntry.lemma,
            definition: staticEntry.definitionPt || staticEntry.definition,
            bookOccurrences: 0 // Cannot calculate without DB
          } 
        });
      } else {
        self.postMessage({ type: "WORKER_ERROR", payload: { message: "Strong ID not found" } });
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
        const results = await conn.query(`SELECT * FROM biblical_locations WHERE start_year <= ${safeEnd} AND end_year >= ${safeStart}`);
        const locations = results.toArray().map((row: any) => ({ id: row.id, canonical_name: row.canonical_name, coordinates: [row.lon, row.lat, row.alt], period_start: row.start_year, period_end: row.end_year, type: row.type }));
        self.postMessage({ type: "FILTERED_DATA_BINARY", payload: { locations, routes: [] } });
      } else {
        // Fallback: filter in-memory seed data
        const locations = SEED_LOCATIONS.filter((loc: any) => {
          const ps = loc.period_start ?? loc.timeline?.start_year ?? -4000;
          const pe = loc.period_end ?? loc.timeline?.end_year ?? 2100;
          return ps <= safeEnd && pe >= safeStart;
        }).map((loc: any) => ({ id: loc.id, canonical_name: loc.names.canonical, coordinates: loc.coordinates, period_start: loc.period_start ?? -4000, period_end: loc.period_end ?? 2100, type: loc.type }));
        self.postMessage({ type: "FILTERED_DATA_BINARY", payload: { locations, routes: [] } });
      }
    }

    if (type === "FIND_LOCATIONS_BY_VERSE") {
      const { verseRef } = payload;
      const matched = SEED_LOCATIONS.filter(loc => loc.id.includes(verseRef.toLowerCase()));
      self.postMessage({ type: "VERSE_LOCATIONS", payload: { locations: matched } });
    }

  } catch (error: any) {
    self.postMessage({ type: "WORKER_ERROR", payload: { message: error.message } });
  }
});
