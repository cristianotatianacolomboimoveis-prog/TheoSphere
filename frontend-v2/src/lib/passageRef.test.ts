/**
 * Testes do parser estrutural de referências bíblicas.
 * Casos extraídos dos formatos reais usados nos datasets do Guia de Passagem.
 */
import { describe, it, expect } from "vitest";
import {
  parsePassage,
  passagesOverlap,
  refsOverlap,
  resolveBookId,
  formatEnglishRef,
} from "./passageRef";

describe("resolveBookId", () => {
  it("resolve nomes em português com e sem acento", () => {
    expect(resolveBookId("Gênesis")).toBe(1);
    expect(resolveBookId("genesis")).toBe(1);
    expect(resolveBookId("João")).toBe(43);
    expect(resolveBookId("joao")).toBe(43);
  });

  it("resolve nomes em inglês e apelidos", () => {
    expect(resolveBookId("John")).toBe(43);
    expect(resolveBookId("Psalm")).toBe(19);
    expect(resolveBookId("Psalms")).toBe(19);
    expect(resolveBookId("1 Corinthians")).toBe(46);
  });

  it("retorna null para nome desconhecido", () => {
    expect(resolveBookId("Enoque")).toBeNull();
  });
});

describe("parsePassage", () => {
  it("versículo único: 'João 3:16'", () => {
    expect(parsePassage("João 3:16")).toEqual([
      {
        bookId: 43,
        chapterStart: 3,
        chapterEnd: 3,
        verseStart: 16,
        verseEnd: 16,
      },
    ]);
  });

  it("faixa de versículos: 'John 3:16-18'", () => {
    expect(parsePassage("John 3:16-18")).toEqual([
      {
        bookId: 43,
        chapterStart: 3,
        chapterEnd: 3,
        verseStart: 16,
        verseEnd: 18,
      },
    ]);
  });

  it("capítulo inteiro: 'Gênesis 3'", () => {
    expect(parsePassage("Gênesis 3")).toEqual([
      {
        bookId: 1,
        chapterStart: 3,
        chapterEnd: 3,
        verseStart: null,
        verseEnd: null,
      },
    ]);
  });

  it("faixa de capítulos: 'Êxodo 12-14'", () => {
    expect(parsePassage("Êxodo 12-14")).toEqual([
      {
        bookId: 2,
        chapterStart: 12,
        chapterEnd: 14,
        verseStart: null,
        verseEnd: null,
      },
    ]);
  });

  it("faixa entre capítulos: 'Gênesis 1:1 - 2:3'", () => {
    expect(parsePassage("Gênesis 1:1 - 2:3")).toEqual([
      {
        bookId: 1,
        chapterStart: 1,
        chapterEnd: 2,
        verseStart: null,
        verseEnd: null,
      },
    ]);
  });

  it("múltiplos segmentos com herança de livro: 'Gênesis 12:1-3; 15:6'", () => {
    const segs = parsePassage("Gênesis 12:1-3; 15:6");
    expect(segs).toHaveLength(2);
    expect(segs[1]).toEqual({
      bookId: 1,
      chapterStart: 15,
      chapterEnd: 15,
      verseStart: 6,
      verseEnd: 6,
    });
  });

  it("livro com prefixo numérico: '1 João 4:8'", () => {
    expect(parsePassage("1 João 4:8")[0].bookId).toBe(62);
  });

  it("entrada não reconhecida retorna []", () => {
    expect(parsePassage("amor de Deus")).toEqual([]);
    expect(parsePassage("")).toEqual([]);
  });
});

describe("passagesOverlap / refsOverlap", () => {
  it("PT e EN se equivalem estruturalmente", () => {
    expect(refsOverlap("João 3:16", "John 3:16")).toBe(true);
  });

  it("versículo dentro de faixa sobrepõe ('Genesis 1:26' ∈ 'Genesis 1:26-27')", () => {
    expect(refsOverlap("Genesis 1:26", "Genesis 1:26-27")).toBe(true);
  });

  it("versículo contido em capítulo inteiro sobrepõe", () => {
    expect(refsOverlap("Gênesis 3:15", "Gênesis 3")).toBe(true);
  });

  it("capítulo dentro de faixa de capítulos sobrepõe", () => {
    expect(refsOverlap("Êxodo 13:1", "Êxodo 12-14")).toBe(true);
  });

  it("versículos disjuntos não sobrepõem", () => {
    expect(refsOverlap("João 3:16", "João 3:17")).toBe(false);
  });

  it("livros diferentes não sobrepõem", () => {
    expect(refsOverlap("João 3:16", "Mateus 3:16")).toBe(false);
  });

  it("capítulos disjuntos não sobrepõem", () => {
    expect(refsOverlap("Gênesis 3", "Gênesis 4")).toBe(false);
  });

  it("passagesOverlap com múltiplos segmentos", () => {
    const a = parsePassage("Gênesis 12:1-3; 15:6");
    const b = parsePassage("Genesis 15:6");
    expect(passagesOverlap(a, b)).toBe(true);
  });
});

describe("formatEnglishRef", () => {
  it("formata versículo, faixa e capítulo", () => {
    expect(formatEnglishRef(parsePassage("João 3:16")[0])).toBe("John 3:16");
    expect(formatEnglishRef(parsePassage("João 3:16-18")[0])).toBe(
      "John 3:16-18",
    );
    expect(formatEnglishRef(parsePassage("Êxodo 12-14")[0])).toBe(
      "Exodus 12-14",
    );
  });
});
