"use client";

import { useCallback, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { logger } from "@/lib/logger";

/**
 * Hook para a pesquisa avançada Logos-like.
 *
 * Mantém estado do parse + hits. O componente de busca pode mostrar chips
 * indicando o que foi interpretado ("book: John", "chapter: 1-3",
 * "AND, OR, -word") — fundamental pro usuário ganhar confiança na sintaxe.
 *
 * Falha em silêncio: 401/404 mantém UI funcional. 5xx loga e devolve vazio.
 */

export interface ParsedAdvanced {
  bookName: string | null;
  chapterMin: number | null;
  chapterMax: number | null;
  must: string[];
  mustNot: string[];
  phrases: string[];
  shouldGroups: string[][];
  hasStructure: boolean;
}

export interface AdvancedHit {
  id: string;
  bookId: number;
  chapter: number;
  verse: number;
  translation: string;
  text: string;
  score: number;
}

interface AdvancedResponse {
  success: boolean;
  data: { parsed: ParsedAdvanced; count: number; hits: AdvancedHit[] };
}

/**
 * Heurística simples: a query é "avançada" se contiver operadores ou
 * filtros estruturados. Se não, vale a pena usar o endpoint barato
 * `/verses` em vez do `/advanced` (que faz parse + roteamento extra).
 */
export function isAdvancedSyntax(q: string): boolean {
  if (!q) return false;
  return (
    /\b(AND|OR)\b/.test(q) ||
    /\w+:/.test(q) ||
    /"[^"]+"/.test(q) ||
    /(^|\s)-\w/.test(q)
  );
}

export function useAdvancedSearch() {
  const [parsed, setParsed] = useState<ParsedAdvanced | null>(null);
  const [hits, setHits] = useState<AdvancedHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (
      query: string,
      opts: { translation?: string; limit?: number } = {},
    ) => {
      const q = query.trim();
      if (q.length < 2) {
        setHits([]);
        setParsed(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ q });
        if (opts.translation) qs.set("translation", opts.translation);
        if (opts.limit) qs.set("limit", String(opts.limit));
        const res = await api.get<AdvancedResponse>(
          `search/advanced?${qs.toString()}`,
          { timeoutMs: 15_000, withAuth: false },
        );
        if (res.success) {
          setParsed(res.data.parsed);
          setHits(res.data.hits);
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 400) {
          setError("Sintaxe inválida — verifique aspas e operadores.");
        } else if (err instanceof ApiError && err.status === 404) {
          // Backend antigo sem /advanced. Cai em silêncio.
        } else {
          logger.warn("[useAdvancedSearch] falhou:", err);
          setError("Não foi possível pesquisar agora.");
        }
        setHits([]);
        setParsed(null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setHits([]);
    setParsed(null);
    setError(null);
  }, []);

  return { parsed, hits, loading, error, search, reset };
}
