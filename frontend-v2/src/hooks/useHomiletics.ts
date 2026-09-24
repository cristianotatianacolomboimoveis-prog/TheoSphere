"use client";

import { useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";
import { logger } from "@/lib/logger";

export interface SermonOutlineResponse {
  passage: string;
  passageText: string;
  title: string;
  bigIdea: string;
  context: {
    author: string;
    historicalSetting: string;
    literaryGenre: string;
    canonicalDivision: string;
  };
  originalLanguageInsights: Array<{
    term: string;
    transliteration?: string;
    strongId: string;
    meaning: string;
    theologicalSignificance: string;
  }>;
  sections: Array<{
    point: string;
    verses: string;
    explanation: string;
    illustration: string;
    application: string;
  }>;
  classicQuotes: Array<{
    author: string;
    work: string;
    quote: string;
  }>;
  crossReferences: string[];
  conclusion: {
    summary: string;
    pastoralCall: string;
    suggestedPrayer: string;
  };
  markdown: string;
}

export interface GenerateOutlineParams {
  bookId: number;
  chapter: number;
  startVerse?: number;
  endVerse?: number;
  theme?: string;
  audience?: string;
  tradition?: string;
}

export function useHomiletics() {
  const [outline, setOutline] = useState<SermonOutlineResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const generateOutline = useCallback(async (params: GenerateOutlineParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{
        success: boolean;
        data: SermonOutlineResponse;
      }>("homiletics/outline", params, { timeoutMs: 15_000, withAuth: false });
      if (res.success && res.data) {
        setOutline(res.data);
        return res.data;
      }
      throw new Error("Resposta inválida do serviço homilético");
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Erro ao gerar esboço homilético";
      logger.warn("[useHomiletics] generateOutline falhou:", err);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setOutline(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    outline,
    loading,
    error,
    generateOutline,
    reset,
  };
}
