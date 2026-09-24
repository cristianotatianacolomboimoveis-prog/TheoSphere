"use client";

import React from "react";
import {
  X,
  Plus,
  Trash2,
  Search,
  Sparkles,
  ArrowRight,
  ExternalLink,
  BookOpen,
  HelpCircle,
  Clock,
  Layers,
} from "lucide-react";
import {
  useConstructSearch,
  ConstructBlock,
  ConstructDistance,
} from "@/hooks/useConstructSearch";

interface ConstructSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToVerse?: (
    bookName: string,
    chapter: number,
    verse: number,
  ) => void;
}

const POS_OPTIONS = [
  { value: "N", label: "Substantivo" },
  { value: "V", label: "Verbo" },
  { value: "T", label: "Artigo Definido" },
  { value: "A", label: "Adjetivo" },
  { value: "C", label: "Conjunção" },
  { value: "R", label: "Preposição" },
  { value: "P", label: "Pronome" },
  { value: "D", label: "Advérbio" },
];

const CASE_OPTIONS = [
  { value: "", label: "Qualquer Caso" },
  { value: "N", label: "Nominativo" },
  { value: "G", label: "Genitivo" },
  { value: "D", label: "Dativo" },
  { value: "A", label: "Acusativo" },
  { value: "V", label: "Vocativo" },
];

const NUMBER_OPTIONS = [
  { value: "", label: "Qualquer Número" },
  { value: "S", label: "Singular" },
  { value: "P", label: "Plural" },
];

const GENDER_OPTIONS = [
  { value: "", label: "Qualquer Gênero" },
  { value: "M", label: "Masculino" },
  { value: "F", label: "Feminino" },
  { value: "N", label: "Neutro" },
];

const TENSE_OPTIONS = [
  { value: "", label: "Qualquer Tempo" },
  { value: "P", label: "Presente" },
  { value: "A", label: "Aoristo" },
  { value: "R", label: "Perfeito" },
  { value: "I", label: "Imperfeito" },
  { value: "F", label: "Futuro" },
];

const VOICE_OPTIONS = [
  { value: "", label: "Qualquer Voz" },
  { value: "A", label: "Ativa" },
  { value: "M", label: "Média" },
  { value: "P", label: "Passiva" },
  { value: "D", label: "Depoente" },
];

const MOOD_OPTIONS = [
  { value: "", label: "Qualquer Modo" },
  { value: "I", label: "Indicativo" },
  { value: "S", label: "Subjuntivo" },
  { value: "M", label: "Imperativo" },
  { value: "N", label: "Infinitivo" },
  { value: "P", label: "Particípio" },
];

