"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { ArchaeologicalFind } from "@/hooks/useArchaeology";

/**
 * usePassageGuide — consome o endpoint orquestrado
 * GET /bible/passage-guide/:translation/:bookId/:chapter[?verse=N]
 * que agrega texto, interlinear STEP, cross-refs TSK, léxico, comentários
 * e arqueologia numa única chamada (uma viagem de rede em vez de seis).
 */

export interface GuideInterlinearWord {
  word: string;
  translit: string;
  gloss: string;
  glossEs: string | null;
  strongId: string;
  morph: string | null;
  lemma: string | null;
}

export interface PassageGuideData {
  reference: {
    bookId: number;
    chapter: number;
    verse: number | null;
    translation: string;
    display: string;
  };
  verses: Array<{ verse: number; text: string }>;
  interlinear:
    | {
        available: boolean;
        source: string | null;
        words: GuideInterlinearWord[];
      }
    | {
        available: boolean;
        source: string | null;
        verses: Record<number, GuideInterlinearWord[]>;
      };
  crossReferences:
    | { mode: "list"; list: Array<{ target: string; rank: number | null }> }
    | { mode: "counts"; counts: Record<string, number> }
    | { mode: "none" };
  lexicon: Array<{
    strongId: string;
    word: string;
    language: string;
    definition: string;
  }>;
  commentaries: Array<{
    verse: number;
    author: string;
    content: string;
    source: string;
    tags: string[];
  }>;
  archaeology: ArchaeologicalFind[];
}

export function usePassageGuide(
  translation: string,
  bookId: number,
  chapter: number,
  verse?: number,
) {
  const [guide, setGuide] = useState<PassageGuideData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!translation || !bookId || !chapter) return;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<{ success: boolean; data: PassageGuideData }>(
          `/bible/passage-guide/${encodeURIComponent(translation)}/${bookId}/${chapter}${
            verse ? `?verse=${verse}` : ""
          }`,
          { signal: controller.signal, throwOnError: false },
        );
        if (res?.success) setGuide(res.data);
        else setError("Guia indisponível para esta passagem.");
      } catch {
        setError("Falha de rede ao montar o guia.");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [translation, bookId, chapter, verse]);

  return { guide, loading, error };
}
