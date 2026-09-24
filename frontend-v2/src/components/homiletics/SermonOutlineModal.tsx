"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  BookOpen,
  Copy,
  Check,
  Printer,
  X,
  Quote,
  Languages,
  ScrollText,
  Lightbulb,
  Crosshair,
  MessageSquare,
  Compass,
} from "lucide-react";
import { type SermonOutlineResponse } from "@/hooks/useHomiletics";

interface SermonOutlineModalProps {
  isOpen: boolean;
  outline: SermonOutlineResponse | null;
  loading: boolean;
  onClose: () => void;
  onRegenerateWithTheme?: (theme: string) => void;
}

export const SermonOutlineModal: React.FC<SermonOutlineModalProps> = ({
  isOpen,
  outline,
  loading,
  onClose,
  onRegenerateWithTheme,
}) => {
  const [activeTab, setActiveTab] = useState<
    "outline" | "classics" | "languages" | "markdown"
  >("outline");
  const [copied, setCopied] = useState(false);
  const [customTheme, setCustomTheme] = useState("");
  const [showThemeInput, setShowThemeInput] = useState(false);

  if (!isOpen) return null;

  const handleCopyMarkdown = () => {
    if (!outline) return;
    void navigator.clipboard.writeText(outline.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleApplyTheme = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTheme.trim() || !onRegenerateWithTheme) return;
    onRegenerateWithTheme(customTheme.trim());
    setShowThemeInput(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.16 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-[#0d131f] border border-amber-500/25 rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
        >
          {/* Top Realce Banner */}
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 flex-shrink-0" />

          {/* Cabeçalho */}
          <header className="px-5 py-4 border-b border-white/10 flex-shrink-0 bg-white/[0.02]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[11px] font-bold text-amber-400">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Gerador Homilético Expositivo
                  </span>
                  {outline && (
                    <span className="px-2 py-0.5 rounded bg-white/5 text-[11px] font-mono text-white/50">
                      {outline.context.canonicalDivision}
                    </span>
                  )}
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
                  {outline?.title || "Gerando Esboço Expositivo..."}
                </h3>
                <p className="text-xs text-amber-400/90 font-mono mt-0.5">
                  {outline?.passage} • {outline?.context.author}
                </p>
              </div>

              {/* Botões de Ação Topo */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={handleCopyMarkdown}
                  disabled={!outline || loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-amber-500/20 text-xs font-semibold text-white/80 hover:text-amber-300 border border-white/10 hover:border-amber-500/30 transition-all disabled:opacity-40"
                  title="Copiar esboço estruturado em Markdown"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Copiar MD</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handlePrint}
                  disabled={!outline || loading}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-colors disabled:opacity-40"
                  title="Imprimir ou salvar como PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 border border-white/10 transition-colors ml-1"
                  title="Fechar (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs de Navegação */}
            <div className="flex items-center gap-2 mt-4 overflow-x-auto thin-scrollbar pt-1">
              <button
                onClick={() => setActiveTab("outline")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === "outline"
                    ? "bg-amber-500 text-black shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Esboço Expositivo</span>
              </button>

              <button
                onClick={() => setActiveTab("classics")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === "classics"
                    ? "bg-amber-500 text-black shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Quote className="w-3.5 h-3.5" />
                <span>
                  Vozes Clássicas ({outline?.classicQuotes.length || 0})
                </span>
              </button>

              <button
                onClick={() => setActiveTab("languages")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === "languages"
                    ? "bg-amber-500 text-black shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Languages className="w-3.5 h-3.5" />
                <span>Exegese dos Originais</span>
              </button>

              <button
                onClick={() => setActiveTab("markdown")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === "markdown"
                    ? "bg-amber-500 text-black shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <ScrollText className="w-3.5 h-3.5" />
                <span>Documento Completo</span>
              </button>
            </div>
          </header>

          {/* Conteúdo Central Scrollável */}
          <div className="flex-1 overflow-y-auto thin-scrollbar p-5 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-10 h-10 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                <p className="text-sm font-semibold text-amber-300/80 tracking-wide font-mono">
                  Sintetizando exegese e teologia clássica…
                </p>
                <p className="text-xs text-white/40 max-w-sm text-center">
                  Consultando originais gregos/hebraicos, referências TSK e
                  comentários de Calvino e Matthew Henry.
                </p>
              </div>
            ) : !outline ? (
              <div className="text-center py-16 text-white/50">
                <p>Nenhum esboço gerado para a passagem selecionada.</p>
              </div>
            ) : (
              <>
                {/* Banner de Big Idea / Tese Central */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 relative overflow-hidden">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono">
                        Tese Central da Pregação (Big Idea)
                      </span>
                      <p className="text-sm font-medium text-white/95 leading-relaxed italic font-serif">
                        &quot;{outline.bigIdea}&quot;
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-amber-500/15 flex items-center justify-between text-xs text-white/50">
                    <span>Cenário: {outline.context.historicalSetting}</span>
                    <span>Gênero: {outline.context.literaryGenre}</span>
                  </div>
                </div>

                {/* ABA 1: ESBOÇO EXPOSITIVO */}
                {activeTab === "outline" && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 font-mono">
                      Movimentos Homiléticos do Texto ({outline.sections.length}{" "}
                      Pontos)
                    </h4>

                    {outline.sections.map((sec, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-amber-500/30 transition-all space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h5 className="text-sm font-bold text-amber-400 tracking-wide">
                            {sec.point}
                          </h5>
                          <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-mono text-white/60">
                            {sec.verses}
                          </span>
                        </div>

                        {/* Exegese */}
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider font-mono">
                            Exegese do Texto:
                          </span>
                          <p className="text-xs text-white/80 leading-relaxed pl-2 border-l border-amber-500/40">
                            {sec.explanation}
                          </p>
                        </div>

                        {/* Ilustração e Aplicação */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5 text-xs">
                          <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                            <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider font-mono block mb-1">
                              Ilustração Homilética:
                            </span>
                            <p className="text-white/75 leading-relaxed">
                              {sec.illustration}
                            </p>
                          </div>

                          <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider font-mono block mb-1">
                              Aplicação Prática:
                            </span>
                            <p className="text-white/75 leading-relaxed">
                              {sec.application}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Conclusão e Oração */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white/60">
                        <Compass className="w-3.5 h-3.5 text-amber-400" />
                        <span>Apelo Pastoral & Oração de Fechamento</span>
                      </div>
                      <p className="text-xs text-white/80 leading-relaxed italic pl-2 border-l border-white/20">
                        {outline.conclusion.pastoralCall}
                      </p>
                      <p className="text-xs text-white/60 font-serif pt-2 border-t border-white/5">
                        &quot;{outline.conclusion.suggestedPrayer}&quot;
                      </p>
                    </div>
                  </div>
                )}

                {/* ABA 2: VOZES CLÁSSICAS */}
                {activeTab === "classics" && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 font-mono">
                      Citações Exegéticas do Acervo Clássico (89 Obras)
                    </h4>

                    {outline.classicQuotes.map((q, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-amber-500/30 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-400">
                            {q.author}
                          </span>
                          <span className="text-[11px] font-mono text-white/40">
                            {q.work}
                          </span>
                        </div>
                        <blockquote className="text-xs font-serif text-white/85 leading-relaxed italic pl-3 border-l-2 border-amber-500/50">
                          &quot;{q.quote}&quot;
                        </blockquote>
                      </div>
                    ))}

                    {/* Conexões TSK */}
                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-white/40 font-mono tracking-wider block">
                        Referências Canônicas de Apoio (TSK):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {outline.crossReferences.map((ref, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-emerald-400/90"
                          >
                            {ref}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ABA 3: EXEGESE DOS ORIGINAIS */}
                {activeTab === "languages" && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 font-mono">
                      Vocabulário & Morfologia dos Originais
                    </h4>

                    {outline.originalLanguageInsights.length === 0 ? (
                      <p className="text-xs text-white/50">
                        Nenhum termo léxico isolado para este trecho.
                      </p>
                    ) : (
                      outline.originalLanguageInsights.map((ins, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-base font-bold text-white font-serif">
                                {ins.term}
                              </span>
                              {ins.transliteration && (
                                <span className="text-xs text-amber-400/80 italic">
                                  ({ins.transliteration})
                                </span>
                              )}
                            </div>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400">
                              Strong {ins.strongId}
                            </span>
                          </div>

                          <p className="text-xs text-white/80">
                            <strong>Significado Léxico:</strong> {ins.meaning}
                          </p>
                          <p className="text-xs text-white/60 leading-relaxed italic pl-2 border-l border-amber-500/30">
                            {ins.theologicalSignificance}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* ABA 4: DOCUMENTO COMPLETO EM MARKDOWN */}
                {activeTab === "markdown" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-white/40 font-mono">
                        Visualização e Cópia Integral
                      </span>
                      <button
                        onClick={handleCopyMarkdown}
                        className="text-xs text-amber-400 hover:text-amber-300 font-mono"
                      >
                        {copied ? "✓ Copiado com sucesso" : "Copiar tudo"}
                      </button>
                    </div>

                    <pre className="p-4 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-white/80 leading-relaxed overflow-x-auto whitespace-pre-wrap select-all">
                      {outline.markdown}
                    </pre>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer com personalização de tema */}
          <footer className="px-5 py-3 bg-black/50 border-t border-white/10 flex items-center justify-between flex-shrink-0 text-xs text-white/50">
            {showThemeInput ? (
              <form
                onSubmit={handleApplyTheme}
                className="flex items-center gap-2 w-full"
              >
                <input
                  type="text"
                  value={customTheme}
                  onChange={(e) => setCustomTheme(e.target.value)}
                  placeholder="Defina um tema específico (ex: A Cruz e a Justificação)..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-amber-500/50"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors"
                >
                  Regerar
                </button>
                <button
                  type="button"
                  onClick={() => setShowThemeInput(false)}
                  className="px-2 py-1.5 text-xs text-white/40 hover:text-white"
                >
                  Cancelar
                </button>
              </form>
            ) : (
              <>
                <button
                  onClick={() => setShowThemeInput(true)}
                  className="flex items-center gap-1.5 text-white/60 hover:text-amber-400 transition-colors font-mono"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Personalizar Tema da Pregação</span>
                </button>

                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span>Padrão Expositivo Logos-Grade</span>
                  <button
                    onClick={onClose}
                    className="hover:text-white transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </>
            )}
          </footer>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
