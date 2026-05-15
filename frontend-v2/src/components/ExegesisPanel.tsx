"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Volume2, Sparkles, X, Loader2, Info, BookOpen, ChevronDown, 
  ChevronRight, Copy, Library as LibraryIcon, FileText, ExternalLink, ScrollText
} from "lucide-react";
import * as Framer from "framer-motion";
const { motion, AnimatePresence } = Framer;
import { useRAG } from "@/hooks/useRAG";
import { api } from "@/lib/api";

interface InterlinearWord {
  word: string;
  transliteration: string;
  strong: string;
  morphology: string;
  translation: string;
}

interface LexicalAnalysis {
  word: string;
  bdag_halot_sense: string;
  academic_discussion: string;
}

interface TechnicalCommentary {
  source: string;
  view: string;
}

interface SystematicConnection {
  locus: string;
  explanation: string;
}

interface ExegesisData {
  verse: string;
  original_language: string;
  interlinear: InterlinearWord[];
  lexical_analysis: LexicalAnalysis[];
  syntactic_notes: string;
  technical_commentary: TechnicalCommentary[];
  systematic_connection: SystematicConnection;
}

interface LibraryExcerpt {
  content: string;
  fileName: string;
}

export default function ExegesisPanel({ verse, onClose, hideHeader = false }: { verse: string, onClose: () => void, hideHeader?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ExegesisData | null>(null);
  const [markdownFallback, setMarkdownFallback] = useState<string | null>(null);
  const [libraryExcerpts, setLibraryExcerpts] = useState<LibraryExcerpt[]>([]);
  const { chat } = useRAG();

  useEffect(() => {
    const fetchExegesis = async () => {
      setLoading(true);
      const isNT = /\b(Mateus|Marcos|Lucas|João|Atos|Romanos|Coríntios|Gálatas|Efésios|Filipenses|Colossenses|Tessalonicenses|Timóteo|Tito|Filemom|Hebreus|Tiago|Pedro|Judas|Apocalipse)\b/i.test(verse);
      const language = isNT ? "Grego" : "Hebraico";
      const prompt = `Análise PhD para ${verse}. Idioma: ${language}. JSON Schema: { "verse": "${verse}", "original_language": "${language}", "interlinear": [{ "word": "...", "transliteration": "...", "strong": "...", "morphology": "...", "translation": "..." }], "lexical_analysis": [{ "word": "...", "bdag_halot_sense": "...", "academic_discussion": "..." }], "syntactic_notes": "...", "technical_commentary": [{ "source": "...", "view": "..." }], "systematic_connection": { "locus": "...", "explanation": "..." } }`;

      try {
        const response = await chat(prompt, [], undefined, true);
        const content = response?.content;
        if (typeof content === "object") { setData(content as ExegesisData); }
        else {
          const jsonMatch = (content as string).match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content as string];
          try { setData(JSON.parse(jsonMatch[1]!) as ExegesisData); }
          catch { setMarkdownFallback(content as string); }
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchExegesis();
  }, [verse]);

  return (
    <div className="flex flex-col h-full bg-[#F3F4F6] dark:bg-[#0A0D14] text-gray-900 dark:text-gray-100 overflow-hidden border-l border-gray-200 dark:border-white/10 shadow-2xl">
      
      {!hideHeader && (
        <div className="h-14 border-b border-gray-200 dark:border-white/10 px-8 flex items-center justify-between bg-white dark:bg-black/20 backdrop-blur-xl">
          <div className="flex items-center gap-2">
             <ScrollText className="w-4 h-4 text-blue-600" />
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Guia de Exegese Profissional</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-400"><X className="w-5 h-5" /></button>
        </div>
      )}

      <div className="flex-grow overflow-y-auto custom-scrollbar p-8 space-y-10">
        
        {/* Academic Header */}
        <div className="border-b border-gray-300 dark:border-white/10 pb-6">
            <h2 className="text-3xl font-serif font-bold text-gray-900 dark:text-white mb-1">{verse}</h2>
            <div className="flex items-center gap-3">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-600 text-white uppercase">{data?.original_language || "Analítica"}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">Aparato Crítico & Léxico</span>
            </div>
        </div>

        {loading ? (
          <div className="h-full flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Sincronizando Léxicos Acadêmicos...</p>
          </div>
        ) : (
          <>
            <StudySection title="Análise Interlinear" icon={BookOpen} defaultOpen>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data?.interlinear.map((w, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-2xl font-serif text-gray-900 dark:text-white">{w.word}</span>
                      <span className="text-[9px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900/30">{w.strong}</span>
                    </div>
                    <p className="text-xs font-serif italic text-blue-600 mb-1">{w.transliteration}</p>
                    <p className="text-[10px] text-gray-400 dark:text-white/20 mb-3 font-mono">{w.morphology}</p>
                    <div className="mt-auto pt-2 border-t border-gray-100 dark:border-white/5">
                        <p className="text-sm font-serif font-bold text-gray-700 dark:text-gray-200">"{w.translation}"</p>
                    </div>
                  </div>
                ))}
              </div>
            </StudySection>

            <StudySection title="Léxico (BDAG/HALOT)" icon={Sparkles} defaultOpen>
              <div className="space-y-6">
                {data?.lexical_analysis.map((l, i) => (
                  <div key={i} className="relative pl-6 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-600/30">
                    <h4 className="text-lg font-serif font-bold text-gray-800 dark:text-white mb-2">{l.word}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-serif leading-relaxed mb-3 text-justify">{l.bdag_halot_sense}</p>
                    <p className="text-[11px] text-blue-600/60 italic font-medium">{l.academic_discussion}</p>
                  </div>
                ))}
                <div className="p-5 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 italic">
                   <p className="text-sm text-gray-500 dark:text-white/40 font-serif leading-relaxed">"{data?.syntactic_notes}"</p>
                </div>
              </div>
            </StudySection>

            <StudySection title="Comentários Técnicos" icon={Info}>
               <div className="space-y-4">
                 {data?.technical_commentary.map((c, i) => (
                   <div key={i} className="p-5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm">
                     <span className="text-[10px] font-black text-blue-600 uppercase mb-3 block tracking-widest">{c.source}</span>
                     <p className="text-[13px] font-serif italic text-gray-600 dark:text-gray-300 leading-relaxed">"{c.view}"</p>
                   </div>
                 ))}
               </div>
            </StudySection>

            <StudySection title="Loci Theologici" icon={LibraryIcon}>
                <div className="p-6 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm">
                    <h5 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">{data?.systematic_connection.locus}</h5>
                    <p className="text-sm font-serif text-gray-600 dark:text-gray-400 leading-relaxed">{data?.systematic_connection.explanation}</p>
                </div>
            </StudySection>
          </>
        )}
      </div>
    </div>
  );
}

function StudySection({ title, icon: Icon, children, defaultOpen = false }: { title: string, icon: any, children: React.ReactNode, defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="space-y-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-2 group"
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 ${isOpen ? "text-blue-600" : "text-gray-300 group-hover:text-gray-400"}`} />
          <span className={`text-[11px] font-bold uppercase tracking-[0.2em] transition-all ${isOpen ? "text-gray-900 dark:text-white" : "text-gray-400 group-hover:text-gray-500"}`}>{title}</span>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-gray-300" /> : <ChevronRight className="w-4 h-4 text-gray-300" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="py-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
