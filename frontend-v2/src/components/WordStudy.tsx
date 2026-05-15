"use client";

import React, { useState, useMemo } from "react";
import {
  X, Search, BookOpen, Languages, Hash, BarChart3, ChevronRight, BookMarked, Sparkles, Loader2,
  Library as LibraryIcon, FileText, ExternalLink, ScrollText
} from "lucide-react";
import * as Framer from "framer-motion";
const { motion, AnimatePresence } = Framer;
import { STRONGS_GREEK, searchStrongs, type StrongsEntry } from "@/data/strongsGreek";
import { STRONGS_HEBREW, searchStrongsHebrew } from "@/data/strongsHebrew";
import { TranslationRing } from "./word-study/TranslationRing";
import { ExegeticalConcordance } from "./word-study/ExegeticalConcordance";
import { api } from "@/lib/api";

interface LibraryExcerpt {
  content: string;
  fileName: string;
  source: "vector" | "fulltext" | "hybrid";
}

export default function WordStudy({
  onClose,
  initialStrongId,
  hideHeader = false,
}: {
  onClose: () => void;
  initialStrongId?: string | null;
  hideHeader?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<StrongsEntry | null>(null);
  const [language, setLanguage] = useState<"greek" | "hebrew">("greek");
  const [lexicalData, setLexicalData] = useState<any>(null);
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [loadingLexical, setLoadingLexical] = useState(false);
  const [loadingOccurrences, setLoadingOccurrences] = useState(false);
  const [libraryExcerpts, setLibraryExcerpts] = useState<LibraryExcerpt[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  const fetchLexicalAnalysis = async (strongId: string) => {
    setLoadingLexical(true);
    setLoadingOccurrences(true);
    try {
      const jsonLex = await api.get<any>(`linguistics/lexical/${strongId}`);
      if (jsonLex.success) setLexicalData(jsonLex.data);
      const jsonOcc = await api.get<any>(`linguistics/search-root/${strongId}`);
      if (jsonOcc.success) setOccurrences(jsonOcc.data);
    } catch (e) { console.error(e); }
    finally { setLoadingLexical(false); setLoadingOccurrences(false); }
  };

  const fetchLibraryExcerpts = async (entry: StrongsEntry) => {
    setLoadingLibrary(true);
    try {
      const qs = new URLSearchParams({ term: entry.lemma || entry.transliteration, strongId: entry.number, limit: "5" });
      const res = await api.get<any>(`library/lookup?${qs.toString()}`);
      if (res.success) setLibraryExcerpts(res.data.excerpts);
    } catch (err) { console.error(err); }
    finally { setLoadingLibrary(false); }
  };

  React.useEffect(() => {
    if (!selectedEntry) return;
    void fetchLibraryExcerpts(selectedEntry);
  }, [selectedEntry]);

  React.useEffect(() => {
    if (!initialStrongId) return;
    const isHebrew = initialStrongId.startsWith("H");
    const targetLang = isHebrew ? "hebrew" : "greek";
    if (language !== targetLang) setLanguage(targetLang);
    const table = isHebrew ? STRONGS_HEBREW : STRONGS_GREEK;
    const entry = (table as Record<string, StrongsEntry>)[initialStrongId];
    if (entry) setSelectedEntry(entry);
  }, [initialStrongId]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return language === "greek" ? searchStrongs(query) : searchStrongsHebrew(query);
  }, [query, language]);

  const allEntries = useMemo(() => {
    return language === "greek" ? Object.values(STRONGS_GREEK) : Object.values(STRONGS_HEBREW);
  }, [language]);

  return (
    <div className="flex flex-col h-full bg-[#F3F4F6] dark:bg-[#0A0D14] text-gray-900 dark:text-gray-100 overflow-hidden border-l border-gray-200 dark:border-white/10 shadow-2xl">
      
      {/* Logos Header Style */}
      <div className="px-8 pt-6 pb-4 bg-white dark:bg-[#0D1117] border-b border-gray-200 dark:border-white/10 shadow-sm z-20">
        {!hideHeader && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                  <Languages className="w-5 h-5" />
               </div>
               <div>
                  <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-white leading-tight">Estudo de Palavras</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Dicionário Léxico & Concordância</p>
               </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        )}

        <div className="flex flex-col gap-4">
            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-xl">
                {(["greek", "hebrew"] as const).map(lang => (
                    <button
                        key={lang}
                        onClick={() => { setLanguage(lang); setQuery(""); setSelectedEntry(null); }}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                            language === lang ? "bg-white dark:bg-white/10 text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                        }`}
                    >
                        {lang === "greek" ? "Grego (NT)" : "Hebraico (AT)"}
                    </button>
                ))}
            </div>
            <div className="relative">
                <input 
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setSelectedEntry(null); }}
                    placeholder="Buscar por termo, transliteração ou número de Strong..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            </div>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar p-8">
        <AnimatePresence mode="wait">
          {selectedEntry ? (
            <motion.div key="detail" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-10 pb-20">
                
                {/* Academic Word Header */}
                <div className="text-center border-b border-gray-200 dark:border-white/10 pb-8">
                    <p className="text-6xl font-serif font-bold text-gray-900 dark:text-white mb-4" dir="auto">{selectedEntry.lemma}</p>
                    <p className="text-xl text-indigo-600 font-mono font-bold italic">{selectedEntry.transliteration}</p>
                    <p className="text-xs text-gray-400 mt-2">Prununcia: /{selectedEntry.pronunciation}/</p>
                    <div className="flex items-center justify-center gap-3 mt-6">
                        <span className="px-3 py-1 rounded-md bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[10px] font-black text-gray-500">{selectedEntry.number}</span>
                        <span className="px-3 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/20 text-[10px] font-black text-indigo-600">{selectedEntry.partOfSpeech}</span>
                        <span className="px-3 py-1 rounded-md bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 text-[10px] font-black text-amber-600">{selectedEntry.occurrences} Ocorrências</span>
                    </div>
                </div>

                {/* Entry Definition */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 border-l-2 border-indigo-600 pl-4">
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Definição Acadêmica</span>
                    </div>
                    <div className="bg-white dark:bg-[#0D1117] rounded-xl border border-gray-200 dark:border-white/10 p-6 shadow-sm">
                        <p className="text-lg font-serif text-gray-800 dark:text-gray-200 leading-relaxed mb-4">{selectedEntry.definitionPt}</p>
                        <p className="text-sm text-gray-400 dark:text-white/20 italic font-serif">"{selectedEntry.definition}"</p>
                    </div>
                </div>

                {/* PhD Contextual Analysis */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 border-l-2 border-emerald-500 pl-4">
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Análise Crítica & Léxica</span>
                        </div>
                    </div>
                    <div className="bg-emerald-50/30 dark:bg-emerald-900/5 rounded-xl border border-emerald-100 dark:border-emerald-900/20 p-6 relative overflow-hidden group">
                        {loadingLexical ? (
                            <div className="flex items-center gap-3 py-4">
                                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                                <span className="text-xs font-bold text-emerald-600 uppercase">Consultando BDAG/HALOT...</span>
                            </div>
                        ) : lexicalData ? (
                            <div className="space-y-4">
                                <p className="text-sm font-serif text-gray-700 dark:text-gray-300 leading-relaxed italic">"{lexicalData.academic_discussion}"</p>
                                <div className="pt-4 border-t border-emerald-100 dark:border-emerald-900/10 flex gap-4">
                                    <span className="text-[9px] font-bold text-emerald-600 uppercase">Origem: {lexicalData.source}</span>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => fetchLexicalAnalysis(selectedEntry.number)} className="w-full py-4 rounded-lg bg-white dark:bg-white/5 border border-emerald-200 dark:border-emerald-900/30 text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] hover:bg-emerald-500 hover:text-white transition-all">Ativar Análise Profunda</button>
                        )}
                    </div>
                </div>

                {/* Integration Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <TranslationRing occurrences={selectedEntry.occurrences} data={[]} />
                    <div className="space-y-4">
                         <div className="flex items-center gap-2 border-l-2 border-purple-500 pl-4">
                            <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Conexões Lexicais</span>
                        </div>
                        <div className="bg-white dark:bg-[#0D1117] rounded-xl border border-gray-200 dark:border-white/10 p-4 shadow-sm flex flex-wrap gap-2">
                             {selectedEntry.relatedWords.map(w => (
                                 <span key={w} className="px-2 py-1 rounded bg-purple-50 dark:bg-purple-900/10 text-purple-600 text-[10px] font-bold border border-purple-100 dark:border-purple-900/20">{w}</span>
                             ))}
                        </div>
                    </div>
                </div>

                <ExegeticalConcordance loading={loadingOccurrences} occurrences={occurrences} lexicalData={lexicalData} />

            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(query.trim() ? results : allEntries.slice(0, 50)).map((entry) => (
                        <button key={entry.number} onClick={() => setSelectedEntry(entry)} className="bg-white dark:bg-[#0D1117] rounded-xl border border-gray-200 dark:border-white/10 p-5 shadow-sm hover:border-indigo-500/30 transition-all text-left group">
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-2xl font-serif text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">{entry.lemma}</span>
                                <span className="text-[9px] font-mono text-gray-400">{entry.number}</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-indigo-600 italic">{entry.transliteration}</p>
                                <p className="text-[11px] text-gray-500 dark:text-white/40 line-clamp-2 leading-relaxed">{entry.definitionPt}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 bg-white dark:bg-[#0D1117] border-t border-gray-200 dark:border-white/10 flex items-center justify-center">
         <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.3em]">Lexicon Integrado · Sola Scriptura</p>
      </div>
    </div>
  );
}
