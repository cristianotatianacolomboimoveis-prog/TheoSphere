"use client";

import React, { useState } from "react";
import {
  useTextualCriticism,
  CriticalRating,
} from "../../hooks/useTextualCriticism";

interface TextualCriticismModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBookId?: number;
  currentBookName?: string;
  currentChapter?: number;
  currentVerse?: number;
}

function getRatingBadge(rating: CriticalRating) {
  switch (rating) {
    case "A":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    case "B":
      return "bg-blue-500/20 text-blue-300 border-blue-500/40";
    case "C":
      return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    case "D":
      return "bg-red-500/20 text-red-300 border-red-500/40";
    default:
      return "bg-zinc-800 text-zinc-300 border-zinc-700";
  }
}

function getImpactBadge(impact: "high" | "medium" | "low" | "none") {
  switch (impact) {
    case "high":
      return "bg-rose-500/20 text-rose-300 border-rose-500/40";
    case "medium":
      return "bg-orange-500/20 text-orange-300 border-orange-500/40";
    case "low":
    case "none":
      return "bg-zinc-800 text-zinc-400 border-zinc-700";
  }
}

export function TextualCriticismModal({
  isOpen,
  onClose,
  currentBookId = 23,
  currentBookName = "Isaías",
  currentChapter = 53,
  currentVerse = 11,
}: TextualCriticismModalProps) {
  const {
    variantsList,
    activeVariant,
    selectedVariantId,
    activeTestament,
    searchQuery,
    isLoading,
    error,
    copied,
    setActiveTestament,
    setSearchQuery,
    loadVariantById,
    copyVariantMarkdown,
  } = useTextualCriticism({
    bookId: currentBookId,
    chapter: currentChapter,
    verse: currentVerse,
  });

  const [activeTab, setActiveTab] = useState<"catalog" | "apparatus">(
    "catalog",
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xl font-bold">
              📜
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-zinc-100">
                  Crítica Textual & Manuscritos do Mar Morto (Qumran DSS)
                </h2>
                <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-800/60 px-2 py-0.5 rounded font-mono font-semibold">
                  Accordance Engine
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Aparato crítico e variantes entre Grandes Códices (א, B), Rolos
                de Qumran e Textus Receptus
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyVariantMarkdown}
              disabled={!activeVariant}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-700 flex items-center gap-1.5 transition-colors disabled:opacity-40"
              title="Copiar Ficha Crítica em Markdown"
            >
              {copied ? (
                <>
                  <span className="text-emerald-400">✓</span> Copiado!
                </>
              ) : (
                <>
                  <span>📋</span> Copiar Markdown
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Toolbar de Filtros e Busca */}
        <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/30 flex flex-wrap items-center justify-between gap-3">
          {/* Alternador de Testamentos */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-xs">
            <button
              onClick={() => setActiveTestament("ALL")}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTestament === "ALL"
                  ? "bg-amber-600 text-white font-medium shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Todas ({variantsList.length})
            </button>
            <button
              onClick={() => setActiveTestament("OT")}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTestament === "OT"
                  ? "bg-amber-600 text-white font-medium shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Antigo Testamento (Qumran / MT / LXX)
            </button>
            <button
              onClick={() => setActiveTestament("NT")}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTestament === "NT"
                  ? "bg-amber-600 text-white font-medium shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Novo Testamento (Papiros / א / B / TR)
            </button>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por livro, tema ou códice..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
            />
            <span className="absolute left-2.5 top-2 text-zinc-500 text-xs">
              🔍
            </span>
          </div>
        </div>

        {/* Corpo Principal Split (Duas Colunas) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Coluna Esquerda: Lista de Variantes Catalogadas */}
          <div className="w-full md:w-80 border-r border-zinc-800/80 bg-zinc-950/70 overflow-y-auto p-3 space-y-2">
            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider px-1 pb-1">
              Variantes Notáveis ({variantsList.length})
            </div>

            {variantsList.map((item) => {
              const isSelected = selectedVariantId === item.id;
              const ratingClass = getRatingBadge(item.criticalRating);
              const impactClass = getImpactBadge(item.theologicalImpact);

              return (
                <button
                  key={item.id}
                  onClick={() => loadVariantById(item.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    isSelected
                      ? "bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/30"
                      : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-zinc-200">
                      {item.passageRef}
                    </span>
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold border ${ratingClass}`}
                        title={`Grau de Certeza Crítica UBS: ${item.criticalRating}`}
                      >
                        {item.criticalRating}
                      </span>
                      {item.dssOrEarlyPapyriInvolved && (
                        <span
                          className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800 px-1.5 py-0.2 rounded font-mono"
                          title="Envolve Rolos de Qumran ou Papiro Primitivo"
                        >
                          DSS
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {item.unitTitlePt}
                  </p>

                  <div className="flex items-center gap-1.5 mt-2">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold border ${impactClass}`}
                    >
                      Impacto: {item.theologicalImpact}
                    </span>
                    <span className="text-[10px] text-zinc-500 uppercase">
                      {item.variantType}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Coluna Direita: Aparato Crítico da Variante Selecionada */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-zinc-950">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 text-zinc-500 space-y-3">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm">
                  Consultando aparato de códices e leituras manuscritas...
                </p>
              </div>
            ) : error ? (
              <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-4 text-red-300 text-sm">
                <p className="font-semibold mb-1">Aviso:</p>
                <p>{error}</p>
              </div>
            ) : activeVariant ? (
              <div className="space-y-5">
                {/* Banner de Identificação da Variante */}
                <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono font-semibold text-amber-400 bg-amber-950/50 border border-amber-800/40 px-2 py-0.5 rounded">
                      {activeVariant.passageRef}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${getRatingBadge(
                          activeVariant.criticalRating,
                        )}`}
                      >
                        Grau de Certeza: {activeVariant.criticalRating}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${getImpactBadge(
                          activeVariant.theologicalImpact,
                        )}`}
                      >
                        Impacto Teológico:{" "}
                        {activeVariant.theologicalImpact.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-zinc-100 leading-snug">
                    {activeVariant.unitTitlePt}
                  </h3>
                </div>

                {/* Leituras das Testemunhas Manuscritas */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <span>
                      Testemunhas Manuscritas & Leituras Contrastantes
                    </span>
                    <span className="text-zinc-600 font-normal">
                      ({activeVariant.readings.length} tradições de manuscritos)
                    </span>
                  </h4>

                  <div className="grid grid-cols-1 gap-3">
                    {activeVariant.readings.map((reading, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border transition-all ${
                          reading.isAdoptedByModernEclectic
                            ? "bg-emerald-950/20 border-emerald-800/40"
                            : reading.isAdoptedByTraditionalTR
                              ? "bg-amber-950/20 border-amber-800/40"
                              : "bg-zinc-900/60 border-zinc-800"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-zinc-200">
                              {reading.witnessSiglum}
                            </span>
                            <span className="text-xs text-zinc-500 font-mono">
                              ({reading.witnessDate})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {reading.isAdoptedByModernEclectic && (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-semibold">
                                ✓ Crítica Moderna (NA28/BHS)
                              </span>
                            )}
                            {reading.isAdoptedByTraditionalTR && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-semibold">
                                📜 Tradição Textus Receptus
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Texto Original */}
                        <div className="bg-zinc-950/60 rounded-lg p-3 border border-zinc-800/80 mb-2">
                          <p className="font-serif text-lg text-emerald-200 tracking-wide selection:bg-emerald-800 leading-relaxed">
                            {reading.originalText}
                          </p>
                        </div>

                        {/* Tradução em Português */}
                        <p className="text-sm text-zinc-300 italic">
                          &ldquo;{reading.translationPt}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Análise Exegética e Histórica */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Contexto Histórico */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                    <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span>🏛️ Contexto Histórico & Arqueológico</span>
                    </h5>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {activeVariant.historicalContextPt}
                    </p>
                  </div>

                  {/* Causa Provável do Copista */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                    <h5 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span>✒️ Causa Provável de Transmissão</span>
                    </h5>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {activeVariant.scribalCausePt}
                    </p>
                  </div>
                </div>

                {/* Consenso Acadêmico */}
                <div className="bg-blue-950/20 border border-blue-900/30 rounded-xl p-4">
                  <h5 className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span>🎓 Consenso Acadêmico Contemporâneo</span>
                  </h5>
                  <p className="text-xs text-blue-200/90 leading-relaxed">
                    {activeVariant.scholarlyConsensusPt}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>
              Motor de Crítica Textual Ativo • Rolos de Qumran, Códices de
              Leningrado, Sinaítico e Vaticano
            </span>
          </div>
          <div className="text-[11px] text-zinc-500">
            Pressione{" "}
            <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-300">
              Esc
            </kbd>{" "}
            para fechar
          </div>
        </div>
      </div>
    </div>
  );
}
