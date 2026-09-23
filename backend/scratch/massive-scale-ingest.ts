/**
 * massive-scale-ingest.ts
 *
 * Agente resiliente e robusto de ingestão massiva de obras teológicas de domínio público.
 * Fontes: Project Gutenberg (via Gutendex API)
 *
 * Funcionalidades avançadas:
 *  - Checkpointing para permitir pausa/resumo sem reprocessar livros concluídos.
 *  - Retry com Backoff Exponencial na chamada de API de embeddings.
 *  - Sanitização e tratamento robusto de falhas individuais por livro.
 *
 * Uso: npx tsx scratch/massive-scale-ingest.ts [--dry-run] [--limit N]
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import axios from 'axios';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { Pool } from 'pg';
import { GoogleGenAI } from '@google/genai';

const SAVE_DIR = path.resolve(__dirname, '../../acervo-traduzido');
const MANIFEST_PATH = path.resolve(__dirname, '../src/rag/license-manifest.ts');
const CHECKPOINT_PATH = path.resolve(__dirname, 'ingestion-checkpoint.json');
const ADMIN_USER_ID = '995ef324-b355-4786-8973-3fc8bb535745'; // cristianotatianacolomboimoveis@gmail.com
const CHUNK_SIZE_WORDS = 500;
const EMBEDDING_CONCURRENCY = 5;
const THROTTLE_MS = 500;

// Lista curada de obras teológicas clássicas — IDs do Project Gutenberg
const CURATED_BOOKS: Array<{ id: number; title: string; author: string }> = [
  // ── Patrística ──
  { id: 45844, title: 'Anti-Pelagian Writings', author: 'Augustine of Hippo' },
  {
    id: 45305,
    title: 'The City of God, Vol III',
    author: 'Augustine of Hippo',
  },
  {
    id: 19038,
    title: 'Homilies on the Gospel of St. John',
    author: 'John Chrysostom',
  },
  {
    id: 17723,
    title: 'Homilies on the Epistles of Paul to the Corinthians',
    author: 'John Chrysostom',
  },
  { id: 32055, title: 'On the Priesthood', author: 'John Chrysostom' },
  { id: 9804, title: 'Against Heresies', author: 'Irenaeus of Lyons' },
  { id: 7098, title: 'Apology', author: 'Tertullian' },
  {
    id: 3239,
    title: 'The Stromata (Miscellanies)',
    author: 'Clement of Alexandria',
  },
  {
    id: 32999,
    title: 'On the Incarnation of the Word',
    author: 'Athanasius of Alexandria',
  },

  // ── Escolástica e Medieval ──
  {
    id: 17611,
    title: 'Summa Theologica, Part I (Prima Pars)',
    author: 'Thomas Aquinas',
  },
  {
    id: 17897,
    title: 'Summa Theologica, Part I-II (Pars Prima Secundae)',
    author: 'Thomas Aquinas',
  },
  {
    id: 18755,
    title: 'Summa Theologica, Part II-II (Secunda Secundae)',
    author: 'Thomas Aquinas',
  },
  {
    id: 19950,
    title: 'Summa Theologica, Part III (Tertia Pars)',
    author: 'Thomas Aquinas',
  },
  {
    id: 36907,
    title: 'Cur Deus Homo (Why God Became Man)',
    author: 'Anselm of Canterbury',
  },
  {
    id: 26472,
    title: 'Proslogium; Monologium',
    author: 'Anselm of Canterbury',
  },
  { id: 59353, title: 'Of the Imitation of Christ', author: 'Thomas a Kempis' },

  // ── Reforma e Puritanismo ──
  {
    id: 45001,
    title: 'Institutes of the Christian Religion Vol I',
    author: 'John Calvin',
  },
  {
    id: 64392,
    title: 'Institutes of the Christian Religion Vol II',
    author: 'John Calvin',
  },
  {
    id: 45463,
    title: 'Letters of John Calvin, Volume II',
    author: 'John Calvin',
  },
  {
    id: 1722,
    title: "Martin Luther's Large Catechism",
    author: 'Martin Luther',
  },
  {
    id: 1670,
    title: "Luther's Little Instruction Book: The Small Catechism",
    author: 'Martin Luther',
  },
  { id: 39452, title: "The Pilgrim's Progress", author: 'John Bunyan' },

  // ── Avivamento e Puritanismo Tardio ──
  { id: 9519, title: 'Freedom of the Will', author: 'Jonathan Edwards' },
  {
    id: 14867,
    title: 'A Treatise Concerning Religious Affections',
    author: 'Jonathan Edwards',
  },
  {
    id: 32011,
    title: 'Sinners in the Hands of an Angry God',
    author: 'Jonathan Edwards',
  },
  { id: 19039, title: 'Lectures to My Students', author: 'Charles Spurgeon' },
  { id: 27530, title: 'All of Grace', author: 'Charles Spurgeon' },
  { id: 1967, title: 'Morning and Evening', author: 'Charles Spurgeon' },
  { id: 41785, title: 'Sermons on Several Occasions', author: 'John Wesley' },
  {
    id: 59789,
    title: 'The Works of John Wesley, Vol 1',
    author: 'John Wesley',
  },
  // ── Bloco 1: Obras Adicionais do Google Drive / Outras Bibliotecas ────────
  {
    id: 90001,
    title: 'Commentary on the Whole Bible Vol 1',
    author: 'Matthew Henry',
  },
  {
    id: 90002,
    title: 'Commentary on the Whole Bible Vol 2',
    author: 'Matthew Henry',
  },
  {
    id: 90003,
    title: 'Commentary on the Whole Bible Vol 3',
    author: 'Matthew Henry',
  },
  {
    id: 90004,
    title: 'Commentary on the Whole Bible Vol 4',
    author: 'Matthew Henry',
  },
  {
    id: 90005,
    title: 'Commentary on the Whole Bible Vol 5',
    author: 'Matthew Henry',
  },
  {
    id: 90006,
    title: 'Commentary on the Whole Bible Vol 6',
    author: 'Matthew Henry',
  },
  { id: 90007, title: "Easton's Bible Dictionary", author: 'M.G. Easton' },
  // ── Bloco 2: Clássicos Puritanos e Históricos em Domínio Público ────────
  {
    id: 654,
    title: 'Grace Abounding to the Chief of Sinners',
    author: 'John Bunyan',
  },
  { id: 395, title: 'The Holy War', author: 'John Bunyan' },
  { id: 22400, title: "Foxe's Book of Martyrs", author: 'John Foxe' },
  {
    id: 2848,
    title: 'The Antiquities of the Jews',
    author: 'Flavius Josephus',
  },
  { id: 2850, title: 'The Wars of the Jews', author: 'Flavius Josephus' },

  // ── Bloco 3: Comentários Exegéticos de João Calvino e Martinho Lutero ────────
  { id: 91038, title: 'Commentary on Romans', author: 'John Calvin' },
  { id: 91039, title: 'Commentary on 1 Corinthians', author: 'John Calvin' },
  { id: 91040, title: 'Commentary on 2 Corinthians', author: 'John Calvin' },
  {
    id: 91041,
    title: 'Commentary on Galatians and Ephesians',
    author: 'John Calvin',
  },
  {
    id: 91042,
    title: 'Commentary on Philippians, Colossians, and Thessalonians',
    author: 'John Calvin',
  },
  {
    id: 91043,
    title: 'Commentary on Timothy, Titus, and Philemon',
    author: 'John Calvin',
  },
  { id: 91044, title: 'Commentary on Hebrews', author: 'John Calvin' },
  {
    id: 91045,
    title: 'Commentary on Catholic Epistles',
    author: 'John Calvin',
  },
  {
    id: 3390,
    title: 'Commentary on the Epistle to the Galatians',
    author: 'Martin Luther',
  },

  // ── Bloco 4: João Calvino — Novo Testamento Restante (Evangelhos e Atos) ──
  {
    id: 91031,
    title: 'Harmony of the Gospels Vol 1 (Matt, Mark, Luke)',
    author: 'John Calvin',
  },
  { id: 91032, title: 'Harmony of the Gospels Vol 2', author: 'John Calvin' },
  { id: 91033, title: 'Harmony of the Gospels Vol 3', author: 'John Calvin' },
  { id: 91034, title: 'Gospel According to John Vol 1', author: 'John Calvin' },
  { id: 91035, title: 'Gospel According to John Vol 2', author: 'John Calvin' },
  { id: 91036, title: 'Acts of the Apostles Vol 1', author: 'John Calvin' },
  { id: 91037, title: 'Acts of the Apostles Vol 2', author: 'John Calvin' },

  // ── Bloco 5: João Calvino — Antigo Testamento Monumental ──
  { id: 91001, title: 'Commentary on Genesis Vol 1', author: 'John Calvin' },
  { id: 91002, title: 'Commentary on Genesis Vol 2', author: 'John Calvin' },
  {
    id: 91003,
    title: 'Harmony of Exodus, Leviticus, Numbers, Deuteronomy Vol 1',
    author: 'John Calvin',
  },
  {
    id: 91004,
    title: 'Harmony of the Pentateuch Vol 2',
    author: 'John Calvin',
  },
  {
    id: 91005,
    title: 'Harmony of the Pentateuch Vol 3',
    author: 'John Calvin',
  },
  {
    id: 91006,
    title: 'Harmony of the Pentateuch Vol 4',
    author: 'John Calvin',
  },
  {
    id: 91007,
    title: 'Commentary on the Book of Joshua',
    author: 'John Calvin',
  },
  {
    id: 91008,
    title: 'Commentary on the Book of Psalms Vol 1',
    author: 'John Calvin',
  },
  {
    id: 91009,
    title: 'Commentary on the Book of Psalms Vol 2',
    author: 'John Calvin',
  },
  {
    id: 91010,
    title: 'Commentary on the Book of Psalms Vol 3',
    author: 'John Calvin',
  },
  {
    id: 91011,
    title: 'Commentary on the Book of Psalms Vol 4',
    author: 'John Calvin',
  },
  {
    id: 91012,
    title: 'Commentary on the Book of Psalms Vol 5',
    author: 'John Calvin',
  },
  {
    id: 91013,
    title: 'Commentary on the Prophet Isaiah Vol 1',
    author: 'John Calvin',
  },
  {
    id: 91014,
    title: 'Commentary on the Prophet Isaiah Vol 2',
    author: 'John Calvin',
  },
  {
    id: 91015,
    title: 'Commentary on the Prophet Isaiah Vol 3',
    author: 'John Calvin',
  },
  {
    id: 91016,
    title: 'Commentary on the Prophet Isaiah Vol 4',
    author: 'John Calvin',
  },
  {
    id: 91017,
    title: 'Commentary on Jeremiah and Lamentations Vol 1',
    author: 'John Calvin',
  },
  {
    id: 91018,
    title: 'Commentary on Jeremiah and Lamentations Vol 2',
    author: 'John Calvin',
  },
  {
    id: 91019,
    title: 'Commentary on Jeremiah and Lamentations Vol 3',
    author: 'John Calvin',
  },
  {
    id: 91020,
    title: 'Commentary on Jeremiah and Lamentations Vol 4',
    author: 'John Calvin',
  },
  {
    id: 91021,
    title: 'Commentary on Jeremiah and Lamentations Vol 5',
    author: 'John Calvin',
  },
  {
    id: 91022,
    title: 'Commentary on the Prophet Ezekiel Vol 1',
    author: 'John Calvin',
  },
  {
    id: 91023,
    title: 'Commentary on the Prophet Ezekiel Vol 2',
    author: 'John Calvin',
  },
  {
    id: 91024,
    title: 'Commentary on the Prophet Daniel Vol 1',
    author: 'John Calvin',
  },
  {
    id: 91025,
    title: 'Commentary on the Prophet Daniel Vol 2',
    author: 'John Calvin',
  },
  {
    id: 91026,
    title: 'Commentary on the Minor Prophets (Hosea) Vol 1',
    author: 'John Calvin',
  },
  {
    id: 91027,
    title: 'Commentary on the Minor Prophets (Joel, Amos, Obadiah) Vol 2',
    author: 'John Calvin',
  },
  {
    id: 91028,
    title: 'Commentary on the Minor Prophets (Jonah, Micah, Nahum) Vol 3',
    author: 'John Calvin',
  },
  {
    id: 91029,
    title:
      'Commentary on the Minor Prophets (Habakkuk, Zephaniah, Haggai) Vol 4',
    author: 'John Calvin',
  },
  {
    id: 91030,
    title: 'Commentary on the Minor Prophets (Zechariah, Malachi) Vol 5',
    author: 'John Calvin',
  },

  // ── Bloco 6: Jamieson, Fausset & Brown (JFB) ──
  {
    id: 92001,
    title: 'Commentary Critical and Explanatory on the Whole Bible',
    author: 'Robert Jamieson, A.R. Fausset, David Brown',
  },

  // ── Bloco 7: Teologia Sistemática de Princeton (Charles Hodge) ──
  {
    id: 93001,
    title: 'Systematic Theology Vol 1 (Theology Proper)',
    author: 'Charles Hodge',
  },
  {
    id: 93002,
    title: 'Systematic Theology Vol 2 (Anthropology and Soteriology)',
    author: 'Charles Hodge',
  },
  {
    id: 93003,
    title: 'Systematic Theology Vol 3 (Eschatology and Means of Grace)',
    author: 'Charles Hodge',
  },

  // ── Bloco 8: Clássicos Puritanos (John Owen & Richard Baxter) ──
  {
    id: 94001,
    title: 'The Death of Death in the Death of Christ',
    author: 'John Owen',
  },
  {
    id: 94002,
    title: 'Of the Mortification of Sin in Believers',
    author: 'John Owen',
  },
  { id: 94003, title: 'The Reformed Pastor', author: 'Richard Baxter' },
];

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err: any) => {
  console.warn(
    '  ⚠️ Conexão de background com Supabase resetada (reestabelecendo automaticamente):',
    err.message,
  );
});

// ── Utilitários ──────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function chunkText(text: string, wordsPerChunk: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
  }
  return chunks;
}

// ── Retry com Backoff Exponencial ──────────────────────────────────────────

async function callWithRetry<T>(
  fn: () => Promise<T>,
  retries = 4,
  delay = 2500,
): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (retries <= 0) throw err;
    console.warn(
      `  ⚠️ Falha temporária da API (${err?.message || err}). Tentando novamente em ${delay}ms... (Retentativas restantes: ${retries})`,
    );
    await sleep(delay);
    return callWithRetry(fn, retries - 1, delay * 2);
  }
}

// ── Ingestão de Embeddings em Lote ──────────────────────────────────────────

async function embedBatch(texts: string[]): Promise<(number[] | null)[]> {
  const results: (number[] | null)[] = [];
  for (let i = 0; i < texts.length; i += EMBEDDING_CONCURRENCY) {
    const batch = texts.slice(i, i + EMBEDDING_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (text) => {
        return callWithRetry(async () => {
          const res = await ai.models.embedContent({
            model: 'gemini-embedding-001',
            contents: text,
            config: {
              taskType: 'RETRIEVAL_DOCUMENT',
              outputDimensionality: 768,
            },
          });
          return (res.embeddings?.[0]?.values ?? null) as number[] | null;
        }).catch((err) => {
          console.error(`  ❌ Falha definitiva no chunk: ${err.message}`);
          return null;
        });
      }),
    );
    results.push(...batchResults);
    const done = Math.min(i + EMBEDDING_CONCURRENCY, texts.length);
    if (done % 10 === 0 || done === texts.length) {
      console.log(
        `    📊 Progresso embeddings: ${done}/${texts.length} concluídos...`,
      );
    }
    if (i + EMBEDDING_CONCURRENCY < texts.length) {
      await sleep(THROTTLE_MS);
    }
  }
  return results;
}

// ── Gravação no banco ────────────────────────────────────────────────────────

async function upsertChunks(
  chunks: string[],
  embeddings: (number[] | null)[],
  meta: { title: string; author: string; source: string; gutenbergId: number },
  chunkIndices?: number[],
) {
  return callWithRetry(
    async () => {
      const client = await pool.connect();
      let inserted = 0;
      let skipped = 0;
      try {
        for (let i = 0; i < chunks.length; i++) {
          const text = chunks[i];
          const embedding = embeddings[i];
          if (!embedding) {
            skipped++;
            continue;
          }

          const actualIdx = chunkIndices ? chunkIndices[i] : i;
          const chunkId = `gutenberg_${meta.gutenbergId}_chunk_${actualIdx}`;

          const existing = await client.query(
            `SELECT id FROM "UserEmbedding" WHERE metadata->>'chunkId' = $1 AND "userId" = $2 LIMIT 1`,
            [chunkId, ADMIN_USER_ID],
          );
          if (existing.rowCount! > 0) {
            skipped++;
            continue;
          }

          const embeddingStr = `[${embedding.join(',')}]`;
          const metadata = JSON.stringify({
            chunkId,
            title: meta.title,
            author: meta.author,
            source: meta.source,
            gutenbergId: meta.gutenbergId,
            chunkIndex: actualIdx,
          });
          await client.query(
            `INSERT INTO "UserEmbedding" ("id","userId","type","content","metadata","embedding","createdAt")
           VALUES (gen_random_uuid(), $1, 'book_chunk', $2, $3::jsonb, $4::vector, NOW())`,
            [ADMIN_USER_ID, text, metadata, embeddingStr],
          );
          inserted++;
        }
        return { inserted, skipped };
      } finally {
        client.release();
      }
    },
    4,
    2000,
  );
}

// ── Manifesto de Licenças ──────────────────────────────────────────────────

function registerInManifest(
  filename: string,
  meta: { source: string; author: string; title: string },
) {
  if (!fs.existsSync(MANIFEST_PATH)) return;
  const content = fs.readFileSync(MANIFEST_PATH, 'utf-8');
  const key = `'${filename}'`;
  if (content.includes(key)) return;

  const entry = `  '${filename}': {
    status: 'dominio-publico',
    fonte: '${meta.source}',
    motivo: '${meta.author} — obra em domínio público (Project Gutenberg)',
  },\n`;

  const updated = content.replace(/^};\s*$/m, entry + '};');
  fs.writeFileSync(MANIFEST_PATH, updated, 'utf-8');
}

// ── Checkpoint Manager ─────────────────────────────────────────────────────

function loadCheckpoint(): number[] {
  if (!fs.existsSync(CHECKPOINT_PATH)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf-8'));
    return Array.isArray(data.processedIds) ? data.processedIds : [];
  } catch {
    return [];
  }
}

function saveCheckpoint(processedIds: number[]) {
  fs.writeFileSync(
    CHECKPOINT_PATH,
    JSON.stringify(
      { processedIds, updatedAt: new Date().toISOString() },
      null,
      2,
    ),
    'utf-8',
  );
}

// ── Download do Gutenberg ────────────────────────────────────────────────────

async function downloadBook(
  book: any,
): Promise<{ buffer: Buffer; filename: string; mime: string } | null> {
  const formats = book.formats as Record<string, string>;
  const epubUrl = formats['application/epub+zip'];
  const txtUrl = formats['text/plain; charset=utf-8'] || formats['text/plain'];

  const url = epubUrl || txtUrl;
  if (!url) return null;

  const mime = epubUrl ? 'application/epub+zip' : 'text/plain';
  const ext = epubUrl ? 'epub' : 'txt';

  const safeTitle = book.title
    .replace(/[^\w\s-]/gi, '')
    .replace(/\s+/g, '_')
    .slice(0, 60);
  const filename = `${safeTitle}_gutenberg_${book.id}.${ext}`;
  const filepath = path.join(SAVE_DIR, filename);

  if (fs.existsSync(url)) {
    const buffer = fs.readFileSync(url);
    return { buffer, filename: path.basename(url), mime };
  }

  if (fs.existsSync(filepath)) {
    const buffer = fs.readFileSync(filepath);
    return { buffer, filename, mime };
  }

  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    },
    responseType: 'arraybuffer',
    timeout: 30000,
  });
  const buffer = Buffer.from(res.data);
  fs.writeFileSync(filepath, buffer);
  return { buffer, filename, mime };
}

function extractTxtText(buffer: Buffer): string {
  let text = buffer.toString('utf-8');
  const startMarker = /\*\*\* START OF (THE|THIS) PROJECT GUTENBERG/i;
  const endMarker = /\*\*\* END OF (THE|THIS) PROJECT GUTENBERG/i;
  const startIdx = text.search(startMarker);
  const endIdx = text.search(endMarker);
  if (startIdx > -1) text = text.slice(startIdx + 100);
  if (endIdx > -1) text = text.slice(0, endIdx);
  return text.trim();
}

// ── Pipeline por Livro ───────────────────────────────────────────────────────

async function processBook(book: any, dryRun = false): Promise<void> {
  const title = book.title;
  const authorName = book.authors?.[0]?.name ?? 'Unknown';
  const gutenbergId = book.id;

  console.log(`\n  📖 ${title} — ${authorName} (Gutenberg #${gutenbergId})`);

  let downloaded: { buffer: Buffer; filename: string; mime: string } | null;
  try {
    downloaded = await downloadBook(book);
  } catch (err: any) {
    console.log(`  ⚠️  Falha no download: ${err.message}. Pulando.`);
    return;
  }
  if (!downloaded) {
    console.log(`  ⚠️  Nenhum formato compatível. Pulando.`);
    return;
  }

  const { buffer, filename, mime } = downloaded;
  console.log(`  ✅ ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`);

  if (dryRun) {
    console.log(`  [DRY-RUN] Pulando extração, embeddings e gravação.`);
    return;
  }

  let rawText: string;
  if (mime === 'text/plain') {
    rawText = extractTxtText(buffer);
  } else {
    try {
      const { findExtractor } = await import(
        path.resolve(__dirname, '../src/rag/text-extractors')
      );
      const extractor = findExtractor(mime);
      if (!extractor) {
        console.log(`  ⚠️  Extrator não encontrado para ${mime}. Pulando.`);
        return;
      }
      const result = await extractor.extract(buffer);
      rawText = result.text;
    } catch {
      const txtUrl =
        book.formats['text/plain; charset=utf-8'] || book.formats['text/plain'];
      if (!txtUrl) {
        console.log(`  ⚠️  Sem TXT fallback. Pulando.`);
        return;
      }
      const res = await axios.get(txtUrl, {
        responseType: 'text',
        timeout: 30000,
      });
      rawText = extractTxtText(Buffer.from(res.data));
    }
  }

  if (!rawText || rawText.length < 500) {
    console.log(`  ⚠️  Texto insuficiente extraído. Pulando.`);
    return;
  }

  const chunks = chunkText(rawText, CHUNK_SIZE_WORDS);
  console.log(`  🔪 ${chunks.length} chunks de ~${CHUNK_SIZE_WORDS} palavras`);

  // Otimização de Custo & Quota: checar quais chunks já existem no banco
  const client = await pool.connect();
  const existingChunks = new Set<string>();
  try {
    const res = await client.query(
      `SELECT metadata->>'chunkId' as cid FROM "UserEmbedding" WHERE metadata->>'gutenbergId' = $1 AND "userId" = $2`,
      [gutenbergId.toString(), ADMIN_USER_ID],
    );
    for (const r of res.rows) {
      if (r.cid) existingChunks.add(r.cid);
    }
  } finally {
    client.release();
  }

  const missingIndices: number[] = [];
  const missingChunks: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunkId = `gutenberg_${gutenbergId}_chunk_${i}`;
    if (!existingChunks.has(chunkId)) {
      missingIndices.push(i);
      missingChunks.push(chunks[i]);
    }
  }

  if (missingChunks.length === 0) {
    console.log(
      `  ⚡ Todos os ${chunks.length} chunks já constam no banco de dados. Pulando geração de embeddings.`,
    );
  } else {
    console.log(
      `  🧠 Processando e gravando incrementalmente ${missingChunks.length}/${chunks.length} chunks pendentes...`,
    );
    const BATCH_SIZE = 50;
    let totalInserted = 0;
    let totalSkipped = 0;

    const sourceName =
      gutenbergId >= 91000 && gutenbergId <= 91099
        ? 'Calvin Translation Society / CCEL'
        : gutenbergId >= 90001 && gutenbergId <= 90006
          ? 'Matthew Henry Commentary'
          : gutenbergId === 92001
            ? 'Jamieson, Fausset & Brown (JFB)'
            : gutenbergId >= 93001 && gutenbergId <= 93003
              ? 'Charles Hodge Systematic Theology'
              : gutenbergId >= 94001 && gutenbergId <= 94003
                ? 'Puritan Classics / CCEL'
                : `Project Gutenberg #${gutenbergId}`;

    for (let start = 0; start < missingChunks.length; start += BATCH_SIZE) {
      const sliceChunks = missingChunks.slice(start, start + BATCH_SIZE);
      const sliceIndices = missingIndices.slice(start, start + BATCH_SIZE);

      const sliceEmbeddings = await embedBatch(sliceChunks);
      const validCount = sliceEmbeddings.filter(Boolean).length;

      if (sliceChunks.length > 0 && validCount === 0) {
        throw new Error(
          'Falha completa na geração de embeddings (cota esgotada ou erro de API).',
        );
      }

      const { inserted, skipped } = await upsertChunks(
        sliceChunks,
        sliceEmbeddings,
        {
          title,
          author: authorName,
          source: sourceName,
          gutenbergId,
        },
        sliceIndices,
      );

      totalInserted += inserted;
      totalSkipped += skipped;
      const progressDone = Math.min(start + BATCH_SIZE, missingChunks.length);
      console.log(
        `  💾 [#${gutenbergId}] Progresso gravado no PostgreSQL: ${progressDone}/${missingChunks.length} (+${inserted} novos | ${skipped} já existentes)`,
      );
    }

    console.log(
      `  🎉 Concluído livro #${gutenbergId}: +${totalInserted} novos gravados | ${totalSkipped} pulados`,
    );
  }

  registerInManifest(filename, {
    source: `Project Gutenberg #${gutenbergId}`,
    author: authorName,
    title,
  });
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

async function bootstrap() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArgIdx = args.indexOf('--limit');
  const limit =
    limitArgIdx > -1
      ? parseInt(args[limitArgIdx + 1], 10)
      : CURATED_BOOKS.length;

  console.log('🌟 [AGENTE-MASSIVO-SCALE] Iniciando ingestão resiliente...');
  if (dryRun)
    console.log('  ⚠️ MODO DRY-RUN ATIVADO (Somente leitura e download).');

  if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR, { recursive: true });

  const processedIds = loadCheckpoint();
  console.log(
    `📋 Checkpoint: ${processedIds.length} livros já processados anteriormente.`,
  );

  let count = 0;
  for (const entry of CURATED_BOOKS) {
    if (count >= limit) {
      console.log(
        `\n🛑 Limite de --limit ${limit} livros atingido nesta sessão.`,
      );
      break;
    }

    if (processedIds.includes(entry.id)) {
      console.log(`⏭️ [Ignorado] ID #${entry.id} já consta no checkpoint.`);
      continue;
    }

    console.log(`\n🔍 Buscando ID #${entry.id}: "${entry.title}"`);
    let book: any;

    // 1. Verificar se o arquivo já está em SAVE_DIR
    const existingLocalFiles = fs
      .readdirSync(SAVE_DIR)
      .filter((f) => f.includes(`_gutenberg_${entry.id}.`));
    if (existingLocalFiles.length > 0) {
      const localFile = existingLocalFiles[0];
      const isEpub = localFile.endsWith('.epub');
      console.log(`  📂 Arquivo encontrado localmente em cache: ${localFile}`);
      book = {
        id: entry.id,
        title: entry.title,
        authors: [{ name: entry.author }],
        formats: {
          [isEpub ? 'application/epub+zip' : 'text/plain']: path.join(
            SAVE_DIR,
            localFile,
          ),
        },
      };
    } else if (entry.id >= 90000) {
      let url = '';
      if (entry.id >= 90001 && entry.id <= 90006) {
        const vol = entry.id - 90000;
        url = `https://www.ccel.org/ccel/h/henry/mhc${vol}/cache/mhc${vol}.txt`;
      } else if (entry.id === 90007) {
        url =
          'https://archive.org/download/EastonsBibleDictionary/Eastons-Bible-Dictionary_djvu.txt';
      } else if (entry.id >= 91001 && entry.id <= 91045) {
        const calcomNum = (entry.id - 91000).toString().padStart(2, '0');
        url = `https://www.ccel.org/ccel/calvin/calcom${calcomNum}/cache/calcom${calcomNum}.txt`;
      } else if (entry.id === 92001) {
        url = 'https://www.ccel.org/ccel/jamieson/jfb/cache/jfb.txt';
      } else if (entry.id >= 93001 && entry.id <= 93003) {
        const hodgeVol = entry.id - 93000;
        url = `https://www.ccel.org/ccel/hodge/theology${hodgeVol}/cache/theology${hodgeVol}.txt`;
      } else if (entry.id === 94001) {
        url =
          'https://www.ccel.org/ccel/owen/deathofdeath/cache/deathofdeath.txt';
      } else if (entry.id === 94002) {
        url = 'https://www.ccel.org/ccel/owen/mort/cache/mort.txt';
      } else if (entry.id === 94003) {
        url = 'https://www.ccel.org/ccel/baxter/pastor/cache/pastor.txt';
      }
      book = {
        id: entry.id,
        title: entry.title,
        authors: [{ name: entry.author }],
        formats: {
          'text/plain': url,
        },
      };
    } else {
      // 2. Tentar download direto de alta velocidade do Project Gutenberg
      const directTxtUrl = `https://www.gutenberg.org/cache/epub/${entry.id}/pg${entry.id}.txt`;
      book = {
        id: entry.id,
        title: entry.title,
        authors: [{ name: entry.author }],
        formats: {
          'text/plain': directTxtUrl,
        },
      };
    }

    if (!book) continue;
    book.title = entry.title;
    if (!book.authors?.length) book.authors = [{ name: entry.author }];

    try {
      await processBook(book, dryRun);
      if (!dryRun) {
        processedIds.push(entry.id);
        saveCheckpoint(processedIds);
      }
      count++;
    } catch (err: any) {
      console.error(
        `  ❌ Erro crítico ao processar "${entry.title}": ${err.message}`,
      );
    }

    await sleep(2000);
  }

  await pool.end();
  console.log('\n🏁 [AGENTE-MASSIVO-SCALE] Execução concluída.');
}

bootstrap().catch((err) => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
