"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  BrainCircuit, 
  MessageSquare, 
  ChevronRight, 
  BookOpen,
  Zap,
  Quote
} from "lucide-react";
import { useTheoStore } from "@/store/useTheoStore";
import { api } from "@/lib/api";

export const AIInsights: React.FC = () => {
  const { activeBook, activeChapter, activeVerseId } = useTheoStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!activeBook) return;
    
    setIsAnalyzing(true);
    setInsight(null);
    
    try {
      const res = await api.post<any>("enterprise/ai/exegesis", {
        book: activeBook,
        chapter: activeChapter
      });
      
      if (res.success && res.data) {
        setInsight(res.data);
        setIsExpanded(true);
      } else {
        setInsight("Não foi possível gerar insights agora. Tente novamente em breve.");
      }
    } catch (err) {
      setInsight("Erro de conexão com o TheoSphere AI Engine.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.9, y: 20, filter: "blur(10px)" }}
            className="w-80 glass-heavy rounded-2xl border border-white/20 shadow-2xl overflow-hidden mb-2"
          >
            <div className="h-1 bg-gradient-to-r from-accent via-indigo-500 to-purple-500" />
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-accent/20 border border-accent/30">
                  <BrainCircuit className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-tighter">TheoSphere AI</h4>
                  <p className="text-[9px] text-white/40 font-medium">Análise em Tempo Real</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <div className="flex items-start gap-2">
                    <Quote className="w-3 h-3 text-accent/50 mt-0.5" />
                    <p className="text-[11px] text-white/80 leading-relaxed font-serif italic">
                      {insight || "O que deseja investigar nesta passagem?"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-bold text-white/60 transition-all">
                    <BookOpen className="w-3 h-3" /> Exegese
                  </button>
                  <button className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-bold text-white/60 transition-all">
                    <MessageSquare className="w-3 h-3" /> Perguntar
                  </button>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsExpanded(false)}
              className="w-full py-2 bg-white/5 hover:bg-white/10 text-[9px] font-bold text-white/30 uppercase tracking-widest border-t border-white/5"
            >
              Recolher Painel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={isExpanded ? handleAnalyze : () => setIsExpanded(true)}
        className={`relative flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl transition-all border ${
          isAnalyzing 
            ? "bg-accent/20 border-accent/40 cursor-wait" 
            : "bg-accent border-accent/50 hover:shadow-accent/20"
        }`}
      >
        {isAnalyzing ? (
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-white animate-pulse" />
            <span className="text-xs font-black text-white uppercase tracking-widest">Analisando...</span>
          </div>
        ) : (
          <>
            <Sparkles className="w-4 h-4 text-white" />
            <span className="text-xs font-black text-white uppercase tracking-widest">Insights da IA</span>
          </>
        )}
        
        {/* Glow Effect */}
        <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 hover:opacity-100 transition-opacity" />
      </motion.button>
    </div>
  );
};
