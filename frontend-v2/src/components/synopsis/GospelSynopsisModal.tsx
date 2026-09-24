"use client";

import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  Search,
  BookOpen,
  ArrowRightLeft,
  Sparkles,
  Layers,
  ChevronDown,
  Info,
} from "lucide-react";
import {
  useGospelSynopsis,
  GospelKey,
  GospelColumnData,
} from "@/hooks/useGospelSynopsis";

interface GospelSynopsisModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBookId?: number;
  currentChapter?: number;
}

const GOSPEL_CONFIG: Record<
  GospelKey,
  {
    name: string;
    shortName: string;
    border: string;
    bgHeader: string;
    badgeBg: string;
    badgeText: string;
    accent: string;
  }
> = {
  matthew: {
    name: "Mateus",
    shortName: "Mt",
    border: "border-blue-500/30",
    bgHeader: "bg-blue-950/40",
    badgeBg: "bg-blue-500/20",
    badgeText: "text-blue-400",
    accent: "text-blue-400",
  },
  mark: {
    name: "Marcos",
    shortName: "Mc",
    border: "border-emerald-500/30",
    bgHeader: "bg-emerald-950/40",
    badgeBg: "bg-emerald-500/20",
    badgeText: "text-emerald-400",
    accent: "text-emerald-400",
  },
  luke: {
    name: "Lucas",
    shortName: "Lc",
    border: "border-amber-500/30",
    bgHeader: "bg-amber-950/40",
    badgeBg: "bg-amber-500/20",
    badgeText: "text-amber-400",
    accent: "text-amber-400",
  },
  john: {
    name: "João",
    shortName: "Jo",
    border: "border-purple-500/30",
    bgHeader: "bg-purple-950/40",
    badgeBg: "bg-purple-500/20",
    badgeText: "text-purple-400",
    accent: "text-purple-400",
  },
};

const SECTIONS_LIST = [
  { key: "all", title: "Todas as Seções" },
  { key: "prologue_infancy", title: "Infância & Prólogo" },
  { key: "baptism_temptation", title: "Batismo & Tentação" },
  { key: "early_ministry", title: "Início & Discípulos" },
  { key: "galilean_ministry", title: "Ministério na Galileia" },
  { key: "parables", title: "Parábolas do Reino" },
  { key: "miracles", title: "Grandes Milagres" },
  { key: "journey_to_jerusalem", title: "A Caminho de Jerusalém" },
  { key: "jerusalem_ministry", title: "Ministério em Jerusalém" },
  { key: "passion_death", title: "Paixão e Morte" },
  { key: "resurrection_ascension", title: "Ressurreição" },
];

