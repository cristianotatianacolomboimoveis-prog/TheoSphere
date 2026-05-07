"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Globe, Map as MapIcon, Book, Search, Settings, Zap, Library,
  MessageSquare, Sparkles, Command, Keyboard, Languages, ScrollText,
  BookOpen, FileText, Users, ChevronRight, X, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BibleReader from "@/components/BibleReader";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useTheoStore } from "@/store/useTheoStore";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useAuth } from "@/hooks/useAuth";
import AuthModal from "@/components/AuthModal";

/* --- Neural Grid Background ------------------------------ */
const NeuralGrid = () => (
  <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
    <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-blue-500/5" />
  </div>
);

/* --- Splash Screen --------------------------------------- */
const SplashScreen = ({ progress }: { progress: number }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0, scale: 1.05 }}
    className="fixed inset-0 z-[1000] bg-[#05080f] flex flex-col items-center justify-center"
  >
    <NeuralGrid />
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 flex flex-col items-center"
    >
      <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.3)] mb-8 animate-pulse-glow">
        <Globe className="w-10 h-10 text-slate-950" />
      </div>
      <h1 className="text-3xl font-black tracking-tighter text-white mb-2">
        THEO<span className="text-gradient">SPHERE</span>
      </h1>
      <p className="text-[10px] text-white/30 font-bold tracking-[0.4em] uppercase mb-12">SO Teológico de Nova Geração</p>
      
      <div className="w-64 h-1 bg-white/5 rounded-full overflow-hidden relative">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
        />
      </div>
      <p className="text-[9px] text-amber-500/50 font-black uppercase tracking-widest mt-4">
        {progress < 40 ? "Inicializando DuckDB WASM..." : progress < 70 ? "Carregando Camadas Geoespaciais..." : "Otimizando TheoAI..."}
      </p>
    </motion.div>
  </motion.div>
);

/* -- Dynamic imports --------------------------------------- */

const CesiumGlobe = dynamic(() => import("@/components/CesiumGlobe"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#070b14] skeleton" />,
});

const Atlas4D = dynamic(() => import("@/components/Atlas4D"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#070b14] flex items-center justify-center"><div className="text-amber-500 font-bold uppercase tracking-widest text-[10px]">Iniciando WebGPU Engine...</div></div>,
});

const TheologicalLibrary = dynamic(
  () => import("@/components/TheologicalLibrary"),
  { ssr: false, loading: () => <div className="w-full h-full bg-[#070b14] skeleton" /> }
);

const AIAssistant = dynamic(() => import("@/components/AIAssistant"), {
  ssr: false, loading: () => <div className="w-full h-full bg-[#070b14] skeleton" />,
});

const PassageGuide = dynamic(() => import("@/components/PassageGuide"), {
  ssr: false, loading: () => <div className="w-full h-full bg-[#070b14] skeleton" />,
});

const WordStudy = dynamic(() => import("@/components/WordStudy"), {
  ssr: false, loading: () => <div className="w-full h-full bg-[#070b14] skeleton" />,
});

const Factbook = dynamic(() => import("@/components/Factbook"), {
  ssr: false, loading: () => <div className="w-full h-full bg-[#070b14] skeleton" />,
});

const SermonBuilder = dynamic(() => import("@/components/SermonBuilder"), {
  ssr: false, loading: () => <div className="w-full h-full bg-[#070b14] skeleton" />,
});

const StudyBuilder = dynamic(() => import("@/components/StudyBuilder"), {
  ssr: false, loading: () => <div className="w-full h-full bg-[#070b14] skeleton" />,
});

const ExegesisPanel = dynamic(() => import("@/components/ExegesisPanel"), {
  ssr: false, loading: () => <div className="w-full h-full bg-white flex items-center justify-center"><Loader2 className="w-8 h-8 text-slate-900 animate-spin" /></div>,
});

/* --- Tool IDs --------------------------------------------- */

type ToolId = "atlas" | "bible" | "library" | "ai" | "passage-guide" | "word-study" | "factbook" | "sermon" | "study" | "exegesis";

