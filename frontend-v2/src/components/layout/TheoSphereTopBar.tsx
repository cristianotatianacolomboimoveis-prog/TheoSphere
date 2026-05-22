"use client";

import React from "react";
import {
  Search,
  Library,
  Layout,
  Settings,
  User,
  Bell,
  ChevronDown,
  Menu,
  BookOpen,
  Sparkles,
  Command,
} from "lucide-react";
import { useTheoStore, ToolId } from "@/store/useTheoStore";

import { useAuth } from "@/hooks/useAuth";
import { LogOut } from "lucide-react";

export function TheoSphereTopBar({ onOpenAuth }: { onOpenAuth?: () => void }) {
  const { setActiveTool } = useTheoStore();
  const { isAuthenticated, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const handleCommand = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = (
      e.currentTarget.elements.namedItem("command") as HTMLInputElement
    )?.value?.trim();
    if (!input) return;

    // Simple command routing
    const lower = input.toLowerCase();
    if (
      lower.startsWith("gen") ||
      lower.startsWith("gên") ||
      /^[1-3]?\s?[a-z]/i.test(lower)
    ) {
      // Bible reference detected → go to exegesis
      setActiveTool("exegesis");
    } else {
      setActiveTool("factbook");
    }
  };

  return (
    <div className="h-10 bg-[#E8EBF0] dark:bg-[#1E252B] border-b border-gray-300 dark:border-black/20 flex items-center px-4 gap-4 z-[60]">
      {/* Logos Icon / Menu */}
      <button
        onClick={() => setActiveTool("dashboard")}
        className="p-1 hover:bg-gray-300 dark:hover:bg-white/5 rounded transition-colors"
      >
        <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      {/* Command Box (Central Focus of Logos) */}
      <form
        onSubmit={handleCommand}
        className="flex-grow max-w-2xl relative group"
      >
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <Command className="w-3.5 h-3.5 text-gray-400" />
        </div>
        <input
          name="command"
          type="text"
          placeholder="Ir para Gênesis 1:1, Pesquisar 'Justificação'..."
          className="w-full h-7 pl-10 pr-4 bg-white dark:bg-[#0D1117] border border-gray-300 dark:border-white/10 rounded text-[12px] focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-400 outline-none"
        />
        <button
          type="submit"
          className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-gray-100 dark:bg-white/5 text-[10px] font-bold text-gray-500 rounded border border-gray-200 dark:border-white/10 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors"
        >
          IR
        </button>
      </form>

      {/* Tools Icons */}
      <div className="flex items-center gap-1">
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
        <TopBarButton
          icon={Layout}
          label="Layouts"
          onClick={() => setActiveTool("exegesis")}
        />
      </div>

      <div className="ml-auto flex items-center gap-3 relative">
        <button className="p-1.5 hover:bg-gray-300 dark:hover:bg-white/5 rounded">
          <Bell className="w-4 h-4 text-gray-500" />
        </button>

        {isAuthenticated ? (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="p-1 hover:bg-gray-300 dark:hover:bg-white/5 rounded flex items-center gap-1.5 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-[11px] text-white font-extrabold shadow-sm border border-blue-400/20">
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
                      Usuário Ativo
                    </p>
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">
                      Sessão Iniciada
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-500/10 dark:hover:bg-red-500/20 flex items-center gap-2 transition-colors font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sair</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="h-7 px-3 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-[11px] font-bold rounded-lg transition-all shadow-sm hover:shadow-blue-500/15 flex items-center gap-1.5 cursor-pointer"
          >
            <User className="w-3.5 h-3.5" />
            <span>Entrar</span>
          </button>
        )}
      </div>
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
      className="flex items-center gap-2 px-3 py-1 hover:bg-gray-300 dark:hover:bg-white/5 rounded transition-colors group"
    >
      <Icon className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" />
      <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">
        {label}
      </span>
    </button>
  );
}
