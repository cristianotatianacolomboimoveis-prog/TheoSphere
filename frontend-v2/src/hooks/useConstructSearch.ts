import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

export type ConstructLanguage = "greek" | "hebrew";
export type ConstructDistance = "adjacent" | "within_3" | "same_verse";

export interface ConstructBlock {
  id: string;
  label?: string;
  partOfSpeech?: string;
  grammaticalCase?: string;
  number?: string;
  gender?: string;
  tense?: string;
  voice?: string;
  mood?: string;
  lemma?: string;
  strongId?: string;
  morphPattern?: string;
}

export interface MatchedWordItem {
  position: number;
  word: string;
  translit: string;
  gloss: string;
  strongId: string;
  morph: string | null;
  lemma: string | null;
  blockId: string;
}

export interface ConstructVerseMatch {
  bookId: number;
  bookName: string;
  chapter: number;
  verse: number;
  displayRef: string;
  textPt: string;
  matchedWords: MatchedWordItem[];
}

export interface ConstructPreset {
  id: string;
  title: string;
  language: ConstructLanguage;
  description: string;
  significance: string;
  sampleRef: string;
  distance: ConstructDistance;
  blocks: ConstructBlock[];
}

export interface ConstructSearchResult {
  totalMatches: number;
  verses: ConstructVerseMatch[];
  distributionByBook: Record<string, number>;
  executionTimeMs: number;
}

export function useConstructSearch() {
  const [presets, setPresets] = useState<ConstructPreset[]>([]);
  const [language, setLanguage] = useState<ConstructLanguage>("greek");
  const [distance, setDistance] = useState<ConstructDistance>("adjacent");
  const [blocks, setBlocks] = useState<ConstructBlock[]>([
    {
      id: "block-1",
      label: "Bloco 1",
      partOfSpeech: "N",
      grammaticalCase: "G",
    },
    {
      id: "block-2",
      label: "Bloco 2",
      partOfSpeech: "V",
      mood: "P",
      grammaticalCase: "G",
    },
  ]);
  const [results, setResults] = useState<ConstructSearchResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Carrega presets
  const loadPresets = useCallback(async () => {
    try {
      const json = await api.get<{ presets: ConstructPreset[] }>(
        "/construct-search/presets",
        { throwOnError: false },
      );
      setPresets(json?.presets || []);
    } catch (err) {
      console.warn("[useConstructSearch] Erro ao carregar presets:", err);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadPresets();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadPresets]);

  // Manipuladores de Blocos
  const addBlock = useCallback(() => {
    const newId = `block-${Date.now()}`;
    setBlocks((prev) => [
      ...prev,
      {
        id: newId,
        label: `Bloco ${prev.length + 1}`,
        partOfSpeech: "N",
      },
    ]);
  }, []);

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) =>
      prev.length > 1 ? prev.filter((b) => b.id !== id) : prev,
    );
  }, []);

  const updateBlock = useCallback(
    (id: string, updates: Partial<ConstructBlock>) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...updates } : b)),
      );
    },
    [],
  );

  // Aplica um preset pronto
  const applyPreset = useCallback((preset: ConstructPreset) => {
    setLanguage(preset.language);
    setDistance(preset.distance);
    setBlocks(preset.blocks);
    setResults(null);
  }, []);

  // Executa a busca
  const executeSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await api.post<ConstructSearchResult>(
        "/construct-search/query",
        {
          language,
          blocks,
          distance,
        },
      );
      setResults(json);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [language, blocks, distance]);

  return {
    presets,
    language,
    setLanguage,
    distance,
    setDistance,
    blocks,
    addBlock,
    removeBlock,
    updateBlock,
    applyPreset,
    executeSearch,
    results,
    loading,
    error,
  };
}
