import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CrossReferencesService } from './cross-references.service';
import { LinguisticsService } from '../linguistics/linguistics.service';
import { ArchaeologyService } from '../archaeology/archaeology.service';

/**
 * PassageGuideService — o "Passage Guide" do TheoSphere (paridade com a
 * experiência-assinatura do Logos, construída sobre dados abertos).
 *
 * Uma única chamada agrega, para um capítulo ou versículo:
 *   • texto bíblico (tradução pedida)
 *   • interlinear STEP (TAGNT/TAHOT) palavra a palavra
 *   • cross-references TSK (lista no versículo; contagens no capítulo)
 *   • léxico (entradas dos Strong's presentes na passagem)
 *   • comentários técnicos locais
 *   • achados arqueológicos ligados à passagem
 *
 * Tudo em Promise.all — a latência é a da fonte mais lenta, não a soma.
 * IA fica de fora deste endpoint por design: síntese RAG tem custo por
 * chamada e já existe em /rag/chat; o guide é 100% determinístico e
 * cacheável (Cache-Control no controller).
 */

/** Nome EN canônico por bookId (formato dos sourceRef do TSK). */
const EN_NAME: Record<number, string> = {
  1: 'Genesis',
  2: 'Exodus',
  3: 'Leviticus',
  4: 'Numbers',
  5: 'Deuteronomy',
  6: 'Joshua',
  7: 'Judges',
  8: 'Ruth',
  9: '1 Samuel',
  10: '2 Samuel',
  11: '1 Kings',
  12: '2 Kings',
  13: '1 Chronicles',
  14: '2 Chronicles',
  15: 'Ezra',
  16: 'Nehemiah',
  17: 'Esther',
  18: 'Job',
  19: 'Psalms',
  20: 'Proverbs',
  21: 'Ecclesiastes',
  22: 'Song of Solomon',
  23: 'Isaiah',
  24: 'Jeremiah',
  25: 'Lamentations',
  26: 'Ezekiel',
  27: 'Daniel',
  28: 'Hosea',
  29: 'Joel',
  30: 'Amos',
  31: 'Obadiah',
  32: 'Jonah',
  33: 'Micah',
  34: 'Nahum',
  35: 'Habakkuk',
  36: 'Zephaniah',
  37: 'Haggai',
  38: 'Zechariah',
  39: 'Malachi',
  40: 'Matthew',
  41: 'Mark',
  42: 'Luke',
  43: 'John',
  44: 'Acts',
  45: 'Romans',
  46: '1 Corinthians',
  47: '2 Corinthians',
  48: 'Galatians',
  49: 'Ephesians',
  50: 'Philippians',
  51: 'Colossians',
  52: '1 Thessalonians',
  53: '2 Thessalonians',
  54: '1 Timothy',
  55: '2 Timothy',
  56: 'Titus',
  57: 'Philemon',
  58: 'Hebrews',
  59: 'James',
  60: '1 Peter',
  61: '2 Peter',
  62: '1 John',
  63: '2 John',
  64: '3 John',
  65: 'Jude',
  66: 'Revelation',
};

/** Abreviação PT por bookId (formato dos relatedRefs da arqueologia). */
const PT_ABBREV: Record<number, string> = {
  1: 'Gn',
  2: 'Êx',
  3: 'Lv',
  4: 'Nm',
  5: 'Dt',
  6: 'Js',
  7: 'Jz',
  8: 'Rt',
  9: '1Sm',
  10: '2Sm',
  11: '1Rs',
  12: '2Rs',
  13: '1Cr',
  14: '2Cr',
  15: 'Ed',
  16: 'Ne',
  17: 'Et',
  18: 'Jó',
  19: 'Sl',
  20: 'Pv',
  21: 'Ec',
  22: 'Ct',
  23: 'Is',
  24: 'Jr',
  25: 'Lm',
  26: 'Ez',
  27: 'Dn',
  28: 'Os',
  29: 'Jl',
  30: 'Am',
  31: 'Ob',
  32: 'Jn',
  33: 'Mq',
  34: 'Na',
  35: 'Hc',
  36: 'Sf',
  37: 'Ag',
  38: 'Zc',
  39: 'Ml',
  40: 'Mt',
  41: 'Mc',
  42: 'Lc',
  43: 'Jo',
  44: 'At',
  45: 'Rm',
  46: '1Co',
  47: '2Co',
  48: 'Gl',
  49: 'Ef',
  50: 'Fp',
  51: 'Cl',
  52: '1Ts',
  53: '2Ts',
  54: '1Tm',
  55: '2Tm',
  56: 'Tt',
  57: 'Fm',
  58: 'Hb',
  59: 'Tg',
  60: '1Pe',
  61: '2Pe',
  62: '1Jo',
  63: '2Jo',
  64: '3Jo',
  65: 'Jd',
  66: 'Ap',
};

