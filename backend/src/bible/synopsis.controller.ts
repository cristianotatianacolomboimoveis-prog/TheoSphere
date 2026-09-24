import { Controller, Get, Param, Query, Header } from '@nestjs/common';
import { GospelKey, SynopsisService } from './synopsis.service';

@Controller('api/v1/synopsis')
export class SynopsisController {
  constructor(private readonly synopsisService: SynopsisService) {}

  @Get('sections')
  @Header('Cache-Control', 'public, max-age=86400')
  getSections() {
    return {
      sections: this.synopsisService.getSections(),
    };
  }

  @Get('pericopes')
  @Header('Cache-Control', 'public, max-age=3600')
  listPericopes(
    @Query('section') section?: string,
    @Query('search') search?: string,
    @Query('parallelType') parallelType?: string,
  ) {
    const pericopes = this.synopsisService.listPericopes({
      section,
      search,
      parallelType,
    });

    return {
      total: pericopes.length,
      pericopes,
    };
  }

  @Get('find')
  findByReference(
    @Query('bookId') bookIdStr: string,
    @Query('chapter') chapterStr: string,
    @Query('verse') verseStr?: string,
  ) {
    const bookId = parseInt(bookIdStr, 10);
    const chapter = parseInt(chapterStr, 10);
    const verse = verseStr ? parseInt(verseStr, 10) : undefined;

    if (isNaN(bookId) || isNaN(chapter)) {
      return { found: false, pericope: null };
    }

    const pericope = this.synopsisService.findPericopeByReference(
      bookId,
      chapter,
      verse,
    );

    return {
      found: !!pericope,
      pericope,
    };
  }

  @Get('pericopes/:id')
  @Header('Cache-Control', 'public, max-age=600')
  async getSynopsis(
    @Param('id') id: string,
    @Query('translation') translation?: string,
    @Query('base') base?: string,
  ) {
    const validBase = (base?.toLowerCase() || 'mark') as GospelKey;
    return this.synopsisService.getSynopsis(
      id,
      translation || 'BLIVRE',
      validBase,
    );
  }
}
