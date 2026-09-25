import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "@/lib/api";

export type TimelineEraKey =
  | "creation_patriarchs"
  | "exodus_conquest"
  | "united_kingdom"
  | "divided_kingdom"
  | "babylonian_exile"
  | "post_exilic_restoration"
  | "intertestamental"
  | "life_of_christ"
  | "apostolic_church";

export type TimelineCategory =
  | "biblical_event"
  | "king_judah"
  | "king_israel"
  | "prophet"
  | "world_empire"
  | "archaeology";

export interface TimelinePassageRef {
  bookId: number;
  bookName: string;
  chapter: number;
  startVerse?: number;
  endVerse?: number;
  display: string;
}

export interface TimelineEventItem {
  id: string;
  title: string;
  year: number;
  yearDisplay: string;
  era: TimelineEraKey;
  eraTitle: string;
  category: TimelineCategory;
  categoryLabel: string;
  summary: string;
  description: string;
  passages: TimelinePassageRef[];
  contemporaryFigures?: string[];
  archaeologicalNotes?: string;
  spiritualAssessment?: "faithful" | "unfaithful" | "neutral";
}

export interface TimelineEraDefinition {
  key: TimelineEraKey;
  title: string;
  periodDisplay: string;
  startYear: number;
  endYear: number;
  description: string;
}

export function useBiblicalTimeline(
  currentBookId?: number,
  currentChapter?: number,
) {
  const [eras, setEras] = useState<TimelineEraDefinition[]>([]);
  const [events, setEvents] = useState<TimelineEventItem[]>([]);
  const [passageEvents, setPassageEvents] = useState<TimelineEventItem[]>([]);
  const [selectedEra, setSelectedEra] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<TimelineEventItem | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Carrega as Eras bíblicas
  const loadEras = useCallback(async () => {
    try {
      const json = await api.get<{ eras: TimelineEraDefinition[] }>(
        "/timeline/eras",
        { throwOnError: false },
      );
      setEras(json?.eras || []);
    } catch (err) {
      console.warn("[useBiblicalTimeline] Erro ao carregar eras:", err);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadEras();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadEras]);

  // 2. Carrega eventos com filtros
  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedEra && selectedEra !== "all") params.set("era", selectedEra);
      if (selectedCategory && selectedCategory !== "all")
        params.set("category", selectedCategory);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const json = await api.get<{ events: TimelineEventItem[] }>(
        `/timeline/events?${params.toString()}`,
      );
      const list: TimelineEventItem[] = json?.events || [];
      setEvents(list);
      if (list.length > 0 && !selectedEvent) {
        setSelectedEvent(list[0]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedEra, selectedCategory, searchQuery, selectedEvent]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadEvents();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadEvents]);

  // 3. Carrega eventos da passagem bíblica ativa
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!currentBookId) {
        setPassageEvents([]);
        return;
      }
      api
        .get<{ events: TimelineEventItem[] }>(
          `/timeline/for-passage?bookId=${currentBookId}${
            currentChapter ? `&chapter=${currentChapter}` : ""
          }`,
          { throwOnError: false },
        )
        .then((data) => {
          if (data?.events) {
            setPassageEvents(data.events);
            if (data.events.length > 0) {
              setSelectedEvent(data.events[0]);
            }
          }
        })
        .catch(() => {});
    }, 0);
    return () => clearTimeout(timer);
  }, [currentBookId, currentChapter]);

  // Estatísticas e contagens
  const stats = useMemo(() => {
    const total = events.length;
    const kings = events.filter(
      (e) => e.category === "king_judah" || e.category === "king_israel",
    ).length;
    const prophets = events.filter((e) => e.category === "prophet").length;
    const empires = events.filter((e) => e.category === "world_empire").length;
    return { total, kings, prophets, empires };
  }, [events]);

  return {
    eras,
    events,
    passageEvents,
    selectedEra,
    setSelectedEra,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    selectedEvent,
    setSelectedEvent,
    loading,
    error,
    stats,
    refresh: loadEvents,
  };
}
