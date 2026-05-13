"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Send,
  Zap,
  Sparkles,
  Loader2,
  RotateCcw,
  BookOpen,
  Scale,
  MessageCircle,
  Bot,
  User,
  ChevronRight,
  Database,
  TrendingDown,
  RefreshCw,
  Wifi,
  WifiOff,
  Info,
} from "lucide-react";
import * as Framer from "framer-motion";
const { motion, AnimatePresence } = Framer;
import { useRAG } from "@/hooks/useRAG";
import { Button } from "./ui/Button";
import { Card, CardContent } from "./ui/Card";

/* ─── Types ──────────────────────────────────────────────── */

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  meta?: {
    cached: boolean;
    similarity?: number;
    cacheSource?: "global" | "user";
    contextUsed: boolean;
    contextDocCount: number;
    tokensEstimated: number;
    costEstimated: number;
  };
}

/* ─── Suggested Prompts ──────────────────────────────────── */

const SUGGESTED_PROMPTS = [
  {
    icon: Scale,
    label: "Predestinação vs Livre-Arbítrio",
    prompt: "Compare as perspectivas Calvinista e Arminiana sobre predestinação e livre-arbítrio, incluindo os principais versículos usados por cada tradição.",
  },
  {
    icon: BookOpen,
    label: "Explique Romanos 9",
    prompt: "Faça uma análise exegética de Romanos 9, abordando as diferentes interpretações teológicas do capítulo.",
  },
  {
    icon: Sparkles,
    label: "Dons do Espírito Hoje",
    prompt: "Compare as visões Cessacionista e Continuacionista sobre os dons espirituais, com base bíblica e histórica.",
  },
  {
    icon: MessageCircle,
    label: "Batismo: Aspersão vs Imersão",
    prompt: "Apresente os argumentos bíblicos e históricos para batismo por aspersão e por imersão, incluindo as tradições que defendem cada prática.",
  },
];

/* ─── Component ──────────────────────────────────────────── */

