import {
  Controller,
  Get,
  Param,
  Query,
  Logger,
  BadRequestException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';
import { BibleIngestionService } from './bible-ingestion.service';
import { PassageGuideService } from './bible/passage-guide.service';
import { safeFetch, SafeFetchError } from './common/http/safe-fetch';
import { CacheControlInterceptor } from './common/interceptors/cache-control.interceptor';

const ALLOWED_TRANSLATIONS = new Set([
  'BLIVRE',
  'NVA',
  'KJV',
  'TR',
  'WLC',
  'LXX',
  'WEB',
]);

/**
 * Metadados de licenciamento por versão (auditoria go-to-market 2026-07-13).
 * `license: 'free'`  → licença livre (CC/domínio público), ok para uso comercial
 * `license: 'restricted'` → texto sob copyright, exige licença do detentor
 * BLIVRE e NVA são servidas do banco local (seed-public-domain.ts), não de APIs externas.
 */
const VERSION_METADATA: Record<
  string,
  {
    name: string;
    lang: string;
    license: 'free' | 'restricted';
    holder?: string;
  }
> = {
  BLIVRE: {
    name: 'Bíblia Livre (Textus Receptus)',
    lang: 'PT',
    license: 'free',
    holder: 'CC BY 3.0 BR',
  },
  NVA: {
    name: 'Nova Versão de Acesso Livre',
    lang: 'PT',
    license: 'free',
    holder: 'CC BY-SA 4.0',
  },
  KJV: { name: 'King James Version', lang: 'EN', license: 'free' },
  WEB: { name: 'World English Bible', lang: 'EN', license: 'free' },
  TR: { name: 'Textus Receptus', lang: 'GRC', license: 'free' },
  WLC: { name: 'Westminster Leningrad Codex', lang: 'HEB', license: 'free' },
  LXX: { name: 'Septuagint', lang: 'GRC', license: 'free' },
};

@Controller('api/v1/bible')
export class BibleController {
  private readonly logger = new Logger(BibleController.name);

  constructor(
    private ingestionService: BibleIngestionService,
    private passageGuide: PassageGuideService,
  ) {}

  /**
   * Passage Guide — agrega texto, interlinear, cross-refs TSK, léxico,
   * comentários e arqueologia numa única chamada (estilo Logos).
   * `verse` opcional via query: com ele o guide é focado no versículo.
   */
  @Get('passage-guide/:translation/:bookId/:chapter')
  @UseInterceptors(new CacheControlInterceptor(3600))
  async getPassageGuide(
    @Param('translation') translation: string,
    @Param('bookId') bookId: string,
    @Param('chapter') chapter: string,
    @Query('verse') verse?: string,
  ) {
    const b = parseInt(bookId, 10);
    const c = parseInt(chapter, 10);
    const v = verse ? parseInt(verse, 10) : undefined;
    if (
      !Number.isInteger(b) ||
      b < 1 ||
      b > 66 ||
      !Number.isInteger(c) ||
      c < 1 ||
      c > 176 ||
      (verse !== undefined && (!Number.isInteger(v) || v! < 1 || v! > 200))
    ) {
      throw new BadRequestException('Referência inválida.');
    }
    const data = await this.passageGuide.getGuide(translation, b, c, v);
    return { success: true, data };
  }

  @Get('versions')
  @UseInterceptors(new CacheControlInterceptor(86400))
  async getVersions() {
    // `data` mantém o formato legado (array de strings) para compatibilidade.
    // Filtrado na Etapa 1 do Risco 2 para conter apenas traduções completas de domínio público (BLIVRE e NVA)
    return {
      success: true,
      data: ['BLIVRE', 'NVA', 'KJV', 'WEB', 'TR', 'WLC', 'LXX'],
      meta: {
        BLIVRE: VERSION_METADATA.BLIVRE,
        NVA: VERSION_METADATA.NVA,
        KJV: VERSION_METADATA.KJV,
        WEB: VERSION_METADATA.WEB,
        TR: VERSION_METADATA.TR,
        WLC: VERSION_METADATA.WLC,
        LXX: VERSION_METADATA.LXX,
      },
    };
  }

  @Get('books')
  @UseInterceptors(new CacheControlInterceptor(86400))
  async getBooks() {
    const books = await this.ingestionService.getBooks();
    return { success: true, data: books };
  }

  @Get('chapter')
  @UseInterceptors(new CacheControlInterceptor(3600))
  async getChapterQuery(
    @Query('translation') translation: string,
    @Query('bookId') bookId: string,
    @Query('book') bookName: string,
    @Query('chapter') chapter: string,
  ) {
    let resolvedBookId = parseInt(bookId);
    if (isNaN(resolvedBookId) && bookName) {
      resolvedBookId = await this.ingestionService.resolveBookId(bookName);
    }

    const verses = await this.ingestionService.ingestChapter(
      translation || 'KJV',
      resolvedBookId || 1,
      parseInt(chapter) || 1,
    );
    return {
      success: true,
      data: {
        verses,
        translation: translation || 'KJV',
        bookId: resolvedBookId,
        chapter,
      },
    };
  }

  @Get('chapter/:translation/:bookId/:chapter')
  @UseInterceptors(new CacheControlInterceptor(3600))
  async getChapterParam(
    @Param('translation') translation: string,
    @Param('bookId') bookId: string,
    @Param('chapter') chapter: string,
  ) {
    const verses = await this.ingestionService.ingestChapter(
      translation,
      parseInt(bookId),
      parseInt(chapter),
    );
    return { success: true, data: { verses, translation, bookId, chapter } };
  }

  /**
   * Fallback proxy to bible-api.com. Hardened (SEC-006):
   *   • translation allow-list — no value-injection into the upstream URL
   *   • ref length cap — defends against gigantic path components
   *   • safeFetch with 5s timeout + 2 retries (exp. backoff)
   */
  @Get('fallback')
  async getFallback(
    @Query('ref') ref: string,
    @Query('translation') translation: string,
  ) {
    if (!ref || typeof ref !== 'string' || ref.length > 64) {
      throw new BadRequestException('ref is required and must be ≤ 64 chars');
    }
    if (!translation || !ALLOWED_TRANSLATIONS.has(translation)) {
      throw new BadRequestException(
        `translation must be one of: ${[...ALLOWED_TRANSLATIONS].join(', ')}`,
      );
    }

    const url =
      `https://bible-api.com/${encodeURIComponent(ref)}` +
      `?translation=${encodeURIComponent(translation)}`;

    try {
      const response = await safeFetch(url, { timeoutMs: 5_000, retries: 2 });
      if (!response.ok) return { success: false, data: [] };
      const data = await response.json();
      return { success: true, data };
    } catch (err) {
      this.logger.warn(
        `[fallback] upstream failure: ${err instanceof SafeFetchError ? err.message : String(err)}`,
      );
      return { success: false, error: 'upstream unavailable' };
    }
  }

  @Get('sefaria/:ref')
  async getSefaria(@Param('ref') ref: string) {
    const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?context=0&commentary=0`;
    try {
      const response = await safeFetch(url, { timeoutMs: 8_000, retries: 2 });
      if (!response.ok) return { success: false, data: [] };
      const data = await response.json();

      // Normalize Sefaria response to our standard format
      const verses = Array.isArray(data.text)
        ? data.text.map((t: string, i: number) => ({ verse: i + 1, text: t }))
        : [];

      return {
        success: true,
        data: {
          verses,
          translation: 'Sefaria',
          book: data.book,
          ref: data.ref,
          hebrew: data.he,
        },
      };
    } catch (err) {
      this.logger.warn(`[sefaria] upstream failure: ${(err as Error).message}`);
      return { success: false, error: 'sefaria unavailable' };
    }
  }

  @Get('lexicon/:strongId')
  async getLexicon(@Param('strongId') strongId: string) {
    const entry = await this.ingestionService.getLexicon(strongId);
    if (!entry) throw new BadRequestException(`Lexicon ${strongId} not found`);
    return { success: true, data: entry };
  }

  // Operação cara (chamadas em massa à API de embeddings) — restrita a ADMIN
  // para impedir que qualquer usuário FREE dispare custo/DoS (achado da
  // auditoria 2026-07-21).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('ingest-embeddings')
  async ingestEmbeddings(
    @Query('translation') translation: string,
    @Query('limit') limit: string,
  ) {
    // Fire and forget em produção, ou await para testes
    void this.ingestionService.massGenerateEmbeddings(
      translation || 'ARA',
      parseInt(limit) || 1000,
    );
    return {
      success: true,
      message: `Iniciada geração de embeddings para ${translation}`,
    };
  }
}
