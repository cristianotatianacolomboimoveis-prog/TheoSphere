import { readFileSync } from 'fs';
import { join } from 'path';
import { mapRef, VerseRef } from './versification';
import {
  KJV_TO_LXX_SEGMENTS,
  LXX_TO_KJV_SEGMENTS,
  LxxAlignmentSegment,
} from './lxx-alignment.data';

/**
 * Defeito achado em 2026-11-08: a LXX de Brenton segue a ordem da
 * Septuaginta. Com o mapeamento só por regras, KJV Jr 49:35 (Elão) abria
 * LXX 49:35, que é outro texto, e 599 versículos de Jeremias saíam
 * desalinhados. Os pares abaixo foram conferidos lendo o grego e o inglês
 * no banco.
 */
const r = (bookId: number, chapter: number, verse: number): VerseRef => ({
  bookId,
  chapter,
  verse,
});

describe('Alinhamento LXX (Brenton) ↔ KJV', () => {
  const KJV_LXX: [string, VerseRef, VerseRef][] = [
    ['Jr 49:35 Elão', r(24, 49, 35), r(24, 25, 15)],
    ['Jr 25:15 taça do vinho', r(24, 25, 15), r(24, 32, 15)],
    ['Jr 46:2 Egito', r(24, 46, 2), r(24, 26, 2)],
    ['Jr 49:1 Amom', r(24, 49, 1), r(24, 30, 17)],
    ['Jr 30:12 ferida incurável', r(24, 30, 12), r(24, 37, 12)],
    ['Dn 3:24 Nabucodonosor se espanta', r(27, 3, 24), r(27, 3, 91)],
    ['1 Rs 7:27 dez bases de bronze', r(11, 7, 27), r(11, 7, 14)],
    ['Nm 26:22 famílias de Judá', r(4, 26, 22), r(4, 26, 18)],
    ['Sl 45:1 "meu coração transborda"', r(19, 45, 1), r(19, 44, 2)],
    ['Sl 51:1 (título de 2 vv. na LXX)', r(19, 51, 1), r(19, 50, 3)],
    ['Gn 1:1 sem divergência', r(1, 1, 1), r(1, 1, 1)],
  ];

  it.each(KJV_LXX)('KJV→LXX %s', (_n, kjv, lxx) => {
    expect(mapRef(kjv, 'KJV', 'LXX')).toEqual(lxx);
  });

  it.each(KJV_LXX)('LXX→KJV %s', (_n, kjv, lxx) => {
    expect(mapRef(lxx, 'LXX', 'KJV')).toEqual(kjv);
  });

  it('Dn 3:24-90 (Oração de Azarias, ausente na KJV) ancora em Dn 3:23', () => {
    for (const v of [24, 50, 90]) {
      expect(mapRef(r(27, 3, v), 'LXX', 'KJV')).toEqual(r(27, 3, 23));
    }
  });

  it('ida e volta: todo versículo de segmento 1:1 volta ao ponto de partida', () => {
    const failures: string[] = [];
    for (const [b, c, v1, v2, , , step] of LXX_TO_KJV_SEGMENTS) {
      if (step !== 1) continue;
      for (let v = v1; v <= v2; v++) {
        const kjv = mapRef(r(b, c, v), 'LXX', 'KJV');
        const back = mapRef(kjv, 'KJV', 'LXX');
        if (back.chapter !== c || back.verse !== v)
          failures.push(
            `${b} ${c}:${v} → ${kjv.chapter}:${kjv.verse} → ${back.chapter}:${back.verse}`,
          );
      }
    }
    expect(failures).toEqual([]);
  });

  it('segmentos não se sobrepõem (a primeira correspondência não pode esconder outra)', () => {
    const check = (table: readonly LxxAlignmentSegment[]) => {
      const seen = new Map<string, number>();
      const overlaps: string[] = [];
      for (const [b, c, v1, v2] of table)
        for (let v = v1; v <= v2; v++) {
          const k = `${b}:${c}:${v}`;
          if (seen.has(k)) overlaps.push(k);
          seen.set(k, 1);
        }
      return overlaps;
    };
    expect(check(LXX_TO_KJV_SEGMENTS)).toEqual([]);
    expect(check(KJV_TO_LXX_SEGMENTS)).toEqual([]);
  });

  it('a tabela do frontend é idêntica à do backend', () => {
    const nums = (p: string) =>
      [...readFileSync(p, 'utf8').matchAll(/\[(\d+(?:, \d+){6})\]/g)].map(
        (m) => m[1],
      );
    const back = nums(join(__dirname, 'lxx-alignment.data.ts'));
    const front = nums(
      join(__dirname, '../../../frontend-v2/src/lib/lxx-alignment.data.ts'),
    );
    expect(back.length).toBe(
      LXX_TO_KJV_SEGMENTS.length + KJV_TO_LXX_SEGMENTS.length,
    );
    expect(front).toEqual(back);
  });
});
