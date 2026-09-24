import { useState, useEffect, useCallback } from "react";

export type ClauseType =
  | "main"
  | "subordinate_purpose"
  | "subordinate_causal"
  | "subordinate_conditional"
  | "subordinate_temporal"
  | "subordinate_result"
  | "subordinate_relative"
  | "participial"
  | "infinitive_phrase"
  | "prepositional_phrase"
  | "vocative_apposition";

export interface ClauseNode {
  id: string;
  level: number;
  clauseType: ClauseType;
  labelPt: string;
  conjunction?: string;
  textOriginal: string;
  textTranslation: string;
  grammaticalSubject?: string;
  mainVerb?: string;
  theologicalNote?: string;
  children?: ClauseNode[];
}

export interface SyntaxDiagramResponse {
  reference: string;
  titlePt: string;
  authorPt: string;
  totalClauses: number;
  maxNestingDepth: number;
  rootClauses: ClauseNode[];
  isCanonicalPreset: boolean;
}

export interface CanonicalDiagramSummary {
  id: string;
  reference: string;
  titlePt: string;
  themePt: string;
  testament: "NT" | "OT";
  clauseCount: number;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://theosphere.onrender.com";

export function useSyntaxDiagram(initialReference?: {
  bookId: string | number;
  chapter: number;
  verse: number;
}) {
  const [predefinedList, setPredefinedList] = useState<
    CanonicalDiagramSummary[]
  >([]);
  const [activeDiagram, setActiveDiagram] =
    useState<SyntaxDiagramResponse | null>(null);
  const [selectedCanonicalId, setSelectedCanonicalId] =
    useState<string>("EPH.1.3-6");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Carrega catálogo de diagramas canônicos
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/syntax-diagram/predefined`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: CanonicalDiagramSummary[] = await res.json();
        if (isMounted) {
          setPredefinedList(data);
        }
      } catch (err) {
        console.warn("Falha ao buscar diagramas canônicos:", err);
      }
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  // Carrega diagrama canônico por ID
  const loadCanonicalDiagram = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    setSelectedCanonicalId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/syntax-diagram/canonical/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SyntaxDiagramResponse = await res.json();
      setActiveDiagram(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(`Não foi possível carregar o diagrama canônico: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carrega diagrama de versículo arbitrário
  const loadVerseDiagram = useCallback(
    async (book: string | number, chapter: number, verse: number) => {
      setIsLoading(true);
      setError(null);
      setSelectedCanonicalId("");
      try {
        const res = await fetch(
          `${API_BASE_URL}/syntax-diagram/verse/${book}/${chapter}/${verse}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: SyntaxDiagramResponse = await res.json();
        setActiveDiagram(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        setError(`Não foi possível analisar as cláusulas do versículo: ${msg}`);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Inicializa com o diagrama canônico padrão ou a referência informada
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (initialReference && initialReference.bookId) {
        if (isMounted) {
          loadVerseDiagram(
            initialReference.bookId,
            initialReference.chapter,
            initialReference.verse,
          );
        }
      } else {
        if (isMounted) {
          loadCanonicalDiagram("EPH.1.3-6");
        }
      }
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [initialReference, loadVerseDiagram, loadCanonicalDiagram]);

  // Função para exportar em formato Markdown estruturado
  const copyDiagramMarkdown = useCallback(async () => {
    if (!activeDiagram) return;

    let md = `# ${activeDiagram.titlePt}\n`;
    md += `**Referência:** ${activeDiagram.reference} | **Total de Cláusulas:** ${activeDiagram.totalClauses}\n\n`;

    function renderNode(node: ClauseNode, indent = "") {
      md += `${indent}- **[${node.labelPt}]** ${node.textOriginal ? `*${node.textOriginal}*` : ""}\n`;
      md += `${indent}  - **Tradução:** "${node.textTranslation}"\n`;
      if (node.grammaticalSubject) {
        md += `${indent}  - **Sujeito:** ${node.grammaticalSubject}\n`;
      }
      if (node.mainVerb) {
        md += `${indent}  - **Verbo:** ${node.mainVerb}\n`;
      }
      if (node.theologicalNote) {
        md += `${indent}  - **Nota Exegética:** ${node.theologicalNote}\n`;
      }
      if (node.children && node.children.length > 0) {
        node.children.forEach((child) => renderNode(child, indent + "    "));
      }
    }

    activeDiagram.rootClauses.forEach((node) => renderNode(node, ""));
    md += `\n---\n*Gerado via TheoSphere Exegetical Syntax Diagrammer*\n`;

    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Falha ao copiar diagrama:", e);
    }
  }, [activeDiagram]);

  return {
    predefinedList,
    activeDiagram,
    selectedCanonicalId,
    isLoading,
    error,
    copied,
    loadCanonicalDiagram,
    loadVerseDiagram,
    copyDiagramMarkdown,
  };
}
