import { useState, useEffect, useCallback, useMemo } from "react";

export type GospelKey = "matthew" | "mark" | "luke" | "john";

export interface GospelPassageRef {
  bookId: number;
  chapter: number;
  startVerse: number;
  endVerse: number;
  display: string;
}

export interface PericopeItem {
  id: string;
  order: number;
  title: string;
  section: string;
  sectionTitle: string;
  parallelType: string;
  description: string;
  passages: {
    matthew?: GospelPassageRef;
    mark?: GospelPassageRef;
    luke?: GospelPassageRef;
    john?: GospelPassageRef;
  };
  participatingGospels: GospelKey[];
}

export interface DiffToken {
  type: "equal" | "added" | "removed";
  text: string;
}

export interface GospelColumnData {
  bookId: number;
  bookName: string;
  referenceDisplay: string;
  wordCount: number;
  verses: Array<{ verse: number; text: string }>;
  fullText: string;
  diffWithBase?: {
    similarity: number;
    tokens: DiffToken[];
    addedCount: number;
    removedCount: number;
    equalCount: number;
  };
}

export interface SynopsisAgreementPair {
  gospelA: GospelKey;
  gospelB: GospelKey;
  labelA: string;
  labelB: string;
  similarity: number;
}

export interface GospelSynopsisDetail {
  pericope: PericopeItem;
  translation: string;
  baseGospel: GospelKey;
  availableTranslations: string[];
  gospels: {
    matthew?: GospelColumnData;
    mark?: GospelColumnData;
    luke?: GospelColumnData;
    john?: GospelColumnData;
  };
  agreementMatrix: SynopsisAgreementPair[];
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://theosphere.onrender.com";

export function useGospelSynopsis(
  initialBookId?: number,
  initialChapter?: number,
) {
  const [pericopes, setPericopes] = useState<PericopeItem[]>([]);
  const [selectedPericopeId, setSelectedPericopeId] = useState<string>(
    "feeding-of-the-five-thousand",
  );
  const [synopsisData, setSynopsisData] = useState<GospelSynopsisDetail | null>(
    null,
  );
  const [translation, setTranslation] = useState<string>("BLIVRE");
  const [baseGospel, setBaseGospel] = useState<GospelKey>("mark");
  const [highlightLexicalAgreement, setHighlightLexicalAgreement] =
    useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Carrega lista de perícopas catalogadas
  const loadPericopes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/synopsis/pericopes`);
      if (!res.ok) throw new Error(`Falha HTTP: ${res.status}`);
      const json = await res.json();
      setPericopes(json.pericopes || []);
    } catch (err) {
      console.warn(
        "[useGospelSynopsis] Erro ao buscar lista de perícopas:",
        err,
      );
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadPericopes();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadPericopes]);

  // Se vier com bookId e chapter inicial dos evangelhos (40-43), tenta achar a perícopa correspondente
  useEffect(() => {
    if (
      initialBookId &&
      initialBookId >= 40 &&
      initialBookId <= 43 &&
      initialChapter
    ) {
      const timer = setTimeout(() => {
        fetch(
          `${API_BASE_URL}/api/v1/synopsis/find?bookId=${initialBookId}&chapter=${initialChapter}`,
        )
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.found && data.pericope?.id) {
              setSelectedPericopeId(data.pericope.id);
            }
          })
          .catch(() => {});
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialBookId, initialChapter]);

  // 2. Carrega detalhes da perícopa ativa com versículos e diffs
  const loadSynopsisDetail = useCallback(async () => {
    if (!selectedPericopeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/synopsis/pericopes/${selectedPericopeId}?translation=${encodeURIComponent(
          translation,
        )}&base=${baseGospel}`,
      );
      if (!res.ok) {
        throw new Error(`Erro ao carregar sinopse: status ${res.status}`);
      }
      const json: GospelSynopsisDetail = await res.json();
      setSynopsisData(json);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedPericopeId, translation, baseGospel]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadSynopsisDetail();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadSynopsisDetail]);

  // Filtra perícopas para o dropdown de busca
  const filteredPericopes = useMemo(() => {
    return pericopes.filter((p) => {
      const matchesSection =
        sectionFilter === "all" || p.section === sectionFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        Object.values(p.passages).some((pass) =>
          pass?.display.toLowerCase().includes(q),
        );

      return matchesSection && matchesSearch;
    });
  }, [pericopes, sectionFilter, searchQuery]);

  // Exportação em Markdown
  const copyAsMarkdown = useCallback(() => {
    if (!synopsisData) return "";
    const { pericope, gospels, agreementMatrix } = synopsisData;

    let md = `### 📜 Sinopse dos Evangelhos: ${pericope.title}\n`;
    md += `*${pericope.description}*  \n`;
    md += `**Tradução:** ${synopsisData.translation} | **Evangelho Base:** ${synopsisData.baseGospel.toUpperCase()}\n\n`;

    // Matriz de concordância
    if (agreementMatrix.length > 0) {
      md += `**Concordância Léxica:** `;
      md += agreementMatrix
        .map((m) => `${m.labelA} ↔ ${m.labelB}: ${m.similarity}%`)
        .join(" | ");
      md += `\n\n`;
    }

    // Tabela das 4 colunas
    md += `| Mateus (${pericope.passages.matthew?.display || "—"}) | Marcos (${pericope.passages.mark?.display || "—"}) | Lucas (${pericope.passages.luke?.display || "—"}) | João (${pericope.passages.john?.display || "—"}) |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;

    const textMt = (gospels.matthew?.fullText || "*[Não narrado]*").replace(
      /\n/g,
      " ",
    );
    const textMc = (gospels.mark?.fullText || "*[Não narrado]*").replace(
      /\n/g,
      " ",
    );
    const textLc = (gospels.luke?.fullText || "*[Não narrado]*").replace(
      /\n/g,
      " ",
    );
    const textJo = (gospels.john?.fullText || "*[Não narrado]*").replace(
      /\n/g,
      " ",
    );

    md += `| ${textMt} | ${textMc} | ${textLc} | ${textJo} |\n\n`;
    md += `*Gerado pelo TheoSphere — Suíte Exegética Gospel Parallels*\n`;

    navigator.clipboard.writeText(md);
    return md;
  }, [synopsisData]);

  return {
    pericopes,
    filteredPericopes,
    selectedPericopeId,
    setSelectedPericopeId,
    synopsisData,
    translation,
    setTranslation,
    baseGospel,
    setBaseGospel,
    highlightLexicalAgreement,
    setHighlightLexicalAgreement,
    searchQuery,
    setSearchQuery,
    sectionFilter,
    setSectionFilter,
    loading,
    error,
    refresh: loadSynopsisDetail,
    copyAsMarkdown,
  };
}
