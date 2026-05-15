"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useTheoStore } from "@/store/useTheoStore";

// Components
import { Sidebar } from "@/components/layout/Sidebar";
import { LogosTopBar } from "@/components/layout/LogosTopBar";
import { Workspace } from "@/components/layout/Workspace";
import { UnifiedAssistantOverlay } from "@/components/layout/UnifiedAssistantOverlay";
import AuthModal from "@/components/AuthModal";
import DashboardHome from "@/components/dashboard/DashboardHome";

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
const LogosDashboard = dynamic(() => import("@/components/dashboard/LogosDashboard").then(m => m.LogosDashboard), { ssr: false });
const Encyclopedia = dynamic(() => import("@/components/Encyclopedia"), { ssr: false });

// Pages
const ProgressPage = dynamic(() => import("@/components/pages/ProgressPage"), { ssr: false });
const CommunityPage = dynamic(() => import("@/components/pages/CommunityPage"), { ssr: false });
const SettingsPage = dynamic(() => import("@/components/pages/SettingsPage"), { ssr: false });

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
  const [pendingStrongId, setPendingStrongId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveTool("dashboard");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setActiveTool]);

  const currentReference = visibleVerseId || activeVerseId || `${activeBook} ${activeChapter}`;

  const closeTool = () => {
    setActiveTool("dashboard");
    setPendingStrongId(null);
  };

  const openWordStudyWithStrong = (strongId: string) => {
    setPendingStrongId(strongId);
    setActiveTool("word");
  };

  if (!_hasHydrated) return <BootingFallback label="NÚCLEO THEOSPHERE" />;

  return (
    <div className="flex flex-col w-full h-screen overflow-hidden bg-[#DDE2E8] dark:bg-[#0A0D14] text-foreground font-sans">
      
      {/* ─── Logos Top Bar (Global Search & Tools) ────────────────────────── */}
      <LogosTopBar />

      <div className="flex flex-grow w-full overflow-hidden">
        {/* ─── Sidebar Persistente (Logos Shortcuts) ─────────────────────── */}
        <Sidebar 
            activeTool={activeTool} 
            onSelectTool={(tool) => setActiveTool(tool)} 
        />

        {/* ─── Main Application Area ───────────────────────────────────── */}
        <main className="flex-grow relative overflow-hidden bg-white dark:bg-[#12161B]">
            <AnimatePresence mode="wait">
            <motion.div
                key={activeTool || "dashboard"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="h-full w-full"
            >
                {/* Home Screen (Logos Dashboard) */}
                {(!activeTool || activeTool === "dashboard") && <DashboardHome />}
                {activeTool === "library" && <TheologicalLibrary onClose={closeTool} />}
                {activeTool === "progress" && <ProgressPage />}
                {activeTool === "community" && <CommunityPage />}
                {activeTool === "settings" && <SettingsPage />}

                {/* Workspace (Tiled Layout) */}
                {(activeTool === "exegesis" || activeTool === "study_mode") && (
                <Workspace 
                    leftTitle="Escritura Sagrada"
                    middleTitle={activeTool === "exegesis" ? "Análise Crítica & Interlinear" : "Guia de Passagem & Comentários"}
                    rightTitle="Análise Lexical & Strong's"
                    leftPane={<BibleReader hideHeader onClose={() => {}} onOpenWordStudy={openWordStudyWithStrong} />}
                    rightPane={
                    activeTool === "exegesis" 
                        ? <ExegesisPanel hideHeader verse={currentReference} onClose={closeTool} /> 
                        : <PassageGuide onClose={closeTool} initialRef={currentReference} />
                    }
                    bottomPane={<WordStudy hideHeader onClose={() => {}} initialStrongId={pendingStrongId} />}
                />
                )}

                {/* Single Tool Views */}
                {activeTool === "guide" && <PassageGuide onClose={closeTool} initialRef={currentReference} />}
                {activeTool === "word" && <WordStudy onClose={closeTool} initialStrongId={pendingStrongId} />}
                {activeTool === "factbook" && <Factbook onClose={closeTool} />}
                {activeTool === "encyclopedia" && <Encyclopedia onClose={closeTool} />}
                {activeTool === "sermon" && <SermonBuilder onClose={closeTool} />}
                {activeTool === "study" && <StudyBuilder onClose={closeTool} />}
                {activeTool === "notes" && <NoteEditor reference={currentReference} />}
                {activeTool === "atlas" && (
                <div className="flex h-full w-full overflow-hidden">
                    <div className="flex-grow relative h-full">
                    <TheoSphere3D onClose={closeTool} />
                    </div>
                    <LogosDashboard />
                </div>
                )}
                {activeTool === "console" && <AgenticConsole />}
                {activeTool === "graph" && <TheoSGraph onClose={closeTool} />}
            </motion.div>
            </AnimatePresence>
        </main>
      </div>

      {/* Auth & Overlays */}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      <UnifiedAssistantOverlay />
    </div>
  );
}

function BootingFallback({ label }: { label: string }) {
  return (
    <div className="h-screen w-full bg-[#DDE2E8] dark:bg-[#0A0D14] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-[10px] tracking-[0.4em] font-black text-gray-400 uppercase">
          {label}…
        </span>
      </div>
    </div>
  );
}

import { Loader2 } from "lucide-react";
