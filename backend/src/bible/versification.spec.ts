import {
  mapRef,
  mapTranslationRef,
  getVersificationScheme,
  VerseRef,
} from './versification';

describe('T1.2 — Mapeamento de Versificação Canônica (KJV vs MT vs LXX)', () => {
  describe('≥ 20 Casos Conhecidos de Divergência KJV (Ocidental) ↔ MT (Massorético Hebraico)', () => {
    const TEST_CASES: {
      name: string;
      kjv: VerseRef;
      mt: VerseRef;
    }[] = [
      // 1. Gênesis 31:55 / 32:1
      {
        name: 'Gênesis 31:55 (KJV) ↔ Gênesis 32:1 (MT)',
        kjv: { bookId: 1, chapter: 31, verse: 55 },
        mt: { bookId: 1, chapter: 32, verse: 1 },
      },
      // 2. Gênesis 32:1 / 32:2
      {
        name: 'Gênesis 32:1 (KJV) ↔ Gênesis 32:2 (MT)',
        kjv: { bookId: 1, chapter: 32, verse: 1 },
        mt: { bookId: 1, chapter: 32, verse: 2 },
      },
      // 3. Êxodo 8:1 / 7:26
      {
        name: 'Êxodo 8:1 (KJV) ↔ Êxodo 7:26 (MT)',
        kjv: { bookId: 2, chapter: 8, verse: 1 },
        mt: { bookId: 2, chapter: 7, verse: 26 },
      },
      // 4. Êxodo 22:1 / 21:37
      {
        name: 'Êxodo 22:1 (KJV) ↔ Êxodo 21:37 (MT)',
        kjv: { bookId: 2, chapter: 22, verse: 1 },
        mt: { bookId: 2, chapter: 21, verse: 37 },
      },
      // 5. Levítico 6:1 / 5:20
      {
        name: 'Levítico 6:1 (KJV) ↔ Levítico 5:20 (MT)',
        kjv: { bookId: 3, chapter: 6, verse: 1 },
        mt: { bookId: 3, chapter: 5, verse: 20 },
      },
      // 6. Números 16:36 / 17:1
      {
        name: 'Números 16:36 (KJV) ↔ Números 17:1 (MT)',
        kjv: { bookId: 4, chapter: 16, verse: 36 },
        mt: { bookId: 4, chapter: 17, verse: 1 },
      },
      // 7. Números 17:1 / 17:16
      {
        name: 'Números 17:1 (KJV) ↔ Números 17:16 (MT)',
        kjv: { bookId: 4, chapter: 17, verse: 1 },
        mt: { bookId: 4, chapter: 17, verse: 16 },
      },
      // 8. 1 Samuel 23:29 / 24:1
      {
        name: '1 Samuel 23:29 (KJV) ↔ 1 Samuel 24:1 (MT)',
        kjv: { bookId: 9, chapter: 23, verse: 29 },
        mt: { bookId: 9, chapter: 24, verse: 1 },
      },
      // 9. 1 Samuel 24:1 / 24:2
      {
        name: '1 Samuel 24:1 (KJV) ↔ 1 Samuel 24:2 (MT)',
        kjv: { bookId: 9, chapter: 24, verse: 1 },
        mt: { bookId: 9, chapter: 24, verse: 2 },
      },
      // 10. 2 Samuel 18:33 / 19:1
      {
        name: '2 Samuel 18:33 (KJV) ↔ 2 Samuel 19:1 (MT)',
        kjv: { bookId: 10, chapter: 18, verse: 33 },
        mt: { bookId: 10, chapter: 19, verse: 1 },
      },
      // 11. 1 Reis 4:21 / 5:1
      {
        name: '1 Reis 4:21 (KJV) ↔ 1 Reis 5:1 (MT)',
        kjv: { bookId: 11, chapter: 4, verse: 21 },
        mt: { bookId: 11, chapter: 5, verse: 1 },
      },
      // 12. Neemias 4:1 / 3:33
      {
        name: 'Neemias 4:1 (KJV) ↔ Neemias 3:33 (MT)',
        kjv: { bookId: 16, chapter: 4, verse: 1 },
        mt: { bookId: 16, chapter: 3, verse: 33 },
      },
      // 13. Jó 41:1 / 40:25
      {
        name: 'Jó 41:1 (KJV) ↔ Jó 40:25 (MT)',
        kjv: { bookId: 18, chapter: 41, verse: 1 },
        mt: { bookId: 18, chapter: 40, verse: 25 },
      },
      // 14. Salmo 3:1 / 3:2 (Título curto +1)
      {
        name: 'Salmo 3:1 (KJV) ↔ Salmo 3:2 (MT)',
        kjv: { bookId: 19, chapter: 3, verse: 1 },
        mt: { bookId: 19, chapter: 3, verse: 2 },
      },
      // 15. Salmo 51:1 / 51:3 (Título longo +2)
      {
        name: 'Salmo 51:1 (KJV) ↔ Salmo 51:3 (MT)',
        kjv: { bookId: 19, chapter: 51, verse: 1 },
        mt: { bookId: 19, chapter: 51, verse: 3 },
      },
      // 16. Eclesiastes 5:1 / 4:17
      {
        name: 'Eclesiastes 5:1 (KJV) ↔ Eclesiastes 4:17 (MT)',
        kjv: { bookId: 21, chapter: 5, verse: 1 },
        mt: { bookId: 21, chapter: 4, verse: 17 },
      },
      // 17. Cantares 6:13 / 7:1
      {
        name: 'Cantares 6:13 (KJV) ↔ Cantares 7:1 (MT)',
        kjv: { bookId: 22, chapter: 6, verse: 13 },
        mt: { bookId: 22, chapter: 7, verse: 1 },
      },
      // 18. Isaías 9:1 / 8:23
      {
        name: 'Isaías 9:1 (KJV) ↔ Isaías 8:23 (MT)',
        kjv: { bookId: 23, chapter: 9, verse: 1 },
        mt: { bookId: 23, chapter: 8, verse: 23 },
      },
      // 19. Ezequiel 20:45 / 21:1
      {
        name: 'Ezequiel 20:45 (KJV) ↔ Ezequiel 21:1 (MT)',
        kjv: { bookId: 26, chapter: 20, verse: 45 },
        mt: { bookId: 26, chapter: 21, verse: 1 },
      },
      // 20. Daniel 4:1 / 3:31
      {
        name: 'Daniel 4:1 (KJV) ↔ Daniel 3:31 (MT)',
        kjv: { bookId: 27, chapter: 4, verse: 1 },
        mt: { bookId: 27, chapter: 3, verse: 31 },
      },
      // 21. Oséias 1:10 / 2:1
      {
        name: 'Oséias 1:10 (KJV) ↔ Oséias 2:1 (MT)',
        kjv: { bookId: 28, chapter: 1, verse: 10 },
        mt: { bookId: 28, chapter: 2, verse: 1 },
      },
      // 22. Joel 2:28 / 3:1
      {
        name: 'Joel 2:28 (KJV) ↔ Joel 3:1 (MT)',
        kjv: { bookId: 29, chapter: 2, verse: 28 },
        mt: { bookId: 29, chapter: 3, verse: 1 },
      },
      // 23. Jonas 1:17 / 2:1
      {
        name: 'Jonas 1:17 (KJV) ↔ Jonas 2:1 (MT)',
        kjv: { bookId: 32, chapter: 1, verse: 17 },
        mt: { bookId: 32, chapter: 2, verse: 1 },
      },
      // 24. Miquéias 5:1 / 4:14
      {
        name: 'Miquéias 5:1 (KJV) ↔ Miquéias 4:14 (MT)',
        kjv: { bookId: 33, chapter: 5, verse: 1 },
        mt: { bookId: 33, chapter: 4, verse: 14 },
      },
      // 25. Naum 1:15 / 2:1
      {
        name: 'Naum 1:15 (KJV) ↔ Naum 2:1 (MT)',
        kjv: { bookId: 34, chapter: 1, verse: 15 },
        mt: { bookId: 34, chapter: 2, verse: 1 },
      },
      // 26. Malaquias 4:1 / 3:19
      {
        name: 'Malaquias 4:1 (KJV) ↔ Malaquias 3:19 (MT)',
        kjv: { bookId: 39, chapter: 4, verse: 1 },
        mt: { bookId: 39, chapter: 3, verse: 19 },
      },
    ];

    it('deve possuir ao menos 20 casos canônicos de teste', () => {
      expect(TEST_CASES.length).toBeGreaterThanOrEqual(20);
    });

    test.each(TEST_CASES)(
      'deve converter corretamente: $name',
      ({ kjv, mt }) => {
        // 1. Ida: KJV -> MT
        const mappedMt = mapRef(kjv, 'KJV', 'MT');
        expect(mappedMt).toEqual(mt);

        // 2. Volta: MT -> KJV (Teste de Ida-e-Volta / Round-Trip)
        const mappedKjv = mapRef(mt, 'MT', 'KJV');
        expect(mappedKjv).toEqual(kjv);
      },
    );
  });

  describe('Divergências com a Septuaginta Grega (LXX)', () => {
    it('deve mapear Salmo 23 (KJV) para Salmo 22 (LXX)', () => {
      const kjv = { bookId: 19, chapter: 23, verse: 1 };
      const lxx = mapRef(kjv, 'KJV', 'LXX');
      expect(lxx).toEqual({ bookId: 19, chapter: 22, verse: 1 });

      // Round-trip
      expect(mapRef(lxx, 'LXX', 'KJV')).toEqual(kjv);
    });

    it('deve mapear Salmo 91 (KJV) para Salmo 90 (LXX)', () => {
      const kjv = { bookId: 19, chapter: 91, verse: 1 };
      const lxx = mapRef(kjv, 'KJV', 'LXX');
      expect(lxx).toEqual({ bookId: 19, chapter: 90, verse: 1 });

      // Round-trip
      expect(mapRef(lxx, 'LXX', 'KJV')).toEqual(kjv);
    });

    it('deve manter Salmo 1 a 8 idênticos na LXX', () => {
      const kjv = { bookId: 19, chapter: 1, verse: 1 };
      expect(mapRef(kjv, 'KJV', 'LXX')).toEqual(kjv);
      expect(mapRef(kjv, 'LXX', 'KJV')).toEqual(kjv);
    });

    // Casos conferidos contra o LXX do banco (Rahlfs: título = v.1, capitulação
    // do MT fora dos Salmos). Contagens medidas em 2026-11-05: LXX Sl 9 = 39 vv.,
    // Sl 113 = 26 vv., Ml 3 = 24 vv., Jl 3 = 5 vv., Nm 17 = 28 vv.
    test.each([
      ['Sl 10:1 (MT 9+10 = LXX 9)', [19, 10, 1], [19, 9, 22]],
      ['Sl 10:18 (último verso de LXX 9)', [19, 10, 18], [19, 9, 39]],
      ['Sl 9:1 (título conta como v.1)', [19, 9, 1], [19, 9, 2]],
      ['Sl 51:1 (título de 2 vv.)', [19, 51, 1], [19, 50, 3]],
      ['Sl 114:1 (MT 114+115 = LXX 113)', [19, 114, 1], [19, 113, 1]],
      ['Sl 115:1', [19, 115, 1], [19, 113, 9]],
      ['Sl 115:18 (último verso de LXX 113)', [19, 115, 18], [19, 113, 26]],
      ['Sl 116:10', [19, 116, 10], [19, 115, 1]],
      ['Sl 147:12', [19, 147, 12], [19, 147, 1]],
      ['Ml 4:1 (LXX segue o MT 3:19)', [39, 4, 1], [39, 3, 19]],
      ['Jl 2:28 (LXX segue o MT 3:1)', [29, 2, 28], [29, 3, 1]],
      ['Nm 16:36 (LXX segue o MT 17:1)', [4, 16, 36], [4, 17, 1]],
    ])('KJV→LXX %s, com ida e volta', (_label, [b, c, v], [eb, ec, ev]) => {
      const kjv = { bookId: b, chapter: c, verse: v };
      const lxx = mapRef(kjv, 'KJV', 'LXX');
      expect(lxx).toEqual({ bookId: eb, chapter: ec, verse: ev });
      expect(mapRef(lxx, 'LXX', 'KJV')).toEqual(kjv);
    });

    it('MT↔LXX é consistente com KJV↔LXX', () => {
      const mt = { bookId: 19, chapter: 10, verse: 1 };
      expect(mapRef(mt, 'MT', 'LXX')).toEqual({
        bookId: 19,
        chapter: 9,
        verse: 22,
      });
      expect(
        mapRef({ bookId: 19, chapter: 9, verse: 22 }, 'LXX', 'MT'),
      ).toEqual(mt);
    });
  });

  describe('Mapeamento por Tradução e Identificação de Esquema', () => {
    it('deve mapear códigos de tradução para seus esquemas corretos', () => {
      expect(getVersificationScheme('WLC')).toBe('MT');
      expect(getVersificationScheme('wlc')).toBe('MT');
      expect(getVersificationScheme('LXX')).toBe('LXX');
      expect(getVersificationScheme('BLIVRE')).toBe('KJV');
      expect(getVersificationScheme('NVA')).toBe('KJV');
      expect(getVersificationScheme('KJV')).toBe('KJV');
      expect(getVersificationScheme('WEB')).toBe('KJV');
      expect(getVersificationScheme('SBLGNT')).toBe('KJV');
      expect(getVersificationScheme('TR')).toBe('KJV');
    });

    it('deve converter referências entre traduções divergentes (ex: BLIVRE -> WLC)', () => {
      // Salmo 51:1 na BLIVRE -> Salmo 51:3 no WLC hebraico
      const blivreRef = { bookId: 19, chapter: 51, verse: 1 };
      const wlcRef = mapTranslationRef(blivreRef, 'BLIVRE', 'WLC');
      expect(wlcRef).toEqual({ bookId: 19, chapter: 51, verse: 3 });

      // Round-trip de volta do hebraico para português
      expect(mapTranslationRef(wlcRef, 'WLC', 'BLIVRE')).toEqual(blivreRef);
    });
  });
});
