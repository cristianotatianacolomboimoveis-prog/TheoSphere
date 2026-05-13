"use client";

import React, { useState, useMemo } from "react";
import {
  X, Search, BookOpen, Languages, Hash, BarChart3, ChevronRight, BookMarked, Sparkles, Loader2
} from "lucide-react";
import * as Framer from "framer-motion";
const { motion, AnimatePresence } = Framer;
import { STRONGS_GREEK, searchStrongs, type StrongsEntry } from "@/data/strongsGreek";
import { STRONGS_HEBREW, searchStrongsHebrew } from "@/data/strongsHebrew";
import { TranslationRing } from "./word-study/TranslationRing";
import { ExegeticalConcordance } from "./word-study/ExegeticalConcordance";
import { api } from "@/lib/api";

/* ─── Component ──────────────────────────────────────────── */

export default function WordStudy({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<StrongsEntry | null>(null);
  const [language, setLanguage] = useState<"greek" | "hebrew">("greek");
  const [lexicalData, setLexicalData] = useState<any>(null);
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [loadingLexical, setLoadingLexical] = useState(false);
  const [loadingOccurrences, setLoadingOccurrences] = useState(false);

  /* ── API Integration ──────────────────────────────────── */
  const fetchLexicalAnalysis = async (strongId: string) => {
    setLoadingLexical(true);
    setLoadingOccurrences(true);
    try {
      // Endpoints moved to /linguistics/* and lib/api already prefixes /api/v1.
      // Old paths /api/v1/bible/lexical and /api/v1/bible/search-root would
      // 404: bible controller never had those routes.
      const jsonLex = await api.get<any>(`linguistics/lexical/${strongId}`);
      if (jsonLex.success) setLexicalData(jsonLex.data);

      const jsonOcc = await api.get<any>(`linguistics/search-root/${strongId}`);
      if (jsonOcc.success) setOccurrences(jsonOcc.data);
    } catch (e) {
      console.error("Erro ao buscar dados linguísticos:", e);
    } finally {
      setLoadingLexical(false);
      setLoadingOccurrences(false);
    }
  };

  /* ── Search ───────────────────────────────────────────── */
  const results = useMemo(() => {
    if (!query.trim()) return [];
    if (language === "greek") return searchStrongs(query);
    return searchStrongsHebrew(query);
  }, [query, language]);

  const allEntries = useMemo(() => {
    return language === "greek" ? Object.values(STRONGS_GREEK) : Object.values(STRONGS_HEBREW);
  }, [language]);

  /* ── Ring chart data ──────────────────────────────────── */
  const ringData = useMemo(() => {
    if (!selectedEntry) return [];
    const total = selectedEntry.kjvTranslations.reduce((sum, t) => sum + t.count, 0);
    const colors = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899"];
    let cumulativePercent = 0;
    return selectedEntry.kjvTranslations.map((t, i) => {
      const percent = (t.count / total) * 100;
      const start = cumulativePercent;
      cumulativePercent += percent;
      return { ...t, percent, start, color: colors[i % colors.length] };
    });
  }, [selectedEntry]);

  /* ── Render ───────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-border-subtle flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Languages className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Estudo de Palavras</h2>
              <p className="text-[10px] text-white/25 font-medium tracking-widest uppercase">Léxico Grego/Hebraico</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-all text-white/30 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Language toggle */}
        <div className="flex gap-2 mb-3">
          {(["greek", "hebrew"] as const).map(lang => (
            <button
              key={lang}
              onClick={() => { setLanguage(lang); setQuery(""); setSelectedEntry(null); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                language === lang
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                  : "bg-white/5 text-white/40 hover:bg-white/10"
              }`}
            >
              {lang === "greek" ? "Grego (NT)" : "Hebraico (AT)"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedEntry(null); }}
            placeholder={language === "greek" ? "Buscar: ágape, G26, amor..." : "Buscar: chesed, H2617, misericórdia..."}
            className="input-glass w-full pl-10 text-sm"
          />
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-white/25" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow overflow-y-auto custom-scrollbar px-5 py-4">
        <AnimatePresence mode="wait">
          {selectedEntry ? (
            /* ── Entry Detail ──────────────────────────── */
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <button
                onClick={() => setSelectedEntry(null)}
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 mb-4 transition-colors"
              >
                ← Voltar
              </button>

              {/* Word header */}
              <div className="text-center mb-6">
                <p className="text-4xl font-serif mb-2 text-white">{selectedEntry.lemma}</p>
                <p className="text-lg text-blue-400 font-mono font-bold">{selectedEntry.transliteration}</p>
                <p className="text-xs text-white/30 mt-1">/{selectedEntry.pronunciation}/</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="tag tag-blue">{selectedEntry.number}</span>
                  <span className="tag tag-purple">{selectedEntry.partOfSpeech}</span>
                  <span className="tag tag-amber">{selectedEntry.occurrences}x</span>
                </div>
              </div>

              {/* Definitions */}
              <div className="glass-amber rounded-xl p-4 mb-4">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-500 mb-2">
                  Definição
                </h4>
                <p className="text-sm text-white/80 leading-relaxed font-serif mb-2">{selectedEntry.definition}</p>
                <p className="text-sm text-amber-400/80 leading-relaxed font-serif">{selectedEntry.definitionPt}</p>
              </div>

              {/* PhD: Lexical Analysis from Database */}
              <div className="glass-emerald rounded-xl border border-emerald-500/20 p-4 mb-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                   <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-3 flex items-center gap-2">
                   <BookMarked className="w-3.5 h-3.5" /> Análise Lexical PhD
                </h4>
                {loadingLexical ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                    <span className="text-[10px] text-emerald-400/60 uppercase font-black tracking-widest">Consultando BDAG/HALOT...</span>
                  </div>
                ) : lexicalData ? (
                  <div className="space-y-3">
                    <p className="text-xs text-white/80 leading-relaxed font-serif italic">
                      {lexicalData.academic_discussion || "Análise profunda disponível via RAG."}
                    </p>
                    <div className="flex gap-2">
                       <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">Fonte: {lexicalData.source || "TheoAI"}</span>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => fetchLexicalAnalysis(selectedEntry.number)}
                    className="w-full py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                  >
                    Ativar Análise Crítica
                  </button>
                )}
              </div>

              <TranslationRing occurrences={selectedEntry.occurrences} data={ringData} />

              <ExegeticalConcordance 
                loading={loadingOccurrences} 
                occurrences={occurrences} 
                lexicalData={lexicalData} 
              />

              {/* Related Words */}
              <div className="glass rounded-xl border border-border-subtle p-4">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-purple-400 mb-3">
                  Palavras Relacionadas
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedEntry.relatedWords.map((w, i) => (
                    <span key={i} className="tag tag-purple text-[10px]">{w}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            /* ── Search Results / Browse ───────────────── */
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {query.trim() ? (
                /* Search results */
                <div className="space-y-1.5">
                  {results.length > 0 ? results.map((entry) => (
                    <button
                      key={entry.number}
                      onClick={() => setSelectedEntry(entry)}
                      className="group w-full flex items-center bg-surface border border-border-subtle rounded-[2rem] p-4 hover:bg-surface-hover hover:border-accent/20 transition-all duration-300 shadow-lg"
                    >
                      <div className="w-16 flex-shrink-0 flex justify-center">
                        <span className="text-2xl font-serif text-muted group-hover:text-foreground transition-colors">
                          {entry.lemma}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 pl-4 border-l border-border-subtle overflow-hidden">
                        <div className="text-[15px] font-bold text-accent tracking-wide leading-tight">
                          {entry.transliteration}
                        </div>
                        <div className="text-[11px] text-muted truncate font-medium">
                          {entry.definitionPt}
                        </div>
                      </div>
                      <div className="ml-auto text-[9px] font-mono text-white/10 pr-2">
                        {entry.number}
                      </div>
                    </button>
                  )) : (
                    <div className="text-center py-12 text-white/20">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Nenhum resultado encontrado</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Browse all entries */
                <div>
                  <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.25em] mb-4 pl-2">
                    {language === "greek" ? "Termos Gregos do NT" : "Termos Hebraicos do AT"} ({allEntries.length})
                  </h3>
                  <div className="space-y-3">
                    {allEntries.map((entry) => (
                      <button
                        key={entry.number}
                        onClick={() => setSelectedEntry(entry)}
                        className="group w-full flex items-center bg-surface border border-border-subtle rounded-[2.5rem] p-5 hover:bg-surface-hover hover:border-accent/20 transition-all duration-300 shadow-lg"
                      >
                        <div className="w-20 flex-shrink-0 flex justify-center">
                          <span className="text-2xl font-serif text-muted group-hover:text-foreground transition-colors">
                            {entry.lemma}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 pl-6 border-l border-border-subtle overflow-hidden">
                          <div className="text-[16px] font-bold text-accent tracking-tight leading-none">
                            {entry.transliteration}
                          </div>
                          <div className="text-[12px] text-muted truncate font-medium">
                            {entry.definitionPt}
                          </div>
                        </div>
                        <div className="ml-auto text-[10px] font-mono text-white/5 pr-4">
                          {entry.number}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-border-subtle flex-shrink-0">
        <p className="text-[9px] text-white/12 text-center uppercase tracking-[0.15em] font-bold">
          Estudo de Palavras · Concordância de Strong
        </p>
      </div>
    </div>
  );
}
