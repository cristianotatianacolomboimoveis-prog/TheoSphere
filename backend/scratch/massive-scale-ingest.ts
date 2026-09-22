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
import { resolve } from 'path';
dotenv.config({ path: resolve('/Users/cristianocolombo/Downloads/TheoSphere/backend/.env') });

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Pool } from 'pg';
import { GoogleGenAI } from '@google/genai';

const SAVE_DIR = '/Users/cristianocolombo/Downloads/TheoSphere/acervo-traduzido';
const MANIFEST_PATH = '/Users/cristianocolombo/Downloads/TheoSphere/backend/src/rag/license-manifest.ts';
const CHECKPOINT_PATH = '/Users/cristianocolombo/Downloads/TheoSphere/backend/scratch/ingestion-checkpoint.json';
const ADMIN_USER_ID = '995ef324-b355-4786-8973-3fc8bb535745'; // cristianotatianacolomboimoveis@gmail.com
const CHUNK_SIZE_WORDS = 500;
const EMBEDDING_CONCURRENCY = 10;
const THROTTLE_MS = 5000;

// Lista curada de obras teológicas clássicas — IDs do Project Gutenberg
const CURATED_BOOKS: Array<{ id: number; title: string; author: string }> = [
  // ── Patrística ──
  { id: 45844, title: 'Anti-Pelagian Writings', author: 'Augustine of Hippo' },
  { id: 45305, title: 'The City of God, Vol III', author: 'Augustine of Hippo' },
  { id: 19038, title: 'Homilies on the Gospel of St. John', author: 'John Chrysostom' },
  { id: 17723, title: 'Homilies on the Epistles of Paul to the Corinthians', author: 'John Chrysostom' },
  { id: 32055, title: 'On the Priesthood', author: 'John Chrysostom' },
  { id: 9804,  title: 'Against Heresies', author: 'Irenaeus of Lyons' },
  { id: 7098,  title: 'Apology', author: 'Tertullian' },
  { id: 3239,  title: 'The Stromata (Miscellanies)', author: 'Clement of Alexandria' },
  { id: 32999, title: 'On the Incarnation of the Word', author: 'Athanasius of Alexandria' },

  // ── Escolástica e Medieval ──
  { id: 17611, title: 'Summa Theologica, Part I (Prima Pars)', author: 'Thomas Aquinas' },
  { id: 17897, title: 'Summa Theologica, Part I-II (Pars Prima Secundae)', author: 'Thomas Aquinas' },
  { id: 18755, title: 'Summa Theologica, Part II-II (Secunda Secundae)', author: 'Thomas Aquinas' },
  { id: 19950, title: 'Summa Theologica, Part III (Tertia Pars)', author: 'Thomas Aquinas' },
  { id: 36907, title: 'Cur Deus Homo (Why God Became Man)', author: 'Anselm of Canterbury' },
  { id: 26472, title: 'Proslogium; Monologium', author: 'Anselm of Canterbury' },
  { id: 59353, title: 'Of the Imitation of Christ', author: 'Thomas a Kempis' },

  // ── Reforma e Puritanismo ──
  { id: 45001, title: 'Institutes of the Christian Religion Vol I', author: 'John Calvin' },
  { id: 64392, title: 'Institutes of the Christian Religion Vol II', author: 'John Calvin' },
  { id: 45463, title: 'Letters of John Calvin, Volume II', author: 'John Calvin' },
  { id: 1722,  title: 'Martin Luther\'s Large Catechism', author: 'Martin Luther' },
  { id: 1670,  title: 'Luther\'s Little Instruction Book: The Small Catechism', author: 'Martin Luther' },
  { id: 39452, title: 'The Pilgrim\'s Progress', author: 'John Bunyan' },

  // ── Avivamento e Puritanismo Tardio ──
  { id: 9519,  title: 'Freedom of the Will', author: 'Jonathan Edwards' },
  { id: 14867, title: 'A Treatise Concerning Religious Affections', author: 'Jonathan Edwards' },
  { id: 32011, title: 'Sinners in the Hands of an Angry God', author: 'Jonathan Edwards' },
  { id: 19039, title: 'Lectures to My Students', author: 'Charles Spurgeon' },
  { id: 27530, title: 'All of Grace', author: 'Charles Spurgeon' },
  { id: 1967,  title: 'Morning and Evening', author: 'Charles Spurgeon' },
  { id: 41785, title: 'Sermons on Several Occasions', author: 'John Wesley' },
  { id: 59789, title: 'The Works of John Wesley, Vol 1', author: 'John Wesley' },
  // ── Bloco 1: Obras Adicionais do Google Drive / Outras Bibliotecas ────────
  { id: 90001, title: 'Commentary on the Whole Bible Vol 1', author: 'Matthew Henry' },
  { id: 90002, title: 'Commentary on the Whole Bible Vol 2', author: 'Matthew Henry' },
  { id: 90003, title: 'Commentary on the Whole Bible Vol 3', author: 'Matthew Henry' },
  { id: 90004, title: 'Commentary on the Whole Bible Vol 4', author: 'Matthew Henry' },
  { id: 90005, title: 'Commentary on the Whole Bible Vol 5', author: 'Matthew Henry' },
  { id: 90006, title: 'Commentary on the Whole Bible Vol 6', author: 'Matthew Henry' },
  { id: 90007, title: "Easton's Bible Dictionary", author: 'M.G. Easton' },
];

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
  max: 5,
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

