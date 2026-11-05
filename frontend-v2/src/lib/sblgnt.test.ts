import { describe, it, expect } from "vitest";
import { getOriginalLanguageTranslation, isNewTestament } from "./bibleUtils";
import { TRANSLATIONS } from "../components/BibleReader";

describe("T1.1 — Padrão do Texto Crítico Grego no Frontend (SBLGNT)", () => {
  it("deve definir SBLGNT como tradução padrão da língua original para livros do Novo Testamento", () => {
    expect(isNewTestament("Mateus")).toBe(true);
    expect(isNewTestament("João")).toBe(true);
    expect(isNewTestament("Romanos")).toBe(true);
    expect(isNewTestament("Apocalipse")).toBe(true);

    expect(getOriginalLanguageTranslation("Mateus")).toBe("SBLGNT");
    expect(getOriginalLanguageTranslation("João")).toBe("SBLGNT");
    expect(getOriginalLanguageTranslation("Romanos")).toBe("SBLGNT");
    expect(getOriginalLanguageTranslation("Apocalipse")).toBe("SBLGNT");
  });

  it("deve manter WLC (Hebraico) para o Antigo Testamento", () => {
    expect(isNewTestament("Gênesis")).toBe(false);
    expect(isNewTestament("Salmos")).toBe(false);
    expect(isNewTestament("Isaías")).toBe(false);

    expect(getOriginalLanguageTranslation("Gênesis")).toBe("WLC");
    expect(getOriginalLanguageTranslation("Salmos")).toBe("WLC");
    expect(getOriginalLanguageTranslation("Isaías")).toBe("WLC");
  });

  it("deve cadastrar SBLGNT no catálogo de traduções do leitor com atribuição de licença CC BY 4.0", () => {
    const sbl = TRANSLATIONS.find((t) => t.id === "sblgnt");
    expect(sbl).toBeDefined();
    expect(sbl?.lang).toBe("GR");
    expect(sbl?.name).toContain("SBL Greek New Testament");
    expect(sbl?.type).toContain("CC BY 4.0");
    expect(sbl?.attribution).toContain("Society of Biblical Literature");
    expect(sbl?.attribution).toContain("Logos Bible Software");

    // TR continua selecionável
    const tr = TRANSLATIONS.find((t) => t.id === "tr");
    expect(tr).toBeDefined();
    expect(tr?.name).toContain("Textus Receptus");
  });
});
