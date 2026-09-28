"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Command,
  Columns,
  Globe,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
} from "lucide-react";

interface WelcomeTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOUR_STEPS = [
  {
    stepNumber: 1,
    title: "Morfologia Original em 1 Clique",
    subtitle: "Exegese profunda no grego e no hebraico",
    icon: BookOpen,
    badge: "Línguas Originais",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    description:
      "Dê duplo-clique em qualquer palavra de um versículo bíblico para abrir o Strong Overlay instantâneo com a raiz léxica, significado teológico e todas as formas flexionadas no texto sagrado.",
    highlight:
      "Dica: experimente dar duplo-clique em palavras de João 1 ou Gênesis 1.",
  },
  {
    stepNumber: 2,
    title: "Speed Search Canônica (⌘K)",
    subtitle: "Navegação e busca ultra-rápida",
    icon: Command,
    badge: "Atalho Global",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    description:
      "Pressione ⌘K (ou Ctrl+K) de qualquer tela para abrir a Paleta de Comandos. Digite referências diretas (ex: 'Sl 23', 'Jo 3:16') ou use operadores lógicos booleanos do Logos (ex: 'graça AND fé', 'book:Rm').",
    highlight:
      "Dica: localize qualquer capítulo ou conceito teológico em menos de 50 milissegundos.",
  },
  {
    stepNumber: 3,
    title: "Bancada Exegética & Sinopse Textual",
    subtitle: "90 Obras Clássicas e Diff de Versões",
    icon: Columns,
    badge: "Acervo de 45.000 Chunks",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    description:
      "Use o botão [⚖️ Sinopse] na barra de leitura para comparar versões com alinhamento textual e realce de palavras adicionadas/omitidas. No [📖 Guia Exegético], acesse comentários integrais de João Calvino e Matthew Henry.",
    highlight:
      "Dica: acesse a Biblioteca Teológica no menu superior para explorar autores clássicos.",
  },
  {
    stepNumber: 4,
    title: "Atlas Bíblico 3D com Órbita 360°",
    subtitle: "Imersão geospacial e arqueologia real",
    icon: Globe,
    badge: "Geografia Sagrada",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    description:
      "Navegue por eventos bíblicos no Globo 3D, trace as jornadas de Abraão, o Êxodo e as viagens missionárias de Paulo. Ative o Voo de Solo, a Órbita 360° cinematográfica e a Câmera de Solo de Israel.",
    highlight:
      "Dica: clique em marcos arqueológicos para estudar escavações históricas validadas.",
  },
];

export function WelcomeTourModal({ isOpen, onClose }: WelcomeTourModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // Fecha no Esc
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") {
        setCurrentStep((prev) => Math.min(prev + 1, TOUR_STEPS.length - 1));
      }
      if (e.key === "ArrowLeft") {
        setCurrentStep((prev) => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const StepIcon = step.icon;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  const handleFinish = () => {
    try {
      localStorage.setItem("theosphere_tour_completed", "true");
    } catch {
      // localStorage pode falhar em modo restrito
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in-0 duration-200"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto custom-scrollbar my-auto bg-[#0C1019] border border-white/10 rounded-2xl shadow-2xl z-10 flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header com barra de progresso */}
        <div className="p-6 pb-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3
                id="tour-modal-title"
                className="text-sm font-bold text-white tracking-wide"
              >
                Guia Rápido TheoSphere
              </h3>
              <p className="text-[11px] text-gray-400">
                Passo {currentStep + 1} de {TOUR_STEPS.length}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            title="Fechar guia"
            aria-label="Fechar guia rápido"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Linha de progresso com 4 segmentos */}
        <div className="grid grid-cols-4 gap-1 px-6 pt-3">
          {TOUR_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 rounded-full transition-all duration-300 ${
                idx <= currentStep ? "bg-indigo-500" : "bg-white/10"
              }`}
            />
          ))}
        </div>

        {/* Conteúdo do Passo Ativo */}
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${step.badgeColor}`}
            >
              {step.badge}
            </span>
            <span className="text-[11px] font-mono text-gray-500">
              0{currentStep + 1} / 0{TOUR_STEPS.length}
            </span>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
              <StepIcon className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-white leading-tight">
                {step.title}
              </h4>
              <p className="text-xs text-indigo-300/80 font-medium mt-0.5">
                {step.subtitle}
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-300 leading-relaxed font-sans">
            {step.description}
          </p>

          <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl">
            <p className="text-[11px] text-amber-300/90 font-medium italic">
              {step.highlight}
            </p>
          </div>
        </div>

        {/* Rodapé com Navegação */}
        <div className="p-4 px-6 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
          <button
            onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
            disabled={currentStep === 0}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
              currentStep === 0
                ? "opacity-30 cursor-not-allowed text-gray-500"
                : "text-gray-300 hover:text-white hover:bg-white/5 active:scale-95"
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Anterior</span>
          </button>

          <div className="flex items-center gap-2">
            {isLast ? (
              <button
                onClick={handleFinish}
                className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center gap-1.5 transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Explorar TheoSphere</span>
              </button>
            ) : (
              <button
                onClick={() =>
                  setCurrentStep((prev) =>
                    Math.min(prev + 1, TOUR_STEPS.length - 1),
                  )
                }
                className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-1.5 transition-all"
              >
                <span>Próximo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
