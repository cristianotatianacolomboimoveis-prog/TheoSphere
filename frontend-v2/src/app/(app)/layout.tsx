"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useTheoStore, ToolId } from "@/store/useTheoStore";

import { Sidebar } from "@/components/layout/Sidebar";
import { TheoSphereTopBar } from "@/components/layout/TheoSphereTopBar";
import { CommandBar } from "@/components/layout/CommandBar";
import { UnifiedAssistantOverlay } from "@/components/layout/UnifiedAssistantOverlay";
import { ServerWarmupBanner } from "@/components/layout/ServerWarmupBanner";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import LoginPage from "./login/page";
import { Loader2 } from "lucide-react";

/** pathname → ToolId */
const PATHNAME_TO_TOOL: Record<string, ToolId> = {
  "/": "dashboard",
  "/exegesis": "exegesis",
  "/atlas": "atlas",
  "/factbook": "factbook",
  "/encyclopedia": "encyclopedia",
  "/study": "study_mode",
  "/notes": "notes",
  "/graph": "graph",
  "/settings": "settings",
  "/library": "library",
};

/** ToolId → pathname */
const TOOL_TO_PATH: Record<string, string> = {
  dashboard: "/",
  exegesis: "/exegesis",
  atlas: "/atlas",
  factbook: "/factbook",
  encyclopedia: "/encyclopedia",
  study_mode: "/study",
  notes: "/notes",
  graph: "/graph",
  settings: "/settings",
  library: "/library",
};

const PUBLIC_PATHS = ["/login", "/privacidade", "/termos"];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { activeTool, setActiveTool, _hasHydrated } = useTheoStore();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [authOpen, setAuthOpen] = useState(false);
  const [commandBarOpen, setCommandBarOpen] = useState(false);

  const isPublic = PUBLIC_PATHS.includes(pathname);

  // Redireciona usuários não autenticados para /login para controle estrito dos testes
  useEffect(() => {
    if (!authLoading && !isAuthenticated && !isPublic) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, isPublic, router]);

  // Sync pathname → store
  useEffect(() => {
    const tool = PATHNAME_TO_TOOL[pathname] || "dashboard";
    if (activeTool !== tool) {
      setActiveTool(tool);
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ctrl+K / Cmd+K → Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandBarOpen((prev) => !prev);
        return;
      }
      if (e.key === "Escape") {
        if (commandBarOpen) {
          setCommandBarOpen(false);
        } else {
          router.push("/");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, commandBarOpen]);

  /** Sidebar/CommandBar → navegação real */
  const handleSelectTool = (tool: ToolId | string) => {
    const key = String(tool);
    const path = TOOL_TO_PATH[key] ?? "/";
    router.push(path);
    setActiveTool(tool as ToolId);
  };

  if (pathname === "/privacidade" || pathname === "/termos") {
    return (
      <main className="w-full min-h-screen overflow-auto bg-[#080B11]">
        {children}
      </main>
    );
  }

  // Se o visitante não está autenticado ou acessou /login:
  // Exibe diretamente a tela de login com o vídeo ao vivo de Israel, som ambiente e dicas beta
  if (!isAuthenticated || pathname === "/login") {
    return (
      <main className="w-full min-h-screen overflow-auto bg-[#080B11]">
        <LoginPage />
      </main>
    );
  }

  return (
    <div className="flex flex-col w-full h-screen overflow-hidden bg-[#F8FAFC] dark:bg-[#080B11] text-foreground font-sans">
      <TheoSphereTopBar onOpenAuth={() => router.push("/login")} />

      <div className="flex flex-grow w-full overflow-hidden">
        <Sidebar activeTool={activeTool} onSelectTool={handleSelectTool} />

        <main
          id="main"
          className="flex-grow relative overflow-hidden bg-[#F8FAFC] dark:bg-[#0E131F]"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="h-full w-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      <UnifiedAssistantOverlay />
      <ServerWarmupBanner />
      <CommandBar
        isOpen={commandBarOpen}
        onClose={() => setCommandBarOpen(false)}
        onSelectTool={handleSelectTool}
      />
    </div>
  );
}
