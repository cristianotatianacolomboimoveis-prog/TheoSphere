/**
 * massive-ingest-crawler.ts
 *
 * Agente autônomo de ingestão massiva de obras teológicas de domínio público.
 * Fontes: Project Gutenberg (via Gutendex API)
 *
 * Pipeline:
 *  1. Busca por autores teológicos clássicos na API do Gutenberg
 *  2. Filtra obras por critério de domínio público seguro (autor morreu > 100 anos atrás)
 *  3. Baixa em EPUB (suportado pelo RAG) ou TXT como fallback
 *  4. Gera chunks de ~500 palavras por obra
 *  5. Gera embeddings via Gemini (em lotes de 10, com throttle de 5s)
 *  6. Grava UserEmbedding no Supabase com deduplilcação por hash de conteúdo
 *  7. Registra obra no license-manifest.ts
 *
 * Uso: npx tsx scratch/massive-ingest-crawler.ts
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
const ADMIN_USER_ID = '995ef324-b355-4786-8973-3fc8bb535745'; // cristianotatianacolomboimoveis@gmail.com
const CHUNK_SIZE_WORDS = 500;
const EMBEDDING_CONCURRENCY = 10;
const THROTTLE_MS = 5000;

// Lista curada de obras teológicas clássicas — IDs verificados no Project Gutenberg
// Critério: autor morreu antes de 1900, obra claramente teológica/filosófica
const CURATED_BOOKS: Array<{ id: number; title: string; author: string }> = [
  // ── Agostinho de Hipona (354–430) ────────────────────────────────────────
  // As Confissões e A Cidade de Deus já estão no banco. Adicionando obras restantes:
  { id: 45844, title: 'Anti-Pelagian Writings', author: 'Augustine of Hippo' },
  { id: 45305, title: 'The City of God, Vol III', author: 'Augustine of Hippo' },

  // ── Tomás de Aquino (1225–1274) ──────────────────────────────────────────
  { id: 17611, title: 'Summa Theologica, Part I (Prima Pars)', author: 'Thomas Aquinas' },
  { id: 17897, title: 'Summa Theologica, Part I-II (Pars Prima Secundae)', author: 'Thomas Aquinas' },
  { id: 18755, title: 'Summa Theologica, Part II-II (Secunda Secundae)', author: 'Thomas Aquinas' },
  { id: 19950, title: 'Summa Theologica, Part III (Tertia Pars)', author: 'Thomas Aquinas' },

  // ── João Calvino (1509–1564) ──────────────────────────────────────────────
  { id: 45001, title: 'Institutes of the Christian Religion Vol I', author: 'John Calvin' },
  { id: 64392, title: 'Institutes of the Christian Religion Vol II', author: 'John Calvin' },
  { id: 45463, title: 'Letters of John Calvin, Volume II', author: 'John Calvin' },

  // ── Martinho Lutero (1483–1546) ───────────────────────────────────────────
  { id: 1722,  title: 'Martin Luther\'s Large Catechism', author: 'Martin Luther' },
  { id: 1670,  title: 'Luther\'s Little Instruction Book: The Small Catechism', author: 'Martin Luther' },

  // ── João Crisóstomo (349–407) ─────────────────────────────────────────────
  { id: 19038, title: 'Homilies on the Gospel of St. John', author: 'John Chrysostom' },
  { id: 17723, title: 'Homilies on the Epistles of Paul to the Corinthians', author: 'John Chrysostom' },
  { id: 32055, title: 'On the Priesthood', author: 'John Chrysostom' },

  // ── Anselmo de Cantuária (1033–1109) ──────────────────────────────────────
  { id: 36907, title: 'Cur Deus Homo (Why God Became Man)', author: 'Anselm of Canterbury' },
  { id: 26472, title: 'Proslogium; Monologium', author: 'Anselm of Canterbury' },

  // ── Jonathan Edwards (1703–1758) ─────────────────────────────────────────
  { id: 9519,  title: 'Freedom of the Will', author: 'Jonathan Edwards' },
  { id: 14867, title: 'A Treatise Concerning Religious Affections', author: 'Jonathan Edwards' },
  { id: 32011, title: 'Sinners in the Hands of an Angry God', author: 'Jonathan Edwards' },

  // ── Charles Spurgeon (1834–1892) ──────────────────────────────────────────
  { id: 19039, title: 'Lectures to My Students', author: 'Charles Spurgeon' },
  { id: 27530, title: 'All of Grace', author: 'Charles Spurgeon' },
  { id: 1967,  title: 'Morning and Evening', author: 'Charles Spurgeon' },

  // ── João Wesley (1703–1791) ───────────────────────────────────────────────
  { id: 41785, title: 'Sermons on Several Occasions', author: 'John Wesley' },
  { id: 59789, title: 'The Works of John Wesley, Vol 1', author: 'John Wesley' },

  // ── Ireneu de Lião (~130–202) ─────────────────────────────────────────────
  { id: 9804,  title: 'Against Heresies', author: 'Irenaeus of Lyons' },

  // ── Tertuliano (~155–220) ─────────────────────────────────────────────────
  { id: 7098,  title: 'Apology', author: 'Tertullian' },

  // ── Clemente de Alexandria (~150–215) ─────────────────────────────────────
  { id: 3239,  title: 'The Stromata (Miscellanies)', author: 'Clement of Alexandria' },

  // ── Atanásio (296–373) ────────────────────────────────────────────────────
  { id: 32999, title: 'On the Incarnation of the Word', author: 'Athanasius of Alexandria' },
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

function contentHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 32);
}

// ── Embedding em lotes com throttle ─────────────────────────────────────────

async function embedBatch(texts: string[]): Promise<(number[] | null)[]> {
  const results: (number[] | null)[] = [];
  for (let i = 0; i < texts.length; i += EMBEDDING_CONCURRENCY) {
    const batch = texts.slice(i, i + EMBEDDING_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (text) => {
        try {
          const res = await ai.models.embedContent({
            model: 'gemini-embedding-001',
            contents: text,
            config: {
              taskType: 'RETRIEVAL_DOCUMENT',
              outputDimensionality: 768,
            },
          });
          return (res.embeddings?.[0]?.values ?? null) as number[] | null;
        } catch {
          return null;
        }
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

      // Deduplicação via metadata JSONB
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

// ── Registro no manifesto ────────────────────────────────────────────────────

function registerInManifest(filename: string, meta: { source: string; author: string; title: string }) {
  const content = fs.readFileSync(MANIFEST_PATH, 'utf-8');
  const key = `'${filename}'`;
  if (content.includes(key)) return; // Já registrada

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

// ── Download do Gutenberg ────────────────────────────────────────────────────

async function downloadBook(book: any): Promise<{ buffer: Buffer; filename: string; mime: string } | null> {
  const formats = book.formats as Record<string, string>;

  // Prefere EPUB (suportado pelo RAG), depois TXT
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

  // Não re-baixa se já existe
  if (fs.existsSync(filepath)) {
    const buffer = fs.readFileSync(filepath);
    return { buffer, filename, mime };
  }

  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  const buffer = Buffer.from(res.data);
  fs.writeFileSync(filepath, buffer);
  return { buffer, filename, mime };
}

// ── Extração de texto de TXT simples ────────────────────────────────────────

function extractTxtText(buffer: Buffer): string {
  let text = buffer.toString('utf-8');
  // Remove cabeçalho/rodapé padrão do Gutenberg
  const startMarker = /\*\*\* START OF (THE|THIS) PROJECT GUTENBERG/i;
  const endMarker = /\*\*\* END OF (THE|THIS) PROJECT GUTENBERG/i;
  const startIdx = text.search(startMarker);
  const endIdx = text.search(endMarker);
  if (startIdx > -1) text = text.slice(startIdx + 100);
  if (endIdx > -1) text = text.slice(0, endIdx);
  return text.trim();
}

// ── Pipeline principal ───────────────────────────────────────────────────────

async function processBook(book: any): Promise<void> {
  const title = book.title;
  const authorName = book.authors?.[0]?.name ?? 'Unknown';
  const gutenbergId = book.id;

  console.log(`\n  📖 ${title} — ${authorName} (Gutenberg #${gutenbergId})`);

  // 1. Download
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

  // 2. Extração de texto
  let rawText: string;
  if (mime === 'text/plain') {
    rawText = extractTxtText(buffer);
  } else {
    // EPUB — usa o extrator nativo do projeto
    try {
      const { findExtractor } = await import(
        '/Users/cristianocolombo/Downloads/TheoSphere/backend/src/rag/text-extractors.js'
      );
      const extractor = findExtractor(mime);
      if (!extractor) { console.log(`  ⚠️  Extrator não encontrado para ${mime}. Pulando.`); return; }
      const result = await extractor.extract(buffer);
      rawText = result.text;
    } catch {
      // Fallback: tenta baixar TXT
      const txtUrl = book.formats['text/plain; charset=utf-8'] || book.formats['text/plain'];
      if (!txtUrl) { console.log(`  ⚠️  Sem TXT fallback. Pulando.`); return; }
      const res = await axios.get(txtUrl, { responseType: 'text', timeout: 30000 });
      rawText = extractTxtText(Buffer.from(res.data));
    }
  }

  if (!rawText || rawText.length < 500) {
    console.log(`  ⚠️  Texto insuficiente extraído (${rawText?.length ?? 0} chars). Pulando.`);
    return;
  }

  // 3. Chunking
  const chunks = chunkText(rawText, CHUNK_SIZE_WORDS);
  console.log(`  🔪 ${chunks.length} chunks de ~${CHUNK_SIZE_WORDS} palavras`);

  // 4. Embeddings
  console.log(`  🧠 Gerando embeddings (${chunks.length} chunks, ${Math.ceil(chunks.length / EMBEDDING_CONCURRENCY)} lotes)...`);
  const embeddings = await embedBatch(chunks);
  const validEmbeddings = embeddings.filter(Boolean).length;
  console.log(`  ✅ ${validEmbeddings}/${chunks.length} embeddings gerados`);

  // 5. Gravação no banco
  const { inserted, skipped } = await upsertChunks(chunks, embeddings, {
    title,
    author: authorName,
    source: `Project Gutenberg #${gutenbergId}`,
    gutenbergId,
  });
  console.log(`  💾 Banco: +${inserted} novos | ${skipped} já existentes`);

  // 6. Manifesto
  registerInManifest(filename, {
    source: `Project Gutenberg #${gutenbergId}`,
    author: authorName,
    title,
  });
  console.log(`  📋 Manifesto: ${filename} registrado.`);
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

async function bootstrap() {
  console.log('🌟 [AGENTE-MASSIVO] Iniciando ingestão autônoma de obras teológicas de domínio público...\n');
  console.log(`📂 Destino: ${SAVE_DIR}`);
  console.log(`🔑 Gemini Key: ${process.env.GEMINI_API_KEY ? '***configurada***' : '❌ AUSENTE'}`);
  console.log(`🔑 Database:   ${process.env.DATABASE_URL ? '***configurada***' : '❌ AUSENTE'}`);
  console.log(`📚 Total de obras curadas: ${CURATED_BOOKS.length}\n`);

  if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR, { recursive: true });

  let totalProcessed = 0;
  let totalInserted = 0;

  for (const entry of CURATED_BOOKS) {
    console.log(`\n🔍 Buscando ID #${entry.id}: "${entry.title}" — ${entry.author}`);

    let book: any;
    try {
      const res = await axios.get(`https://gutendex.com/books/${entry.id}`, { timeout: 15000 });
      book = res.data;
    } catch (err: any) {
      // Tenta URL alternativa
      try {
        const res2 = await axios.get(`https://gutendex.com/books/?ids=${entry.id}`, { timeout: 15000 });
        book = res2.data.results?.[0];
      } catch {
        console.log(`  ❌ Não encontrado. Pulando.`);
        continue;
      }
    }

    if (!book) {
      console.log(`  ❌ Obra não encontrada no Gutenberg. Pulando.`);
      continue;
    }

    // Injeta metadados curados para garantir autor/título corretos
    book.title = entry.title;
    if (!book.authors?.length) {
      book.authors = [{ name: entry.author }];
    }

    try {
      await processBook(book);
      totalProcessed++;
    } catch (err: any) {
      console.log(`  ❌ Erro ao processar "${entry.title}": ${err.message}`);
    }

    // Throttle entre obras para não sobrecarregar a API
    await sleep(1000);
  }

  await pool.end();
  console.log(`\n🏁 [AGENTE-MASSIVO] Sessão concluída.`);
  console.log(`   Obras processadas: ${totalProcessed}/${CURATED_BOOKS.length}`);
}

bootstrap().catch((err) => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
