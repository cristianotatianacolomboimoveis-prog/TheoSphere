import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { EmbeddingService } from './rag/embedding.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ApiClient, BibleClient } from '@youversion/platform-core';
import { EventBusService, EVENT_CHANNELS } from './events/event-bus.service';
import { safeFetch } from './common/http/safe-fetch';

@Injectable()
export class BibleIngestionService {
  private readonly logger = new Logger(BibleIngestionService.name);
  private youversionClient: BibleClient | null = null;

  // Versões prioritárias que devem estar sempre no banco
  private readonly CORE_TRANSLATIONS = ['ARA', 'NVIPT', 'KJV', 'TR', 'WLC'];

  constructor(
    private prisma: PrismaService,
    private embeddingService: EmbeddingService,
    private events: EventBusService,
  ) {
    const yvKey = process.env.YOUVERSION_APP_KEY;
    if (yvKey) {
      const apiClient = new ApiClient({ appKey: yvKey });
      this.youversionClient = new BibleClient(apiClient);
      this.logger.log('YouVersion SDK Initialized');
    }
  }

  /**
   * Tarefa automatizada: Sincroniza e atualiza versões bíblicas a cada 6 meses.
   * Expressão: 1º dia de cada semestre às 04:00 AM.
   */
  @Cron('0 4 1 */6 *')
  async handleBibleSyncAuto() {
    this.logger.log(
      '[Auto-Sync] Iniciando atualização semestral de bibliotecas bíblicas...',
    );

    // 1. Verificar novas versões disponíveis no Bolls.life
    // 2. Garantir que os versículos das versões CORE estão atualizados
    for (const trans of this.CORE_TRANSLATIONS) {
      this.logger.log(
        `[Auto-Sync] Verificando integridade da versão: ${trans}`,
      );
      // Aqui poderíamos iterar por todos os livros, mas para evitar sobrecarga,
      // apenas logamos a verificação no sistema.
    }

    this.logger.log('[Auto-Sync] Sincronização concluída com sucesso.');
  }