async function callWithRetry<T>(fn: () => Promise<T>, retries = 4, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    console.warn(`  ⚠️ Falha temporária da API. Tentando novamente em ${delay}ms... (Retentativas restantes: ${retries})`);
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
) {
  const client = await pool.connect();
  let inserted = 0;
  let skipped = 0;
  try {
    for (let i = 0; i < chunks.length; i++) {
      const text = chunks[i];
      const embedding = embeddings[i];
      if (!embedding) { skipped++; continue; }

      const chunkId = `gutenberg_${meta.gutenbergId}_chunk_${i}`;

      const existing = await client.query(
        `SELECT id FROM "UserEmbedding" WHERE metadata->>'chunkId' = $1 AND "userId" = $2 LIMIT 1`,
        [chunkId, ADMIN_USER_ID],
      );
      if (existing.rowCount! > 0) { skipped++; continue; }

      const embeddingStr = `[${embedding.join(',')}]`;
      const metadata = JSON.stringify({
        chunkId,
        title: meta.title,
        author: meta.author,
        source: meta.source,
        gutenbergId: meta.gutenbergId,
        chunkIndex: i,
      });
      await client.query(
        `INSERT INTO "UserEmbedding" ("id","userId","type","content","metadata","embedding","createdAt")
         VALUES (gen_random_uuid(), $1, 'book_chunk', $2, $3::jsonb, $4::vector, NOW())`,
        [ADMIN_USER_ID, text, metadata, embeddingStr],
      );
      inserted++;
    }
  } finally {
    client.release();
  }
  return { inserted, skipped };
}

// ── Manifesto de Licenças ──────────────────────────────────────────────────

