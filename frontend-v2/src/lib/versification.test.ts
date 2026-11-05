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
});