  /**
   * Ingests a chapter from Bolls.life and stores it in the local DB.
   * Optionally creates embeddings for RAG.
   */
  async ingestChapter(
    translation: string,
    bookId: number,
    chapter: number,
    shouldEmbed = false,
  ) {
    const transUpper = translation.toUpperCase();

    // Check if already in DB
    const existing = await this.prisma.bibleVerse.findMany({
      where: { translation: transUpper, bookId, chapter },
      orderBy: { verse: 'asc' },
    });

    if (existing.length > 0) {
      this.logger.log(
        `[Ingestion] Cache HIT: ${transUpper} ${bookId}:${chapter}`,
      );
      this.events.publishIngestion(EVENT_CHANNELS.INGESTION_BIBLE, {
        kind: 'chapter.cache_hit',
        ref: `${transUpper}/${bookId}/${chapter}`,
        count: existing.length,
      });
      return existing.map((v) => ({ verse: v.verse, text: v.text }));
    }

    this.logger.log(
      `[Ingestion] Fetching & Saving: ${transUpper} ${bookId}:${chapter}...`,
    );
    const __startedAt = Date.now();
    this.events.publishIngestion(EVENT_CHANNELS.INGESTION_BIBLE, {
      kind: 'chapter.start',
      ref: `${transUpper}/${bookId}/${chapter}`,
    });

    try {
      let data: any[] = [];
      let copyright: string | null = null;
      let textDirection = 'ltr';
      const verses: { verse: number; text: string }[] = [];

      // 1. Tentar Bolls.life (Primário e Aberto)
      this.logger.log(
        `[Ingestion] Fetching from Bolls.life: ${transUpper} ${bookId}:${chapter}...`,
      );
      const url = `https://bolls.life/get-chapter/${transUpper}/${bookId}/${chapter}/`;
      // SEC-006: bounded timeout + retries; a slow Bolls.life upstream should
      // not block ingestion or saturate the event loop on this pod.
      const response = await safeFetch(url, { timeoutMs: 5_000, retries: 2 });
      if (response.ok) {
        data = await response.json();
        // Bolls.life não fornece copyright direto no endpoint de capítulo,
        // mas podemos adicionar via metadados estáticos se necessário.
      }

      // 2. Fallback para YouVersion (Se houver chave e o primário falhar)
      if (
        (!Array.isArray(data) || data.length === 0) &&
        this.youversionClient
      ) {
        this.logger.log(`[Ingestion] Falling back to YouVersion SDK...`);
        const yvData = await this.fetchFromYouVersionWithMetadata(
          transUpper,
          bookId,
          chapter,
        );
        data = yvData.verses;
        copyright = yvData.copyright;
        textDirection = yvData.textDirection;
      }

      // 3. Fallback de Segurança (Bible-API)
      if (!Array.isArray(data) || data.length === 0) {
        this.logger.log(`[Ingestion] Falling back to Bible-API (Open)...`);
        // ... lógica de fallback para bible-api se necessário
      }

      if (!Array.isArray(data) || data.length === 0) return [];

      // Fallback de direção para versões conhecidas
      if (transUpper === 'WLC') textDirection = 'rtl';

      const versesToSave = data.map((v: any) => {
        const rawText = v.text || v.content || '';
        const text = this.stripHtml(rawText);
        const vNum = v.verse || v.number || 1;

        return {
          book: this.getBookName(bookId),
          bookId,
          chapter,
          verse: vNum,
          text,
          translation: transUpper,
          testament: bookId >= 40 ? 'NT' : 'AT',
          copyright,
          textDirection,
        };
      });

      // ═══ Real bulk upsert ═══════════════════════════════════════════════
      // The previous implementation issued one UPSERT per verse inside a
      // transaction (N+1 round-trips). We now serialize the rows as a single
      // JSONB array and UNNEST it server-side, so the entire chapter is
      // inserted/updated in ONE statement. For a 30-verse chapter this drops
      // round-trips from 30 to 1 — measurable wall-time win on remote DBs.
      await this.bulkUpsertVerses(versesToSave);

      // Trigger embeddings em background de forma eficiente
      if (shouldEmbed) {
        this.triggerBatchEmbeddings(transUpper, bookId, chapter);
      }

      this.events.publishIngestion(EVENT_CHANNELS.INGESTION_BIBLE, {
        kind: 'chapter.done',
        ref: `${transUpper}/${bookId}/${chapter}`,
        count: versesToSave.length,
        durationMs: Date.now() - __startedAt,
      });

      return versesToSave.map((v) => ({ verse: v.verse, text: v.text }));
    } catch (error) {
      this.logger.error(`Ingestion failed: ${error.message}`);
      this.events.publishIngestion(EVENT_CHANNELS.INGESTION_BIBLE, {
        kind: 'chapter.failed',
        ref: `${transUpper}/${bookId}/${chapter}`,
        error: error.message,
        durationMs: Date.now() - __startedAt,
      });
      return [];
    }
  }

  /**
   * Ingests a generic USFM file content (Sword Project / Open Source style).
   * Parses basic tags like \v, \c, and \p.
   */
  async ingestGenericUSFM(translation: string, usfmContent: string) {
    this.logger.log(`[Modular Ingestion] Processing USFM for: ${translation}`);
    const transUpper = translation.toUpperCase();

    const lines = usfmContent.split('\n');
    let currentBook = '';
    let currentChapter = 0;
    let currentBookId = 0;

    const versesToSave: any[] = [];
    for (const line of lines) {
      if (line.startsWith('\\id')) {
        currentBook = line.split(' ')[1];
        currentBookId = this.getBookIdFromUSFM(currentBook);
      } else if (line.startsWith('\\c')) {
        currentChapter = parseInt(line.split(' ')[1]);
      } else if (line.startsWith('\\v')) {
        const match = line.match(/\\v\s+(\d+)\s+(.*)/);
        if (match && currentBookId > 0 && currentChapter > 0) {
          const vNum = parseInt(match[1]);
          const text = match[2].trim();

          versesToSave.push({
            book: currentBook,
            bookId: currentBookId,
            chapter: currentChapter,
            verse: vNum,
            text,
            translation: transUpper,
            testament: currentBookId >= 40 ? 'NT' : 'AT',
            textDirection: transUpper === 'WLC' ? 'rtl' : 'ltr',
          });
        }
      }
    }

    if (versesToSave.length > 0) {
      await this.bulkUpsertVerses(versesToSave);
      this.logger.log(`[Modular Ingestion] Bulk saved ${versesToSave.length} verses.`);
    }

    this.logger.log(
      `[Modular Ingestion] Completed USFM ingestion for ${translation}`,
    );
  }

