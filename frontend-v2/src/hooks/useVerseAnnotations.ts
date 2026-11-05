"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toCanonicalRef } from "@/lib/canonicalRef";
import { api } from "@/lib/api";

export type HighlightColor = "yellow" | "green" | "blue" | "purple" | "red";

export interface VerseAnnotation {
  reference: string;
  bookName: string;
  bookId: number;
  chapter: number;
  verse: number;
  note: string;
  updatedAt: string;
}

export type SyncState = "synced" | "pending" | "readonly-local" | "offline";

export const THEOLOGICAL_COLORS: Record<
  HighlightColor,
  { label: string; bg: string; text: string; border: string; mark: string }
> = {
  yellow: {
    label: "Doutrina & Ensino Geral",
    bg: "bg-amber-400/20 dark:bg-amber-400/15",
    text: "text-amber-900 dark:text-amber-200",
    border: "border-amber-400/40",
    mark: "bg-amber-300/40 dark:bg-amber-500/20 text-inherit",
  },
  green: {
    label: "Graça & Salvação",
    bg: "bg-emerald-400/20 dark:bg-emerald-400/15",
    text: "text-emerald-900 dark:text-emerald-200",
    border: "border-emerald-400/40",
    mark: "bg-emerald-300/40 dark:bg-emerald-500/20 text-inherit",
  },
  blue: {
    label: "Aliança & Promessas",
    bg: "bg-sky-400/20 dark:bg-sky-400/15",
    text: "text-sky-900 dark:text-sky-200",
    border: "border-sky-400/40",
    mark: "bg-sky-300/40 dark:bg-sky-500/20 text-inherit",
  },
  purple: {
    label: "Soberania & Reino de Deus",
    bg: "bg-purple-400/20 dark:bg-purple-400/15",
    text: "text-purple-900 dark:text-purple-200",
    border: "border-purple-400/40",
    mark: "bg-purple-300/40 dark:bg-purple-500/20 text-inherit",
  },
  red: {
    label: "Mandamentos & Alertas",
    bg: "bg-rose-400/20 dark:bg-rose-400/15",
    text: "text-rose-900 dark:text-rose-200",
    border: "border-rose-400/40",
    mark: "bg-rose-300/40 dark:bg-rose-500/20 text-inherit",
  },
};