export const GospelSynopsisModal: React.FC<GospelSynopsisModalProps> = ({
  isOpen,
  onClose,
  currentBookId,
  currentChapter,
}) => {
  const {
    filteredPericopes,
    selectedPericopeId,
    setSelectedPericopeId,
    synopsisData,
    translation,
    setTranslation,
    baseGospel,
    setBaseGospel,
    highlightLexicalAgreement,
    setHighlightLexicalAgreement,
    searchQuery,
    setSearchQuery,
    sectionFilter,
    setSectionFilter,
    loading,
    error,
    copyAsMarkdown,
  } = useGospelSynopsis(currentBookId, currentChapter);

  const [copied, setCopied] = useState(false);
  const [showPericopeDropdown, setShowPericopeDropdown] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    copyAsMarkdown();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentPericope = synopsisData?.pericope;
  const gospels = synopsisData?.gospels || {};
  const agreementMatrix = synopsisData?.agreementMatrix || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-7xl h-[92vh] flex flex-col bg-surface border border-border-subtle rounded-2xl shadow-2xl overflow-hidden">
        {/* Header Superior */}
        <div className="flex flex-col border-b border-border-subtle bg-surface-hover/30 px-5 py-3 gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-accent/10 border border-accent/20 text-accent">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    Sinopse dos 4 Evangelhos (Gospel Parallels)
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-accent/20 text-accent border border-accent/30">
                    Accordance Grade
                  </span>
                </div>
                <p className="text-xs text-foreground/50">
                  Alinhamento paralelo, diff léxico LCS e matriz de concordância
                  dos Sinóticos e João
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

          {/* Barra de Controles e Seletores */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {/* Seletor de Perícopa */}
            <div className="relative flex-grow max-w-xl">
              <button
                onClick={() => setShowPericopeDropdown(!showPericopeDropdown)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-surface border border-border-subtle hover:border-accent/40 text-xs font-semibold text-foreground transition-all shadow-sm"
              >
                <div className="flex items-center gap-2 truncate">
                  <Layers className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                  <span className="truncate">
                    {currentPericope
                      ? `${currentPericope.order}. ${currentPericope.title}`
                      : "Selecionar Perícopa..."}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-foreground/40 transition-transform ${
                    showPericopeDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown de Busca de Perícopas */}
              {showPericopeDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 z-50 max-h-80 flex flex-col bg-surface border border-border-subtle rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
                  <div className="p-2 border-b border-border-subtle flex items-center gap-2 bg-surface-hover/50">
                    <Search className="w-3.5 h-3.5 text-foreground/40" />
                    <input
                      type="text"
                      placeholder="Buscar perícopa ou referência..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent text-xs text-foreground focus:outline-none placeholder:text-foreground/30"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-1 p-1.5 border-b border-border-subtle overflow-x-auto bg-surface-hover/20">
                    {SECTIONS_LIST.map((sec) => (
                      <button
                        key={sec.key}
                        onClick={() => setSectionFilter(sec.key)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap transition-all ${
                          sectionFilter === sec.key
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground/50 hover:text-foreground hover:bg-surface-hover"
                        }`}
                      >
                        {sec.title}
                      </button>
                    ))}
                  </div>

                  <div className="overflow-y-auto flex-grow divide-y divide-border-subtle/30">
                    {filteredPericopes.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedPericopeId(p.id);
                          setShowPericopeDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-surface-hover/80 transition-all flex items-center justify-between gap-2 ${
                          selectedPericopeId === p.id
                            ? "bg-accent/10 text-accent font-bold"
                            : "text-foreground/80"
                        }`}
                      >
                        <div className="truncate">
                          <span className="text-[10px] opacity-40 font-mono mr-1.5">
                            #{p.order}
                          </span>
                          <span>{p.title}</span>
                          <div className="text-[10px] text-foreground/40 truncate">
                            {p.description}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {p.passages.matthew && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400">
                              Mt
                            </span>
                          )}
                          {p.passages.mark && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400">
                              Mc
                            </span>
                          )}
                          {p.passages.luke && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400">
                              Lc
                            </span>
                          )}
                          {p.passages.john && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-400">
                              Jo
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Controles de Configuração */}
            <div className="flex items-center gap-2">
              {/* Seletor de Tradução */}
              <div className="flex items-center gap-1 bg-surface border border-border-subtle rounded-xl px-2 py-1 text-xs">
                <span className="text-[10px] font-bold uppercase text-foreground/40">
                  Versão:
                </span>
                <select
                  value={translation}
                  onChange={(e) => setTranslation(e.target.value)}
                  className="bg-transparent text-xs font-bold text-accent focus:outline-none cursor-pointer"
                >
                  <option value="BLIVRE" className="bg-surface text-foreground">
                    BLIVRE (PT)
                  </option>
                  <option value="NVA" className="bg-surface text-foreground">
                    NVA (PT)
                  </option>
                  <option value="KJV" className="bg-surface text-foreground">
                    KJV (EN)
                  </option>
                  <option value="WEB" className="bg-surface text-foreground">
                    WEB (EN)
                  </option>
                  <option value="TR" className="bg-surface text-foreground">
                    TR (Grego NT)
                  </option>
                </select>
              </div>

              {/* Seletor do Evangelho Base para Diff */}
              <div className="flex items-center gap-1 bg-surface border border-border-subtle rounded-xl px-2 py-1 text-xs">
                <span className="text-[10px] font-bold uppercase text-foreground/40">
                  Base Diff:
                </span>
                <select
                  value={baseGospel}
                  onChange={(e) => setBaseGospel(e.target.value as GospelKey)}
                  className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                >
                  <option value="mark" className="bg-surface text-foreground">
                    Marcos (Prioridade)
                  </option>
                  <option
                    value="matthew"
                    className="bg-surface text-foreground"
                  >
                    Mateus
                  </option>
                  <option value="luke" className="bg-surface text-foreground">
                    Lucas
                  </option>
                  <option value="john" className="bg-surface text-foreground">
                    João
                  </option>
                </select>
              </div>

              {/* Toggle de Realce Léxico */}
              <button
                onClick={() =>
                  setHighlightLexicalAgreement(!highlightLexicalAgreement)
                }
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                  highlightLexicalAgreement
                    ? "bg-accent/20 border-accent/40 text-accent shadow-sm"
                    : "bg-surface border-border-subtle text-foreground/40 hover:text-foreground"
                }`}
                title="Realçar palavras comuns com o evangelho base (LCS Diff)"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Realce Léxico</span>
              </button>

              {/* Botão Copiar Markdown */}
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-xl bg-surface border border-border-subtle hover:border-accent/40 text-xs font-bold text-foreground/80 hover:text-accent flex items-center gap-1.5 transition-all shadow-sm"
                title="Copiar Sinopse em Tabela Markdown"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 hidden sm:inline">
                      Copiado!
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Copiar Tabela</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Matriz de Concordância Léxica (Agreement Matrix) */}
          {agreementMatrix.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto text-[11px] pt-1">
              <span className="text-foreground/40 flex items-center gap-1 flex-shrink-0 font-medium">
                <ArrowRightLeft className="w-3 h-3 text-accent" />
                Concordância Léxica:
              </span>
              <div className="flex items-center gap-1.5 flex-nowrap">
                {agreementMatrix.map((pair, idx) => {
                  const isHigh = pair.similarity >= 60;
                  const isMed = pair.similarity >= 40 && pair.similarity < 60;
                  return (
                    <span
                      key={idx}
                      className={`px-2 py-0.5 rounded-md border font-mono font-bold flex items-center gap-1 whitespace-nowrap ${
                        isHigh
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                          : isMed
                            ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                            : "bg-surface-hover border-border-subtle text-foreground/60"
                      }`}
                    >
                      <span>
                        {pair.labelA} ↔ {pair.labelB}:
                      </span>
                      <span>{pair.similarity}%</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Corpo: Grade de 4 Colunas Sinóticas */}
        <div className="flex-grow overflow-hidden flex flex-col p-4 bg-background/50">
          {loading && (
            <div className="flex-grow flex items-center justify-center text-foreground/40 text-sm gap-2">
              <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span>Sincronizando perícopas e computando diff LCS...</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex-grow flex items-center justify-center p-6 text-center">
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs max-w-md">
                <Info className="w-5 h-5 mx-auto mb-2" />
                <p className="font-bold">Erro ao carregar sinopse</p>
                <p className="opacity-80 mt-1">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && currentPericope && (
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 overflow-y-auto">
              {(["matthew", "mark", "luke", "john"] as GospelKey[]).map(
                (key) => {
                  const cfg = GOSPEL_CONFIG[key];
                  const colData = gospels[key] as GospelColumnData | undefined;
                  const passageRef = currentPericope.passages[key];
                  const isBase = baseGospel === key;

                  return (
                    <div
                      key={key}
                      className={`flex flex-col rounded-xl border bg-surface/60 overflow-hidden ${
                        isBase
                          ? `${cfg.border} ring-1 ring-accent/30 shadow-lg`
                          : "border-border-subtle"
                      }`}
                    >
                      {/* Cabeçalho do Evangelista */}
                      <div
                        className={`px-3 py-2.5 border-b border-border-subtle flex items-center justify-between ${cfg.bgHeader}`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${cfg.badgeBg} ${cfg.badgeText}`}
                          >
                            {cfg.shortName}
                          </span>
                          <div>
                            <span className="font-bold text-xs text-foreground block leading-tight">
                              {cfg.name}
                            </span>
                            <span className="text-[10px] text-foreground/50 font-mono">
                              {passageRef?.display || "Sem relato"}
                            </span>
                          </div>
                        </div>

                        {isBase && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-accent/20 text-accent border border-accent/30">
                            Base
                          </span>
                        )}
                      </div>

                      {/* Conteúdo Textual da Perícopa */}
                      <div className="flex-grow overflow-y-auto p-3 text-xs leading-relaxed space-y-2 select-text font-serif">
                        {colData && colData.verses.length > 0 ? (
                          highlightLexicalAgreement && colData.diffWithBase ? (
                            // Renderização com Realce Léxico Diferencial (LCS Tokens)
                            <div className="space-y-1.5">
                              <p className="text-[13px] leading-relaxed">
                                {colData.diffWithBase.tokens.map(
                                  (token, tIdx) => {
                                    if (token.type === "equal") {
                                      return (
                                        <span
                                          key={tIdx}
                                          className="bg-emerald-500/20 text-emerald-300 font-semibold px-0.5 rounded mx-0.5"
                                          title="Vocabulário idêntico ao evangelho base"
                                        >
                                          {token.text}{" "}
                                        </span>
                                      );
                                    }
                                    return (
                                      <span
                                        key={tIdx}
                                        className="text-foreground/80"
                                      >
                                        {token.text}{" "}
                                      </span>
                                    );
                                  },
                                )}
                              </p>
                              <div className="pt-2 border-t border-border-subtle/50 text-[10px] font-sans text-foreground/40 flex justify-between">
                                <span>{colData.wordCount} palavras</span>
                                <span>
                                  {colData.diffWithBase.similarity}% de acordo
                                </span>
                              </div>
                            </div>
                          ) : (
                            // Renderização Versículo a Versículo Padrão
                            <div className="space-y-1.5">
                              {colData.verses.map((v) => (
                                <p
                                  key={v.verse}
                                  className="text-[13px] leading-relaxed"
                                >
                                  <sup className="font-sans font-bold text-accent mr-1 text-[10px]">
                                    {v.verse}
                                  </sup>
                                  <span className="text-foreground/90">
                                    {v.text}
                                  </span>
                                </p>
                              ))}
                              <div className="pt-2 border-t border-border-subtle/50 text-[10px] font-sans text-foreground/40">
                                <span>{colData.wordCount} palavras</span>
                              </div>
                            </div>
                          )
                        ) : (
                          // Estado Vazio se o Evangelista não narrou a perícopa
                          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-foreground/30">
                            <BookOpen className="w-8 h-8 stroke-[1.2] mb-2 opacity-40" />
                            <p className="font-sans text-[11px] font-medium">
                              Episódio não registrado em {cfg.name}
                            </p>
                            <p className="font-sans text-[10px] opacity-60 mt-0.5">
                              Exclusivo das outras tradições
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </div>

        {/* Rodapé Informativo */}
        <div className="px-5 py-2.5 border-t border-border-subtle bg-surface-hover/30 flex items-center justify-between text-[11px] text-foreground/50">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground/70">
              Legenda do Realce:
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
              Verde: Termo comum / Acordo verbal estrito
            </span>
            <span className="text-foreground/40 hidden sm:inline">
              Baseado no algoritmo LCS (Longest Common Subsequence)
            </span>
          </div>

          <div className="font-mono text-[10px] text-foreground/40">
            TheoSphere Exegetical Suite
          </div>
        </div>
      </div>
    </div>
  );
};