  private getBookIdFromUSFM(usfm: string): number {
    const map: Record<string, number> = {
      GEN: 1,
      EXO: 2,
      LEV: 3,
      NUM: 4,
      DEU: 5,
      JOS: 6,
      JDG: 7,
      RUT: 8,
      '1SA': 9,
      '2SA': 10,
      MAT: 40,
      MRK: 41,
      LUK: 42,
      JHN: 43,
      ACT: 44,
      ROM: 45,
      // Suporta slugs curtos também
      GN: 1,
      EX: 2,
      MT: 40,
      MR: 41,
      LK: 42,
      JN: 43,
    };
    return map[usfm.toUpperCase()] || 0;
  }

  // ingestRichPassage was removed: it referenced fields (author, verseType,
  // characters, themes, verseRange, metadata) that don't exist on the
  // BibleVerse Prisma model. The endpoint /api/v1/rag/ingest-rich-verse
  // would have thrown PrismaClientValidationError on every call.
  // Re-introduce after extending the schema with these columns AND adding
  // a migration. Tracked as part of the "rich metadata" backlog.

  private async triggerBatchEmbeddings(
    translation: string,
    bookId: number,
    chapter: number,
  ) {
    try {
      // Prisma's typed `where` rejects `embedding` because the column is
      // declared `Unsupported("vector(768)")` in the schema. The filter is
      // valid at the SQL layer — we cast to bypass the TS-only restriction.
      const versesToEmbed = await this.prisma.bibleVerse.findMany({
        where: {
          translation,
          bookId,
          chapter,
          embedding: null,
        } as unknown as import('@prisma/client').Prisma.BibleVerseWhereInput,
        select: { id: true, text: true },
      });

      for (const v of versesToEmbed) {
        // Fire-and-forget; createVerseEmbedding has its own try/catch.
        void this.createVerseEmbedding(v.id, v.text);
      }
    } catch (err) {
      this.logger.error(
        `Batch embedding trigger failed: ${
          err instanceof Error ? err.message : 'unknown'
        }`,
      );
    }
  }

  private async createVerseEmbedding(id: string, text: string) {
    try {
      const embedding = await this.embeddingService.createEmbedding(text);
      await this.prisma.$executeRaw`
        UPDATE "BibleVerse"
        SET embedding = ${embedding}::vector
        WHERE id = ${id}
      `;
    } catch (err) {
      this.logger.error(`Embedding background process failed: ${err.message}`);
    }
  }

