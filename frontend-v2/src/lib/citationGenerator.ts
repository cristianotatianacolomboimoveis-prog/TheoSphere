/**
 * TheoSphere Academic Citation Generator
 * Formata citações conforme normas ABNT e SBL (Society of Biblical Literature).
 */

export type CitationStyle = "ABNT" | "SBL";

interface CitationParams {
  book: string;
  chapter: number;
  verse?: string | number;
  translation: string;
  insight?: string;
  author?: string;
}

export function generateCitation(params: CitationParams, style: CitationStyle = "ABNT"): string {
  const { book, chapter, verse, translation, insight, author = "TheoSphere Engine" } = params;
  const versePart = verse ? `:${verse}` : "";
  const reference = `${book} ${chapter}${versePart}`;
  const date = new Date().toLocaleDateString("pt-BR", { year: "numeric" });

  if (style === "ABNT") {
    // Formato ABNT: AUTOR. Título. Local: Editora, Data. Citação da Bíblia.
    const base = `${author.toUpperCase()}. Análise Exegética PhD: ${reference} (${translation.toUpperCase()}).`;
    const platform = ` Disponível em: TheoSphere Digital Platform. Acesso em: ${date}.`;
    return insight ? `"${insight}" (${base}${platform})` : `${base}${platform}`;
  }

  if (style === "SBL") {
    // Formato SBL: Autor, "Título," em Fonte (Local: Editora, Data), Referência.
    const base = `${author}, "Exegetical Insight on ${reference}," in TheoSphere PhD Engine (${translation.toUpperCase()}), ${date}.`;
    return insight ? `"${insight}" (${base})` : base;
  }

  return reference;
}
