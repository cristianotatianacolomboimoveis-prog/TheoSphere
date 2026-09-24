import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  TIMELINE_ERAS,
  TIMELINE_EVENTS,
  TimelineEraDefinition,
  TimelineEventItem,
} from './timeline-data';

@Injectable()
export class TimelineService {
  private readonly logger = new Logger(TimelineService.name);

  /**
   * Retorna todas as eras cronológicas da história bíblica.
   */
  getEras(): TimelineEraDefinition[] {
    return TIMELINE_ERAS;
  }

  /**
   * Retorna os eventos da linha do tempo ordenados cronologicamente, com suporte a filtros e busca.
   */
  listEvents(options?: {
    era?: string;
    category?: string;
    search?: string;
  }): TimelineEventItem[] {
    let list = [...TIMELINE_EVENTS];

    if (options?.era && options.era !== 'all') {
      list = list.filter((e) => e.era === options.era);
    }

    if (options?.category && options.category !== 'all') {
      list = list.filter((e) => e.category === options.category);
    }

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.contemporaryFigures?.some((c) => c.toLowerCase().includes(q)) ||
          e.archaeologicalNotes?.toLowerCase().includes(q) ||
          e.passages.some((p) => p.display.toLowerCase().includes(q)),
      );
    }

    // Ordenação cronológica estrita (dos mais antigos a.C. aos mais recentes d.C.)
    return list.sort((a, b) => a.year - b.year);
  }

  /**
   * Retorna um evento por seu ID único.
   */
  getEventById(id: string): TimelineEventItem {
    const item = TIMELINE_EVENTS.find((e) => e.id === id);
    if (!item) {
      throw new NotFoundException(`Evento histórico '${id}' não encontrado.`);
    }
    return item;
  }

  /**
   * Encontra eventos da linha do tempo correspondentes ao livro bíblico e capítulo fornecido.
   */
  findEventsForPassage(bookId: number, chapter?: number): TimelineEventItem[] {
    if (!bookId) return [];

    const matches = TIMELINE_EVENTS.filter((e) =>
      e.passages.some((p) => {
        if (p.bookId !== bookId) return false;
        if (chapter && p.chapter !== chapter) return false;
        return true;
      }),
    );

    return matches.sort((a, b) => a.year - b.year);
  }
}