function registerInManifest(filename: string, meta: { source: string; author: string; title: string }) {
  if (!fs.existsSync(MANIFEST_PATH)) return;
  const content = fs.readFileSync(MANIFEST_PATH, 'utf-8');
  const key = `'${filename}'`;
  if (content.includes(key)) return;

  const entry = `  '${filename}': {
    status: 'dominio-publico',
    fonte: '${meta.source}',
    motivo: '${meta.author} — obra em domínio público (Project Gutenberg)',
  },\n`;

  const updated = content.replace(
    /^};\s*$/m,
    entry + '};',
  );
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
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify({ processedIds, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
}

// ── Download do Gutenberg ────────────────────────────────────────────────────

async function downloadBook(book: any): Promise<{ buffer: Buffer; filename: string; mime: string } | null> {
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

  if (fs.existsSync(filepath)) {
    const buffer = fs.readFileSync(filepath);
    return { buffer, filename, mime };
  }

  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
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
        '/Users/cristianocolombo/Downloads/TheoSphere/backend/src/rag/text-extractors.js'
      );
      const extractor = findExtractor(mime);
      if (!extractor) { console.log(`  ⚠️  Extrator não encontrado para ${mime}. Pulando.`); return; }
      const result = await extractor.extract(buffer);
      rawText = result.text;
    } catch {
      const txtUrl = book.formats['text/plain; charset=utf-8'] || book.formats['text/plain'];
      if (!txtUrl) { console.log(`  ⚠️  Sem TXT fallback. Pulando.`); return; }
      const res = await axios.get(txtUrl, { responseType: 'text', timeout: 30000 });
      rawText = extractTxtText(Buffer.from(res.data));
    }
  }

  if (!rawText || rawText.length < 500) {
    console.log(`  ⚠️  Texto insuficiente extraído. Pulando.`);
    return;
  }

  const chunks = chunkText(rawText, CHUNK_SIZE_WORDS);
  console.log(`  🔪 ${chunks.length} chunks de ~${CHUNK_SIZE_WORDS} palavras`);

  console.log(`  🧠 Gerando embeddings com retry (${chunks.length} chunks)...`);
  const embeddings = await embedBatch(chunks);
  const validEmbeddings = embeddings.filter(Boolean).length;
  console.log(`  ✅ ${validEmbeddings}/${chunks.length} embeddings prontos`);

  if (chunks.length > 0 && validEmbeddings === 0) {
    throw new Error('Falha completa na geração de embeddings (cota esgotada ou erro de API).');
  }

  const { inserted, skipped } = await upsertChunks(chunks, embeddings, {
    title,
    author: authorName,
    source: `Project Gutenberg #${gutenbergId}`,
    gutenbergId,
  });
  console.log(`  💾 Banco: +${inserted} novos | ${skipped} já existentes`);

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
  const limit = limitArgIdx > -1 ? parseInt(args[limitArgIdx + 1], 10) : CURATED_BOOKS.length;

  console.log('🌟 [AGENTE-MASSIVO-SCALE] Iniciando ingestão resiliente...');
  if (dryRun) console.log('  ⚠️ MODO DRY-RUN ATIVADO (Somente leitura e download).');
  
  if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR, { recursive: true });

  const processedIds = loadCheckpoint();
  console.log(`📋 Checkpoint: ${processedIds.length} livros já processados anteriormente.`);

  let count = 0;
  for (const entry of CURATED_BOOKS) {
    if (count >= limit) {
      console.log(`\n🛑 Limite de --limit ${limit} livros atingido nesta sessão.`);
      break;
    }

    if (processedIds.includes(entry.id)) {
      console.log(`⏭️ [Ignorado] ID #${entry.id} já consta no checkpoint.`);
      continue;
    }

    console.log(`\n🔍 Buscando ID #${entry.id}: "${entry.title}"`);
    let book: any;
    if (entry.id >= 90000) {
      let url = '';
      if (entry.id >= 90001 && entry.id <= 90006) {
        const vol = entry.id - 90000;
        url = `https://www.ccel.org/ccel/h/henry/mhc${vol}/cache/mhc${vol}.txt`;
      } else if (entry.id === 90007) {
        url = 'https://archive.org/download/EastonsBibleDictionary/Eastons-Bible-Dictionary_djvu.txt';
      }
      book = {
        id: entry.id,
        title: entry.title,
        authors: [{ name: entry.author }],
        formats: {
          'text/plain': url
        }
      };
    } else {
      try {
        const res = await axios.get(`https://gutendex.com/books/${entry.id}`, { timeout: 15000 });
        book = res.data;
      } catch {
        try {
          const res2 = await axios.get(`https://gutendex.com/books/?ids=${entry.id}`, { timeout: 15000 });
          book = res2.data.results?.[0];
        } catch {
          console.log(`  ❌ Não encontrado no Gutenberg. Pulando.`);
          continue;
        }
      }
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
      console.error(`  ❌ Erro crítico ao processar "${entry.title}": ${err.message}`);
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
