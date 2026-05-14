"use client";

/**
 * TheoSphere — Unified OS Launcher.
 * 
 * Restores all "missing" academic tools (Exegesis, Manuscripts, Notes)
 * and upgrades the UI to a premium vertical Sidebar for professional discovery.
 */

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  BookOpen,
  ScrollText,
  GraduationCap,
  BookMarked,
  Search,
  Library,
  Map,
  Compass,
  Book,
  Bot,
  ShieldCheck,
  Sparkles,
  Zap,
  Image as ImageIcon,
  MessageSquare,
  Globe,
  Share2,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { motion, AnimatePresence } from "framer-motion";
import { useTheoStore, type ToolId } from "@/store/useTheoStore";
import { ToolOverlay, FullScreenOverlay } from "@/components/ui/Overlay";

// ─── Heavy components: lazy-loaded, no SSR ─────────────────────────────────
const BibleReader = dynamic(() => import("@/components/BibleReader"), {
  ssr: false,
  loading: () => <BootingFallback label="LEITOR BÍBLICO" />,
});
const ExegesisPanel = dynamic(() => import("@/components/ExegesisPanel"), { ssr: false });
const SermonBuilder = dynamic(() => import("@/components/SermonBuilder"), { ssr: false });
const StudyBuilder = dynamic(() => import("@/components/StudyBuilder"), { ssr: false });
const Factbook = dynamic(() => import("@/components/Factbook"), { ssr: false });
const WordStudy = dynamic(() => import("@/components/WordStudy"), { ssr: false });
const TheologicalLibrary = dynamic(() => import("@/components/TheologicalLibrary"), { ssr: false });
const PassageGuide = dynamic(() => import("@/components/PassageGuide"), { ssr: false });
const AIAssistant = dynamic(() => import("@/components/AIAssistant"), { ssr: false });
const TheoSphere3D = dynamic(() => import("@/components/visualizer/TheoSphere3D"), { ssr: false });
const StudyMode = dynamic(() => import("@/components/StudyMode"), { ssr: false });
const NoteEditor = dynamic(() => import("@/components/NoteEditor"), { ssr: false });
const ManuscriptViewer = dynamic(() => import("@/components/ManuscriptViewer"), { ssr: false });
const TheoSGraph = dynamic(() => import("@/components/TheoSGraph"), { ssr: false });
const AgenticConsole = dynamic(() => import("@/components/AgenticConsole"), { ssr: false });

import AuthModal from "@/components/AuthModal";

// ─── Tool registry ──────────────────────────────────────────────────────────
// ToolId importado do store

interface ToolDefinition {
  key: ToolId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const PRIMARY_TOOLS: ToolDefinition[] = [
  { key: "exegesis", label: "Análise Exegética", icon: Zap, color: "text-amber-400" },
  { key: "guide", label: "Guia de Passagem", icon: BookOpen, color: "text-blue-400" },
  { key: "word", label: "Estudo de Palavras", icon: Search, color: "text-emerald-400" },
  { key: "factbook", label: "Enciclopédia Bíblica", icon: BookMarked, color: "text-purple-400" },
];

const CREATIVE_TOOLS: ToolDefinition[] = [
  { key: "sermon", label: "Criador de Sermões", icon: ScrollText, color: "text-orange-400" },
  { key: "study", label: "Criador de Estudos", icon: GraduationCap, color: "text-indigo-400" },
  { key: "notes", label: "Minhas Notas", icon: MessageSquare, color: "text-pink-400" },
];

const EXPLORATION_TOOLS: ToolDefinition[] = [
  { key: "study_mode", label: "Modo Estudo (Scholar)", icon: Book, color: "text-[#D4AF37]" },
  { key: "atlas", label: "Atlas 3D", icon: Compass, color: "text-yellow-500" },
  { key: "graph", label: "Grafo Bíblico", icon: Share2, color: "text-amber-500" },
  { key: "library", label: "Biblioteca Enterprise", icon: Library, color: "text-slate-400" },
];

const AI_TOOLS: ToolDefinition[] = [
  { key: "ai", label: "Assistente TheoAI", icon: Bot, color: "text-blue-500" },
  { key: "console", label: "Console Agêntica", icon: Sparkles, color: "text-amber-500" },
];

export default function TheoSphereOS() {
  const { 
    activeBook, 
    activeChapter, 
    activeVerseId, 
    visibleVerseId, 
    activeTool, 
    setActiveTool,
    _hasHydrated 
  } = useTheoStore();

  const [authOpen, setAuthOpen] = useState(false);
  // Strong's ID pré-selecionado quando o usuário clica em "Estudo Completo"
  // no StrongOverlay do BibleReader. Resetado quando o tool fecha.
  const [pendingStrongId, setPendingStrongId] = useState<string | null>(null);

  // Keyboard shortcut: Esc to close tool
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveTool(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setActiveTool]);

