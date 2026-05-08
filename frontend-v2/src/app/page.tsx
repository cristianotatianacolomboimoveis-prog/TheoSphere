"use client";

/**
 * TheoSphere — Unified OS Launcher.
 * 
 * Restores all "missing" academic tools (Exegesis, Manuscripts, Notes)
 * and upgrades the UI to a premium vertical Sidebar for professional discovery.
 */

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  BookOpen,
  ScrollText,
  GraduationCap,
  BookMarked,
  Search,
  Library,
  Map,
  Bot,
  ShieldCheck,
  Sparkles,
  Zap,
  Image as ImageIcon,
  MessageSquare,
  LayoutDashboard
} from "lucide-react";
import * as Framer from "framer-motion";
const { motion, AnimatePresence } = Framer;
import { useTheoStore } from "@/store/useTheoStore";

// ─── Heavy components: lazy-loaded, no SSR ─────────────────────────────────
const BibleReader = dynamic(() => import("@/components/BibleReader"), {
  ssr: false,
  loading: () => <BootingFallback label="Carregando Bible Reader" />,
});
const ExegesisPanel = dynamic(() => import("@/components/ExegesisPanel"), { ssr: false });
const SermonBuilder = dynamic(() => import("@/components/SermonBuilder"), { ssr: false });
const StudyBuilder = dynamic(() => import("@/components/StudyBuilder"), { ssr: false });
const Factbook = dynamic(() => import("@/components/Factbook"), { ssr: false });
const WordStudy = dynamic(() => import("@/components/WordStudy"), { ssr: false });
const TheologicalLibrary = dynamic(() => import("@/components/TheologicalLibrary"), { ssr: false });
const PassageGuide = dynamic(() => import("@/components/PassageGuide"), { ssr: false });
const AIAssistant = dynamic(() => import("@/components/AIAssistant"), { ssr: false });
const Atlas4D = dynamic(() => import("@/components/Atlas4D"), { ssr: false });
const AgenticConsole = dynamic(() => import("@/components/AgenticConsole"), { ssr: false });
const AuthModal = dynamic(() => import("@/components/AuthModal"), { ssr: false });
const ManuscriptViewer = dynamic(() => import("@/components/ManuscriptViewer"), { ssr: false });
const NoteEditor = dynamic(() => import("@/components/NoteEditor"), { ssr: false });

// ─── Tool registry ──────────────────────────────────────────────────────────
type ToolKey =
  | "exegesis"
  | "sermon"
  | "study"
  | "factbook"
  | "word"
  | "library"
  | "guide"
  | "ai"
  | "atlas"
  | "console"
  | "manuscripts"
  | "notes"
  | null;

