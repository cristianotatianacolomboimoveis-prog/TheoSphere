"use client";

import React, { useState, useEffect, useRef } from "react";
import { Zap, Check, Loader2, Send, Terminal, Sparkles } from "lucide-react";
import * as Framer from "framer-motion";
const { motion, AnimatePresence } = Framer;
import { useRAG } from "@/hooks/useRAG";

export default function AgenticConsole() {
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const { chat } = useRAG();
  const scrollRef = useRef<HTMLDivElement>(null);

  const predefinedSteps = [
    "Inicializando Exegeta TheoAI (Modo PhD)...",
    "Analisando camadas semânticas e línguas originais...",
    "Consultando Bases Léxicas BDAG/HALOT...",
    "Recuperando contexto da base pgvector...",
    "Aplicando pesos de tradição teológica...",
    "Sintetizando resposta acadêmica..."
  ];

  const handleSend = async () => {
    if (!query.trim() || isProcessing) return;

    setIsProcessing(true);
    setSteps([]);
    setResult(null);

    // Simulate agentic steps
    for (const step of predefinedSteps) {
      setSteps(prev => [...prev, step]);
      await new Promise(r => setTimeout(r, 600 + Math.random() * 800));
    }

    try {
      const response = await chat(query);
      setResult(response.content);
    } catch (error) {
      setResult("Erro ao processar a exegese. Por favor, tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps, result]);

  return (
    <div className="flex flex-col h-[500px] w-full max-w-4xl mx-auto bg-surface border border-primary/30 rounded-3xl overflow-hidden shadow-[0_0_50px_hsla(var(--primary)/0.15)] backdrop-blur-3xl font-sans">
      {/* Header */}
      <div className="px-6 py-4 border-b border-primary/20 bg-primary/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_15px_hsla(var(--primary)/0.5)]">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-foreground tracking-tight uppercase">TheoAI Agentic Console</h3>
            <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest opacity-70">Persona: Teólogo Sistemático PhD</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500/50" />
            <div className="w-2 h-2 rounded-full bg-amber-500/50" />
            <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
          </div>
        </div>
      </div>

      {/* Terminal Area */}
      <div 
        ref={scrollRef}
        className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar bg-background"
      >
        {!steps.length && !result && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
            <Terminal className="w-12 h-12 text-primary" />
            <p className="text-xs font-medium tracking-widest uppercase">Aguardando comando...</p>
          </div>
        )}

        <AnimatePresence>
          {steps.map((step, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-3"
            >
              <Check className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
              <span className="text-[11px] text-foreground/70 font-mono leading-relaxed">{step}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {isProcessing && (
          <div className="flex items-center gap-3 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
            <span className="text-[11px] text-blue-400 font-mono uppercase tracking-widest">Processando requisição...</span>
          </div>
        )}

        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-6 rounded-2xl bg-surface-hover border border-border-subtle prose prose-invert prose-xs max-w-none shadow-inner"
          >
            <div className="flex items-center gap-2 mb-4 text-blue-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Resultado da Análise</span>
            </div>
            <div className="text-foreground/80 leading-relaxed font-serif whitespace-pre-wrap">
              {result}
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-surface border-t border-border-subtle">
        <div className="relative group">
          <input 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Pergunte ao TheoAI sobre uma exegese profunda ou dúvida teológica..."
            className="w-full bg-background/50 border border-border-subtle rounded-2xl py-4 pl-6 pr-14 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:border-primary/50 transition-all focus:ring-4 focus:ring-primary/5"
          />
          <button 
            onClick={handleSend}
            disabled={isProcessing || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 transition-all text-white shadow-lg shadow-blue-600/20"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between px-2">
          <div className="flex gap-4">
            <span className="text-[9px] text-foreground/50 font-bold uppercase tracking-tighter">Modelo: Gemini 1.5 Flash</span>
            <span className="text-[9px] text-foreground/50 font-bold uppercase tracking-tighter">Contexto: Hybrid RAG</span>
          </div>
          <span className="text-[9px] text-primary/50 font-bold uppercase tracking-tighter">Pronto para receber comando</span>
        </div>
      </div>
    </div>
  );
}