/* --- Sidebar Button --------------------------------------- */

function SidebarButton({
  icon: Icon, label, active, onClick, badge, color,
}: {
  icon: React.ElementType; label: string; active?: boolean; onClick: () => void;
  badge?: string; color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative p-2.5 rounded-xl transition-all group ${
        active
          ? `${color || "bg-amber-500"} text-slate-950 shadow-lg`
          : "hover:bg-white/5 text-white/40 hover:text-white/80"
      }`}
      title={label}
      style={active && color ? { background: color } : undefined}
    >
      <Icon className="w-5 h-5" />
      <div className="absolute left-14 top-1/2 -translate-y-1/2 glass-heavy px-3 py-1.5 rounded-lg text-xs font-medium text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all scale-95 group-hover:scale-100 z-[60] shadow-xl">
        {label}
        {badge && <span className="ml-2 text-[8px] bg-white/10 px-1.5 py-0.5 rounded">{badge}</span>}
      </div>
    </button>
  );
}

/* --- Command Palette -------------------------------------- */

function CommandPalette({
  open, onClose, onAction,
}: { open: boolean; onClose: () => void; onAction: (action: ToolId) => void }) {
  const [query, setQuery] = useState("");

  const actions: { id: ToolId; label: string; icon: React.ElementType; shortcut: string; desc: string }[] = [
    { id: "bible", label: "Scriptura", icon: Book, shortcut: "B", desc: "Leitor Bíblico Multi-Versão" },
    { id: "passage-guide", label: "Passage Guide", icon: ScrollText, shortcut: "P", desc: "Guia completo de passagem" },
    { id: "word-study", label: "Word Study", icon: Languages, shortcut: "W", desc: "Estudo de palavras Grego/Hebraico" },
    { id: "factbook", label: "Factbook", icon: BookOpen, shortcut: "F", desc: "Enciclopédia bíblica" },
    { id: "library", label: "Biblioteca", icon: Library, shortcut: "L", desc: "Biblioteca teológica" },
    { id: "ai", label: "TheoAI", icon: Sparkles, shortcut: "A", desc: "Assistente teológico IA" },
    { id: "sermon", label: "Sermon Builder", icon: FileText, shortcut: "S", desc: "Construtor de sermões" },
    { id: "study", label: "Study Builder", icon: Users, shortcut: "G", desc: "Construtor de estudos" },
    { id: "atlas", label: "Atlas 4D/3D", icon: Globe, shortcut: "M", desc: "Alternar mapa 4D DeckGL/Cesium" },
  ];

  const filtered = actions.filter(a =>
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    a.desc.toLowerCase().includes(query.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[18vh]">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className="relative glass-heavy rounded-2xl w-full max-w-lg shadow-2xl border border-white/10 overflow-hidden z-10"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <Command className="w-4 h-4 text-amber-500/60" />
          <input
            type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ferramenta..."
            className="flex-grow bg-transparent text-sm text-white outline-none placeholder:text-white/20"
            autoFocus
          />
          <kbd className="text-[10px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">ESC</kbd>
        </div>
        <div className="p-2 max-h-72 overflow-y-auto">
          {filtered.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => { onAction(action.id); onClose(); setQuery(""); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-all text-left group"
              >
                <Icon className="w-4 h-4 text-white/30 group-hover:text-amber-500 transition-colors" />
                <div className="flex-grow">
                  <span className="text-sm text-white/70 group-hover:text-white transition-colors">{action.label}</span>
                  <p className="text-[10px] text-white/20">{action.desc}</p>
                </div>
                <kbd className="text-[9px] text-white/15 bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/5">⌘{action.shortcut}</kbd>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

/* --- Main Content Component --- */

function TheoSphereContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  
  const [mode, setMode] = useState<"2d" | "3d">("2d"); 
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  
  const { isAuthenticated, logout, userId: authUserId } = useAuth();
  const { 
    activeBook, activeChapter, activeVerseId, visibleVerseId, viewMode,
    setActiveVerse, setBibleReference, setHasHydrated, setViewMode
  } = useTheoStore();

  useEffect(() => {
    setHasHydrated(true);
  }, [setHasHydrated]);

  // Derivando estado diretamente da URL (Single Source of Truth)
  const showReader = searchParams.get("reader") === "true";
  const activeOverlay = searchParams.get("tool") as ToolId | null;

  const updateUrl = (tool: ToolId | null, reader: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (tool) params.set("tool", tool);
    else params.delete("tool");

    if (reader) params.set("reader", "true");
    else params.delete("reader");
    
    const query = params.toString();
    router.push(query ? `?${query}` : window.location.pathname, { scroll: false });
  };

  /* -- Loading Simulation --------------------------------- */
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setLoading(false), 500);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
    return () => clearInterval(interval);
  }, []);

  /* -- Open tool ------------------------------------------ */
  const openTool = useCallback((tool: ToolId) => {
    if (tool === "atlas") {
      setMode(prev => prev === "2d" ? "3d" : "2d");
      return;
    }
    
    let nextOverlay: ToolId | null = activeOverlay;
    let nextReader = showReader;

    if (tool === "bible") {
      nextReader = !showReader;
      nextOverlay = null;
    } else {
      nextOverlay = activeOverlay === tool ? null : tool;
      nextReader = false;
    }

    updateUrl(nextOverlay, nextReader);
  }, [activeOverlay, showReader, searchParams]);

  const closeOverlay = () => {
    updateUrl(null, showReader);
  };

  /* -- Keyboard shortcuts --------------------------------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCommandPaletteOpen(prev => !prev); return; }
      if (e.key === "Escape") { setCommandPaletteOpen(false); return; }
      if (e.metaKey || e.ctrlKey) {
        const map: Record<string, ToolId> = {
          b: "bible", l: "library", p: "passage-guide", w: "word-study",
          f: "factbook", s: "sermon", g: "study", m: "atlas", e: "exegesis"
        };
        const tool = map[e.key.toLowerCase()];
        if (tool) { e.preventDefault(); openTool(tool); }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openTool]);

  /* -- Active tab for header nav -------------------------- */
  const getNavTab = () => {
    if (activeOverlay === "library") return "library";
    if (activeOverlay === "ai") return "ai";
    if (activeOverlay) return "tools";
    return "atlas";
  };

  const navTab = getNavTab();
  const hasOverlay = !!activeOverlay;

  return (
    <main className="relative w-screen h-screen bg-[#05080f] text-slate-200 overflow-hidden font-sans">
      <AnimatePresence>
        {loading && <SplashScreen progress={loadProgress} />}
      </AnimatePresence>

      <NeuralGrid />
      {/* -- Top Bar --------------------------------------- */}
      <header className="absolute top-0 left-0 w-full h-14 glass-heavy z-50 flex items-center justify-between px-5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/15">
              <Globe className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="text-lg font-black tracking-tighter text-white">
              THEO<span className="text-gradient">SPHERE</span>
            </h1>
          </div>

          <div className="divider-v h-5" />

          <nav className="flex gap-0.5">
            {[
              { id: "atlas", label: "Atlas 4D" },
              { id: "tools", label: "Ferramentas" },
              { id: "library", label: "Biblioteca" },
              { id: "ai", label: "TheoAI" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === "atlas") { updateUrl(null, false); }
                  else if (tab.id === "library") openTool("library");
                  else if (tab.id === "ai") openTool("ai");
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  navTab === tab.id
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                    : "hover:bg-white/5 text-white/40 hover:text-white/70 border border-transparent"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all text-white/25 hover:text-white/50"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-[11px]">Buscar</span>
            <kbd className="text-[9px] bg-white/5 px-1 py-0.5 rounded border border-white/5 ml-2">⌘K</kbd>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 glass-amber rounded-lg">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-[11px] font-bold tracking-wider text-amber-300">1,240 XP</span>
          </div>

          <button className="p-2 hover:bg-white/5 rounded-lg text-white/30 hover:text-white/60 transition-colors">
            <Settings className="w-4 h-4" />
          </button>

          {isAuthenticated ? (
            <button 
              onClick={() => {
                if (confirm("Deseja sair da sua conta?")) logout();
              }}
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 border border-white/10 flex items-center justify-center text-[11px] font-bold shadow-lg shadow-orange-500/15 text-white hover:scale-105 transition-all"
              title="Sair"
            >
              {authUserId?.slice(0, 2).toUpperCase() || "TH"}
            </button>
          ) : (
            <button 
              onClick={() => setAuthModalOpen(true)}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-[11px] font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              Entrar
            </button>
          )}
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
      />

      {/* -- Main Viewport -------------------------------- */}
      <div className="relative w-full h-full pt-14 flex">
        {/* Left Sidebar */}
        <aside className="w-14 h-full glass-heavy border-r border-white/[0.03] flex flex-col items-center py-4 gap-1 z-40 overflow-y-auto custom-scrollbar">
          {/* Map Tools */}
          <SidebarButton icon={mode === "2d" ? Globe : MapIcon} label={mode === "2d" ? "Modo Cesium 3D Globe" : "Modo Atlas 4D"}
            onClick={() => setMode(mode === "2d" ? "3d" : "2d")} />

          <div className="divider w-6 my-1" />

          {/* Bible Tools */}
          <SidebarButton icon={Book} label="Scriptura" badge="⌘B" active={showReader}
            onClick={() => openTool("bible")} />
          <SidebarButton icon={ScrollText} label="Passage Guide" badge="⌘P" active={activeOverlay === "passage-guide"}
            onClick={() => openTool("passage-guide")} />
          <SidebarButton icon={Languages} label="Word Study" badge="⌘W" active={activeOverlay === "word-study"}
            onClick={() => openTool("word-study")} />
          <SidebarButton icon={BookOpen} label="Factbook" badge="⌘F" active={activeOverlay === "factbook"}
            onClick={() => openTool("factbook")} />

          <div className="divider w-6 my-1" />

          {/* Library & AI */}
          <SidebarButton icon={Library} label="Biblioteca" badge="⌘L" active={activeOverlay === "library"}
            onClick={() => openTool("library")} />
          <SidebarButton icon={Sparkles} label="TheoAI" active={activeOverlay === "ai"}
            onClick={() => openTool("ai")} />

          <div className="divider w-6 my-1" />

          {/* Building Tools */}
          <SidebarButton icon={FileText} label="Sermon Builder" badge="⌘S" active={activeOverlay === "sermon"}
            onClick={() => openTool("sermon")} />
          <SidebarButton icon={Users} label="Study Builder" badge="⌘G" active={activeOverlay === "study"}
            onClick={() => openTool("study")} />

          <div className="flex-grow" />

          <SidebarButton icon={MessageSquare} label="Comunidade" onClick={() => {}} />
          <SidebarButton icon={Keyboard} label="Atalhos (⌘K)" onClick={() => setCommandPaletteOpen(true)} />
        </aside>

        {/* -- Content Area (Dynamic Resizable Grid) -------------------------------- */}
        <div className="flex-grow relative overflow-hidden transition-all duration-500 ease-in-out flex">
          <PanelGroup direction="horizontal">
            {/* 1. Left Panel: Map or Other Tools */}
            {!showReader && (
              <Panel defaultSize={100} minSize={20}>
                <div className="relative w-full h-full">
                   <div className={`absolute inset-0 transition-all duration-700 ${hasOverlay ? "opacity-10 scale-[1.02] blur-sm" : "opacity-100"}`}>
                    <AnimatePresence mode="wait">
                      {mode === "3d" ? (
                        <motion.div key="3d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.5 }} className="absolute inset-0">
                          <CesiumGlobe />
                        </motion.div>
                      ) : (
                        <motion.div key="2d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.5 }} className="absolute inset-0 p-2">
                          <ErrorBoundary>
                            <Atlas4D />
                          </ErrorBoundary>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Overlays (Library, AI, etc.) */}
                  <AnimatePresence>
                    {activeOverlay && activeOverlay !== "exegesis" && (
                      <motion.div
                        key={activeOverlay}
                        initial={{ opacity: 0, y: 30, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.98 }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="absolute inset-3 z-40 glass-heavy rounded-2xl border border-white/5 shadow-2xl overflow-hidden"
                      >
                        {activeOverlay === "library" && <TheologicalLibrary onClose={closeOverlay} />}
                        {activeOverlay === "ai" && <AIAssistant onClose={closeOverlay} />}
                        {activeOverlay === "passage-guide" && <PassageGuide onClose={closeOverlay} />}
                        {activeOverlay === "word-study" && <WordStudy onClose={closeOverlay} />}
                        {activeOverlay === "factbook" && <Factbook onClose={closeOverlay} />}
                        {activeOverlay === "sermon" && <SermonBuilder onClose={closeOverlay} />}
                        {activeOverlay === "study" && <StudyBuilder onClose={closeOverlay} />}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Panel>
            )}

            {/* 2. Central Panel: Bible Reader */}
            {showReader && (
              <>
                <Panel defaultSize={activeOverlay === "exegesis" ? 50 : 100} minSize={30}>
                   <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full"
                  >
                    <BibleReader onClose={() => updateUrl(activeOverlay, false)} />
                  </motion.div>
                </Panel>
                
                {/* Resize Handle for Right Panel */}
                <PanelResizeHandle className="w-1.5 h-full bg-white/5 hover:bg-amber-500/30 transition-colors flex items-center justify-center group">
                   <div className="w-0.5 h-8 bg-white/10 group-hover:bg-amber-500/50 rounded-full" />
                </PanelResizeHandle>
              </>
            )}

            {/* 3. Right Panel: Exegesis PhD (Sync Mode) */}
            {activeOverlay === "exegesis" && (
              <Panel defaultSize={35} minSize={25} maxSize={60}>
                <motion.div
                  initial={{ x: "100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "100%", opacity: 0 }}
                  transition={{ type: "spring", damping: 30, stiffness: 200 }}
                  className="h-full border-l border-white/5 shadow-2xl bg-[#05080f]"
                >
                  <ExegesisPanel 
                    verse={visibleVerseId || `${activeBook} ${activeChapter}:1`} 
                    onClose={closeOverlay} 
                  />
                </motion.div>
              </Panel>
            )}
          </PanelGroup>
        </div>
      </div>

      {/* -- Status Bar ------------------------------------ */}
      <div className="absolute bottom-0 left-14 right-0 h-6 glass-heavy border-t border-white/[0.03] z-30 flex items-center justify-between px-4 pointer-events-none">
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-white/15 font-bold tracking-widest uppercase">TheoSphere OS v2.0</span>
          <div className="divider-v h-3" />
          <span className="text-[9px] text-white/15">
            {mode === "2d" ? "WebGPU Atlas 4D" : "Cesium 3D Globe"} ·{" "}
            {activeOverlay ? activeOverlay.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase()) : "Geo-Engine Ativa"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-white/15">⌘K Buscar</span>
          <span className="text-[9px] text-white/15">⌘B Bíblia</span>
          <span className="text-[9px] text-white/15">⌘P Passage</span>
          <span className="text-[9px] text-white/15">⌘W Words</span>
          <span className="text-[9px] text-white/15">⌘F Factbook</span>
        </div>
      </div>

      {/* -- Command Palette ------------------------------- */}
      <AnimatePresence>
        {commandPaletteOpen && (
          <CommandPalette
            open={commandPaletteOpen}
            onClose={() => setCommandPaletteOpen(false)}
            onAction={openTool}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

export default function TheoSphereApp() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-[#05080f] flex items-center justify-center text-white font-bold">CARREGANDO THEOSPHERE...</div>}>
      <TheoSphereContent />
    </Suspense>
  );
}
