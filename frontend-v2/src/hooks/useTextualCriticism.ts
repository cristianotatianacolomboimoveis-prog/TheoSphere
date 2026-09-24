import { useState, useEffect, useCallback } from "react";

export type ManuscriptFamily =
  | "Alexandrian"
  | "Byzantine"
  | "Western"
  | "Caesarean"
  | "Proto-Masoretic"
  | "Qumran_DSS"
  | "Septuagint_LXX"
  | "Samaritan_SP";

export type CriticalRating = "A" | "B" | "C" | "D";

export type VariantType =
  | "omission"
  | "addition"
  | "substitution"
  | "transposition"
  | "orthographic"
  | "harmonization"
  | "conflation";

export interface ManuscriptReading {
  witnessSiglum: string;
  witnessDate: string;
  family: ManuscriptFamily;
  originalText: string;
  translationPt: string;
  isAdoptedByModernEclectic: boolean;
  isAdoptedByTraditionalTR: boolean;
}

export interface TextualVariantItem {
  id: string;
  bookId: number;
  bookNamePt: string;
  chapter: number;
  verse: number;
  passageRef: string;
  unitTitlePt: string;
  variantType: VariantType;
  criticalRating: CriticalRating;
  theologicalImpact: "high" | "medium" | "low" | "none";
  historicalContextPt: string;
  scribalCausePt: string;
  readings: ManuscriptReading[];
  scholarlyConsensusPt: string;
}

export interface TextualCriticismSummary {
  id: string;
  passageRef: string;
  unitTitlePt: string;
  testament: "OT" | "NT";
  variantType: VariantType;
  criticalRating: CriticalRating;
  theologicalImpact: "high" | "medium" | "low" | "none";
  dssOrEarlyPapyriInvolved: boolean;
}

export interface ManuscriptApparatusResponse {
  passageRef: string;
  hasNotableCatalogVariant: boolean;
  catalogVariant?: TextualVariantItem;
  manuscriptWitnesses: {
    translationCode: string;
    sourceName: string;
    language: string;
    text: string;
  }[];
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://theosphere.onrender.com";

export function useTextualCriticism(initialPassage?: {
  bookId: number;
  chapter: number;
  verse: number;
}) {
  const [variantsList, setVariantsList] = useState<TextualCriticismSummary[]>(
    [],
  );
  const [activeVariant, setActiveVariant] = useState<TextualVariantItem | null>(
    null,
  );
  const [apparatusData, setApparatusData] =
    useState<ManuscriptApparatusResponse | null>(null);
  const [selectedVariantId, setSelectedVariantId] =
    useState<string>("ISA.53.11");
  const [activeTestament, setActiveTestament] = useState<"ALL" | "OT" | "NT">(
    "ALL",
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Carrega lista de variantes catalogadas
  const loadVariantsList = useCallback(
    async (testamentFilter?: "OT" | "NT", query?: string) => {
      try {
        const params = new URLSearchParams();
        if (testamentFilter) params.append("testament", testamentFilter);
        if (query) params.append("searchQuery", query);

        const res = await fetch(
          `${API_BASE_URL}/textual-criticism/variants?${params.toString()}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: TextualCriticismSummary[] = await res.json();
        setVariantsList(data);
      } catch (err) {
        console.warn("Falha ao buscar variantes textuais:", err);
      }
    },
    [],
  );

  // Carrega variante específica por ID
  const loadVariantById = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    setSelectedVariantId(id);
    try {
      const res = await fetch(
        `${API_BASE_URL}/textual-criticism/variants/${id}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: TextualVariantItem = await res.json();
      setActiveVariant(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(`Não foi possível carregar a variante: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carrega aparato de manuscritos para versículo arbitrário
  const loadApparatus = useCallback(
    async (book: string | number, chapter: number, verse: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_BASE_URL}/textual-criticism/apparatus/${book}/${chapter}/${verse}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ManuscriptApparatusResponse = await res.json();
        setApparatusData(data);
        if (data.catalogVariant) {
          setActiveVariant(data.catalogVariant);
          setSelectedVariantId(data.catalogVariant.id);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        setError(`Não foi possível carregar o aparato: ${msg}`);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Inicialização segura com React Compiler
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        loadVariantsList(
          activeTestament === "ALL" ? undefined : activeTestament,
          searchQuery,
        );
        loadVariantById("ISA.53.11");
        if (initialPassage) {
          loadApparatus(
            initialPassage.bookId,
            initialPassage.chapter,
            initialPassage.verse,
          );
        }
      }
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [
    loadVariantsList,
    loadVariantById,
    loadApparatus,
    activeTestament,
    searchQuery,
    initialPassage,
  ]);

  // Copia a ficha crítica formatada para a área de transferência
  const copyVariantMarkdown = useCallback(async () => {
    if (!activeVariant) return;

    let md = `# Ficha Crítica Textual: ${activeVariant.passageRef}\n`;
    md += `**Unidade:** ${activeVariant.unitTitlePt}\n`;
    md += `**Classificação:** ${activeVariant.variantType.toUpperCase()} | **Grau de Certeza:** ${activeVariant.criticalRating} | **Impacto Teológico:** ${activeVariant.theologicalImpact.toUpperCase()}\n\n`;

    md += `## Leituras das Testemunhas Manuscritas\n\n`;
    activeVariant.readings.forEach((r, idx) => {
      md += `### ${idx + 1}. ${r.witnessSiglum} (${r.witnessDate})\n`;
      md += `- **Texto:** \`${r.originalText}\`\n`;
      md += `- **Tradução:** "${r.translationPt}"\n`;
      md += `- **Status:** ${r.isAdoptedByModernEclectic ? "✅ Adotado pela Crítica Moderna (NA28/BHS)" : "❌ Rejeitado pelas edições críticas modernas"} | ${r.isAdoptedByTraditionalTR ? "📜 Base do Textus Receptus (KJV/ARC)" : ""}\n\n`;
    });

    md += `## Contexto Histórico & Arqueológico\n${activeVariant.historicalContextPt}\n\n`;
    md += `## Causa Provável do Erro de Cópia\n${activeVariant.scribalCausePt}\n\n`;
    md += `## Consenso Acadêmico\n${activeVariant.scholarlyConsensusPt}\n\n`;
    md += `---\n*Gerado via TheoSphere Textual Criticism & Qumran DSS Engine*\n`;

    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Erro ao copiar variante:", e);
    }
  }, [activeVariant]);

  return {
    variantsList,
    activeVariant,
    apparatusData,
    selectedVariantId,
    activeTestament,
    searchQuery,
    isLoading,
    error,
    copied,
    setActiveTestament,
    setSearchQuery,
    loadVariantById,
    loadApparatus,
    copyVariantMarkdown,
  };
}
