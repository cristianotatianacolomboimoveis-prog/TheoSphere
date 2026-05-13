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
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ExegesisData | null>(null);
  // Fallback: when the LLM ignores jsonMode and replies in prose/markdown,
  // we still want to show the user *something* useful instead of throwing.
  const [markdownFallback, setMarkdownFallback] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"interlinear" | "lexical" | "syntax" | "commentary" | "systematic">("interlinear");
  const { chat } = useRAG();
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchExegesis = async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setLoading(true);
      setError(null);
      setMarkdownFallback(null);

      // Inclui o schema explícito no prompt — Gemini's `responseMimeType:
      // application/json` honra melhor quando o schema está visível.
      const prompt = `Realize uma análise exegética PhD profunda para ${verse}.

REGRAS CRÍTICAS:
1. NUNCA use '...' ou espaços reservados.
2. Forneça o texto original, transliteração, código Strong e morfologia.
3. Retorne APENAS um objeto JSON válido seguindo EXATAMENTE este schema:

{
  "verse": "${verse}",
  "original_language": "Hebraico" | "Grego" | "Aramaico",
  "interlinear": [
    { "word": "<palavra original>", "transliteration": "<...>", "strong": "<G/H####>", "morphology": "<...>", "translation": "<português>" }
  ],
  "lexical_analysis": [
    { "word": "<palavra>", "bdag_halot_sense": "<sentido lexicográfico>", "academic_discussion": "<discussão>" }
  ],
  "syntactic_notes": "<análise sintática em texto>",
  "syntactic_graph": {
    "nodes": [{ "id": "n1", "label": "<...>", "type": "subject|verb|object|modifier" }],
    "edges": [{ "source": "n1", "target": "n2", "relation": "<rel>" }]
  },
  "technical_commentary": [
    { "source": "<comentarista>", "view": "<posição>" }
  ],
  "systematic_connection": { "locus": "<lócus teológico>", "explanation": "<...>" }
}

Não inclua texto antes ou depois do JSON.`;

      try {
        const response = await chat(prompt, [], undefined, true);
        if (signal.aborted) return;

        if (!response || !response.content) {
          throw new Error("Resposta da IA vazia");
        }

        const content = response.content;

        // Caso 1: backend já fez parse e retornou objeto.
        if (typeof content === "object" && content !== null) {
          setData(content as ExegesisData);
          return;
        }

        // Caso 2: string — pode vir como markdown puro ou JSON.
        const rawText = typeof content === "string" ? content : "";

        // Extrai bloco ```json ... ``` se houver
        const jsonBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const candidate = jsonBlockMatch?.[1] ?? rawText;

        const startIdx = candidate.indexOf("{");
        const endIdx = candidate.lastIndexOf("}");

        // Caso 3: sem JSON detectável — renderiza como markdown.
        if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
          console.warn(
            "[ExegesisPanel] IA retornou prosa em vez de JSON estruturado. " +
              "Exibindo fallback markdown."
          );
          setMarkdownFallback(rawText);
          return;
        }

        const potentialJson = candidate.substring(startIdx, endIdx + 1);
        try {
          setData(JSON.parse(potentialJson) as ExegesisData);
        } catch {
          // Última chance: sanitizar trailing commas e comentários.
          try {
            const sanitized = potentialJson
              .replace(/,\s*([\]}])/g, "$1")
              .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "");
            setData(JSON.parse(sanitized) as ExegesisData);
          } catch {
            // Parse falhou completamente — fallback markdown com o texto bruto.
            console.warn(
              "[ExegesisPanel] JSON irrecuperável. Exibindo fallback markdown."
            );
            setMarkdownFallback(rawText);
          }
        }
      } catch (err) {
        const error = err as Error;
        if (error.name === "AbortError") {
          // Silenciar — requisição cancelada por unmount/retry.
        } else {
          console.error("Erro ao carregar exegese:", error);
          setError(error.message || "Erro de conexão.");
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchExegesis();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [verse, retryCount, chat]);

  return (
    <div className="flex flex-col h-full bg-background/40 backdrop-blur-2xl text-foreground overflow-hidden font-sans">
      {/* Table Header Versículo */}
      <div className="bg-gradient-to-r from-primary/30 via-primary/10 to-transparent py-4 text-center border-b border-primary/20 relative">
        <span className="text-xs font-black text-primary uppercase tracking-[0.4em] drop-shadow-[0_0_8px_hsl(var(--primary)/0.3)]">
          {verse}
        </span>
        
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <button 
            onClick={() => {
              const citation = generateCitation({ book: verse.split(' ')[0], chapter: 1, translation: 'ARA' }, "ABNT");
              navigator.clipboard.writeText(citation);
              alert("Citação ABNT copiada!");
            }}
            className="p-2 hover:bg-surface-hover rounded-lg transition-all text-foreground/30 hover:text-primary group"
            title="Copiar Citação Acadêmica (ABNT)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-hover rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-foreground/40" />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      {!loading && data && (
        <div className="flex px-8 border-b border-border-subtle bg-surface">
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
                  ? "border-primary text-primary bg-primary/5" 
                  : "border-transparent text-foreground/30 hover:text-foreground/60"
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
              <p className="text-[11px] font-black text-primary uppercase tracking-[0.4em] animate-pulse">
                Iniciando Escaneamento Exegético PhD...
              </p>
              <p className="text-[9px] text-foreground/20 font-medium tracking-widest uppercase">
                Consultando Léxicos BDAG/HALOT & Comentários Técnicos
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full py-24 px-12 text-center">
            <div className="p-4 rounded-full bg-red-500/10 mb-6">
              <Info className="w-12 h-12 text-red-500" />
            </div>
            <h3 className="text-xl font-serif font-bold text-white mb-2">Falha na Conexão Teológica</h3>
            <p className="text-sm text-foreground/60 mb-8 max-w-md leading-relaxed">{error}</p>
            <button 
              onClick={() => { setError(null); setLoading(true); setRetryCount(prev => prev + 1); }}
              className="px-8 py-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl text-primary text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Reiniciar Escaneamento
            </button>
          </div>
        ) : markdownFallback ? (
          /* Fallback: a IA respondeu em prosa em vez de JSON estruturado.
             Renderizamos o texto cru com um aviso, em vez de quebrar a UI. */
          <div className="max-w-3xl mx-auto py-8">
            <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-300/80 leading-relaxed">
                A IA retornou uma análise narrativa em vez de dados estruturados.
                Mostrando o texto bruto. Você pode{" "}
                <button
                  onClick={() => {
                    setMarkdownFallback(null);
                    setLoading(true);
                    setRetryCount((n) => n + 1);
                  }}
                  className="underline font-bold hover:text-amber-200"
                >
                  tentar novamente
                </button>{" "}
                para forçar uma resposta estruturada.
              </div>
            </div>
            <article className="prose prose-invert prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-serif text-[14px] leading-relaxed text-foreground/80 bg-transparent border-0 p-0">
                {markdownFallback}
              </pre>
            </article>
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
                    <div key={idx} className="p-6 rounded-xl bg-surface border border-border-subtle hover:border-primary/30 transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-4xl font-serif text-white group-hover:text-amber-200 transition-colors" dir="auto">{word.word}</span>
                        <span className="text-[9px] font-black text-amber-500/50 uppercase bg-amber-500/10 px-2 py-1 rounded">{word.strong}</span>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] font-black text-foreground/20 uppercase tracking-widest mb-1">Transliteração</p>
                          <p className="text-sm font-serif italic text-foreground/60">{word.transliteration}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-foreground/20 uppercase tracking-widest mb-1">Morfologia</p>
                          <p className="text-[11px] text-foreground/40 leading-relaxed">{word.morphology}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-foreground/20 uppercase tracking-widest mb-1">Tradução</p>
                          <p className="text-sm font-serif italic text-primary/80">"{word.translation}"</p>
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
                    <div key={idx} className="p-8 rounded-2xl bg-surface border border-border-subtle">
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
                  className="h-[500px] rounded-3xl bg-surface border border-border-subtle relative overflow-hidden flex items-center justify-center"
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
                            <div className="px-4 py-2 rounded-lg bg-white/5 border border-border-strong text-white/60 text-xs font-medium">
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
                    <div key={idx} className="p-8 rounded-2xl bg-gradient-to-br from-surface to-transparent border border-border-subtle">
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
      <div className="px-8 py-4 bg-surface border-t border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Motor TheoAI Ativo</span>
          </div>
          <div className="divider-v h-3 bg-white/10" />
          <span className="text-[9px] text-white/20 font-medium italic">Exegese acadêmica com RAG.</span>
        </div>
      </div>
    </div>
  );
}
