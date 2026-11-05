import { describe, it, expect } from "vitest";
import {
  mapRef,
  mapTranslationRef,
  getVersificationScheme,
} from "./versification";

describe("T1.2 — Mapeamento de Versificação no Frontend", () => {
  it("deve converter referências KJV para MT em casos conhecidos (ex: Sl 51:1 -> Sl 51:3 e Ml 4:1 -> Ml 3:19)", () => {
    // Salmo 51:1 (KJV) -> Sl 51:3 (MT)
    const sl51 = mapRef({ bookId: 19, chapter: 51, verse: 1 }, "KJV", "MT");
    expect(sl51).toEqual({ bookId: 19, chapter: 51, verse: 3 });

    // Malaquias 4:1 (KJV) -> Ml 3:19 (MT)
    const ml4 = mapRef({ bookId: 39, chapter: 4, verse: 1 }, "KJV", "MT");
    expect(ml4).toEqual({ bookId: 39, chapter: 3, verse: 19 });
  });

  it("deve executar teste de ida-e-volta (round-trip) com sucesso", () => {
    const original = { bookId: 29, chapter: 2, verse: 28 }; // Joel 2:28
    const mt = mapRef(original, "KJV", "MT"); // Joel 3:1
    expect(mt).toEqual({ bookId: 29, chapter: 3, verse: 1 });

    const roundTrip = mapRef(mt, "MT", "KJV");
    expect(roundTrip).toEqual(original);
  });

  it("deve alinhar referências entre versões divergentes via mapTranslationRef", () => {
    const blivreRef = { bookId: 1, chapter: 31, verse: 55 }; // Gn 31:55
    const wlcRef = mapTranslationRef(blivreRef, "BLIVRE", "WLC");
    expect(wlcRef).toEqual({ bookId: 1, chapter: 32, verse: 1 }); // Gn 32:1 no hebraico
  });

  // Mesma tabela do backend (versification.spec.ts) — as duas cópias devem
  // concordar com o LXX do banco (Rahlfs, capitulação do MT fora dos Salmos).
  it.each([
    [[19, 10, 1], [19, 9, 22]],
    [[19, 9, 1], [19, 9, 2]],
    [[19, 51, 1], [19, 50, 3]],
    [[19, 115, 1], [19, 113, 9]],
    [[39, 4, 1], [39, 3, 19]],
    [[29, 2, 28], [29, 3, 1]],
  ])("KJV %j → LXX %j com ida e volta", ([b, c, v], [eb, ec, ev]) => {
    const kjv = { bookId: b, chapter: c, verse: v };
    const lxx = mapRef(kjv, "KJV", "LXX");
    expect(lxx).toEqual({ bookId: eb, chapter: ec, verse: ev });
    expect(mapRef(lxx, "LXX", "KJV")).toEqual(kjv);
  });
});
