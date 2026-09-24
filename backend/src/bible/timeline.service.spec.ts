import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TimelineService } from './timeline.service';

describe('TimelineService', () => {
  let service: TimelineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TimelineService],
    }).compile();

    service = module.get<TimelineService>(TimelineService);
  });

  describe('getEras', () => {
    it('deve retornar todas as 9 eras bíblicas canônicas', () => {
      const eras = service.getEras();
      expect(eras.length).toBe(9);
      expect(eras[0].key).toBe('creation_patriarchs');
      expect(eras[eras.length - 1].key).toBe('apostolic_church');
    });
  });

  describe('listEvents', () => {
    it('deve listar eventos em ordem cronológica estrita', () => {
      const events = service.listEvents();
      expect(events.length).toBeGreaterThanOrEqual(20);

      // Confere se está estritamente ordenado por ano crescente
      for (let i = 0; i < events.length - 1; i++) {
        expect(events[i].year).toBeLessThanOrEqual(events[i + 1].year);
      }
    });

    it('deve filtrar eventos por era', () => {
      const divided = service.listEvents({ era: 'divided_kingdom' });
      expect(divided.length).toBeGreaterThan(0);
      expect(divided.every((e) => e.era === 'divided_kingdom')).toBe(true);
    });

    it('deve filtrar eventos por categoria (king_judah)', () => {
      const kings = service.listEvents({ category: 'king_judah' });
      expect(kings.length).toBeGreaterThan(0);
      expect(kings.every((e) => e.category === 'king_judah')).toBe(true);
    });

    it('deve buscar eventos por termo arqueológico ou histórico', () => {
      const cyrusEvents = service.listEvents({ search: 'Cilindro de Ciro' });
      expect(cyrusEvents.length).toBeGreaterThan(0);
      expect(cyrusEvents[0].id).toBe('cyrus-decree');
    });

    it('deve buscar por personagem bíblico contemporâneo', () => {
      const hezekiahEvents = service.listEvents({ search: 'Ezequias' });
      expect(hezekiahEvents.length).toBeGreaterThan(0);
      expect(
        hezekiahEvents.some((e) => e.id === 'king-hezekiah-and-isaiah'),
      ).toBe(true);
    });
  });

  describe('getEventById', () => {
    it('deve retornar o evento correto pelo id', () => {
      const ev = service.getEventById('the-exodus');
      expect(ev).toBeDefined();
      expect(ev.title).toContain('Êxodo');
      expect(ev.year).toBe(-1446);
    });

    it('deve lançar NotFoundException para id inexistente', () => {
      expect(() => service.getEventById('evento-inexistente-xyz')).toThrow(
        NotFoundException,
      );
    });
  });

  describe('findEventsForPassage', () => {
    it('deve encontrar o evento de Ezequias e Isaías a partir de 2 Reis 18', () => {
      const events = service.findEventsForPassage(12, 18); // 2 Reis = 12, Cap = 18
      expect(events.length).toBeGreaterThan(0);
      expect(events.some((e) => e.id === 'king-hezekiah-and-isaiah')).toBe(
        true,
      );
    });

    it('deve encontrar a crucificação a partir de Mateus 27', () => {
      const events = service.findEventsForPassage(40, 27); // Mateus = 40, Cap = 27
      expect(events.length).toBeGreaterThan(0);
      expect(
        events.some((e) => e.id === 'crucifixion-resurrection-christ'),
      ).toBe(true);
    });

    it('deve retornar array vazio se não houver eventos para o livro', () => {
      const events = service.findEventsForPassage(999, 1);
      expect(events).toEqual([]);
    });
  });
});