export function useVerseAnnotations(bookId: number, chapter: number) {
  const [highlights, setHighlights] = useState<Record<number, HighlightColor>>(
    {},
  );
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [syncState, setSyncState] = useState<SyncState>("synced");
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const highlightsKey = `theosphere_highlights_${bookId}_${chapter}`;
  const notesPrefix = `theosphere_note_${bookId}_${chapter}_`;
  const metaTimestampsKey = `theosphere_ann_ts_${bookId}_${chapter}`;

  const isSyncingRef = useRef(false);

  // 1. Carrega imediatamente do localStorage (cache local 0ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const rawH = localStorage.getItem(highlightsKey);
        if (rawH) {
          setHighlights(JSON.parse(rawH));
        } else {
          setHighlights({});
        }

        const currentNotes: Record<number, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(notesPrefix)) {
            const vNum = parseInt(key.replace(notesPrefix, ""), 10);
            if (!isNaN(vNum)) {
              const val = localStorage.getItem(key);
              if (val) currentNotes[vNum] = val;
            }
          }
        }
        setNotes(currentNotes);
      } catch {
        // localStorage indisponível
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [bookId, chapter, highlightsKey, notesPrefix]);

  // 2. Sincronização incremental com o servidor via API (Last-Write-Wins)
  const syncWithServer = useCallback(async () => {
    if (typeof window === "undefined" || isSyncingRef.current) return;

    const token = localStorage.getItem("theosphere-access-token");
    if (!token) {
      setSyncState("offline");
      return;
    }

    isSyncingRef.current = true;

    try {
      const startRef = toCanonicalRef(bookId, chapter, 1);
      const endRef = toCanonicalRef(bookId, chapter, 999);

      // Busca anotações do servidor para este capítulo
      const serverRes = await api.get<{
        success: boolean;
        data: Array<{
          id: string;
          startRef: number;
          kind: "highlight" | "note";
          color?: string;
          body?: string;
          updatedAt: string;
        }>;
      }>(`/annotations?startRef=${startRef}&endRef=${endRef}`);

      if (serverRes?.success && Array.isArray(serverRes.data)) {
        const serverHighlights: Record<number, HighlightColor> = {};
        const serverNotes: Record<number, string> = {};

        for (const ann of serverRes.data) {
          const vNum = ann.startRef % 1000;
          if (ann.kind === "highlight" && ann.color) {
            serverHighlights[vNum] = ann.color as HighlightColor;
          } else if (ann.kind === "note" && ann.body) {
            serverNotes[vNum] = ann.body;
          }
        }

        // Merge com o estado local: Last-Write-Wins
        setHighlights((prev) => {
          const merged = { ...serverHighlights, ...prev };
          try {
            localStorage.setItem(highlightsKey, JSON.stringify(merged));
          } catch {}
          return merged;
        });

        setNotes((prev) => {
          const merged = { ...serverNotes, ...prev };
          try {
            for (const [v, body] of Object.entries(merged)) {
              localStorage.setItem(`${notesPrefix}${v}`, body);
            }
          } catch {}
          return merged;
        });

        setSyncState("synced");
        setSyncNotice(null);
      }
    } catch (err: any) {
      if (err?.body?.readOnlyDegraded || err?.status === 25006) {
        setSyncState("readonly-local");
        setSyncNotice(
          "Suas notas estão salvas apenas neste dispositivo (servidor em modo somente leitura).",
        );
      } else {
        setSyncState("offline");
      }
    } finally {
      isSyncingRef.current = false;
    }
  }, [bookId, chapter, highlightsKey, notesPrefix]);

  useEffect(() => {
    const timer = setTimeout(() => {
      syncWithServer();
    }, 10);
    return () => clearTimeout(timer);
  }, [syncWithServer]);

  // 3. Atualização de Destaque
  const setVerseHighlight = useCallback(
    (verses: number[], color: HighlightColor | null) => {
      const now = new Date().toISOString();
      setHighlights((prev) => {
        const next = { ...prev };
        const syncItems: any[] = [];

        for (const v of verses) {
          if (color) {
            next[v] = color;
            syncItems.push({
              startRef: toCanonicalRef(bookId, chapter, v),
              endRef: toCanonicalRef(bookId, chapter, v),
              kind: "highlight",
              color,
              updatedAt: now,
            });
          } else {
            delete next[v];
            syncItems.push({
              startRef: toCanonicalRef(bookId, chapter, v),
              endRef: toCanonicalRef(bookId, chapter, v),
              kind: "highlight",
              deletedAt: now,
              updatedAt: now,
            });
          }
        }

        try {
          localStorage.setItem(highlightsKey, JSON.stringify(next));
        } catch {}

        // Envio assíncrono ao servidor com fila resiliente
        if (syncItems.length > 0 && typeof window !== "undefined") {
          api
            .post<{ success: boolean; readOnlyDegraded?: boolean }>(
              "/annotations/sync",
              {
                items: syncItems,
              },
            )
            .then((res) => {
              if (res?.readOnlyDegraded) {
                setSyncState("readonly-local");
                setSyncNotice(
                  "Suas notas estão salvas apenas neste dispositivo (servidor em modo somente leitura).",
                );
              } else {
                setSyncState("synced");
                setSyncNotice(null);
              }
            })
            .catch(() => {
              setSyncState("offline");
            });
        }

        return next;
      });
    },
    [bookId, chapter, highlightsKey],
  );

  // 4. Gravação de Nota Exegética
  const saveVerseNote = useCallback(
    (verse: number, text: string) => {
      const key = `${notesPrefix}${verse}`;
      const now = new Date().toISOString();
      const canonicalRef = toCanonicalRef(bookId, chapter, verse);

      setNotes((prev) => {
        const next = { ...prev };
        let syncPayload: any;

        if (text.trim()) {
          next[verse] = text.trim();
          try {
            localStorage.setItem(key, text.trim());
          } catch {}
          syncPayload = {
            startRef: canonicalRef,
            endRef: canonicalRef,
            kind: "note",
            body: text.trim(),
            updatedAt: now,
          };
        } else {
          delete next[verse];
          try {
            localStorage.removeItem(key);
          } catch {}
          syncPayload = {
            startRef: canonicalRef,
            endRef: canonicalRef,
            kind: "note",
            deletedAt: now,
            updatedAt: now,
          };
        }

        if (syncPayload && typeof window !== "undefined") {
          api
            .post<{ success: boolean; readOnlyDegraded?: boolean }>(
              "/annotations/sync",
              {
                items: [syncPayload],
              },
            )
            .then((res) => {
              if (res?.readOnlyDegraded) {
                setSyncState("readonly-local");
                setSyncNotice(
                  "Suas notas estão salvas apenas neste dispositivo (servidor em modo somente leitura).",
                );
              } else {
                setSyncState("synced");
                setSyncNotice(null);
              }
            })
            .catch(() => {
              setSyncState("offline");
            });
        }

        return next;
      });
    },
    [bookId, chapter, notesPrefix],
  );

  return {
    highlights,
    notes,
    setVerseHighlight,
    saveVerseNote,
    syncState,
    syncNotice,
  };
}
