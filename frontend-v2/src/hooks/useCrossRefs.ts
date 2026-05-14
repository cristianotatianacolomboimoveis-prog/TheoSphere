"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { logger } from "@/lib/logger";

/**
 * Hook para integração com TSK cross-references.
 *
 * Duas funcionalidades:
 *   • `counts`   — bulk: dada uma lista de refs do capítulo aberto, retorna
 *                  quantos cross-refs cada uma tem. Usado pra renderizar
 *                  o badge "🔗 N" ao lado de cada versículo sem N+1 calls.
 *   • `list(ref)` — sob demanda: busca a lista completa quando o usuário
 *                  clica no badge. Cacheado em memória por sessão para
 *                  evitar refetch ao reabrir o mesmo verso.
 *
 * Falha em silêncio em qualquer caminho (rede caiu, backend antigo, etc.):
 * o reader não deve quebrar se cross-refs estiverem indisponíveis.
 */

export interface CrossRef {
  target: string;
  rank: number | null;
  votes: number | null;
}

interface CountsResponse {
  success: boolean;
  data: { counts: Record<string, number> };
}

interface ListResponse {
  success: boolean;
  data: { source: string; count: number; refs: CrossRef[] };
}

export function useCrossRefs() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const listCacheRef = useRef<Map<string, CrossRef[]>>(new Map());

  /**
   * Carrega counts para os refs visíveis no capítulo. Idempotente: refs já
   * presentes no estado anterior são preservados (merge), evitando flicker
   * quando o usuário rola entre capítulos.
   */
  const loadCounts = useCallback(async (refs: string[]) => {
    if (!Array.isArray(refs) || refs.length === 0) return;
    const unique = Array.from(new Set(refs.filter((r) => r && r.length > 0)));
    if (unique.length === 0) return;
    try {
      const res = await api.post<CountsResponse>(
        "cross-refs/counts",
        { refs: unique },
        { timeoutMs: 5_000, withAuth: false },
      );
      if (res.success) {
        setCounts((prev) => ({ ...prev, ...res.data.counts }));
      }
    } catch (err) {
      // 404 indica backend antigo sem CrossReferencesController.
      // Não polui o console em produção; o useEffect só não atualiza counts.
      if (!(err instanceof ApiError) || err.status >= 500) {
        logger.warn("[useCrossRefs] counts falhou:", err);
      }
    }
  }, []);

  /**
   * Resolve a lista de cross-refs para um ref específico. Retorna o array
   * vazio em erro (cache miss + falha de rede) — UI mostra estado vazio.
   */
  const list = useCallback(async (ref: string): Promise<CrossRef[]> => {
    const cached = listCacheRef.current.get(ref);
    if (cached) return cached;
    try {
      const res = await api.get<ListResponse>(
        `cross-refs?ref=${encodeURIComponent(ref)}&limit=50`,
        { timeoutMs: 8_000, withAuth: false },
      );
      if (res.success) {
        listCacheRef.current.set(ref, res.data.refs);
        return res.data.refs;
      }
    } catch (err) {
      if (!(err instanceof ApiError) || err.status >= 500) {
        logger.warn(`[useCrossRefs] list("${ref}") falhou:`, err);
      }
    }
    return [];
  }, []);

  return { counts, loadCounts, list };
}

/**
 * Parser de "Book Chapter:Verse" canônico → { book, chapter, verse }.
 * Tolera múltiplas formas de espaçamento e prefixos numéricos
 * ("1 Samuel", "1Samuel", "I Samuel"). Retorna null se não encaixar.
 */
export interface ParsedRef {
  book: string;
  chapter: number;
  verse: number;
}

export function parseRef(ref: string): ParsedRef | null {
  if (!ref || typeof ref !== "string") return null;
  const trimmed = ref.trim();
  // "1 Samuel 17:45" ou "Genesis 1:1"
  const m = trimmed.match(/^(\d?\s*[A-Za-z][A-Za-z\s]*?)\s+(\d+):(\d+)$/);
  if (!m) return null;
  return {
    book: m[1].replace(/\s+/g, " ").trim(),
    chapter: parseInt(m[2], 10),
    verse: parseInt(m[3], 10),
  };
}

/** Hook utilitário: carrega counts toda vez que `refs` mudar. */
export function useChapterCrossRefs(refs: string[]) {
  const { counts, loadCounts, list } = useCrossRefs();
  useEffect(() => {
    void loadCounts(refs);
    // refs.join('|') é um dep eficiente — comparar array por valor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refs.join("|")]);
  return { counts, list };
}