  const currentReference = visibleVerseId || activeVerseId || `${activeBook} ${activeChapter}`;

  const closeTool = () => {
    setActiveTool(null);
    setPendingStrongId(null);
  };

  const openWordStudyWithStrong = (strongId: string) => {
    setPendingStrongId(strongId);
    setActiveTool("word");
  };

  // Hydration Guard: Prevents UI flickering and mismatches
  if (!_hasHydrated) return <BootingFallback label="NÚCLEO THEOSPHERE" />;

  const renderToolIcon = (t: ToolDefinition) => {
    const Icon = t.icon;
    const isActive = activeTool === t.key;
    return (
      <button
        key={t.key}
        onClick={() => (isActive ? closeTool() : setActiveTool(t.key))}
        title={t.label}
        aria-label={t.label}
        className={
          "group relative p-3.5 rounded-2xl transition-all duration-500 " +
          (isActive
            ? "bg-primary text-primary-fg shadow-[0_0_30px_rgba(255,215,0,0.2)] scale-105"
            : "text-white/20 hover:text-white/60 hover:bg-white/5")
        }
      >
        <Icon className={`w-6 h-6 transition-transform duration-500 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
        
        {/* Tooltip on Hover (Sidebar Style) */}
        <div className="absolute left-16 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-surface/95 backdrop-blur-xl border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-2 group-hover:translate-x-0 z-50 whitespace-nowrap shadow-2xl">
          {t.label}
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col md:flex-row w-full h-screen overflow-hidden bg-background text-foreground font-sans">
      
      {/* ─── Persistent Sidebar (The "OS" Shell) ──────────────────────── */}
      <aside
        aria-label="Navegação principal"
        className="fixed bottom-0 left-0 w-full h-20 md:relative md:h-full md:w-24 flex md:flex-col flex-row items-center justify-around md:justify-start py-4 md:py-8 border-t md:border-t-0 md:border-r border-white/5 bg-surface/80 backdrop-blur-3xl z-40"
      >
        {/* Brand Mark — Gold Globe (system identity) */}
        <button
          type="button"
          onClick={() => setActiveTool(null)}
          aria-label="Início — TheoSphere"
          className="hidden md:flex mb-10 relative w-12 h-12 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 items-center justify-center border border-white/10 hover:border-primary/50 transition-all hover:scale-110 active:scale-95 group flex-shrink-0"
        >
          <div className="absolute inset-0 bg-primary/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <Globe className="w-6 h-6 text-primary drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]" />
        </button>

        <div className="flex md:flex-col flex-row gap-2 md:gap-4 overflow-x-auto md:overflow-y-auto no-scrollbar md:pb-10 flex-grow justify-around md:justify-start px-4 md:px-0">
          <div className="flex md:flex-col flex-row gap-1">
             {PRIMARY_TOOLS.map(renderToolIcon)}
          </div>
          
          <div className="hidden md:block w-8 h-px bg-border-subtle mx-auto my-2" />
          
          <div className="flex md:flex-col flex-row gap-1">
             {CREATIVE_TOOLS.map(renderToolIcon)}
          </div>

          <div className="hidden md:block w-8 h-px bg-border-subtle mx-auto my-2" />

          <div className="flex md:flex-col flex-row gap-1">
             {EXPLORATION_TOOLS.map(renderToolIcon)}
          </div>

          <div className="hidden md:block w-8 h-px bg-border-subtle mx-auto my-2" />

          <div className="flex md:flex-col flex-row gap-1">
             {AI_TOOLS.map(renderToolIcon)}
          </div>
        </div>

        <div className="hidden md:flex mt-auto flex-col gap-2 pb-2">
          {/* User Account / Settings */}
          <button
            onClick={() => setAuthOpen(true)}
            className="p-3 rounded-2xl text-foreground/20 hover:text-foreground hover:bg-surface-hover transition-all"
            title="Configurações da Conta"
          >
            <ShieldCheck className="w-6 h-6" />
          </button>
        </div>
      </aside>

      {/* ─── Main Content Surface ────────────────────────────────────────── */}
      <main id="main" className="flex-grow relative overflow-hidden bg-background pb-16 md:pb-0">
        {/* BibleReader is the primary desktop background */}
        <div className={`flex w-full h-full transition-all duration-700 ease-in-out ${activeTool === "exegesis" ? "gap-4 p-4" : ""}`}>
          {/* BibleReader is the primary desktop background or part of split */}
          <div className={`transition-all duration-700 ease-in-out h-full overflow-hidden ${activeTool === "exegesis" ? "w-1/2 rounded-[32px] border border-white/10 shadow-2xl" : "w-full"}`}>
            <BibleReader onClose={() => {}} onOpenWordStudy={openWordStudyWithStrong} />
          </div>

          {/* Integrated Split Tools (Exegesis / Interlinear) */}
          <AnimatePresence>
            {activeTool === "exegesis" && (
              <motion.div 
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                className="w-1/2 h-full glass-heavy rounded-[32px] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
              >
                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <h3 className="text-sm font-black text-white/90 uppercase tracking-[0.2em]">Análise Exegética (Interlinear)</h3>
                  </div>
                  <button onClick={closeTool} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-grow overflow-y-auto custom-scrollbar">
                  <ExegesisPanel verse={currentReference} onClose={closeTool} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Immersive Full Screen Overlays for Research Tools */}
        <AnimatePresence mode="wait">
          {activeTool === "guide" && (
            <FullScreenOverlay onClose={closeTool}>
              <PassageGuide onClose={closeTool} initialRef={currentReference} />
            </FullScreenOverlay>
          )}
          {activeTool === "word" && (
             <FullScreenOverlay onClose={closeTool}>
               <WordStudy onClose={closeTool} initialStrongId={pendingStrongId} />
             </FullScreenOverlay>
          )}
          {activeTool === "factbook" && (
            <FullScreenOverlay onClose={closeTool}>
              <Factbook onClose={closeTool} />
            </FullScreenOverlay>
          )}
          {activeTool === "sermon" && (
             <FullScreenOverlay onClose={closeTool}>
               <SermonBuilder onClose={closeTool} />
             </FullScreenOverlay>
          )}
          {activeTool === "study" && (
            <FullScreenOverlay onClose={closeTool}>
              <StudyBuilder onClose={closeTool} />
            </FullScreenOverlay>
          )}
          {activeTool === "notes" && (
            <FullScreenOverlay onClose={closeTool}>
              <NoteEditor reference={currentReference} />
            </FullScreenOverlay>
          )}
          {activeTool === "library" && (
            <FullScreenOverlay onClose={closeTool}>
              <TheologicalLibrary onClose={closeTool} />
            </FullScreenOverlay>
          )}
          {activeTool === "manuscripts" && (
            <FullScreenOverlay onClose={closeTool}>
              <ManuscriptViewer reference={currentReference} />
            </FullScreenOverlay>
          )}
          {activeTool === "atlas" && (
            <FullScreenOverlay onClose={closeTool}>
              <TheoSphere3D onClose={closeTool} />
            </FullScreenOverlay>
          )}
          {activeTool === "ai" && (
             <ToolOverlay key="ai" onClose={closeTool} label="Assistente TheoAI">
               <AIAssistant onClose={closeTool} />
             </ToolOverlay>
          )}
          {activeTool === "console" && (
            <FullScreenOverlay onClose={closeTool}>
              <AgenticConsole />
            </FullScreenOverlay>
          )}
          {activeTool === "graph" && (
            <FullScreenOverlay onClose={closeTool}>
              <TheoSGraph onClose={closeTool} />
            </FullScreenOverlay>
          )}
          {activeTool === "study_mode" && (
            <FullScreenOverlay onClose={closeTool}>
              <StudyMode onClose={closeTool} />
            </FullScreenOverlay>
          )}
        </AnimatePresence>
      </main>

      {/* Auth */}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

// Overlays modularizados em @/components/ui/Overlay

function BootingFallback({ label }: { label: string }) {
  return (
    <div className="h-screen w-full bg-background text-foreground flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/40 animate-pulse" />
          <div className="absolute inset-0 bg-primary/10 blur-2xl animate-pulse" />
        </div>
        <span className="text-[10px] tracking-[0.4em] font-black text-foreground/60 uppercase">
          {label}…
        </span>
      </div>
    </div>
  );
}

