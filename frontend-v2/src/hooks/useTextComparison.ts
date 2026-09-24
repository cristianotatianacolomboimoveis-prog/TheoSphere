"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export type DiffTokenType = "equal" | "added" | "removed";

export interface DiffToken {
  type: DiffTokenType;
  text: string;
}

export interface TextDiffResult {
  similarity: number;
  tokens: DiffToken[];
  addedCount: number;
  removedCount: number;
  equalCount: number;
}

export interface VerseVariantComparison {
  verse: number;
  base: {
    translation: string;
    text: string;
  };
  targets: Record<
    string,
    {
      text: string;
      diff: TextDiffResult;
    }
  >;
}

export interface ComparisonPassageResponse {
  reference: {
    bookId: number;
    chapter: number;
    verse: number | null;
    display: string;
  };
  baseTranslation: string;
  translations: string[];
  metrics: Record<
    string,
    {
      averageSimilarity: number;
      totalVerses: number;
    }
  >;
  verses: VerseVariantComparison[];
}

export function useTextComparison(
  bookId: number,
  chapter: number,
  baseTranslation = "BLIVRE",
  translations: string[] = ["BLIVRE", "NVA", "KJV"],
  verse?: number,
) {
  const [data, setData] = useState<ComparisonPassageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translationsKey = [...translations].sort().join(",");

  useEffect(() => {
    if (!bookId || !chapter) return;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams({
          base: baseTranslation,
          translations: translationsKey,
        });

        if (verse) {
          queryParams.set("verse", verse.toString());
        }

        const res = await api.get<{
          success: boolean;
          data: ComparisonPassageResponse;
        }>(`/bible/compare/${bookId}/${chapter}?${queryParams.toString()}`, {
          signal: controller.signal,
          throwOnError: false,
        });

        if (res?.success && res.data) {
          setData(res.data);
        } else {
          setError("Não foi possível carregar a comparação de versões.");
        }
      } catch {
        setError("Erro de rede ao buscar comparação de versões.");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [bookId, chapter, baseTranslation, translationsKey, verse]);

  return { data, loading, error };
}
