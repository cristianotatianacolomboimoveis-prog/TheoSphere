import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  TextualCriticismFilterDto,
  TextualCriticismSummary,
  TextualVariantItem,
} from './textual-criticism.dto';
import { TEXTUAL_VARIANTS_CATALOG } from './textual-criticism-data';
import { BOOK_ID_TO_NAME_PT, resolveBookId } from '../common/book-map';

@Injectable()
export class TextualCriticismService {
  private readonly logger = new Logger(TextualCriticismService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna lista resumida das variantes textuais catalogadas com filtros opcionais.
   */
  getAllVariants(
    filters?: TextualCriticismFilterDto,
  ): TextualCriticismSummary[] {
    let list = TEXTUAL_VARIANTS_CATALOG;

    if (filters?.testament) {
      const isOt = (bookId: number) => bookId <= 39;
      list = list.filter((item) =>
        filters.testament === 'OT' ? isOt(item.bookId) : !isOt(item.bookId),
      );
    }

    if (filters?.theologicalImpact) {
      list = list.filter(
        (item) => item.theologicalImpact === filters.theologicalImpact,
      );
    }

    if (filters?.bookId) {
      list = list.filter((item) => item.bookId === filters.bookId);
    }

    if (filters?.searchQuery) {
      const q = filters.searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.passageRef.toLowerCase().includes(q) ||
          item.unitTitlePt.toLowerCase().includes(q) ||
          item.scholarlyConsensusPt.toLowerCase().includes(q),
      );
    }

    return list.map((item) => ({
      id: item.id,
      passageRef: item.passageRef,
      unitTitlePt: item.unitTitlePt,
      testament: item.bookId <= 39 ? 'OT' : 'NT',
      variantType: item.variantType,
      criticalRating: item.criticalRating,
      theologicalImpact: item.theologicalImpact,
      dssOrEarlyPapyriInvolved: item.readings.some(
        (r) =>
          r.family === 'Qumran_DSS' ||
          r.witnessSiglum.includes('𝔓') ||
          r.witnessSiglum.includes('P'),
      ),
    }));
  }

  /**
   * Retorna os detalhes de uma variante crítica pelo ID.
   */
  getVariantById(id: string): TextualVariantItem | null {
    const cleanId = id.toUpperCase().trim();
    return TEXTUAL_VARIANTS_CATALOG.find((v) => v.id === cleanId) || null;
  }

  /**
   * Retorna as variantes críticas registradas para uma determinada passagem bíblica.
   */
  getVariantsForPassage(
    bookInput: string | number,
    chapter: number,
    verse?: number,
  ): TextualVariantItem[] {
    const numericBookId =
      typeof bookInput === 'number'
        ? bookInput
        : Number(bookInput) || resolveBookId(bookInput) || 1;

    return TEXTUAL_VARIANTS_CATALOG.filter((item) => {
      if (item.bookId !== numericBookId) return false;
      if (item.chapter !== chapter) return false;
      if (verse !== undefined && item.verse !== verse) return false;
      return true;
    });
  }

  /**
   * Retorna o aparato comparativo de manuscritos para um versículo arbitrário.
   */
  async getManuscriptApparatus(
    bookInput: string,
    chapter: number,
    verse: number,
  ): Promise<{
    passageRef: string;
    hasNotableCatalogVariant: boolean;
    catalogVariant?: TextualVariantItem;
    manuscriptWitnesses: {
      translationCode: string;
      sourceName: string;
      language: string;
      text: string;
    }[];
  }> {
    const numericBookId = Number(bookInput) || resolveBookId(bookInput) || 1;
    const bookNamePt = BOOK_ID_TO_NAME_PT[numericBookId] || bookInput;
    const passageRef = `${bookNamePt} ${chapter}:${verse}`;

    // 1. Verifica se há variante de catálogo célebre
    const catalogVariants = this.getVariantsForPassage(
      numericBookId,
      chapter,
      verse,
    );
    const catalogVariant =
      catalogVariants.length > 0 ? catalogVariants[0] : undefined;

    // 2. Busca textos das testemunhas canônicas no banco de dados
    const isOldTestament = numericBookId <= 39;
    const relevantTranslations = isOldTestament
      ? ['WLC', 'LXX', 'BLIVRE', 'KJV']
      : ['TR', 'BLIVRE', 'KJV', 'WEB'];

    const witnesses: {
      translationCode: string;
      sourceName: string;
      language: string;
      text: string;
    }[] = [];

    try {
      const rows = await this.prisma.bibleVerse.findMany({
        where: {
          bookId: numericBookId,
          chapter,
          verse,
          translation: { in: relevantTranslations },
        },
        select: {
          translation: true,
          text: true,
        },
      });

      for (const row of rows) {
        let sourceName = row.translation;
        let language = 'Português';

        if (row.translation === 'WLC') {
          sourceName = 'Texto Massorético (Westminster Leningrad Codex B19A)';
          language = 'Hebraico';
        } else if (row.translation === 'LXX') {
          sourceName = 'Septuaginta (Antigo Testamento Grego de Alexandria)';
          language = 'Grego';
        } else if (row.translation === 'TR') {
          sourceName = 'Textus Receptus (Stephanus 1550 / Tradição Bizantina)';
          language = 'Grego';
        } else if (row.translation === 'KJV') {
          sourceName = 'King James Version (1611)';
          language = 'Inglês';
        } else if (row.translation === 'BLIVRE') {
          sourceName = 'Bíblia Livre (Equivalência Formal)';
          language = 'Português';
        }

        witnesses.push({
          translationCode: row.translation,
          sourceName,
          language,
          text: row.text,
        });
      }
    } catch (err) {
      this.logger.warn(
        `Erro ao buscar testemunhas textuais para ${passageRef}: ${String(err)}`,
      );
    }

    return {
      passageRef,
      hasNotableCatalogVariant: !!catalogVariant,
      catalogVariant,
      manuscriptWitnesses: witnesses,
    };
  }
}
