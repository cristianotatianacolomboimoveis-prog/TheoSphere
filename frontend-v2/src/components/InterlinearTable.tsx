import React from "react";
import { Volume2, Sparkles, Info, BookOpen, Loader2 } from "lucide-react";
import { speakWord } from "@/lib/transliteration";
import { motion, AnimatePresence } from "framer-motion";
import { translateMorphology } from "@/lib/morphology";
import { useRAG } from "@/hooks/useRAG";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

interface WordData {
  original: string;
  translit: string;
  root: string;
  rootTrans: string;
  translations: string[];
  morphology: string;
  strong: string;
}

interface InterlinearTableProps {
  verse: number;
  selectedBook: { namePt: string; testament: string };
  selectedChapter: number;
  isNT: boolean;
  words: WordData[];
  onWordHover?: (word: string, strongId: string, pos: { x: number; y: number }) => void;
}

export function InterlinearTable({ verse, selectedBook, selectedChapter, isNT, words, onWordHover }: InterlinearTableProps) {
  const [hoveredWord, setHoveredWord] = React.useState<WordData | null>(null);
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });
  const [deepMode, setDeepMode] = React.useState(false);
  const { chat } = useRAG();
  const router = useRouter();

  const handleDeepAnalysis = useCallback(async () => {
    if (deepMode) return;
    setDeepMode(true);
    
    // Abre o novo painel de exegese premium na URL
    const params = new URLSearchParams(window.location.search);
    params.set("tool", "exegesis");
    router.push(`?${params.toString()}`);
  }, [deepMode, router]);

  // Disparo automático se não houver palavras
  React.useEffect(() => {
    if ((!words || words.length === 0) && !deepMode) {
      const timer = setTimeout(handleDeepAnalysis, 1500);
      return () => clearTimeout(timer);
    }
  }, [words, deepMode, handleDeepAnalysis]);

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div className="animate-fade-in-up space-y-4">
      {/* Exegesis Header Card */}
      <div className="bg-[#0f172a]/80 border border-white/5 rounded-3xl p-8 shadow-2xl backdrop-blur-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
          <BookOpen className="w-32 h-32 text-blue-400 rotate-12" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-1 block">Exegese Bíblica PhD</span>
              <h2 className="text-3xl font-serif text-white font-bold tracking-tight">
                {selectedBook.namePt} {selectedChapter}:{verse}
              </h2>
            </div>
          </div>
          
          <button 
            onClick={handleDeepAnalysis}
            className={`flex items-center gap-3 px-6 py-2.5 rounded-2xl border transition-all text-[11px] font-black uppercase tracking-widest ${
              deepMode 
                ? "bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/30" 
                : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
            }`}
          >
            <Info className="w-4 h-4" />
            Análise Profunda: {deepMode ? "ATIVA" : "DESATIVADA"}
          </button>
        </div>
      </div>

      {/* Exact Image-Matched Layout */}
      <div className="flex flex-col gap-4 w-full">
        {words && words.length > 0 ? words.map((word, wi) => (
          <div 
            key={wi} 
            className="group flex items-center bg-[#0d1117] border border-white/10 rounded-[2.5rem] p-6 hover:bg-[#161b22] hover:border-blue-500/20 transition-all duration-300 shadow-xl"
            onMouseEnter={(e) => { setHoveredWord(word); onWordHover?.(word.original, word.strong, { x: e.clientX, y: e.clientY }); }}
            onMouseLeave={() => setHoveredWord(null)}
            onMouseMove={handleMouseMove}
          >
            {/* Left: Original Word (Fixed Width, centered) */}
            <div className="w-32 flex-shrink-0 flex justify-center">
              <span 
                className="text-3xl font-serif text-white/40 group-hover:text-white transition-colors"
                dir={!isNT ? "rtl" : "ltr"}
              >
                {word.original}
              </span>
            </div>

            {/* Right: Textual Details (Translit over Definition) */}
            <div className="flex flex-col gap-1 pr-8">
              <div className="text-lg font-bold text-[#3b82f6] tracking-wide leading-none">
                {word.translit}
              </div>
              <div className="text-[13px] text-white/30 leading-snug font-medium line-clamp-2">
                {word.translations.join(", ")}
              </div>
              
              {/* PhD Details - Visible only when Deep Analysis is ON */}
              <AnimatePresence>
                {deepMode && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 mt-3 border-t border-white/5 flex flex-wrap gap-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] font-black text-blue-400/40 uppercase tracking-widest">Morfologia (Exegese)</span>
                        <span className="text-[10px] text-blue-300/80 font-medium">{translateMorphology(word.morphology, isNT)}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] font-black text-amber-500/40 uppercase tracking-widest">Strong's</span>
                        <span className="text-[10px] text-amber-400/60 font-mono">{word.strong}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] font-black text-emerald-500/40 uppercase tracking-widest">Raiz Lexical</span>
                        <span className="text-[10px] text-emerald-400/60 font-serif italic">{word.root}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Hover Action: Pronunciation */}
            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity pr-4">
              <button 
                onClick={(e) => { e.stopPropagation(); speakWord(word.original, isNT, word.strong); }}
                className="p-2.5 rounded-full bg-white/5 hover:bg-blue-500/20 text-white/20 hover:text-blue-400 transition-all"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )) : (
          <div className="flex flex-col items-center justify-center py-20 bg-[#0f172a]/40 border border-white/5 rounded-3xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent animate-pulse" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative z-10 flex flex-col items-center"
            >
              <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-2xl animate-pulse rounded-full" />
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              </div>
              <p className="text-sm text-blue-400 font-black uppercase tracking-[0.3em] mb-2 animate-pulse">
                TheoAI: Iniciando Escaneamento PhD
              </p>
              <p className="text-[10px] text-white/30 font-medium uppercase tracking-widest text-center max-w-xs">
                Dados estáticos ausentes. Ativando Redes Neurais Teológicas para Gênesis...
              </p>
            </motion.div>
          </div>
        )}
      </div>

      {/* Mini-WordStudy Tooltip (STEP Bible Style) */}
      <AnimatePresence>
        {hoveredWord && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            style={{ 
              position: 'fixed',
              left: Math.min(mousePos.x + 20, window.innerWidth - 320),
              top: mousePos.y - 140,
              zIndex: 100
            }}
            className="w-80 bg-[#0a0f1a]/98 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden pointer-events-none p-6 shadow-blue-500/10"
          >
            <div className="flex items-center justify-between mb-5">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Lexicon PhD Analysis
              </span>
              <span className="text-[10px] font-mono text-white/30 bg-white/5 px-2 py-1 rounded border border-white/10">{hoveredWord.strong}</span>
            </div>
            
            <div className="mb-5">
              <h4 className="text-4xl font-serif text-white mb-1.5 tracking-tight">{hoveredWord.original}</h4>
              <p className="text-[11px] text-blue-400/60 italic font-mono font-bold tracking-tight">
                {hoveredWord.translit} <span className="mx-2 opacity-30">•</span> {translateMorphology(hoveredWord.morphology, isNT)}
              </p>
            </div>

            <div className="space-y-4 border-t border-white/5 pt-5">
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Semantic Range (Lexicon)</span>
                <p className="text-[12px] text-white/80 leading-relaxed font-medium">
                  {hoveredWord.translations.join(", ")}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Origem da Raiz Lexical</span>
                <p className="text-[12px] text-white/60 font-serif italic">
                  {hoveredWord.root} ({hoveredWord.rootTrans})
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
