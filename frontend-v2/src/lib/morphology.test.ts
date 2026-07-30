import { describe, it, expect } from "vitest";
import { translateMorphology } from "./morphology";

/**
 * Testes do decodificador de códigos morfológicos (par do filtro morph: da
 * busca avançada). Códigos no padrão TAGNT/Robinson para o NT grego e
 * códigos compostos para o hebraico do AT.
 */
describe("translateMorphology — NT grego", () => {
  it("decodifica verbo completo V-AAI-3S (João 3:16 ἠγάπησεν)", () => {
    expect(translateMorphology("V-AAI-3S", true)).toBe(
      "Verbo, Aoristo, Ativa, Indicativo, 3ª Pessoa, Singular",
    );
  });

  it("decodifica verbo sem pessoa/número (V-PAI)", () => {
    const out = translateMorphology("V-PAI", true);
    expect(out).toContain("Verbo");
    expect(out).toContain("Presente");
    expect(out).toContain("Ativa");
    expect(out).toContain("Indicativo");
  });

  it("decodifica substantivo N-NSF (caso, número, gênero)", () => {
    const out = translateMorphology("N-NSF", true);
    expect(out).toContain("Substantivo");
    expect(out).toContain("Nominativo");
    expect(out).toContain("Singular");
  });

  it("classe isolada resolve pelo mapa de POS", () => {
    expect(translateMorphology("C", true)).toBe("Conjunção");
  });

  it("código desconhecido degrada sem lançar (retorna partes cruas)", () => {
    expect(() => translateMorphology("X-ZZZ", true)).not.toThrow();
    expect(translateMorphology("X-ZZZ", true)).toBeTruthy();
  });
});

describe("translateMorphology — AT hebraico", () => {
  it("decodifica partes conhecidas e preserva desconhecidas", () => {
    const out = translateMorphology("V-Qal", false);
    expect(out).toContain("Verbo");
  });
});

describe("translateMorphology — guardas", () => {
  it("string vazia retorna vazio", () => {
    expect(translateMorphology("", true)).toBe("");
  });

  it("texto já amigável (com espaço) passa intacto", () => {
    expect(translateMorphology("Verbo, Aoristo", true)).toBe("Verbo, Aoristo");
  });
});