const MAX_LEXICON_ENTRIES = 25;

/** Mapeamento dos 66 livros da Bíblia para os IDs do acervo de comentários clássicos */
const COMMENTARY_BOOK_MAP: Record<number, string[]> = {
  1: ['90001', '91001', '91002'], // Gn (Henry + Calvino)
  2: ['90001', '91003', '91004'], // Êx (Henry + Calvino)
  3: ['90001', '91005'], // Lv (Henry + Calvino)
  4: ['90001', '91005', '91006'], // Nm (Henry + Calvino)
  5: ['90001', '91006'], // Dt (Henry + Calvino)
  6: ['90002', '91007'], // Js (Henry + Calvino)
  7: ['90002'],
  8: ['90002'],
  9: ['90002'],
  10: ['90002'],
  11: ['90002'],
  12: ['90002'],
  13: ['90002'],
  14: ['90002'],
  15: ['90002'],
  16: ['90002'],
  17: ['90002'],
  18: ['90003'],
  19: ['90003', '91008', '91009', '91010', '91011', '91012'], // Sl (Henry + Calvino)
  20: ['90003'],
  21: ['90003'],
  22: ['90003'],
  23: ['90004', '91013', '91014', '91015', '91016'], // Is (Henry + Calvino)
  24: ['90004', '91017', '91018', '91019', '91020', '91021'], // Jr (Henry + Calvino)
  25: ['90004', '91021'], // Lm (Henry + Calvino)
  26: ['90004', '91022', '91023'], // Ez (Henry + Calvino)
  27: ['90004', '91024', '91025'], // Dn (Henry + Calvino)
  28: ['90004', '91026'], // Os (Henry + Calvino)
  29: ['90004', '91027'], // Jl (Henry + Calvino)
  30: ['90004', '91027'], // Am (Henry + Calvino)
  31: ['90004', '91027'], // Ob (Henry + Calvino)
  32: ['90004', '91028'], // Jn (Henry + Calvino)
  33: ['90004', '91028'], // Mq (Henry + Calvino)
  34: ['90004', '91028'], // Na (Henry + Calvino)
  35: ['90004', '91029'], // Hc (Henry + Calvino)
  36: ['90004', '91029'], // Sf (Henry + Calvino)
  37: ['90004', '91029'], // Ag (Henry + Calvino)
  38: ['90004', '91030'], // Zc (Henry + Calvino)
  39: ['90004', '91030'], // Ml (Henry + Calvino)
  40: ['90005', '91031', '91032', '91033'], // Mt (Henry + Calvino)
  41: ['90005', '91031', '91032', '91033'], // Mc (Henry + Calvino)
  42: ['90005', '91031', '91032', '91033'], // Lc (Henry + Calvino)
  43: ['90005', '91034', '91035'], // Jo (Henry + Calvino)
  44: ['90006', '91036', '91037'], // At (Henry + Calvino)
  45: ['90006', '91038'], // Rm (Henry + Calvino)
  46: ['90006', '91039'], // 1Co (Henry + Calvino)
  47: ['90006', '91040'], // 2Co (Henry + Calvino)
  48: ['90006', '91041', '3390'], // Gl (Henry + Calvino + Lutero)
  49: ['90006', '91041'], // Ef (Henry + Calvino)
  50: ['90006', '91042'], // Fp (Henry + Calvino)
  51: ['90006', '91042'], // Cl (Henry + Calvino)
  52: ['90006', '91042'], // 1Ts (Henry + Calvino)
  53: ['90006', '91042'], // 2Ts (Henry + Calvino)
  54: ['90006', '91043'], // 1Tm (Henry + Calvino)
  55: ['90006', '91043'], // 2Tm (Henry + Calvino)
  56: ['90006', '91043'], // Tt (Henry + Calvino)
  57: ['90006', '91043'], // Fm (Henry + Calvino)
  58: ['90006', '91044'], // Hb (Henry + Calvino)
  59: ['90006', '91045'], // Tg (Henry + Calvino)
  60: ['90006', '91045'], // 1Pe (Henry + Calvino)
  61: ['90006', '91045'], // 2Pe (Henry + Calvino)
  62: ['90006', '91045'], // 1Jo (Henry + Calvino)
  63: ['90006', '91045'], // 2Jo (Henry + Calvino)
  64: ['90006', '91045'], // 3Jo (Henry + Calvino)
  65: ['90006', '91045'], // Jd (Henry + Calvino)
  66: ['90006'], // Ap (Henry)
};

