"use client";

import React, { useState, useEffect, useRef } from "react";
import { Volume2, Sparkles, X, Loader2, Info, BookOpen, ChevronRight, Copy } from "lucide-react";
import * as Framer from "framer-motion";
const { motion, AnimatePresence } = Framer;
import { useRAG } from "@/hooks/useRAG";
import { generateCitation } from "@/lib/citationGenerator";

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
  syntactic_graph: {
    nodes: { id: string; label: string; type: string }[];
    edges: { source: string; target: string; relation: string }[];
  };
  technical_commentary: TechnicalCommentary[];
  systematic_connection: SystematicConnection;
}

interface ExegesisPanelProps {
  verse: string; // Ex: "Gênesis 1:1"
  onClose: () => void;
}

export default function ExegesisPanel({ verse, onClose }: ExegesisPanelProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ExegesisData | null>(null);
  const [activeTab, setActiveTab] = useState<"interlinear" | "lexical" | "syntax" | "commentary" | "systematic">("interlinear");
  const { chat } = useRAG();
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchExegesis = async () => {
      // Cancela requisição pendente anterior
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setLoading(true);
      const prompt = `Realize uma análise exegética PhD para ${verse}. 
      Inclua um 'syntactic_graph' com nodes (palavras) e edges (relações gramaticais como sujeito, objeto, modificador).
      Use o jsonMode para retornar a estrutura completa definida no seu sistema.`;

      try {
        const response = await chat(prompt, [], undefined, true);
        
        // Se o sinal foi abortado, interrompe o processamento do estado
        if (signal.aborted) return;

        if (!response || !response.content) {
          throw new Error("Resposta da IA vazia");
        }

        try {
          const parsed = JSON.parse(response.content);
          setData(parsed);
        } catch (e) {
          console.error("Erro ao parsear JSON:", e);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log("Busca exegética cancelada pelo usuário (novo clique)");
        } else {
          console.error("Erro ao carregar exegese:", error);
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchExegesis();

    // Cleanup: aborta requisição se o componente for desmontado
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [verse, chat]);

  return (
    <div className="flex flex-col h-full bg-[#05080f]/40 backdrop-blur-2xl text-white overflow-hidden font-sans">
      {/* Table Header Versículo */}
      <div className="bg-gradient-to-r from-orange-600/30 via-amber-500/10 to-transparent py-4 text-center border-b border-amber-500/20 relative">
        <span className="text-xs font-black text-amber-500 uppercase tracking-[0.4em] drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">
          {verse}
        </span>
        
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <button 
            onClick={() => {
              const citation = generateCitation({ book: verse.split(' ')[0], chapter: 1, translation: 'ARA' }, "ABNT");
              navigator.clipboard.writeText(citation);
              alert("Citação ABNT copiada!");
            }}
            className="p-2 hover:bg-white/5 rounded-lg transition-all text-white/30 hover:text-amber-500 group"
            title="Copiar Citação Acadêmica (ABNT)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      {!loading && data && (
        <div className="flex px-8 border-b border-white/5 bg-white/[0.01]">
          {[
            { id: "interlinear", label: "Interlinear", icon: BookOpen },
            { id: "lexical", label: "Léxico", icon: Sparkles },
            { id: "syntax", label: "Sintaxe (Grafo)", icon: ChevronRight },
            { id: "commentary", label: "Crítica", icon: Info },
            { id: "systematic", label: "Sistemática", icon: ChevronRight },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
                activeTab === tab.id 
                  ? "border-amber-500 text-amber-500 bg-amber-500/5" 
                  : "border-transparent text-white/30 hover:text-white/60"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-grow overflow-y-auto custom-scrollbar p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full py-24">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative mb-12"
            >
               <Loader2 className="w-16 h-16 text-amber-500 animate-spin" />
               <div className="absolute inset-0 bg-amber-500/20 blur-2xl animate-pulse rounded-full" />
            </motion.div>
            <div className="text-center space-y-4">
              <p className="text-[11px] font-black text-amber-500 uppercase tracking-[0.4em] animate-pulse">
                Iniciando Escaneamento Exegético PhD...
              </p>
              <p className="text-[9px] text-white/20 font-medium tracking-widest uppercase">
                Consultando Léxicos BDAG/HALOT & Comentários Técnicos
              </p>
            </div>
          </div>
        ) : data ? (
          <div className="max-w-6xl mx-auto">
            <AnimatePresence mode="wait">
              {activeTab === "interlinear" && (
                <motion.div
                  key="interlinear"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {data.interlinear?.map((word, idx) => (
                    <div key={idx} className="p-6 rounded-xl bg-white/[0.03] border border-white/5 hover:border-amber-500/30 transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-4xl font-serif text-white group-hover:text-amber-200 transition-colors" dir="auto">{word.word}</span>
                        <span className="text-[9px] font-black text-amber-500/50 uppercase bg-amber-500/10 px-2 py-1 rounded">{word.strong}</span>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Transliteração</p>
                          <p className="text-sm font-serif italic text-white/60">{word.transliteration}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Morfologia</p>
                          <p className="text-[11px] text-white/40 leading-relaxed">{word.morphology}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Tradução</p>
                          <p className="text-sm font-serif italic text-amber-500/80">"{word.translation}"</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === "lexical" && (
                <motion.div
                  key="lexical"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  {data.lexical_analysis?.map((lex, idx) => (
                    <div key={idx} className="p-8 rounded-2xl bg-white/[0.02] border border-white/5">
                      <h3 className="text-2xl font-serif text-amber-500 mb-4">{lex.word}</h3>
                      <div className="grid md:grid-cols-2 gap-8">
                        <div>
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-3">Definição Acadêmica (Senses)</p>
                          <p className="text-lg font-serif text-white/80 leading-relaxed">{lex.bdag_halot_sense}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-3">Discussão Crítica</p>
                          <p className="text-sm text-white/40 leading-relaxed italic">{lex.academic_discussion}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="p-6 rounded-xl bg-amber-500/5 border border-amber-500/10">
                    <p className="text-[10px] font-black text-amber-500/50 uppercase tracking-widest mb-2">Notas Sintáticas</p>
                    <p className="text-sm text-white/60 font-serif leading-relaxed">{data.syntactic_notes}</p>
                  </div>
                </motion.div>
              )}

              {activeTab === "syntax" && (
                <motion.div
                  key="syntax"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="h-[500px] rounded-3xl bg-white/[0.02] border border-white/5 relative overflow-hidden flex items-center justify-center"
                >
                  <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="w-full h-full bg-[radial-gradient(#3b82f6_1px,transparent_1px)] bg-[size:30px_30px]" />
                  </div>
                  
                  {/* Visualização Simplificada do Grafo Sintático (Reed-Kellogg Style) */}
                  <div className="relative z-10 w-full h-full p-10 flex flex-wrap items-center justify-center gap-x-12 gap-y-16">
                    {data.syntactic_graph?.edges.map((edge, i) => {
                      const sourceNode = data.syntactic_graph.nodes.find(n => n.id === edge.source);
                      const targetNode = data.syntactic_graph.nodes.find(n => n.id === edge.target);
                      return (
                        <div key={i} className="relative flex flex-col items-center">
                          <div className="flex gap-12 items-center mb-4">
                            <div className="px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold">
                              {sourceNode?.label}
                            </div>
                            <div className="h-px w-12 bg-blue-500/40 relative">
                               <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-black text-white/20 uppercase tracking-tighter whitespace-nowrap">
                                 {edge.relation}
                               </span>
                            </div>
                            <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs font-medium">
                              {targetNode?.label}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {(!data.syntactic_graph || data.syntactic_graph.edges.length === 0) && (
                      <div className="text-center opacity-30">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Renderizando Árvore Sintática...</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === "commentary" && (
                <motion.div
                  key="commentary"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid gap-6"
                >
                  {data.technical_commentary?.map((comm, idx) => (
                    <div key={idx} className="p-8 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-amber-500" />
                        </div>
                        <span className="text-xs font-black text-amber-500 uppercase tracking-widest">{comm.source}</span>
                      </div>
                      <p className="text-lg font-serif text-white/80 leading-relaxed italic">"{comm.view}"</p>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === "systematic" && (
                <motion.div
                  key="systematic"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-3xl"
                >
                  <div className="p-10 rounded-3xl bg-amber-500/5 border border-amber-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <ChevronRight className="w-24 h-24 text-amber-500" />
                    </div>
                    {data.systematic_connection && (
                      <>
                        <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-[9px] font-black text-amber-500 uppercase tracking-widest mb-6">
                          Locus: {data.systematic_connection.locus}
                        </span>
                        <h3 className="text-3xl font-serif text-white mb-6">Implicações Sistemáticas</h3>
                        <p className="text-xl font-serif text-white/60 leading-relaxed">
                          {data.systematic_connection.explanation}
                        </p>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 opacity-40"
            >
              <Sparkles className="w-8 h-8 text-amber-500/50 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">Aguardando Resposta do Sínodo Digital...</p>
            </motion.div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-8 py-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">TheoAI Active Engine</span>
          </div>
          <div className="divider-v h-3 bg-white/10" />
          <span className="text-[9px] text-white/20 font-medium italic">RAG-powered academic exegesis.</span>
        </div>
      </div>
    </div>
  );
}
