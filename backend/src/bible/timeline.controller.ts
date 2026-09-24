import { Controller, Get, Param, Query, Header } from '@nestjs/common';
import { TimelineService } from './timeline.service';

@Controller('api/v1/timeline')
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  @Get('eras')
  @Header('Cache-Control', 'public, max-age=86400')
  getEras() {
    return {
      eras: this.timelineService.getEras(),
    };
  }

  @Get('events')
  @Header('Cache-Control', 'public, max-age=3600')
  listEvents(
    @Query('era') era?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    const events = this.timelineService.listEvents({
      era,
      category,
      search,
    });

    return {
      total: events.length,
      events,
    };
  }

  @Get('for-passage')
  @Header('Cache-Control', 'public, max-age=3600')
  findForPassage(
    @Query('bookId') bookIdStr: string,
    @Query('chapter') chapterStr?: string,
  ) {
    const bookId = parseInt(bookIdStr, 10);
    const chapter = chapterStr ? parseInt(chapterStr, 10) : undefined;

    if (isNaN(bookId)) {
      return { total: 0, events: [] };
    }

    const events = this.timelineService.findEventsForPassage(bookId, chapter);
    return {
      total: events.length,
      events,
    };
  }

  @Get('events/:id')
  @Header('Cache-Control', 'public, max-age=86400')
  getEvent(@Param('id') id: string) {
    return this.timelineService.getEventById(id);
  }
}