@Injectable()
export class PassageGuideService {
  private readonly logger = new Logger(PassageGuideService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crossRefs: CrossReferencesService,
    private readonly linguistics: LinguisticsService,
    private readonly archaeology: ArchaeologyService,
  ) {}

  /**
   * Extrai trechos exegéticos relevantes de Calvino, Matthew Henry e Lutero
   * do acervo de 45.114 chunks em UserEmbedding.
   */
  private async getClassicCommentaries(
    bookId: number,
    chapter: number,
    verse?: number,
  ): Promise<
    Array<{
      verse: number;
      author: string;
      content: string;
      source: string;
      tags: string[];
    }>
  > {
    const gids = COMMENTARY_BOOK_MAP[bookId];
    if (!gids || gids.length === 0) return [];

    try {
      const enBook = EN_NAME[bookId];
      const searchTerms: string[] = [];
      if (enBook) {
        searchTerms.push(`%${enBook} ${chapter}%`);
      }
      searchTerms.push(`%CHAPTER ${chapter}%`);
      searchTerms.push(`%Chapter ${chapter}%`);
      if (verse) {
        searchTerms.push(`%${chapter}:${verse}%`);
        if (enBook) searchTerms.push(`%${enBook} ${chapter}:${verse}%`);
      } else {
        searchTerms.push(`%${chapter}:1%`);
      }

      if (typeof (this.prisma as any).$queryRawUnsafe !== 'function') {
        return [];
      }

      const orClauses = searchTerms
        .map((_, idx) => `content ILIKE $${idx + 2}`)
        .join(' OR ');
      const rows = (await (this.prisma as any).$queryRawUnsafe(
        `SELECT metadata->>'title' as title, metadata->>'author' as author, content
         FROM "UserEmbedding"
         WHERE metadata->>'gutenbergId' = ANY($1::text[])
           AND (${orClauses})
         LIMIT 25;`,
        gids,
        ...searchTerms,
      )) as Array<{ title?: string; author?: string; content?: string }>;

      if (!Array.isArray(rows) || rows.length === 0) return [];

      return rows
        .filter((r) => {
          if (!r.content || r.content.length < 200) return false;
          const bracketRatio = (r.content.match(/\[\d+\]/g) || []).length;
          return bracketRatio < 5; // descarta índices remissivos puros
        })
        .slice(0, 4)
        .map((r) => {
          let cleaned = (r.content || '')
            .replace(/_{3,}/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          if (cleaned.length > 1000) {
            cleaned = cleaned.slice(0, 1000) + '...';
          }
          return {
            verse: verse ?? 1,
            author: r.author || 'Clássico',
            content: cleaned,
            source: r.title || 'Comentário Exegético',
            tags: ['clássico', 'exegese', 'domínio-público'],
          };
        });
    } catch (err: any) {
      this.logger.warn(
        `Busca de comentários clássicos contornada: ${err.message}`,
      );
      return [];
    }
  }

  /**
   * Monta o guia da passagem. `verse` opcional: com ele, o guide é focado
   * no versículo (cross-refs listadas); sem ele, cobre o capítulo
   * (cross-refs como contagens por versículo — badge no leitor).
   */
  async getGuide(
    translation: string,
    bookId: number,
    chapter: number,
    verse?: number,
  ) {
    const enBook = EN_NAME[bookId];
    const ptAbbrev = PT_ABBREV[bookId];

    const [
      verses,
      interlinear,
      technicalComments,
      classicComments,
      arch,
      xrefs,
    ] = await Promise.all([
      // Texto bíblico
      this.prisma.bibleVerse.findMany({
        where: {
          translation,
          bookId,
          chapter,
          ...(verse ? { verse } : {}),
        },
        orderBy: { verse: 'asc' },
        select: { verse: true, text: true },
      }),
      // Interlinear (grupo por versículo já vem do LinguisticsService)
      this.linguistics.getInterlinearChapter(bookId, chapter).catch((e) => {
        this.logger.warn(`interlinear falhou: ${(e as Error).message}`);
        return { available: false, source: null, verses: {} };
      }),
      // Comentários técnicos locais
      this.prisma.technicalCommentary.findMany({
        where: { bookId, chapter, ...(verse ? { verse } : {}) },
        take: 20,
        select: {
          verse: true,
          author: true,
          content: true,
          source: true,
          tags: true,
        },
      }),
      // Comentários clássicos canônicos (Calvino, Matthew Henry, Lutero)
      this.getClassicCommentaries(bookId, chapter, verse),
      // Arqueologia: capítulo primeiro, livro como fallback
      (async () => {
        if (!ptAbbrev) return [];
        const byChapter = await this.archaeology
          .findByRef(`${ptAbbrev} ${chapter}`)
          .catch(() => []);
        if (byChapter.length > 0) return byChapter;
        return this.archaeology.findByRef(ptAbbrev).catch(() => []);
      })(),
      // Cross-refs TSK
      (async () => {
        if (!enBook) return { mode: 'none' as const };
        if (verse) {
          const list = await this.crossRefs
            .list(`${enBook} ${chapter}:${verse}`, 30)
            .catch(() => []);
          return { mode: 'list' as const, list };
        }
        // capítulo: contagens (badge) — refs dos versículos 1..N
        return { mode: 'counts' as const };
      })(),
    ]);

    const commentaries = [...technicalComments, ...classicComments];

    // Cross-refs em modo capítulo: uma chamada em lote com os refs reais
    let crossReferences: unknown = xrefs;
    if (xrefs.mode === 'counts' && enBook) {
      const refs = verses.map((v) => `${enBook} ${chapter}:${v.verse}`);
      const { counts } = await this.crossRefs
        .countsByRef(refs)
        .catch(() => ({ counts: {} }));
      crossReferences = { mode: 'counts', counts };
    }

    // Léxico: entradas dos Strong's que aparecem na passagem
    const verseWords: Array<{ strongId: string }> = verse
      ? (interlinear.verses[verse] ?? [])
      : Object.values(interlinear.verses).flat();
    const strongIds: string[] = Array.from(
      new Set(verseWords.map((w) => w.strongId)),
    ).slice(0, MAX_LEXICON_ENTRIES);
    const lexicon =
      strongIds.length > 0
        ? await this.prisma.lexicalEntry.findMany({
            where: { strongId: { in: strongIds } },
            select: {
              strongId: true,
              word: true,
              language: true,
              definition: true,
            },
          })
        : [];

    return {
      reference: {
        bookId,
        chapter,
        verse: verse ?? null,
        translation,
        display: `${enBook ?? bookId} ${chapter}${verse ? `:${verse}` : ''}`,
      },
      verses,
      interlinear: verse
        ? {
            available: interlinear.available,
            source: interlinear.source,
            words: interlinear.verses[verse] ?? [],
          }
        : interlinear,
      crossReferences,
      lexicon,
      commentaries,
      archaeology: arch,
    };
  }
}