export const ConstructSearchModal: React.FC<ConstructSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigateToVerse,
}) => {
  const {
    presets,
    language,
    setLanguage,
    distance,
    setDistance,
    blocks,
    addBlock,
    removeBlock,
    updateBlock,
    applyPreset,
    executeSearch,
    results,
    loading,
    error,
  } = useConstructSearch();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-7xl h-[94vh] flex flex-col bg-surface border border-border-subtle rounded-2xl shadow-2xl overflow-hidden">
        {/* Header Superior */}
        <div className="flex flex-col border-b border-border-subtle bg-surface-hover/30 px-5 py-3 gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-accent/10 border border-accent/20 text-accent">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    Construtor Visual de Sintaxe (Construct Search)
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-accent/20 text-accent border border-accent/30">
                    Accordance Grade
                  </span>
                </div>
                <p className="text-xs text-foreground/50">
                  Busca de estruturas gramaticais e sequências morfológicas nos
                  textos originais
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

          {/* Presets Exegéticos Prontos */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs">
            <span className="text-[11px] font-bold text-foreground/50 flex items-center gap-1 flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              Presets Exegéticos:
            </span>
            <div className="flex items-center gap-1.5 flex-nowrap">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className="px-2.5 py-1 rounded-lg bg-surface border border-border-subtle hover:border-accent/50 text-[11px] font-semibold text-foreground/80 hover:text-accent transition-all whitespace-nowrap shadow-sm"
                  title={`${preset.description} — ${preset.significance}`}
                >
                  <span>{preset.title}</span>
                  <span className="ml-1 text-[9px] font-mono text-accent opacity-75">
                    ({preset.sampleRef})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Barra de Configurações da Consulta */}
        <div className="px-5 py-2.5 bg-surface-hover/20 border-b border-border-subtle flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            {/* Seletor de Idioma */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase text-foreground/50">
                Corpus:
              </span>
              <div className="flex rounded-lg border border-border-subtle bg-surface p-0.5">
                <button
                  onClick={() => setLanguage("greek")}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                    language === "greek"
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-foreground/50 hover:text-foreground"
                  }`}
                >
                  Grego (NT)
                </button>
                <button
                  onClick={() => setLanguage("hebrew")}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                    language === "hebrew"
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-foreground/50 hover:text-foreground"
                  }`}
                >
                  Hebraico (AT)
                </button>
              </div>
            </div>

            {/* Distância entre os Blocos */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase text-foreground/50">
                Distância:
              </span>
              <select
                value={distance}
                onChange={(e) =>
                  setDistance(e.target.value as ConstructDistance)
                }
                className="bg-surface border border-border-subtle rounded-lg px-2.5 py-1 text-xs font-semibold text-foreground focus:outline-none focus:border-accent cursor-pointer"
              >
                <option value="adjacent">Imediatamente Adjacente (p+1)</option>
                <option value="within_3">Distância de até 3 palavras</option>
                <option value="same_verse">
                  Mesmo Versículo (qualquer distância)
                </option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={addBlock}
              className="px-3 py-1.5 rounded-xl bg-surface border border-border-subtle hover:border-accent/50 text-xs font-bold text-foreground/80 hover:text-accent flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-accent" />
              <span>Adicionar Bloco</span>
            </button>

            <button
              onClick={executeSearch}
              disabled={loading}
              className="px-4 py-1.5 rounded-xl bg-accent text-accent-foreground text-xs font-bold flex items-center gap-1.5 hover:bg-accent/90 transition-all shadow-md disabled:opacity-50"
            >
              <Search className="w-3.5 h-3.5" />
              <span>
                {loading ? "Buscando..." : "Executar Busca Sintática"}
              </span>
            </button>
          </div>
        </div>

        {/* Pipeline Visual de Blocos */}
        <div className="p-4 bg-background/40 border-b border-border-subtle overflow-x-auto">
          <div className="flex items-center gap-3 min-w-max pb-1">
            {blocks.map((block, idx) => {
              const isVerb = block.partOfSpeech === "V";
              const isNominal =
                block.partOfSpeech === "N" ||
                block.partOfSpeech === "A" ||
                block.partOfSpeech === "T" ||
                block.partOfSpeech === "P";

              return (
                <React.Fragment key={block.id}>
                  {idx > 0 && (
                    <div className="flex flex-col items-center justify-center px-1 text-foreground/30">
                      <ArrowRight className="w-4 h-4 text-accent" />
                      <span className="text-[9px] font-mono mt-0.5 opacity-60">
                        {distance === "adjacent"
                          ? "+1"
                          : distance === "within_3"
                            ? "≤3"
                            : "em v."}
                      </span>
                    </div>
                  )}

                  <div className="w-64 flex flex-col rounded-xl border border-border-subtle bg-surface p-3 shadow-md space-y-2.5 relative">
                    <div className="flex items-center justify-between border-b border-border-subtle/50 pb-1.5">
                      <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-md bg-accent/20 text-accent flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <span>{block.label || `Bloco ${idx + 1}`}</span>
                      </span>

                      {blocks.length > 1 && (
                        <button
                          onClick={() => removeBlock(block.id)}
                          className="p-1 rounded text-foreground/30 hover:text-rose-400 hover:bg-surface-hover transition-all"
                          title="Remover Bloco"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Classe Gramatical */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-foreground/40 block">
                        Classe Gramatical:
                      </label>
                      <select
                        value={block.partOfSpeech || ""}
                        onChange={(e) =>
                          updateBlock(block.id, {
                            partOfSpeech: e.target.value,
                          })
                        }
                        className="w-full bg-surface-hover border border-border-subtle rounded-lg px-2 py-1 text-xs font-semibold text-foreground focus:outline-none focus:border-accent"
                      >
                        {POS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Campos Nominais: Caso, Gênero, Número */}
                    {isNominal && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-foreground/40 block">
                            Caso:
                          </label>
                          <select
                            value={block.grammaticalCase || ""}
                            onChange={(e) =>
                              updateBlock(block.id, {
                                grammaticalCase: e.target.value,
                              })
                            }
                            className="w-full bg-surface-hover border border-border-subtle rounded-lg px-1.5 py-1 text-xs text-foreground focus:outline-none"
                          >
                            {CASE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-foreground/40 block">
                            Número:
                          </label>
                          <select
                            value={block.number || ""}
                            onChange={(e) =>
                              updateBlock(block.id, { number: e.target.value })
                            }
                            className="w-full bg-surface-hover border border-border-subtle rounded-lg px-1.5 py-1 text-xs text-foreground focus:outline-none"
                          >
                            {NUMBER_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Campos Verbais: Modo, Tempo, Voz */}
                    {isVerb && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-foreground/40 block">
                            Modo:
                          </label>
                          <select
                            value={block.mood || ""}
                            onChange={(e) =>
                              updateBlock(block.id, { mood: e.target.value })
                            }
                            className="w-full bg-surface-hover border border-border-subtle rounded-lg px-1.5 py-1 text-xs text-foreground focus:outline-none"
                          >
                            {MOOD_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-foreground/40 block">
                            Tempo:
                          </label>
                          <select
                            value={block.tense || ""}
                            onChange={(e) =>
                              updateBlock(block.id, { tense: e.target.value })
                            }
                            className="w-full bg-surface-hover border border-border-subtle rounded-lg px-1.5 py-1 text-xs text-foreground focus:outline-none"
                          >
                            {TENSE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Campo de Lema / Strong ID Opcional */}
                    <div className="space-y-1 pt-1 border-t border-border-subtle/50">
                      <div className="flex items-center justify-between text-[10px] text-foreground/40">
                        <span>Lema ou Strong (Opcional):</span>
                      </div>
                      <input
                        type="text"
                        placeholder="Ex: G2443 ou θεός"
                        value={block.strongId || block.lemma || ""}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          if (
                            val.toUpperCase().startsWith("G") ||
                            val.toUpperCase().startsWith("H")
                          ) {
                            updateBlock(block.id, {
                              strongId: val,
                              lemma: undefined,
                            });
                          } else {
                            updateBlock(block.id, {
                              lemma: val,
                              strongId: undefined,
                            });
                          }
                        }}
                        className="w-full bg-surface-hover border border-border-subtle rounded-lg px-2 py-1 text-xs text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Área de Resultados da Busca */}
        <div className="flex-grow overflow-y-auto p-5 space-y-3 bg-surface-hover/10">
          {loading && (
            <div className="flex flex-col items-center justify-center p-12 text-foreground/40 text-xs gap-3">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span>
                Cruzando corpus interlinear e analisando sequências
                sintáticas...
              </span>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
              {error}
            </div>
          )}

          {!loading && !results && (
            <div className="h-full flex flex-col items-center justify-center text-center text-foreground/30 p-12">
              <Layers className="w-12 h-12 stroke-[1.2] mb-3 opacity-40" />
              <h3 className="font-bold text-sm text-foreground/60">
                Construtor de Sintaxe Pronto
              </h3>
              <p className="text-xs text-foreground/40 max-w-md mt-1">
                Selecione um preset exegético acima ou monte sua própria
                sequência de blocos morfológicos e clique em "Executar Busca
                Sintática".
              </p>
            </div>
          )}

          {!loading && results && (
            <>
              {/* Barra de Métricas */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border-subtle text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-accent">
                    {results.totalMatches} versículo(s) encontrados
                  </span>
                  <span className="text-foreground/30">•</span>
                  <span className="text-foreground/50">
                    Tempo: {results.executionTimeMs}ms
                  </span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
                  {Object.entries(results.distributionByBook).map(
                    ([book, count]) => (
                      <span
                        key={book}
                        className="px-2 py-0.5 rounded-md bg-surface-hover border border-border-subtle text-foreground/70 font-mono"
                      >
                        {book}: {count}
                      </span>
                    ),
                  )}
                </div>
              </div>

              {/* Lista de Versículos Encontrados */}
              <div className="space-y-3">
                {results.verses.map((v, vIdx) => (
                  <div
                    key={vIdx}
                    className="p-4 rounded-xl bg-surface border border-border-subtle space-y-2 hover:border-accent/40 transition-all shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-accent flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        {v.displayRef}
                      </span>

                      {onNavigateToVerse && (
                        <button
                          onClick={() => {
                            onNavigateToVerse(v.bookName, v.chapter, v.verse);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-surface-hover border border-border-subtle hover:border-accent/50 text-[11px] font-semibold text-foreground/80 hover:text-accent flex items-center gap-1 transition-all"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Abrir no Leitor</span>
                        </button>
                      )}
                    </div>

                    {/* Texto Bíblico em Português */}
                    <p className="text-xs text-foreground/90 font-serif leading-relaxed">
                      {v.textPt}
                    </p>

                    {/* Palavras Originais Casadas no Interlinear */}
                    <div className="pt-2 border-t border-border-subtle/50">
                      <span className="text-[10px] font-bold uppercase text-foreground/40 block mb-1.5">
                        Construção Sintática Casada no Original:
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {v.matchedWords.map((mw, mwIdx) => (
                          <div
                            key={mwIdx}
                            className="px-2.5 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-xs flex flex-col"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-serif font-bold text-foreground text-sm">
                                {mw.word}
                              </span>
                              <span className="text-[10px] text-accent font-mono">
                                ({mw.translit})
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-foreground/50 mt-0.5 font-mono">
                              <span>{mw.morph || "—"}</span>
                              <span>•</span>
                              <span>{mw.strongId}</span>
                              <span>•</span>
                              <span className="font-sans italic">
                                {mw.gloss}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Rodapé Informativo */}
        <div className="px-5 py-2.5 border-t border-border-subtle bg-surface-hover/30 flex items-center justify-between text-[11px] text-foreground/50">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground/70">
              Grammar Pipeline:
            </span>
            <span className="text-foreground/40 hidden sm:inline">
              Morfologia STEP Bible TAGNT/TAHOT • Padrão Robinson-Pierpont
            </span>
          </div>

          <div className="font-mono text-[10px] text-foreground/40">
            TheoSphere Syntax Engine
          </div>
        </div>
      </div>
    </div>
  );
};
