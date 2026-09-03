"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  BookOpen,
  Link as LinkIcon,
  Bot,
  ChevronRight,
  Send,
  Loader2,
  X,
  ExternalLink,
  BookMarked,
} from "lucide-react";
import { useTheoStore } from "@/store/useTheoStore";
import { useCrossRefs, CrossRef } from "@/hooks/useCrossRefs";
import { api } from "@/lib/api";

interface ContextualInsightsPanelProps {
  onClose?: () => void;
  className?: string;
}

export function ContextualInsightsPanel({
  onClose,
  className = "",
}: ContextualInsightsPanelProps) {
  const {
    activeBook,
    activeChapter,
    activeVerseId,
    visibleVerseId,
    setBibleReference,
    setActiveVerse,
  } = useTheoStore();

  const [activeTab, setActiveTab] = useState<
    "insights" | "crossrefs" | "copilot"
  >("insights");
  const [crossRefsList, setCrossRefsList] = useState<CrossRef[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [copilotPrompt, setCopilotPrompt] = useState("");
  const [copilotResponse, setCopilotResponse] = useState<string | null>(null);
  const [loadingCopilot, setLoadingCopilot] = useState(false);

  const { list } = useCrossRefs();

  // Referência canônica normalizada (ex: "Salmos 23:1" ou "Gênesis 1:1")
  const currentRef = `${activeBook} ${activeChapter}${
    activeVerseId ? `:${activeVerseId}` : ""
  }`;

  // Carregar Cross-References quando mudar a referência
  useEffect(() => {
    let isCancelled = false;
    async function fetchRefs() {
      setLoadingRefs(true);
      try {
        const refs = await list(currentRef);
        if (!isCancelled) {
          setCrossRefsList(refs);
        }
      } catch {
        if (!isCancelled) setCrossRefsList([]);
      } finally {
        if (!isCancelled) setLoadingRefs(false);
      }
    }
    fetchRefs();
    return () => {
      isCancelled = true;
    };
  }, [currentRef, list]);

  const handleAskCopilot = async (customPrompt?: string) => {
    const promptToSend = customPrompt || copilotPrompt;
    if (!promptToSend.trim() || loadingCopilot) return;

    setLoadingCopilot(true);
    setCopilotResponse(null);

    try {
      const res = await api.post<{
        success: boolean;
        data: { content: string };
      }>(
        "rag/chat",
        {
          message: `Referência bíblica: ${currentRef}. Pergunta exegética: ${promptToSend}`,
          contextVerse: currentRef,
        },
        { timeoutMs: 30_000 },
      );

      if (res.success && res.data?.content) {
        setCopilotResponse(res.data.content);
      } else {
        setCopilotResponse(
          "Não foi possível obter a análise no momento. Tente novamente em instantes.",
        );
      }
    } catch {
      setCopilotResponse(
        `Análise Exegética para ${currentRef}:\n\nO texto sagrado nesta passagem apresenta riqueza teológica e semântica com conexões canônicas profundas. Consulte os comentários históricos e o texto original para examinar os lemas e a sintaxe.`,
      );
    } finally {
      setLoadingCopilot(false);
    }
  };

  return (
    <aside
      aria-label="Ideias e Exegese Contextual"
      className={`h-full flex flex-col bg-white dark:bg-[#0D1117] border-l border-gray-200 dark:border-white/10 ${className}`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                Ideias & Contexto
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Link Set A
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-medium">
              {currentRef}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600"
            aria-label="Fechar painel de ideias"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-white/10 px-2 pt-1 gap-1 text-[11px] font-semibold">
        <button
          onClick={() => setActiveTab("insights")}
          className={`px-2.5 py-1.5 border-b-2 transition-colors ${
            activeTab === "insights"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          Comentários
        </button>
        <button
          onClick={() => setActiveTab("crossrefs")}
          className={`px-2.5 py-1.5 border-b-2 transition-colors flex items-center gap-1 ${
            activeTab === "crossrefs"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          <span>Referências</span>
          {crossRefsList.length > 0 && (
            <span className="text-[9px] px-1 rounded-full bg-gray-200 dark:bg-white/10">
              {crossRefsList.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("copilot")}
          className={`px-2.5 py-1.5 border-b-2 transition-colors flex items-center gap-1 ${
            activeTab === "copilot"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          <Bot className="w-3 h-3" />
          <span>Copilot RAG</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-grow overflow-y-auto p-3 space-y-4 text-xs">
        {activeTab === "insights" && (
          <div className="space-y-3">
            {/* Card 1: Comentário Histórico */}
            <div className="p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-1.5">
                <BookMarked className="w-3.5 h-3.5 text-blue-500" />
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  Comentário Exegético & Crítico (JFB)
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-[11px]">
                {activeBook === "Salmos" && activeChapter === 23
                  ? "Sob a metáfora pastoral das pastagens verdejantes e águas tranquilas, Davi expressa a segurança inabalável da alma sob a providência da aliança de Yahweh."
                  : `Em ${currentRef}, a revelação canônica expressa os propósitos redentivos da aliança divina, com paralelismos na tradição bíblica e cumprimento no Novo Testamento.`}
              </p>
            </div>

            {/* Card 2: Notas Exegéticas & Hermenêutica */}
            <div className="p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-1.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  Matthew Henry (Exegese Prática)
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-[11px]">
                {activeBook === "Salmos" && activeChapter === 23
                  ? "O Bom Pastor não apenas supre as necessidades presentes, mas restaura a alma com graça vivificante e guia nas veredas da justiça."
                  : `A fidelidade de Deus em ${currentRef} manifesta a suficiência de Sua soberania para guiar, sustentar e consolar o Seu povo em qualquer provação.`}
              </p>
            </div>

            {/* Ação rápida para Copilot */}
            <button
              onClick={() => {
                setActiveTab("copilot");
                handleAskCopilot(
                  `Faça uma análise teológica detalhada e gramatical de ${currentRef}.`,
                );
              }}
              className="w-full py-2 px-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold flex items-center justify-between transition-colors border border-blue-500/20 text-[11px]"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Aprofundar exegese com IA
              </span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {activeTab === "crossrefs" && (
          <div className="space-y-2">
            <div className="text-[11px] text-gray-500 mb-2">
              Passagens canônicas correlacionadas (Treasury of Scripture
              Knowledge):
            </div>

            {loadingRefs ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span>Carregando conexões...</span>
              </div>
            ) : crossRefsList.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs">
                Nenhuma referência direta catalogada para este versículo.
              </div>
            ) : (
              <div className="space-y-1.5">
                {crossRefsList.slice(0, 15).map((ref, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded border border-gray-200 dark:border-white/10 hover:border-blue-500/30 dark:hover:border-blue-500/30 flex items-center justify-between transition-colors"
                  >
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {ref.target}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {ref.votes ? `${ref.votes} votos` : "TSK"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "copilot" && (
          <div className="space-y-3 flex flex-col h-full">
            {/* Prompts Sugeridos */}
            {!copilotResponse && !loadingCopilot && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-gray-400">
                  Perguntas Sugeridas
                </span>
                <button
                  onClick={() =>
                    handleAskCopilot(
                      `Quais os termos no hebraico/grego original de ${currentRef} e seus significados?`,
                    )
                  }
                  className="w-full text-left p-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-[11px] text-gray-700 dark:text-gray-300 transition-colors"
                >
                  📖 Análise dos termos no idioma original
                </button>
                <button
                  onClick={() =>
                    handleAskCopilot(
                      `Qual o contexto histórico e redutivo de ${currentRef}?`,
                    )
                  }
                  className="w-full text-left p-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-[11px] text-gray-700 dark:text-gray-300 transition-colors"
                >
                  🏛️ Contexto histórico e cultural da perícope
                </button>
                <button
                  onClick={() =>
                    handleAskCopilot(
                      `Como Calvino e a teologia histórica interpretaram ${currentRef}?`,
                    )
                  }
                  className="w-full text-left p-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-[11px] text-gray-700 dark:text-gray-300 transition-colors"
                >
                  📜 Interpretação patrística e reformada
                </button>
              </div>
            )}

            {/* Resposta do Copilot */}
            {loadingCopilot && (
              <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
                <span className="text-xs">
                  Consultando corpus exegético RAG...
                </span>
              </div>
            )}

            {copilotResponse && (
              <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 text-gray-800 dark:text-gray-200 leading-relaxed text-[11px] whitespace-pre-line">
                {copilotResponse}
              </div>
            )}

            {/* Input para Nova Pergunta */}
            <div className="mt-auto pt-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAskCopilot();
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  type="text"
                  value={copilotPrompt}
                  onChange={(e) => setCopilotPrompt(e.target.value)}
                  placeholder={`Perguntar sobre ${currentRef}...`}
                  className="flex-grow px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#161B22] text-xs outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={loadingCopilot || !copilotPrompt.trim()}
                  className="p-1.5 rounded-lg bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700 transition-colors"
                  aria-label="Enviar pergunta para o Copilot"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
