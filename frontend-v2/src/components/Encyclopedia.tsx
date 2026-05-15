"use client";

import React, { useState, useMemo } from "react";
import {
  X, Search, Users, MapPin, Calendar, Lightbulb, ChevronRight, ArrowLeft,
  BookOpen, Clock, Link2, Globe2, Sparkles, Loader2, Wand2, ScrollText
} from "lucide-react";
import * as Framer from "framer-motion";
const { motion, AnimatePresence } = Framer;
import { BIBLICAL_PEOPLE, type BiblicalPerson } from "@/data/biblicalPeople";
import { BIBLICAL_EVENTS, type BiblicalEvent } from "@/data/biblicalEvents";
import { SEED_LOCATIONS, type GeoLocation3D } from "@/data/geoSeedData";
import { THEOLOGICAL_TOPICS, type TheologicalTopic } from "@/data/theologicalTopics";
import { useRAG } from "@/hooks/useRAG";

type Tab = "people" | "places" | "events" | "topics";
type SelectedItem = { type: Tab; data: BiblicalPerson | BiblicalEvent | GeoLocation3D | TheologicalTopic };

export default function Encyclopedia({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("people");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  
  const { chat } = useRAG();
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const TABS: { id: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { id: "people", label: "Pessoas", icon: Users, count: BIBLICAL_PEOPLE.length },
    { id: "places", label: "Lugares", icon: MapPin, count: SEED_LOCATIONS.length },
    { id: "events", label: "Eventos", icon: Calendar, count: BIBLICAL_EVENTS.length },
    { id: "topics", label: "Tópicos", icon: Lightbulb, count: THEOLOGICAL_TOPICS.length },
  ];

  const results = useMemo(() => {
    const q = query.toLowerCase();
    let base: any[] = [];
    switch (activeTab) {
      case "people": base = BIBLICAL_PEOPLE; break;
      case "places": base = SEED_LOCATIONS; break;
      case "events": base = BIBLICAL_EVENTS; break;
      case "topics": base = THEOLOGICAL_TOPICS; break;
    }
    if (!q) return base;
    return base.filter(item => {
        const name = item.namePt || item.names?.pt || item.name || "";
        return name.toLowerCase().includes(q);
    });
  }, [activeTab, query]);

  const generateAiAnalysis = async (item: any) => {
    setLoadingAi(true);
    const itemName = item.namePt || item.names?.pt || item.name;
    const prompt = `Análise teológica profunda sobre ${itemName}.`;
    try {
      const res = await chat(prompt);
      setAiAnalysis(res.content);
    } catch (error) {
      setAiAnalysis("Erro ao gerar análise.");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F3F4F6] dark:bg-[#0A0D14] text-gray-900 dark:text-gray-100 overflow-hidden border-l border-gray-200 dark:border-white/10 shadow-2xl">
      
      {/* Logos Style Header */}
      <div className="px-8 pt-6 pb-4 bg-white dark:bg-[#0D1117] border-b border-gray-200 dark:border-white/10 shadow-sm z-20">
        <div className="flex items-center justify-between mb-6">
            {selected ? (
                <button onClick={() => { setSelected(null); setAiAnalysis(null); }} className="flex items-center gap-2 text-blue-600 hover:text-blue-500 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-bold">Voltar para a Lista</span>
                </button>
            ) : (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                        <ScrollText className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-white leading-tight">Enciclopédia Bíblica</h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Pessoas, Lugares e Eventos</p>
                    </div>
                </div>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
        </div>

        {!selected && (
            <div className="flex flex-col gap-4">
                <div className="relative">
                    <input 
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Pesquisar na enciclopédia..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 transition-all"
                    />
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                </div>
                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-xl">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setQuery(""); }}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                activeTab === tab.id ? "bg-white dark:bg-white/10 text-orange-600 shadow-sm" : "text-gray-400"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
        )}
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar p-8">
        <AnimatePresence mode="wait">
            {selected ? (
                <motion.div key="detail" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-8 pb-20">
                    <div className="text-center">
                        <h3 className="text-4xl font-serif font-bold text-gray-900 dark:text-white mb-2">{selected.data.namePt || (selected.data as any).names?.pt}</h3>
                        <div className="flex justify-center gap-2 mt-4">
                            <span className="px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-600 text-[10px] font-black uppercase tracking-widest">{selected.type}</span>
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-[#0D1117] rounded-xl border border-gray-200 dark:border-white/10 p-8 shadow-sm">
                        <p className="text-lg font-serif text-gray-800 dark:text-gray-200 leading-relaxed text-justify">{(selected.data as any).description}</p>
                    </div>

                    {!aiAnalysis && !loadingAi ? (
                        <button onClick={() => generateAiAnalysis(selected.data)} className="w-full py-4 rounded-xl bg-orange-600 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-orange-500/20 hover:scale-[1.02] transition-all">Aprofundar via IA</button>
                    ) : (
                        <div className="bg-blue-50/50 dark:bg-blue-900/5 p-8 rounded-xl border border-blue-100 dark:border-blue-900/20">
                            {loadingAi ? <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" /> : (
                                <p className="text-sm font-serif text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{aiAnalysis}</p>
                            )}
                        </div>
                    )}
                </motion.div>
            ) : (
                <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.map((item, i) => (
                        <button
                            key={i}
                            onClick={() => setSelected({ type: activeTab, data: item })}
                            className="bg-white dark:bg-[#0D1117] rounded-xl border border-gray-200 dark:border-white/10 p-5 shadow-sm hover:border-orange-500/30 transition-all text-left group flex items-center justify-between"
                        >
                            <div>
                                <span className="text-lg font-serif font-bold text-gray-900 dark:text-white group-hover:text-orange-600 transition-colors">{item.namePt || item.names?.pt}</span>
                                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">{(item as any).period || (item as any).era || (item as any).category}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-500 transition-all" />
                        </button>
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
}
