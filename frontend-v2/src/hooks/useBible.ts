"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTheoStore } from "@/store/useTheoStore";
import { useTheoWorker } from "./useTheoWorker";
import { BIBLE_BOOKS } from "@/data/bibleBooks";

export interface BibleVerse {
  verse: number;
  text: string;
}

export interface ChapterData {
  reference: string;
  verses: BibleVerse[];
  translation_name: string;
  translation_id: string;
  source?: "cache" | "api";
}

import { CONFIG } from "@/lib/config";

const BACKEND_URL = `${CONFIG.API_BASE_URL}/bible`;

export function useBible(primaryTranslation: string, viewMode: "text" | "interlinear", secondaryTranslation?: string) {
  const { activeBook, activeChapter, _hasHydrated } = useTheoStore();
  const [chaptersData, setChaptersData] = useState<ChapterData[]>([]);
  const [secondaryData, setSecondaryData] = useState<ChapterData | null>(null);
  const [interlinearMap, setInterlinearMap] = useState<Record<number, any[]>>({});
  const [loading, setLoading] = useState(false);
  const chaptersDataRef = useRef(chaptersData);

  useEffect(() => { chaptersDataRef.current = chaptersData; }, [chaptersData]);

  const handleWorkerMessage = useCallback((type: string, payload: any) => {
    if (type === "BIBLE_CHAPTER_DATA") {
      const { verses, chapter, source } = payload;
      setChaptersData([{
        reference: `${activeBook} ${chapter}`,
        verses,
        translation_name: primaryTranslation.toUpperCase(),
        translation_id: primaryTranslation,
        source: source as "cache" | "api" | undefined,
      }]);
      setLoading(false);
    } else if (type === "BIBLE_SECONDARY_DATA") {
      const { verses, chapter } = payload;
      setSecondaryData({
        reference: `${activeBook} ${chapter}`,
        verses,
        translation_name: secondaryTranslation?.toUpperCase() || "",
        translation_id: secondaryTranslation || ""
      });
    } else if (type === "INTERLINEAR_CHAPTER_DATA") {
      setInterlinearMap(payload.interlinearMap);
    } else if (type === "WORKER_ERROR") {
      setLoading(false);
    }
  }, [activeBook, primaryTranslation]);

  const { postMessage } = useTheoWorker(handleWorkerMessage);

  const fetchChapter = useCallback(() => {
    if (!_hasHydrated) return;
    setLoading(true);
    setChaptersData([]);

    postMessage("FETCH_BIBLE_CHAPTER", {
      book: activeBook,
      chapter: activeChapter,
      translation: primaryTranslation,
      backendUrl: BACKEND_URL
    });

    if (secondaryTranslation) {
       postMessage("FETCH_BIBLE_CHAPTER", {
        book: activeBook,
        chapter: activeChapter,
        translation: secondaryTranslation,
        backendUrl: BACKEND_URL,
        isSecondary: true
      });
    }

    if (viewMode === "interlinear") {
      postMessage("FETCH_INTERLINEAR_CHAPTER", {
        book: activeBook,
        chapter: activeChapter,
        backendUrl: BACKEND_URL
      });
    }
  }, [activeBook, activeChapter, primaryTranslation, secondaryTranslation, viewMode, _hasHydrated, postMessage]);

  useEffect(() => {
    fetchChapter();
  }, [fetchChapter]);

  return { chaptersData, secondaryData, interlinearMap, loading, refetch: fetchChapter };
}