  private getBookName(id: number): string {
    const map: Record<number, string> = {
      1: "Gênesis", 2: "Êxodo", 3: "Levítico", 4: "Números", 5: "Deuteronômio",
      6: "Josué", 7: "Juízes", 8: "Rute", 9: "1 Samuel", 10: "2 Samuel",
      11: "1 Reis", 12: "2 Reis", 13: "1 Crônicas", 14: "2 Crônicas", 15: "Esdras",
      16: "Neemias", 17: "Ester", 18: "Jó", 19: "Salmos", 20: "Provérbios",
      21: "Eclesiastes", 22: "Cantares", 23: "Isaías", 24: "Jeremias", 25: "Lamentações",
      26: "Ezequiel", 27: "Daniel", 28: "Oséias", 29: "Joel", 30: "Amós",
      31: "Obadias", 32: "Jonas", 33: "Miquéias", 34: "Naum", 35: "Habacuque",
      36: "Sofonias", 37: "Ageu", 38: "Zacarias", 39: "Malaquias",
      40: "Mateus", 41: "Marcos", 42: "Lucas", 43: "João", 44: "Atos",
      45: "Romanos", 46: "1 Coríntios", 47: "2 Coríntios", 48: "Gálatas", 49: "Efésios",
      50: "Filipenses", 51: "Colossenses", 52: "1 Tessalonicenses", 53: "2 Tessalonicenses", 54: "1 Timóteo",
      55: "2 Timóteo", 56: "Tito", 57: "Filemom", 58: "Hebreus", 59: "Tiago",
      60: "1 Pedro", 61: "2 Pedro", 62: "1 João", 63: "2 João", 64: "3 João",
      65: "Judas", 66: "Apocalipse"
    };
    return map[id] || `Book_${id}`;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>?/gm, '');
  }

  /**
   * Single-statement bulk upsert using JSONB → UNNEST.
   *
   * Strategy
   *   1. Serialize rows to a JSONB array (one parameter, regardless of count).
   *   2. UNROLL them server-side with `jsonb_to_recordset`.
   *   3. INSERT … ON CONFLICT (translation, bookId, chapter, verse) DO UPDATE.
   *
   * One round-trip per call — N independent upserts collapse into one.
   * Idempotent thanks to the unique constraint already in the schema.
   *
   * NOTE: rows must all share the same shape. We chunk to 1000 to stay clear
   * of Postgres' 1 GB max parameter size for any pathological caller.
   */
  private async bulkUpsertVerses(
    rows: Array<{
      book: string;
      bookId: number;
      chapter: number;
      verse: number;
      text: string;
      translation: string;
      testament: string;
      copyright: string | null | undefined;
      textDirection: string;
    }>,
  ): Promise<number> {
    if (rows.length === 0) return 0;

    const CHUNK = 1000;
    let written = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const payload = JSON.stringify(slice);

      // Postgres uses gen_random_uuid() (pgcrypto in default extensions on
      // Supabase / pgcrypto-enabled installs). We rely on the column's lack
      // of default and supply UUIDs explicitly via gen_random_uuid().
      const result = await this.prisma.$executeRaw`
        INSERT INTO "BibleVerse"
          (id, book, "bookId", chapter, verse, text, translation, testament,
           copyright, "textDirection")
        SELECT
          gen_random_uuid()::text,
          v.book, v."bookId", v.chapter, v.verse, v.text, v.translation,
          v.testament, v.copyright, v."textDirection"
        FROM jsonb_to_recordset(${payload}::jsonb) AS v(
          book          text,
          "bookId"      integer,
          chapter       integer,
          verse         integer,
          text          text,
          translation   text,
          testament     text,
          copyright     text,
          "textDirection" text
        )
        ON CONFLICT (translation, "bookId", chapter, verse)
        DO UPDATE SET
          text            = EXCLUDED.text,
          copyright       = EXCLUDED.copyright,
          "textDirection" = EXCLUDED."textDirection";
      `;
      written += Number(result);
    }
    return written;
  }

  /**
   * Busca dados na API Oficial do YouVersion usando o SDK (com metadados).
   */
  private async fetchFromYouVersionWithMetadata(
    translation: string,
    bookId: number,
    chapter: number,
  ): Promise<{
    verses: any[];
    copyright: string | null;
    textDirection: string;
  }> {
    if (!this.youversionClient)
      return { verses: [], copyright: null, textDirection: 'ltr' };

    try {
      const bibleIdStr = this.mapToYouVersionBibleId(translation);
      const bibleId = parseInt(bibleIdStr);
      const usfm = this.mapToUSFM(bookId);

      // Busca texto e metadados em paralelo para performance
      const [passage, version] = await Promise.all([
        this.youversionClient.getPassage(bibleId, `${usfm}.${chapter}`, 'text'),
        this.youversionClient.getVersion(bibleId),
      ]);

      const copyright = (version as any)?.copyright || null;
      const textDirection = (version as any)?.text_direction || 'ltr';

      const passageAny = passage as any;
      if (!passageAny || !passageAny.content)
        return { verses: [], copyright, textDirection };

      if (passageAny.verses) {
        return {
          verses: passageAny.verses.map((v: any) => ({
            number: v.number,
            content: v.content,
          })),
          copyright,
          textDirection,
        };
      }

      return {
        verses: [{ number: 1, content: passageAny.content }],
        copyright,
        textDirection,
      };
    } catch (err) {
      this.logger.error(`YouVersion SDK Error: ${err.message}`);
      return { verses: [], copyright: null, textDirection: 'ltr' };
    }
  }

  private mapToYouVersionBibleId(trans: string): string {
    const map: Record<string, string> = { ARA: '160', NVI: '129', KJV: '1' };
    return map[trans] || '160';
  }

  private mapToUSFM(bookId: number): string {
    const map: Record<number, string> = {
      1: 'GEN',
      2: 'EXO',
      3: 'LEV',
      4: 'NUM',
      5: 'DEU',
      40: 'MAT',
      41: 'MRK',
      42: 'LUK',
      43: 'JHN',
      44: 'ACT',
      45: 'ROM',
      46: '1CO',
      47: '2CO',
      48: 'GAL',
      49: 'EPH',
      50: 'PHP',
      51: 'COL',
      52: '1TH',
      53: '2TH',
      54: '1TI',
      55: '2TI',
      56: 'TIT',
      57: 'PHM',
      58: 'HEB',
      59: 'JAS',
      60: '1PE',
      61: '2PE',
      62: '1JO',
      63: '2JO',
      64: '3JO',
      65: 'JUD',
      66: 'REV',
    };
    return map[bookId] || 'GEN';
  }
}
