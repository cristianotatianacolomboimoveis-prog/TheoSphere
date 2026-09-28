"use client";

import React from "react";
import {
  Search,
  Library,
  Layout,
  Settings,
  User,
  ChevronDown,
  Menu,
  BookOpen,
  Sparkles,
  Command,
  HelpCircle,
  MessageSquare,
} from "lucide-react";
import { useTheoStore, ToolId } from "@/store/useTheoStore";
import { useAuth } from "@/hooks/useAuth";
import { LogOut } from "lucide-react";
import { LayoutSwitcher } from "./LayoutSwitcher";
import { TheoSphereCommandPalette } from "./TheoSphereCommandPalette";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { WelcomeTourModal } from "./WelcomeTourModal";
import { useRouter } from "next/navigation";
import { FeedbackModal } from "./FeedbackModal";

export function TheoSphereTopBar({ onOpenAuth }: { onOpenAuth?: () => void }) {
  const router = useRouter();
  const { setActiveTool } = useTheoStore();
  const { isAuthenticated, logout, userEmail } = useAuth();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [layoutsOpen, setLayoutsOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [tourOpen, setTourOpen] = React.useState(false);
  const [feedbackOpen, setFeedbackOpen] = React.useState(false);

  // Exibir tour de onboarding na primeira visita
  React.useEffect(() => {
    try {
      const seen = localStorage.getItem("theosphere_tour_completed");
      if (!seen) {
        const timer = setTimeout(() => setTourOpen(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage indisponível
    }
  }, []);

  // Atalho global Cmd+K / Ctrl+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative h-11 bg-white/80 dark:bg-[#090C12]/85 backdrop-blur-xl border-b border-gray-200 dark:border-white/8 flex items-center pl-14 md:pl-5 px-4 md:px-5 gap-2 md:gap-4 z-[60] shadow-sm transition-colors">
      {/* Logos Icon / Menu (hidden on mobile — hamburger is in Sidebar) */}
      <button
        onClick={() => setActiveTool("dashboard")}
        className="hidden md:flex p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        title="Início"
        aria-label="Início"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Command Box (Central Focus of Logos — Híbrida & Speed Search) */}
      <div
        onClick={() => setPaletteOpen(true)}
        className="flex-grow max-w-2xl relative group cursor-pointer"
      >
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
          <Command className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
        </div>
        <div className="w-full h-8 pl-9 pr-14 bg-gray-50/90 dark:bg-[#111622]/90 border border-gray-200 dark:border-white/10 rounded-lg text-[12px] flex items-center text-gray-500 dark:text-gray-400 select-none group-hover:border-indigo-500/50 group-hover:shadow-[0_0_20px_-3px_rgba(99,102,241,0.25)] transition-all">
          <span className="truncate">
            Ir para Gn 1:1, Sl 23, ou pesquisar (ex: amor AND paz, book:Rom)...
          </span>
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold text-gray-500 dark:text-gray-400 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded shadow-xs">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Modal Paleta de Comando */}
      <TheoSphereCommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />

      {/* Tools Icons (hidden on mobile — accessible via sidebar drawer) */}
      <div className="hidden md:flex items-center gap-1">
        <TopBarButton
          icon={Library}
          label="Biblioteca"
          onClick={() => setActiveTool("library")}
        />
        <TopBarButton
          icon={Search}
          label="Busca"
          onClick={() => setActiveTool("exegesis")}
        />
        <TopBarButton
          icon={Sparkles}
          label="Factbook"
          onClick={() => setActiveTool("factbook")}
        />
        <div className="w-px h-4 bg-gray-300 dark:bg-white/10 mx-2" />
        <div className="relative">
          <TopBarButton
            icon={Layout}
            label="Layouts"
            onClick={() => setLayoutsOpen(!layoutsOpen)}
          />
          {layoutsOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setLayoutsOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-50">
                <LayoutSwitcher onClose={() => setLayoutsOpen(false)} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* O sino de notificações foi removido: não existe sistema de
          notificações e o botão nunca teve handler (varredura 2026-07-29). */}
      <div className="ml-auto flex items-center gap-1.5 md:gap-2.5 relative">
        {/* Guia Rápido / Onboarding */}
        <button
          onClick={() => setTourOpen(true)}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 flex items-center gap-1.5 cursor-pointer"
          title="Guia Rápido & Atalhos (Onboarding)"
          aria-label="Guia Rápido & Atalhos"
        >
          <HelpCircle className="w-4 h-4" />
          <span className="hidden xl:inline text-[11px] font-medium">Guia</span>
        </button>

        {/* Canal de Feedback Beta */}
        <button
          onClick={() => setFeedbackOpen(true)}
          className="px-2.5 py-1 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 rounded-lg transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs cursor-pointer"
          title="Enviar Feedback ou Relatar Bug"
          aria-label="Enviar Feedback ou Relatar Bug"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold">Feedback</span>
          <span className="px-1 py-0.2 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-[9px] font-extrabold rounded tracking-wider uppercase">
            Beta
          </span>
        </button>

        <ThemeToggle className="hover:bg-gray-200 dark:hover:bg-white/10" />
        {isAuthenticated ? (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="p-1 hover:bg-gray-300 dark:hover:bg-white/5 rounded flex items-center gap-1.5 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-[11px] text-white font-extrabold shadow-sm border border-indigo-400/20">
                U
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-[#1E252B] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-white/5 text-left">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Testador Beta
                    </p>
                    <p
                      className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate"
                      title={userEmail || ""}
                    >
                      {userEmail || "Sessão Ativa"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setDropdownOpen(false);
                      router.push("/login");
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/15 flex items-center gap-2 transition-colors font-medium cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sair da Conta</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="h-7 px-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] text-white text-[11px] font-bold rounded-lg transition-all shadow-sm shadow-indigo-500/20 hover:shadow-indigo-500/35 flex items-center gap-1.5 cursor-pointer"
          >
            <User className="w-3.5 h-3.5" />
            <span>Entrar</span>
          </button>
        )}
      </div>

      {/* Modais Globais de Tour e Feedback */}
      <WelcomeTourModal isOpen={tourOpen} onClose={() => setTourOpen(false)} />
      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
    </div>
  );
}

function TopBarButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: any;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all group active:scale-[0.98]"
    >
      <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
      {label && (
        <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
          {label}
        </span>
      )}
    </button>
  );
}