interface ToolDefinition {
  key: Exclude<ToolKey, null>;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const PRIMARY_TOOLS: ToolDefinition[] = [
  { key: "exegesis", label: "Análise Exegética", icon: Zap, color: "text-amber-400" },
  { key: "guide", label: "Guia de Passagem", icon: BookOpen, color: "text-blue-400" },
  { key: "word", label: "Estudo de Palavras", icon: Search, color: "text-emerald-400" },
  { key: "factbook", label: "Factbook", icon: BookMarked, color: "text-purple-400" },
];

const CREATIVE_TOOLS: ToolDefinition[] = [
  { key: "sermon", label: "Sermon Builder", icon: ScrollText, color: "text-orange-400" },
  { key: "study", label: "Study Builder", icon: GraduationCap, color: "text-indigo-400" },
  { key: "notes", label: "Minhas Notas", icon: MessageSquare, color: "text-pink-400" },
];

const EXPLORATION_TOOLS: ToolDefinition[] = [
  { key: "atlas", label: "Atlas 4D", icon: Map, color: "text-cyan-400" },
  { key: "manuscripts", label: "Manuscritos Digitais", icon: ImageIcon, color: "text-rose-400" },
  { key: "library", label: "Biblioteca", icon: Library, color: "text-slate-400" },
];

const AI_TOOLS: ToolDefinition[] = [
  { key: "ai", label: "TheoAI Assistant", icon: Bot, color: "text-blue-500" },
  { key: "console", label: "Agentic Console", icon: Sparkles, color: "text-amber-500" },
];

export default function TheoSphereApp() {
  const [activeTool, setActiveTool] = useState<ToolKey>(null);
  const [authOpen, setAuthOpen] = useState(false);
  
  const { activeBook, activeChapter, activeVerseId, visibleVerseId } = useTheoStore();
  const currentReference = visibleVerseId || activeVerseId || `${activeBook} ${activeChapter}`;

  const closeTool = () => setActiveTool(null);

  const renderToolIcon = (t: ToolDefinition) => {
    const Icon = t.icon;
    const isActive = activeTool === t.key;
    return (
      <button
        key={t.key}
        onClick={() => setActiveTool(t.key)}
        title={t.label}
        aria-label={t.label}
        className={
          "group relative p-3 rounded-2xl transition-all duration-300 " +
          (isActive
            ? "bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            : "text-white/30 hover:text-white/60 hover:bg-white/5")
        }
      >
        <Icon className={`w-6 h-6 ${isActive ? t.color : "group-hover:" + t.color}`} />
        {isActive && (
          <div className={`absolute -left-3 top-1/4 w-1 h-1/2 rounded-r-full bg-current ${t.color}`} />
        )}
        
        {/* Tooltip on Hover (Sidebar Style) */}
        <div className="absolute left-16 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-[#0a0f1a] border border-white/10 text-[10px] font-black uppercase tracking-widest text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-2 group-hover:translate-x-0 z-50 whitespace-nowrap shadow-2xl">
          {t.label}
        </div>
      </button>
    );
  };

  return (
    <div className="flex w-full h-screen overflow-hidden bg-[#05080f] text-white font-sans">
      
      {/* ─── Persistent Left Sidebar (The "OS" Shell) ──────────────────────── */}
      <aside className="w-20 flex-shrink-0 flex flex-col items-center py-6 border-r border-white/5 bg-[#05080f] z-40">
        {/* Brand Logo */}
        <div className="mb-8 p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20 cursor-pointer hover:scale-110 transition-transform"
             onClick={() => setActiveTool(null)}>
          <LayoutDashboard className="w-6 h-6 text-slate-950" />
        </div>

        <div className="flex-grow flex flex-col gap-4 overflow-y-auto no-scrollbar pb-10">
          <div className="flex flex-col gap-1">
             {PRIMARY_TOOLS.map(renderToolIcon)}
          </div>
          
          <div className="w-8 h-px bg-white/5 mx-auto my-2" />
          
          <div className="flex flex-col gap-1">
             {CREATIVE_TOOLS.map(renderToolIcon)}
          </div>

          <div className="w-8 h-px bg-white/5 mx-auto my-2" />

          <div className="flex flex-col gap-1">
             {EXPLORATION_TOOLS.map(renderToolIcon)}
          </div>

          <div className="w-8 h-px bg-white/5 mx-auto my-2" />

          <div className="flex flex-col gap-1">
             {AI_TOOLS.map(renderToolIcon)}
          </div>
        </div>

        {/* User Account / Settings */}
        <button
          onClick={() => setAuthOpen(true)}
          className="mt-auto p-3 rounded-2xl text-white/20 hover:text-white hover:bg-white/5 transition-all"
          title="Configurações da Conta"
        >
          <ShieldCheck className="w-6 h-6" />
        </button>
      </aside>

      {/* ─── Main Content Surface ────────────────────────────────────────── */}
      <main className="flex-grow relative overflow-hidden bg-black">
        {/* BibleReader is the primary desktop background */}
        <BibleReader onClose={() => {}} />

        {/* Floating Tool Overlays */}
        <AnimatePresence mode="wait">
          {activeTool === "exegesis" && (
            <ToolOverlay key="exegesis" onClose={closeTool} label="Análise Exegética">
              <ExegesisPanel verse={currentReference} onClose={closeTool} />
            </ToolOverlay>
          )}
          {activeTool === "guide" && (
            <ToolOverlay key="guide" onClose={closeTool} label="Passage Guide">
              <PassageGuide onClose={closeTool} initialRef={currentReference} />
            </ToolOverlay>
          )}
          {activeTool === "word" && (
             <ToolOverlay key="word" onClose={closeTool} label="Word Study">
               <WordStudy onClose={closeTool} />
             </ToolOverlay>
          )}
          {activeTool === "factbook" && (
            <ToolOverlay key="factbook" onClose={closeTool} label="Factbook">
              <Factbook onClose={closeTool} />
            </ToolOverlay>
          )}
          {activeTool === "sermon" && (
             <ToolOverlay key="sermon" onClose={closeTool} label="Sermon Builder">
               <SermonBuilder onClose={closeTool} />
             </ToolOverlay>
          )}
          {activeTool === "study" && (
            <ToolOverlay key="study" onClose={closeTool} label="Study Builder">
              <StudyBuilder onClose={closeTool} />
            </ToolOverlay>
          )}
          {activeTool === "notes" && (
            <ToolOverlay key="notes" onClose={closeTool} label="Minhas Notas">
              <NoteEditor reference={currentReference} />
            </ToolOverlay>
          )}
          {activeTool === "library" && (
            <ToolOverlay key="library" onClose={closeTool} label="Biblioteca Teológica">
              <TheologicalLibrary onClose={closeTool} />
            </ToolOverlay>
          )}
          {activeTool === "manuscripts" && (
            <ToolOverlay key="manuscripts" onClose={closeTool} label="Manuscritos Digitais">
              <ManuscriptViewer reference={currentReference} />
            </ToolOverlay>
          )}
          {activeTool === "atlas" && (
            <FullScreenOverlay onClose={closeTool}>
              <Atlas4D />
            </FullScreenOverlay>
          )}
          {activeTool === "ai" && (
             <ToolOverlay key="ai" onClose={closeTool} label="TheoAI Assistant">
               <AIAssistant onClose={closeTool} />
             </ToolOverlay>
          )}
          {activeTool === "console" && (
            <FullScreenOverlay onClose={closeTool}>
              <AgenticConsole />
            </FullScreenOverlay>
          )}
        </AnimatePresence>
      </main>

      {/* Auth */}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

/**
 * Standardized overlay for most tools. 
 * Allows the tool to feel like a window over the Bible text.
 */
function ToolOverlay({ 
  children, 
  onClose,
  label
}: { 
  children: React.ReactNode; 
  onClose: () => void;
  label: string;
}) {
  return (
    <div className="absolute inset-0 z-50 bg-[#05080f]/80 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in zoom-in duration-300">
      <div className="w-full h-full max-w-7xl bg-[#05080f] rounded-[32px] border border-white/10 shadow-2xl overflow-hidden flex flex-col relative">
        {/* Integrated Window Header */}
        <div className="h-12 flex-shrink-0 flex items-center justify-between px-6 border-b border-white/5 bg-white/[0.02]">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{label}</span>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg text-white/30 hover:text-white transition-all">
             <span className="text-xs font-bold px-2 uppercase">Fechar [Esc]</span>
          </button>
        </div>
        <div className="flex-grow overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

function FullScreenOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-[#05080f] animate-in fade-in duration-500">
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-[60] px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[10px] font-black uppercase tracking-widest border border-white/10 backdrop-blur-xl transition-all"
      >
        Voltar para o Texto
      </button>
      {children}
    </div>
  );
}

function BootingFallback({ label }: { label: string }) {
  return (
    <div className="h-screen w-full bg-[#05080f] text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 animate-pulse" />
          <div className="absolute inset-0 bg-amber-500/10 blur-2xl animate-pulse" />
        </div>
        <span className="text-[10px] tracking-[0.4em] font-black text-white/60 uppercase">
          {label}…
        </span>
      </div>
    </div>
  );
}

