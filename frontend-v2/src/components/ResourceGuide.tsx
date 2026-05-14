"use client";

import React, { useMemo } from "react";
import { 
  Library, Link2, Lightbulb, Users, MapPin, 
  ChevronRight, BookOpen, ScrollText, Sparkles,
  PenTool, Image as ImageIcon, MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheoStore } from "@/store/useTheoStore";
import { getCommentariesForReference } from "@/data/commentaries";
import { findRelatedReferences } from "@/data/crossReferences";
import { BIBLICAL_PEOPLE } from "@/data/biblicalPeople";
import { SEED_LOCATIONS } from "@/data/geoSeedData";
import { THEOLOGICAL_TOPICS } from "@/data/theologicalTopics";
import SermonBuilder from "./SermonBuilder";
import NoteEditor from "./NoteEditor";
import ManuscriptViewer from "./ManuscriptViewer";

type TabType = "resources" | "sermon" | "manuscripts" | "notes";

export default function ResourceGuide() {
  const { activeVerseId, visibleVerseId, activeBook, activeChapter } = useTheoStore();
  const [activeTab, setActiveTab] = React.useState<TabType>("resources");
  
  // PhD Sync: Priorizar o versículo visível no scroll para sincronização automática
  const currentRef = visibleVerseId || activeVerseId || `${activeBook} ${activeChapter}`;

  const commentaries = useMemo(() => getCommentariesForReference(currentRef), [currentRef]);
  const crossRefs = useMemo(() => findRelatedReferences(currentRef), [currentRef]);
  
  const relatedPeople = useMemo(() => {
    return BIBLICAL_PEOPLE.slice(0, 3);
  }, []);

  const relatedLocations = useMemo(() => {
    return SEED_LOCATIONS.slice(0, 2);
  }, []);

  const tabs = [
    { id: "resources", label: "Recursos", icon: Library },
    { id: "sermon", label: "Sermão", icon: PenTool },
    { id: "manuscripts", label: "Manuscritos", icon: ImageIcon },
    { id: "notes", label: "Notas", icon: MessageSquare },
  ];

  return (
    <div className="flex flex-col h-full bg-background/40 backdrop-blur-3xl border-l border-border-subtle text-white overflow-hidden shadow-2xl">
      {/* Sidebar Tabs */}
      <div className="flex border-b border-border-subtle bg-background/60 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex-1 flex flex-col items-center py-3 rounded-xl transition-all ${
              activeTab === tab.id 
                ? "bg-white/5 text-blue-400 shadow-inner" 
                : "text-white/20 hover:text-white/40"
            }`}
          >
            <tab.icon className={`w-4 h-4 mb-1 ${activeTab === tab.id ? "text-blue-400" : ""}`} />
            <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "resources" && (
          <motion.div 
            key="resources"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-6"
          >
            {/* AI Insight (Logos-style) */}
            <div className="relative p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-40 transition-opacity">
                <Sparkles className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> AI Insight
              </h3>
              <p className="text-xs text-white/70 leading-relaxed font-serif italic">
                {visibleVerseId ? `Gerando análise profunda para ${visibleVerseId}...` : "Selecione um versículo para obter insights exegéticos PhD via TheoAI."}
              </p>
            </div>

            {/* Commentaries */}
            <section>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Comentários</h3>
              </div>
              <div className="space-y-2">
                {commentaries.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-[11px] font-bold text-white/80 group-hover:text-emerald-400 transition-colors">{c.author}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-white/30 uppercase">{c.tradition}</span>
                    </div>
                    <p className="text-[10px] text-white/40 leading-relaxed line-clamp-3">{c.text}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Cross References */}
            <section>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Referências Cruzadas</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {crossRefs.map((ref, i) => (
                  <button key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-amber-500/30 text-left transition-all">
                    <Link2 className="w-3 h-3 text-amber-500/40" />
                    <span className="text-[10px] font-mono text-white/60 truncate">{ref}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Context */}
            <section className="pt-2">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Contexto Histórico</h3>
              </div>
              <div className="space-y-2">
                {relatedPeople.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:bg-white/[0.03] transition-all cursor-pointer">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Users className="w-3.5 h-3.5 text-blue-400/60" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-white/80">{p.namePt}</p>
                      <p className="text-[9px] text-white/30 truncate">{p.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </motion.div>
        )}

        {activeTab === "sermon" && (
          <motion.div 
            key="sermon"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex-grow overflow-hidden"
          >
            <SermonBuilder onClose={() => setActiveTab("resources")} />
          </motion.div>
        )}

        {activeTab === "manuscripts" && (
          <motion.div 
            key="manuscripts"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex-grow overflow-hidden"
          >
            <ManuscriptViewer reference={currentRef} />
          </motion.div>
        )}

        {activeTab === "notes" && (
          <motion.div 
            key="notes"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex-grow overflow-hidden"
          >
            <NoteEditor reference={currentRef} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border-subtle bg-background/80">
        <p className="text-[8px] text-white/10 text-center uppercase tracking-[0.2em] font-black">TheoSphere Ultimate Suite</p>
      </div>
    </div>
  );
}
