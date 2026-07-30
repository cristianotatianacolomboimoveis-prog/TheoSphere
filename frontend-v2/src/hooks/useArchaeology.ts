"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { BIBLE_BOOKS } from "@/data/bibleBooks";

/**
 * Descoberta arqueológica retornada pela API do acervo.
 * Espelho de ArchaeologicalFind no backend.
 */
export interface ArchaeologicalFind {
  id: string;
  slug: string;
  namePt: string;
  nameEn: string | null;
  category: string;
  discoveryYear: number | null;
  discoverySite: string;
  currentLocation: string | null;
  period: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string;
  significance: string;
  authenticity: "confirmada" | "debatida" | "disputada" | string;
  relatedRefs: string[];
  externalUrl: string | null;
}

/** Resolve a abreviação PT (ex: 'Gn') a partir do nome do livro ativo. */
function bookAbbrev(bookNamePt: string): string | null {
  const book = BIBLE_BOOKS.find(
    (b) => b.namePt.toLowerCase() === bookNamePt.toLowerCase(),
  );
  return book?.abbrevPt ?? null;
}

/**
 * Busca descobertas arqueológicas ligadas ao capítulo aberto no leitor.
 * Estratégia: tenta match no capítulo (ex: '2Rs 3'); se vazio, cai para
 * o nível do livro (ex: '2Rs'), para não deixar o painel vazio à toa.
 */
export function useArchaeology(bookNamePt: string, chapter: number) {
  const [finds, setFinds] = useState<ArchaeologicalFind[]>([]);
  const [scope, setScope] = useState<"chapter" | "book" | "none">("none");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchRef = async (ref: string) => {
      // Client central: timeout, refresh-on-401 e signal externo de graça.
      const json = await api.get<{
        success: boolean;
        data: ArchaeologicalFind[];
      }>(`/archaeology/by-ref?ref=${encodeURIComponent(ref)}`, {
        signal: controller.signal,
        throwOnError: false,
      });
      return json?.success ? json.data : [];
    };

    // Todo o fluxo (incl. reset de estado) roda assíncrono para não
    // disparar setState síncrono dentro do effect (react-hooks rule).
    (async () => {
      const abbrev = bookAbbrev(bookNamePt);
      if (!abbrev) {
        setFinds([]);
        setScope("none");
        return;
      }
      setLoading(true);
      try {
        // 1º: match exato do capítulo
        const byChapter = await fetchRef(`${abbrev} ${chapter}`);
        if (byChapter.length > 0) {
          setFinds(byChapter);
          setScope("chapter");
          return;
        }
        // 2º: fallback para o livro inteiro
        const byBook = await fetchRef(abbrev);
        setFinds(byBook);
        setScope(byBook.length > 0 ? "book" : "none");
      } catch {
        // AbortError ou rede — painel simplesmente não exibe nada
        setFinds([]);
        setScope("none");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [bookNamePt, chapter]);

  return { finds, scope, loading };
}
