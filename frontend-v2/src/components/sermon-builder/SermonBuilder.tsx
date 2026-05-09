"use client";

import React, { useState } from "react";
import { 
  X, PenTool, Sparkles, Layout, Save, Send, 
  MessageSquare, BookOpen, Quote, Loader2, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SermonBuilder({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [outline, setOutline] = useState<string[]>(["Introdução", "Ponto 1", "Ponto 2", "Conclusão"]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"write" | "ai" | "structure">("write");

  const generateSermonAI = async () => {
    setIsGenerating(true);
    // Simulação de chamada RAG / OpenAI PhD
    setTimeout(() => {
      setOutline([
        "I. O Contexto Histórico de Siquém (Arqueologia)",
        "II. A Semântica de Chesed no AT",
        "III. Aplicação Contemporânea: O Amor que Age",
        "IV. Conclusão: O Convite da Aliança"
      ]);
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#05080f] text-white overflow-hidden">
      {/* Header PhD */}
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-blue-600/10 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <PenTool className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight uppercase">Criador de Sermões IA</h2>
            <p className="text-[10px] text-white/30 font-bold tracking-[0.2em]">Homilética Acadêmica & RAG</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-all text-white/30 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex px-6 border-b border-white/5 bg-white/[0.02]">
        {(["write", "ai", "structure"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
              activeTab === tab ? "border-amber-500 text-amber-500" : "border-transparent text-white/30 hover:text-white"
            }`}
          >
            {tab === "write" ? "Escrever" : tab === "ai" ? "Assistente IA" : "Estrutura"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-grow flex overflow-hidden">
        {/* Editor Main */}
        <div className="flex-grow p-8 overflow-y-auto custom-scrollbar">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título do Sermão..."
            className="w-full bg-transparent text-3xl font-serif font-bold placeholder:text-white/10 border-none outline-none mb-8"
          />
          
          <div className="space-y-6">
            {outline.map((item, idx) => (
              <div key={idx} className="group flex gap-4">
                <span className="text-amber-500/30 font-mono text-sm mt-1">{idx + 1}.</span>
                <div className="flex-grow">
                  <h3 className="text-lg font-semibold text-white/90 group-hover:text-amber-400 transition-colors cursor-pointer">
                    {item}
                  </h3>
                  <textarea
                    placeholder="Desenvolva sua exegese aqui..."
                    className="w-full bg-transparent border-none outline-none text-white/60 text-sm leading-relaxed mt-2 resize-none h-24 placeholder:text-white/5"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Sidebar (Contextual) */}
        <div className="w-80 border-l border-white/5 bg-black/20 backdrop-blur-xl p-6 hidden lg:block">
          <div className="flex items-center gap-2 mb-6 text-amber-500">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Sugestões de IA</span>
          </div>

          <div className="space-y-4">
            <button 
              onClick={generateSermonAI}
              disabled={isGenerating}
              className="w-full p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500/20 transition-all text-xs font-bold flex items-center justify-center gap-3 group"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Gerar Esboço via RAG
            </button>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
              <h4 className="text-[10px] font-bold text-white/40 uppercase mb-3 flex items-center gap-2">
                <Quote className="w-3 h-3" /> Citações Recomendadas
              </h4>
              <div className="space-y-2">
                <p className="text-[11px] text-white/60 italic leading-relaxed">"O amor não é um sentimento, é uma decisão de aliança." — Spurgeon</p>
                <button className="text-[9px] text-amber-500/60 font-bold uppercase hover:text-amber-500 transition-colors">Inserir no Sermão</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="p-4 border-t border-white/5 bg-[#05080f] flex justify-between items-center px-8">
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Palavras: 0</span>
          <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Tempo est.: 0min</span>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-xs font-bold text-white/60">
            <Save className="w-4 h-4" /> Salvar
          </button>
          <button className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 text-black hover:bg-amber-400 transition-all text-xs font-black uppercase">
            <Send className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
