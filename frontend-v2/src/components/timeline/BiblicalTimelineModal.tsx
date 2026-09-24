"use client";

import React from "react";
import {
  X,
  Search,
  Clock,
  BookOpen,
  Crown,
  Scroll,
  Globe2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Landmark,
} from "lucide-react";
import {
  useBiblicalTimeline,
  TimelineCategory,
  TimelineEventItem,
} from "@/hooks/useBiblicalTimeline";

interface BiblicalTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBookId?: number;
  currentChapter?: number;
  onNavigateToPassage?: (bookName: string, chapter: number) => void;
}

const CATEGORY_MAP: Record<
  TimelineCategory,
  { label: string; icon: React.ReactNode; badge: string }
> = {
  biblical_event: {
    label: "Evento Bíblico",
    icon: <Sparkles className="w-3.5 h-3.5" />,
    badge: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  king_judah: {
    label: "Rei de Judá",
    icon: <Crown className="w-3.5 h-3.5 text-amber-400" />,
    badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  king_israel: {
    label: "Rei de Israel",
    icon: <Crown className="w-3.5 h-3.5 text-orange-400" />,
    badge: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  prophet: {
    label: "Profeta / Apóstolo",
    icon: <Scroll className="w-3.5 h-3.5 text-emerald-400" />,
    badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  world_empire: {
    label: "Império Mundial",
    icon: <Globe2 className="w-3.5 h-3.5 text-purple-400" />,
    badge: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  archaeology: {
    label: "Arqueologia Bíblica",
    icon: <Landmark className="w-3.5 h-3.5 text-teal-400" />,
    badge: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  },
};

export const BiblicalTimelineModal: React.FC<BiblicalTimelineModalProps> = ({
  isOpen,
  onClose,
  currentBookId,
  currentChapter,
  onNavigateToPassage,
}) => {
  const {
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
  } = useBiblicalTimeline(currentBookId, currentChapter);

  if (!isOpen) return null;

  const handleJumpToPassage = (ev: TimelineEventItem) => {
    if (ev.passages.length > 0 && onNavigateToPassage) {
      const p = ev.passages[0];
      onNavigateToPassage(p.bookName, p.chapter);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-7xl h-[92vh] flex flex-col bg-surface border border-border-subtle rounded-2xl shadow-2xl overflow-hidden">
        {/* Header Superior */}
        <div className="flex flex-col border-b border-border-subtle bg-surface-hover/30 px-5 py-3 gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-accent/10 border border-accent/20 text-accent">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    Linha do Tempo Histórica Bíblica (Biblical Timeline)
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-accent/20 text-accent border border-accent/30">
                    Accordance Grade
                  </span>
                </div>
                <p className="text-xs text-foreground/50">
                  Cronologia canônica paralela: Reis de Judá e Israel, Profetas,
                  Impérios Mundiais e Arqueologia
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-surface-hover border border-transparent hover:border-border-subtle text-foreground/40 hover:text-foreground transition-all"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Barra de Filtros e Busca */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {/* Campo de Busca */}
            <div className="relative flex-grow max-w-md">
              <Search className="w-3.5 h-3.5 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar personagem, rei, profeta, artefato..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-surface border border-border-subtle text-xs text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-accent"
              />
            </div>

            {/* Categorias / Trilhas */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                  selectedCategory === "all"
                    ? "bg-accent/20 border-accent/40 text-accent"
                    : "bg-surface border-border-subtle text-foreground/50 hover:text-foreground"
                }`}
              >
                Todos ({stats.total})
              </button>
              <button
                onClick={() => setSelectedCategory("king_judah")}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                  selectedCategory === "king_judah"
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                    : "bg-surface border-border-subtle text-foreground/50 hover:text-amber-400"
                }`}
              >
                <Crown className="w-3 h-3 text-amber-400" />
                Judá
              </button>
              <button
                onClick={() => setSelectedCategory("king_israel")}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                  selectedCategory === "king_israel"
                    ? "bg-orange-500/20 border-orange-500/40 text-orange-400"
                    : "bg-surface border-border-subtle text-foreground/50 hover:text-orange-400"
                }`}
              >
                <Crown className="w-3 h-3 text-orange-400" />
                Israel
              </button>
              <button
                onClick={() => setSelectedCategory("prophet")}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                  selectedCategory === "prophet"
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                    : "bg-surface border-border-subtle text-foreground/50 hover:text-emerald-400"
                }`}
              >
                <Scroll className="w-3 h-3 text-emerald-400" />
                Profetas
              </button>
              <button
                onClick={() => setSelectedCategory("world_empire")}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                  selectedCategory === "world_empire"
                    ? "bg-purple-500/20 border-purple-500/40 text-purple-400"
                    : "bg-surface border-border-subtle text-foreground/50 hover:text-purple-400"
                }`}
              >
                <Globe2 className="w-3 h-3 text-purple-400" />
                Impérios
              </button>
            </div>
          </div>

          {/* Régua de Eras Bíblicas */}
          <div className="flex items-center gap-1 overflow-x-auto py-1 border-t border-border-subtle/50 text-[11px]">
            <button
              onClick={() => setSelectedEra("all")}
              className={`px-2.5 py-1 rounded-md whitespace-nowrap font-medium transition-all ${
                selectedEra === "all"
                  ? "bg-accent text-accent-foreground font-bold"
                  : "text-foreground/50 hover:text-foreground hover:bg-surface-hover"
              }`}
            >
              Todas as Eras
            </button>
            {eras.map((era) => (
              <button
                key={era.key}
                onClick={() => setSelectedEra(era.key)}
                className={`px-2.5 py-1 rounded-md whitespace-nowrap transition-all flex items-center gap-1 ${
                  selectedEra === era.key
                    ? "bg-accent text-accent-foreground font-bold shadow-sm"
                    : "text-foreground/50 hover:text-foreground hover:bg-surface-hover"
                }`}
                title={era.periodDisplay}
              >
                <span>{era.title}</span>
                <span className="opacity-50 text-[9px] font-mono">
                  ({era.periodDisplay})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Seção de Sincronização com Passagem Bíblica Ativa */}
        {passageEvents.length > 0 && (
          <div className="px-5 py-2 bg-accent/5 border-b border-accent/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-accent/20 text-accent font-bold text-[10px] uppercase">
                📖 Contexto da Passagem Atual
              </span>
              <span className="text-foreground/80 font-medium">
                Esta passagem bíblica está historicamente conectada a{" "}
                <strong>{passageEvents.length}</strong> evento(s) na linha do
                tempo:
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {passageEvents.map((pe) => (
                <button
                  key={pe.id}
                  onClick={() => setSelectedEvent(pe)}
                  className="px-2 py-0.5 rounded bg-surface border border-accent/30 text-accent font-semibold text-[11px] hover:bg-accent/10 transition-all flex items-center gap-1"
                >
                  <span>{pe.title}</span>
                  <span className="font-mono text-[9px] opacity-70">
                    ({pe.yearDisplay})
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Corpo: Duas Colunas (Lista Cronológica + Detalhes Exegéticos) */}
        <div className="flex-grow overflow-hidden flex flex-col md:flex-row">
          {/* Coluna Esquerda: Lista de Eventos Cronológicos */}
          <div className="w-full md:w-7/12 border-r border-border-subtle overflow-y-auto p-4 space-y-3">
            {loading && (
              <div className="flex items-center justify-center p-12 text-foreground/40 text-xs gap-2">
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span>Carregando cronologia bíblica...</span>
              </div>
            )}

            {error && !loading && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            {!loading && events.length === 0 && (
              <div className="text-center p-12 text-foreground/30 text-xs">
                Nenhum evento encontrado para este filtro de busca.
              </div>
            )}

            {!loading &&
              events.map((ev) => {
                const catCfg =
                  CATEGORY_MAP[ev.category] || CATEGORY_MAP.biblical_event;
                const isSelected = selectedEvent?.id === ev.id;

                return (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? "bg-accent/10 border-accent shadow-md ring-1 ring-accent/30"
                        : "bg-surface/50 border-border-subtle hover:bg-surface-hover hover:border-accent/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-black bg-surface-hover border border-border-subtle text-foreground/80">
                          {ev.yearDisplay}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${catCfg.badge}`}
                        >
                          {catCfg.icon}
                          <span>{catCfg.label}</span>
                        </span>
                      </div>

                      {ev.spiritualAssessment && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-0.5 ${
                            ev.spiritualAssessment === "faithful"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {ev.spiritualAssessment === "faithful" ? (
                            <>
                              <ShieldCheck className="w-3 h-3" /> Fiel
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-3 h-3" /> Infiel
                            </>
                          )}
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-sm text-foreground mt-2 leading-snug">
                      {ev.title}
                    </h3>
                    <p className="text-xs text-foreground/60 mt-1 line-clamp-2 leading-relaxed">
                      {ev.summary}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-border-subtle/50 text-[10px]">
                      <div className="flex items-center gap-1 overflow-x-auto text-foreground/50">
                        <BookOpen className="w-3 h-3 text-accent flex-shrink-0" />
                        <span>
                          {ev.passages.map((p) => p.display).join(" • ")}
                        </span>
                      </div>

                      {ev.archaeologicalNotes && (
                        <span className="flex items-center gap-1 text-teal-400 font-medium">
                          <Landmark className="w-3 h-3" />
                          Evidência Arqueológica
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Coluna Direita: Painel de Detalhes Exegéticos e Arqueológicos */}
          <div className="w-full md:w-5/12 overflow-y-auto p-5 bg-surface-hover/20 flex flex-col justify-between">
            {selectedEvent ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded-md font-mono text-xs font-black bg-surface border border-border-subtle text-foreground/90">
                      {selectedEvent.yearDisplay}
                    </span>
                    <span className="text-xs text-foreground/40 font-semibold">
                      {selectedEvent.eraTitle}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-foreground leading-snug">
                    {selectedEvent.title}
                  </h2>
                </div>

                <div className="p-3.5 rounded-xl bg-surface border border-border-subtle text-xs leading-relaxed text-foreground/80 space-y-2">
                  <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">
                    Contexto Histórico & Teológico
                  </h4>
                  <p>{selectedEvent.description}</p>
                </div>

                {selectedEvent.contemporaryFigures &&
                  selectedEvent.contemporaryFigures.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-surface border border-border-subtle text-xs space-y-1.5">
                      <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5 text-accent" />
                        Personagens & Soberanos Contemporâneos
                      </h4>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {selectedEvent.contemporaryFigures.map((fig, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-surface-hover border border-border-subtle text-foreground/80 text-[11px]"
                          >
                            {fig}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {selectedEvent.archaeologicalNotes && (
                  <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs space-y-1 text-teal-300">
                    <h4 className="font-bold flex items-center gap-1.5 text-teal-400 uppercase tracking-wider">
                      <Landmark className="w-4 h-4" />
                      Correlação Arqueológica
                    </h4>
                    <p className="leading-relaxed opacity-90">
                      {selectedEvent.archaeologicalNotes}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-foreground/70 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-accent" />
                    Passagens Bíblicas Canônicas
                  </h4>
                  <div className="space-y-1.5">
                    {selectedEvent.passages.map((p, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 rounded-lg bg-surface border border-border-subtle flex items-center justify-between text-xs hover:border-accent/40 transition-all"
                      >
                        <span className="font-semibold text-foreground">
                          {p.display} ({p.bookName})
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-foreground/30" />
                      </div>
                    ))}
                  </div>
                </div>

                {onNavigateToPassage && (
                  <button
                    onClick={() => handleJumpToPassage(selectedEvent)}
                    className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground font-bold text-xs flex items-center justify-center gap-2 hover:bg-accent/90 transition-all shadow-md mt-4"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Ler Passagem no Leitor Bíblico</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-foreground/30 p-8">
                <Clock className="w-12 h-12 stroke-[1.2] mb-3 opacity-40" />
                <p className="font-semibold text-xs">
                  Selecione um evento da linha do tempo para ver o contexto
                  exegético
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé Informativo */}
        <div className="px-5 py-2 border-t border-border-subtle bg-surface-hover/30 flex items-center justify-between text-[11px] text-foreground/50">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground/70">
              Trilhas Paralelas:
            </span>
            <span className="text-foreground/40 hidden sm:inline">
              Reis de Judá • Reis de Israel • Profetas • Assíria • Babilônia •
              Pérsia • Grécia • Roma
            </span>
          </div>

          <div className="font-mono text-[10px] text-foreground/40">
            TheoSphere Biblical Timeline Engine
          </div>
        </div>
      </div>
    </div>
  );
};
