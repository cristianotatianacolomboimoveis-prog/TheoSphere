import { describe, it, expect } from "vitest";
import { parseBibleRef } from "./bibleRef";

/**
 * Regressão da varredura de 2026-07-29: os botões de "Passagens Chave" do
 * Factbook e as ocorrências da concordância do Word Study não tinham onClick.
 * Ao ligá-los, a navegação depende inteiramente deste parser — e o parseRef
 * existente (useCrossRefs) rejeita acento e exige versículo, o que descartaria
 * a maioria das referências devolvidas pela IA em PT-BR.
 */
describe("parseBibleRef", () => {
  it("aceita nome em português com acento", () => {
    const parsed = parseBibleRef("Gênesis 14:18");
    expect(parsed?.book.nameEn).toBe("Genesis");
    expect(parsed?.chapter).toBe(14);
    expect(parsed?.verse).toBe(18);
  });

  it("aceita nome em inglês", () => {
    expect(parseBibleRef("Hebrews 7:1")?.book.namePt).toBe("Hebreus");
  });

  it("aceita abreviação", () => {
    const parsed = parseBibleRef("Hb 7:1");
    expect(parsed?.book.namePt).toBe("Hebreus");
    expect(parsed?.chapter).toBe(7);
  });

  it("aceita livro numerado", () => {
    const parsed = parseBibleRef("1 Samuel 17:45");
    expect(parsed?.book.nameEn).toBe("1 Samuel");
    expect(parsed?.verse).toBe(45);
  });

  it("aceita referência só de capítulo", () => {
    const parsed = parseBibleRef("Salmos 110");
    expect(parsed?.chapter).toBe(110);
    expect(parsed?.verse).toBeUndefined();
  });

  it("ignora o intervalo e mantém o versículo inicial", () => {
    expect(parseBibleRef("Hebreus 7:1-3")?.verse).toBe(1);
  });

  it("rejeita capítulo fora do intervalo do livro", () => {
    // Judas tem 1 capítulo — a IA às vezes inventa.
    expect(parseBibleRef("Judas 5:2")).toBeNull();
  });

  it("rejeita livro inexistente", () => {
    expect(parseBibleRef("Enoque 1:1")).toBeNull();
  });

  it("rejeita texto que não é referência", () => {
    expect(parseBibleRef("Sacerdócio melquisediano")).toBeNull();
    expect(parseBibleRef("")).toBeNull();
  });
});
