"use client";

import ExegesisPanel from "@/components/ExegesisPanel";
import { useRouter } from "next/navigation";
import { useTheoStore } from "@/store/useTheoStore";
import { Menu, RotateCcw, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function ExegetePage() {
  const router = useRouter();
  const { activeBook, activeChapter } = useTheoStore();

  return (
    <div className="w-full h-screen bg-[#05080f] flex flex-col overflow-hidden">
      {/* Header Premium TheoSphere (Sincronizado com o sistema) */}
      <div className="h-14 glass-heavy border-b border-white/5 flex items-center justify-between px-6 flex-shrink-0 z-50">
        <Menu className="w-5 h-5 text-white/40 cursor-pointer hover:text-white transition-colors" />
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[10px] font-black text-amber-500/80 uppercase tracking-[0.3em]">Motor de Exegese TheoAI</span>
        </div>
        <RotateCcw className="w-5 h-5 text-white/40 cursor-pointer hover:text-white transition-colors" />
      </div>

      {/* Área de Conteúdo TheoSphere Dark */}
      <div className="flex-grow relative overflow-hidden bg-[#05080f]">
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        <div className="absolute inset-0 overflow-y-auto custom-scrollbar z-10">
          {/* Hero Section Premium */}
          <div className="pt-24 pb-16 text-center relative">
             <div className="relative z-10">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Nível Acadêmico PhD</span>
                </motion.div>
                <h1 className="text-7xl font-black text-white tracking-tighter mb-4">
                  Análise Exegética: <span className="text-gradient">{activeBook}</span>
                </h1>
                <p className="text-sm text-white/40 font-medium max-w-xl mx-auto leading-relaxed tracking-wide">
                  Processando raízes etimológicas, morfologia comparativa e semântica teológica profunda em tempo real.
                </p>
             </div>
          </div>

          {/* O Painel de Exegese Estilizado */}
          <div className="max-w-6xl mx-auto px-6 pb-24">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-heavy rounded-[32px] border border-white/5 shadow-2xl overflow-hidden"
            >
               <ExegesisPanel 
                 verse={`${activeBook} ${activeChapter}:1`} 
                 onClose={() => router.push("/")} 
               />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