export default function AIAssistant({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Hook RAG
  const {
    chat,
    syncUserContent,
    syncDrive,
    isBackendAvailable,
    lastSyncResult,
    totalSaved,
  } = useRAG();

  // Estatísticas de economia da sessão
  const [sessionStats, setSessionStats] = useState({
    totalQueries: 0,
    cacheHits: 0,
    totalTokens: 0,
    totalCost: 0,
    totalSavedFromCache: 0,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const content = text || input.trim();
    if (!content) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Prepara histórico para contexto
    const history = messages.map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    try {
      // Usa o hook RAG (tenta backend, fallback local)
      const response = await chat(content, history);

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: response.content,
        timestamp: new Date(),
        meta: response.meta,
      };

      setMessages(prev => [...prev, aiMsg]);

      // Atualiza estatísticas da sessão
      setSessionStats(prev => ({
        totalQueries: prev.totalQueries + 1,
        cacheHits: prev.cacheHits + (response.meta.cached ? 1 : 0),
        totalTokens: prev.totalTokens + response.meta.tokensEstimated,
        totalCost: prev.totalCost + response.meta.costEstimated,
        totalSavedFromCache: prev.totalSavedFromCache + (response.meta.cached ? 0.015 : 0),
      }));
    } catch (error) {
      console.error("Erro no chat:", error);
    }

    setIsTyping(false);
  };

  const clearChat = () => {
    setMessages([]);
  };

  /* ── Render markdown-like content ─────────────────────── */
  const renderContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("## ")) {
        return <h2 key={i} className="text-lg font-bold text-white mt-4 mb-2">{line.replace("## ", "")}</h2>;
      }
      if (line.startsWith("### ")) {
        return <h3 key={i} className="text-sm font-bold text-amber-400 mt-3 mb-1">{line.replace("### ", "")}</h3>;
      }
      if (line.startsWith("**") && line.endsWith("**")) {
        return <p key={i} className="text-sm font-bold text-white/80 mt-2">{line.replace(/\*\*/g, "")}</p>;
      }
      if (line.startsWith("- **")) {
        const parts = line.replace("- **", "").split("**");
        return (
          <div key={i} className="flex gap-2 ml-2 mt-1">
            <span className="text-amber-500/60 mt-0.5">•</span>
            <p className="text-xs text-white/60">
              <strong className="text-white/80">{parts[0]}</strong>
              {parts[1]}
            </p>
          </div>
        );
      }
      if (line.startsWith("- ")) {
        return (
          <div key={i} className="flex gap-2 ml-2 mt-1">
            <span className="text-amber-500/60 mt-0.5">•</span>
            <p className="text-xs text-white/60">{line.replace("- ", "")}</p>
          </div>
        );
      }
      if (line.startsWith("---")) {
        return <div key={i} className="divider my-3" />;
      }
      if (line.startsWith("*") && line.endsWith("*")) {
        return <p key={i} className="text-[10px] text-white/20 italic mt-2">{line.replace(/\*/g, "")}</p>;
      }
      if (line.trim() === "") return <div key={i} className="h-1" />;
      return <p key={i} className="text-xs text-white/60 leading-relaxed">{line}</p>;
    });
  };

  /* ── Meta badge for cached/context responses ──────────── */
  const renderMetaBadge = (meta?: Message["meta"]) => {
    if (!meta) return null;

    return (
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {meta.cached && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-400 font-bold uppercase tracking-wider">
            <Zap className="w-2.5 h-2.5" />
            Cache {meta.cacheSource === "user" ? "pessoal" : "global"}
            {meta.similarity && ` · ${(meta.similarity * 100).toFixed(0)}%`}
          </span>
        )}
        {meta.contextUsed && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[9px] text-blue-400 font-bold uppercase tracking-wider">
            <Database className="w-2.5 h-2.5" />
            {meta.contextDocCount} docs pessoais
          </span>
        )}
        {meta.costEstimated > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] text-white/30 font-mono">
            ~${meta.costEstimated.toFixed(4)}
          </span>
        )}
        {meta.cached && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[9px] text-green-400 font-bold">
            <TrendingDown className="w-2.5 h-2.5" />
            Economizado
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* ── Header ───────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-4 border-b border-border-subtle flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 animate-pulse-glow">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Theo<span className="text-gradient">AI</span>
              </h2>
              <p className="text-[10px] text-white/25 font-medium tracking-widest uppercase">
                RAG · Assistente Teológico
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* RAG Status Indicator */}
            <div className="flex items-center gap-1.5 mr-2">
              {isBackendAvailable ? (
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">RAG</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <WifiOff className="w-3 h-3 text-amber-400" />
                  <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">Local</span>
                </div>
              )}
            </div>

            {/* Stats toggle */}
            <button
              onClick={() => setShowStats(!showStats)}
              className={`p-2 rounded-lg transition-all ${
                showStats 
                  ? "bg-purple-500/15 text-purple-400" 
                  : "hover:bg-white/5 text-white/30 hover:text-white/60"
              }`}
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Sync button */}
            <button
              onClick={() => syncUserContent()}
              className="p-2 rounded-lg hover:bg-white/5 transition-all text-white/30 hover:text-white/60"
              title="Sincronizar conteúdo para RAG"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Google Drive Sync button */}
            <button
              onClick={() => {
                const folderId = prompt("ID da Pasta do Google Drive (deixe em branco para o padrão):");
                syncDrive(folderId || undefined, undefined);
              }}
              className="p-2 rounded-lg hover:bg-white/5 transition-all text-white/30 hover:text-white/60"
              title="Sincronizar Biblioteca do Google Drive"
            >
              <Database className="w-4 h-4" />
            </button>

            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="p-2 rounded-lg hover:bg-white/5 transition-all text-white/30 hover:text-white/60"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/5 transition-all text-white/30 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Stats Panel ──────────────────────────────────── */}
        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 p-3 rounded-xl bg-surface border border-border-subtle grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold">Consultas</p>
                  <p className="text-sm font-bold text-white/70">{sessionStats.totalQueries}</p>
                </div>
                <div>
                  <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold">Acertos de Cache</p>
                  <p className="text-sm font-bold text-emerald-400">
                    {sessionStats.cacheHits}
                    {sessionStats.totalQueries > 0 && (
                      <span className="text-[10px] text-white/20 ml-1">
                        ({Math.round((sessionStats.cacheHits / sessionStats.totalQueries) * 100)}%)
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold">Tokens Usados</p>
                  <p className="text-sm font-bold text-white/70">
                    {sessionStats.totalTokens > 1000
                      ? `${(sessionStats.totalTokens / 1000).toFixed(1)}K`
                      : sessionStats.totalTokens}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold">Economia</p>
                  <p className="text-sm font-bold text-green-400">
                    ${(sessionStats.totalSavedFromCache + totalSaved).toFixed(3)}
                  </p>
                </div>
                {lastSyncResult && (
                  <div className="col-span-2">
                    <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold">Docs Indexados</p>
                    <p className="text-[10px] text-white/40">
                      {lastSyncResult.total} documentos pessoais indexados para RAG
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Messages Area ────────────────────────────────── */}
      <div className="flex-grow overflow-y-auto custom-scrollbar px-5 py-4">
        {messages.length === 0 ? (
          /* ── Welcome Screen ────────────────────────────── */
          <div className="flex flex-col items-center justify-center h-full pt-10 pb-4 px-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center mb-4 border border-purple-500/10">
              <Sparkles className="w-8 h-8 text-purple-400/60" />
            </div>
            <h3 className="text-xl font-bold text-white/90 mb-1">TheoAI + RAG</h3>
            <p className="text-sm text-amber-500/90 font-bold tracking-widest uppercase mb-4 text-center max-w-sm">
              Precisão Científica e Rigor Técnico
            </p>
            
            <Card className="mb-6 max-w-md w-full bg-white/[0.02]">
              <CardContent className="p-4">
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
                  <Database className="w-3 h-3 text-white/30" />
                  Base de Dados RAG (Indexada)
                </p>
                <ul className="text-xs text-white/70 space-y-2.5">
                  <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span> Quase 45 mil anotações exegéticas e comentários acadêmicos aprofundados</li>
                  <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span> Centenas de reconstruções cartográficas e mapas históricos</li>
                  <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span> Extenso material comparativo e infográficos temáticos</li>
                  <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span> Ensaios e monografias sobre os desafios da teologia contemporânea</li>
                  <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span> Prólogos estruturais e análises de contexto para todos os livros canônicos</li>
                  <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span> Motor avançado de referências cruzadas e elucidação doutrinária</li>
                </ul>
              </CardContent>
            </Card>

            {/* RAG Benefits */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/15">
                <Zap className="w-2.5 h-2.5 text-emerald-400" />
                <span className="text-[9px] text-emerald-400/80 font-bold">Cache Semântico</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 border border-blue-500/15">
                <Database className="w-2.5 h-2.5 text-blue-400" />
                <span className="text-[9px] text-blue-400/80 font-bold">Contexto Google Drive</span>
              </div>
            </div>

            <div className="w-full max-w-sm space-y-2">
              {SUGGESTED_PROMPTS.map((sp, i) => {
                const Icon = sp.icon;
                return (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => sendMessage(sp.prompt)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-border-subtle hover:border-primary/20 hover:bg-surface-hover transition-all text-left group"
                  >
                    <Icon className="w-4 h-4 text-purple-400/60 group-hover:text-purple-400 transition-colors flex-shrink-0" />
                    <span className="text-xs text-white/50 group-hover:text-white/80 transition-colors flex-grow">
                      {sp.label}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-white/10 group-hover:text-purple-400/60 transition-colors" />
                  </motion.button>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── Chat Messages ─────────────────────────────── */
          <div className="space-y-4">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center flex-shrink-0 mt-1 border border-purple-500/10">
                    <Bot className="w-3.5 h-3.5 text-purple-400/80" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-amber-500/15 border border-amber-500/20 text-foreground"
                      : "bg-surface-hover border border-border-subtle"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  ) : (
                    <div className="space-y-0">
                      {renderContent(msg.content)}
                      {renderMetaBadge(msg.meta)}
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </motion.div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3 items-start"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center flex-shrink-0 border border-purple-500/10">
                  <Bot className="w-3.5 h-3.5 text-purple-400/80" />
                </div>
                <div className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-purple-400/40" style={{ animation: "typing 1.2s ease-in-out infinite 0s" }} />
                      <div className="w-2 h-2 rounded-full bg-purple-400/40" style={{ animation: "typing 1.2s ease-in-out infinite 0.2s" }} />
                      <div className="w-2 h-2 rounded-full bg-purple-400/40" style={{ animation: "typing 1.2s ease-in-out infinite 0.4s" }} />
                    </div>
                    <span className="text-[9px] text-white/15 uppercase tracking-wider font-bold ml-1">
                      {isBackendAvailable ? "RAG Pipeline" : "Processando"}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Input Area ───────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-border-subtle flex-shrink-0">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Faça uma pergunta teológica..."
            className="input-glass flex-grow text-sm"
            disabled={isTyping}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isTyping}
            size="icon"
            className={
              input.trim() && !isTyping
                ? ""
                : "bg-white/5 text-white/20 cursor-not-allowed shadow-none scale-100"
            }
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[9px] text-white/15 text-center mt-2 uppercase tracking-widest">
          TheoAI · RAG · Cache Semântico · Economia ~95%
        </p>
      </div>
    </div>
  );
}
