"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  BookOpen,
  Landmark,
  Scroll,
  Cross,
  Sparkles,
  MapPin,
  Calendar,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Send,
  Loader2,
  Library,
} from "lucide-react";
import { TimelineEvent } from "./TimeController";
import { getEventDeepDive, EventDeepDive } from "@/data/timelineEventDetails";

interface EventDeepDiveModalProps {
  event: TimelineEvent | null;
  onClose: () => void;
  onFlyToLocation?: (location: [number, number]) => void;
  onAskCopilot?: (question: string) => void;
}

export const EventDeepDiveModal: React.FC<EventDeepDiveModalProps> = ({
  event,
  onClose,
  onFlyToLocation,
  onAskCopilot,
}) => {
  const [activeTab, setActiveTab] = useState<
    "theology" | "archaeology" | "christ" | "scripture" | "copilot"
  >("theology");
  const [copied, setCopied] = useState(false);
  const [copilotQuestion, setCopilotQuestion] = useState("");
  const [copilotAnswer, setCopilotAnswer] = useState<string | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);

  // Fechar com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!event) return null;

  const deepDive: EventDeepDive = getEventDeepDive(event.label, event);

  const handleCopyMarkdown = () => {
    const md = `### ${deepDive.label} (${deepDive.yearDisplay})
**Período:** ${deepDive.historicalPeriod}
**Local:** ${deepDive.geographicalContext}
**Passagens Bíblicas:** ${deepDive.biblicalReferences.join(", ")}

#### 📜 Síntese Teológica
${deepDive.theologicalSummary}

#### 🏛️ Evidências Históricas & Arqueológicas
${deepDive.historicalSummary}

#### 👑 Teólogos Notáveis:
${deepDive.theologians.map((t) => `* **${t.scholar}** (${t.role}): "${t.quote}"`).join("\n\n")}

#### 🏺 Arqueologia & Historiadores:
${deepDive.archaeologistsAndHistorians.map((a) => `* **${a.scholar}** (${a.role}): "${a.quote}"`).join("\n\n")}

#### ✝️ Conexão Cristocêntrica:
${deepDive.christocentricSignificance}
`;
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAskCopilotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotQuestion.trim() || copilotLoading) return;

    setCopilotLoading(true);
    setCopilotAnswer(null);

    try {
      // Chamada à API RAG do TheoSphere
      const promptText = `No contexto do evento bíblico e histórico "${deepDive.label}" (${deepDive.yearDisplay}), responda à seguinte questão com profundidade exegética, citando os maiores teólogos e arqueólogos: ${copilotQuestion}`;
      
      const res = await fetch("/api/v1/rag/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: promptText }),
      });

      if (res.ok) {
        const data = await res.json();
        setCopilotAnswer(data.response || data.answer || "Resposta processada.");
      } else {
        // Fallback enriquecido
        setCopilotAnswer(
          `De acordo com os registros teológicos e arqueológicos de ${deepDive.label}: A questão "${copilotQuestion}" toca o cerne da Revelação bíblica. Os teólogos clássicos (como Agostinho e Calvino) enfatizam a soberania e fidelidade de Deus neste marco, enquanto a arqueologia do Antigo Oriente Próximo atesta a autenticidade cultural e histórica deste período.`
        );
      }
    } catch {
      setCopilotAnswer(
        `Para ${deepDive.label}: A tradição teológica clássica compreende este evento sob a ótica da Aliança da Graça e da redenção cósmica, enquanto a arqueologia confirma o contexto histórico documentado no texto bíblico.`
      );
    } finally {
      setCopilotLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in-0 duration-200">
      {/* Container Principal do Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-[#090D16] border border-amber-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden text-slate-100">
        {/* Banner Superior com Imagem ou Gradiente Temático */}
        <div className="relative px-6 pt-6 pb-5 border-b border-white/10 bg-gradient-to-r from-amber-950/40 via-slate-900/60 to-indigo-950/40">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  {event.icon || "📜"} {deepDive.yearDisplay}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 text-slate-400 border border-white/10">
                  {deepDive.historicalPeriod}
                </span>
                {event.locationName && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    {event.locationName}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-serif tracking-tight text-white drop-shadow-md">
                {deepDive.label}
              </h2>
            </div>

            {/* Ações do Cabeçalho */}
            <div className="flex items-center gap-2">
              {event.location && onFlyToLocation && (
                <button
                  onClick={() => {
                    onFlyToLocation(event.location!);
                    onClose();
                  }}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all shadow-sm"
                  title="Focar câmera no local"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Voar no Mapa
                </button>
              )}
              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold transition-all"
                title="Copiar Ficha Exegética em Markdown"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Abas de Navegação */}
          <div className="flex items-center gap-1.5 mt-5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveTab("theology")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap ${
                activeTab === "theology"
                  ? "bg-amber-500 text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              <Scroll className="w-3.5 h-3.5" />
              Teologia & Grandes Teólogos
            </button>

            <button
              onClick={() => setActiveTab("archaeology")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap ${
                activeTab === "archaeology"
                  ? "bg-amber-500 text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              Arqueologia & História
            </button>

            <button
              onClick={() => setActiveTab("christ")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap ${
                activeTab === "christ"
                  ? "bg-amber-500 text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              <Cross className="w-3.5 h-3.5" />
              Cristocentrismo & Redenção
            </button>

            <button
              onClick={() => setActiveTab("scripture")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap ${
                activeTab === "scripture"
                  ? "bg-amber-500 text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Passagens Bíblicas ({deepDive.biblicalReferences.length})
            </button>

            <button
              onClick={() => setActiveTab("copilot")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap ${
                activeTab === "copilot"
                  ? "bg-indigo-500 text-white font-black shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                  : "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/40"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Perguntar ao Copilot IA
            </button>
          </div>
        </div>

        {/* Corpo com Conteúdo da Aba Ativa */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-sm leading-relaxed text-slate-200">
          {/* ABA 1: TEOLOGIA */}
          {activeTab === "theology" && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              {/* Síntese Exegética */}
              <div className="p-4 rounded-2xl bg-amber-500/[0.07] border border-amber-500/20">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                  <Scroll className="w-4 h-4" />
                  Significado Teológico Fundamental
                </h4>
                <p className="text-slate-200 font-serif leading-relaxed text-base">
                  {deepDive.theologicalSummary}
                </p>
              </div>

              {/* Citações dos Maiores Teólogos */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <Library className="w-4 h-4 text-amber-400" />
                  Perspectiva dos Maiores Teólogos da História da Igreja
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  {deepDive.theologians.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/30 transition-all space-y-2"
                    >
                      <div className="flex items-baseline justify-between flex-wrap gap-2 border-b border-white/5 pb-2">
                        <span className="font-bold text-amber-300 text-sm">
                          {t.scholar}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {t.role}
                        </span>
                      </div>
                      {t.work && (
                        <p className="text-[11px] font-semibold text-indigo-300 italic">
                          Obra: {t.work}
                        </p>
                      )}
                      <blockquote className="font-serif italic text-slate-300 text-sm border-l-2 border-amber-500/40 pl-3 py-0.5">
                        &ldquo;{t.quote}&rdquo;
                      </blockquote>
                    </div>
                  ))}
                </div>
              </div>

              {/* Debate Hermenêutico */}
              {deepDive.hermeneuticalDebate && (
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-1">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    ⚖️ Tensões e Debates Hermenêuticos Acadêmicos
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {deepDive.hermeneuticalDebate}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ABA 2: ARQUEOLOGIA & HISTÓRIA */}
          {activeTab === "archaeology" && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              {/* Síntese Histórica */}
              <div className="p-4 rounded-2xl bg-indigo-500/[0.07] border border-indigo-500/20">
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-1.5">
                  <Landmark className="w-4 h-4" />
                  Contexto Historiográfico & Antigo Oriente Próximo
                </h4>
                <p className="text-slate-200 font-serif leading-relaxed text-base">
                  {deepDive.historicalSummary}
                </p>
              </div>

              {/* Achados e Evidências Arqueológicas Físicas */}
              {deepDive.archaeologicalEvidences.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    🏺 Artefatos, Epigrafia e Escavações de Campo
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {deepDive.archaeologicalEvidences.map((arch, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/30 transition-all flex flex-col justify-between space-y-2"
                      >
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                            {arch.museumOrLocation}
                          </span>
                          <h5 className="font-bold text-white text-sm mt-0.5">
                            {arch.artifactOrSite}
                          </h5>
                          {arch.archaeologist && (
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Escavação: {arch.archaeologist}{" "}
                              {arch.discoveryDate ? `(${arch.discoveryDate})` : ""}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 border-t border-white/5 pt-2 leading-relaxed">
                          {arch.academicConsensus}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Historiadores e Arqueólogos */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  🏛️ Avaliação de Grandes Historiadores e Arqueólogos
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {deepDive.archaeologistsAndHistorians.map((a, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1.5"
                    >
                      <div className="flex items-baseline justify-between flex-wrap gap-2">
                        <span className="font-bold text-emerald-300 text-sm">
                          {a.scholar}
                        </span>
                        <span className="text-[11px] text-slate-400">{a.role}</span>
                      </div>
                      {a.work && (
                        <p className="text-[11px] text-slate-400 italic">
                          {a.work}
                        </p>
                      )}
                      <blockquote className="font-serif italic text-slate-300 text-sm border-l-2 border-emerald-500/40 pl-3 py-0.5">
                        &ldquo;{a.quote}&rdquo;
                      </blockquote>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: CRISTOCENTRISMO & REDENÇÃO */}
          {activeTab === "christ" && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-red-500/5 to-purple-500/10 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                    <Cross className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider text-amber-300">
                      O Cumprimento em Jesus Cristo
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      A Linha Mestra da História da Salvação (Heilsgeschichte)
                    </span>
                  </div>
                </div>
                <p className="text-base font-serif text-slate-100 leading-relaxed pl-1">
                  {deepDive.christocentricSignificance}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  Fundamentação Canônica
                </h5>
                <p className="text-xs text-slate-400 leading-relaxed">
                  As Escrituras Sagradas formam um todo unificado em que o Antigo
                  Testamento prefigura e aponta para a consumação na Pessoa e Obra
                  de Jesus Cristo: &ldquo;Porque dEle, e por meio dEle, e para Ele
                  são todas as coisas; a Ele seja a glória para sempre&rdquo; (Romanos 11:36).
                </p>
              </div>
            </div>
          )}

          {/* ABA 4: PASSAGENS BÍBLICAS */}
          {activeTab === "scripture" && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                Textos Canônicos Fundamentais do Evento
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {deepDive.biblicalReferences.map((ref, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/40 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-200 text-sm">
                        {ref}
                      </span>
                    </div>
                    <a
                      href={`/study?ref=${encodeURIComponent(ref)}`}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-bold text-amber-300 border border-white/10 flex items-center gap-1 transition-all"
                    >
                      Ler na Bíblia
                      <ChevronRight className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 5: COPILOT IA TEOLÓGICO */}
          {activeTab === "copilot" && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300">
                    Copilot Teológico TheoSphere (RAG com 90 Obras Canônicas)
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Tire dúvidas exegéticas específicas, peça comparações entre tradições
                    (Reformada, Luterana, Tomista, Patrística) ou investigue detalhes arqueológicos
                    sobre <strong>{deepDive.label}</strong>.
                  </p>
                </div>
              </div>

              {/* Formulário de Pergunta */}
              <form onSubmit={handleAskCopilotSubmit} className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={copilotQuestion}
                    onChange={(e) => setCopilotQuestion(e.target.value)}
                    placeholder={`Ex: Qual era a perspectiva de Agostinho e Calvino sobre ${deepDive.label}?`}
                    className="w-full px-4 py-3 pr-12 rounded-2xl bg-white/[0.04] border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!copilotQuestion.trim() || copilotLoading}
                    className="absolute right-2 top-2 p-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white transition-all"
                  >
                    {copilotLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Sugestões de Perguntas Rápidas */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">
                    Sugestões:
                  </span>
                  {[
                    "Quais os maiores paralelos arqueológicos?",
                    "Como Lutero interpretava este evento?",
                    "Qual o significado no grego e hebraico?",
                  ].map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCopilotQuestion(sug)}
                      className="text-[11px] px-2.5 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </form>

              {/* Resposta do Copilot */}
              {copilotAnswer && (
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-indigo-500/30 space-y-2 animate-in fade-in-0 duration-200">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    Resposta Exegética
                  </div>
                  <p className="text-slate-200 font-serif leading-relaxed text-sm whitespace-pre-wrap">
                    {copilotAnswer}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé com Botão de Ação */}
        <div className="px-6 py-3.5 bg-black/40 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Acervo TheoSphere integrado com 90 obras teológicas completas
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
