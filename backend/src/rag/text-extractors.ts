/**
 * Text extractors for the formats supported by the Drive ingestion pipeline.
 *
 * Each extractor receives a Buffer of the raw file bytes and returns plain
 * text. Failure modes are explicit (throw with a descriptive message) so
 * DriveRagService can log per-file and continue processing the folder.
 *
 * Formats covered:
 *   • PDF  — `pdf-parse` (already used pre-Fase-C)
 *   • DOCX — `mammoth.extractRawText` (already used pre-Fase-C)
 *   • EPUB — `epub2` library, walks the spine, strips HTML via node-html-parser
 *
 * NOT covered (intentional):
 *   • MOBI / AZW3 — proprietary Amazon formats with no well-maintained Node
 *     parser. Recommend users convert to EPUB via Calibre (free, batch CLI:
 *     `ebook-convert in.mobi out.epub`). Documented in the empty-state UI.
 *   • RTF, ODT — uncommon in theological libraries; can be added later.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';
import { promises as fsp } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

export interface ExtractorResult {
  text: string;
  /** Optional structured metadata extracted from the file itself. */
  meta?: {
    title?: string;
    author?: string;
    pages?: number;
    language?: string;
  };
}

export interface Extractor {
  /** Returns true if this extractor can handle the given mime type. */
  canHandle(mime: string): boolean;
  /** Extracts plain text from the buffer. May throw. */
  extract(buffer: Buffer): Promise<ExtractorResult>;
}

/* ─── PDF ──────────────────────────────────────────────────────────────── */

const pdfExtractor: Extractor = {
  canHandle: (mime) => mime === 'application/pdf',
  async extract(buffer) {
    const parser = new pdfParse.PDFParse(new Uint8Array(buffer));
    const pdfData = await parser.getText();
    return {
      text: pdfData.text ?? '',
      meta: { pages: pdfData.numpages },
    };
  },
};

/* ─── DOCX ─────────────────────────────────────────────────────────────── */

const docxExtractor: Extractor = {
  canHandle: (mime) =>
    mime ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  async extract(buffer) {
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value ?? '' };
  },
};

/* ─── EPUB ─────────────────────────────────────────────────────────────── */

/**
 * Mime types Google Drive reports for EPUB files. There's no single
 * canonical type — Drive sometimes uses `application/epub+zip` (IANA)
 * and sometimes `application/octet-stream` for legacy uploads.
 */
const EPUB_MIMES = new Set([
  'application/epub+zip',
  'application/epub',
]);

/**
 * Strip a parsed XHTML chapter to plain text. We deliberately avoid pulling
 * in a heavy DOM lib (jsdom): a small regex-driven scrub is enough for
 * theological prose. `<sup>`/`<ruby>` etc. become inline text, which is
 * fine for embedding — chunking will absorb the boundaries.
 */
function htmlToPlain(html: string): string {
  return html
    // Remove script/style blocks entirely
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    // Convert <br> and block tags into newlines for paragraph boundaries
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|td|section|article|blockquote)>/gi, '\n')
    // Drop everything else
    .replace(/<[^>]+>/g, '')
    // Decode the handful of named entities that show up in real EPUBs
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) =>
      String.fromCharCode(parseInt(n, 16)),
    )
    // Collapse runs of whitespace
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

const epubExtractor: Extractor = {
  canHandle: (mime) => EPUB_MIMES.has(mime),
  async extract(buffer) {
    // The `epub2` API parses from a file path, not a buffer. We write the
    // bytes to a temp file scoped to this extraction and delete on exit.
    // Using a uuid avoids collisions when multiple Drive files are ingested
    // concurrently (the cron and a manual /ingest can overlap).
    const tmpPath = join(tmpdir(), `theosphere-${randomUUID()}.epub`);
    await fsp.writeFile(tmpPath, buffer);

    try {
      // Dynamic require — keeps the lib out of the build graph for envs
      // where Drive ingestion is disabled.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const EPub = require('epub2').default ?? require('epub2');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const book: any = await new Promise((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const epub = new (EPub as any)(tmpPath);
        epub.on('error', reject);
        epub.on('end', () => resolve(epub));
        epub.parse();
      });

      const chapters: string[] = [];
      // book.flow is the linear reading order; book.spine.contents is similar.
      // Some EPUBs only populate one of the two — fall through.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const order: Array<{ id: string }> =
        book.flow?.length ? book.flow : book.spine?.contents ?? [];

      for (const item of order) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const html: string = await new Promise((res, rej) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (book as any).getChapter(item.id, (err: Error | null, txt: string) => {
              if (err) rej(err);
              else res(txt);
            });
          });
          chapters.push(htmlToPlain(html));
        } catch {
          // Skip unreadable chapter — better partial than empty.
        }
      }

      const text = chapters.join('\n\n').trim();

      return {
        text,
        meta: {
          title: typeof book.metadata?.title === 'string'
            ? book.metadata.title
            : undefined,
          author: typeof book.metadata?.creator === 'string'
            ? book.metadata.creator
            : undefined,
          language: typeof book.metadata?.language === 'string'
            ? book.metadata.language
            : undefined,
        },
      };
    } finally {
      // Best-effort cleanup. Even if delete fails, OS will reclaim tmp.
      try {
        await fsp.unlink(tmpPath);
      } catch {
        /* ignore */
      }
    }
  },
};

/* ─── Registry ────────────────────────────────────────────────────────── */

const EXTRACTORS: ReadonlyArray<Extractor> = [
  pdfExtractor,
  docxExtractor,
  epubExtractor,
];

export function findExtractor(mime: string): Extractor | undefined {
  return EXTRACTORS.find((e) => e.canHandle(mime));
}

/**
 * Mime-type clause for the Google Drive `files.list` query. Keep this in
 * sync with the registered extractors above.
 */
export const SUPPORTED_MIME_QUERY = [
  "mimeType='application/pdf'",
  "mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document'",
  "mimeType='application/epub+zip'",
  "mimeType='application/epub'",
].join(' or ');
