"use client";

import React from "react";
import {
  Square,
  Columns2,
  Columns3,
  LayoutGrid,
  Sparkles,
  Check,
} from "lucide-react";
import { useTheoStore } from "@/store/useTheoStore";

export type WorkspaceLayoutType =
  | "single"
  | "split"
  | "triple"
  | "copilot"
  | "grid";

interface LayoutOption {
  id: WorkspaceLayoutType;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    id: "single",
    title: "Foco Total",
    subtitle: "Leitura imersiva sem distrações",
    icon: Square,
  },
  {
    id: "split",
    title: "Estudo Paralelo (50/50)",
    subtitle: "Duas versões ou Bíblia + Guia lado a lado",
    icon: Columns2,
  },
  {
    id: "triple",
    title: "Bancada Exegética",
    subtitle: "Bíblia + Comentários + Léxico Strong",
    icon: Columns3,
    badge: "Padrão",
  },
  {
    id: "copilot",
    title: "Copilot Teológico (IA)",
    subtitle: "Bíblia + Assistente RAG em tempo real",
    icon: Sparkles,
    badge: "Exegese IA",
  },
  {
    id: "grid",
    title: "Grade Sinótica (2x2)",
    subtitle: "4 painéis para pesquisa acadêmica avançada",
    icon: LayoutGrid,
  },
];

interface LayoutSwitcherProps {
  onClose?: () => void;
  variant?: "dropdown" | "toolbar";
}

export function LayoutSwitcher({
  onClose,
  variant = "dropdown",
}: LayoutSwitcherProps) {
  const { workspaceLayout, setWorkspaceLayout } = useTheoStore();

  const handleSelect = (layoutId: WorkspaceLayoutType) => {
    setWorkspaceLayout(layoutId);
    if (onClose) onClose();
  };

  if (variant === "toolbar") {
    return (
      <div className="flex items-center gap-1 bg-surface-hover/60 dark:bg-white/5 p-1 rounded-lg border border-border-subtle">
        {LAYOUT_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = workspaceLayout === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-xs ${
                isActive
                  ? "bg-accent/20 text-accent font-bold shadow-sm"
                  : "text-foreground/50 hover:text-foreground hover:bg-surface-hover"
              }`}
              title={`${opt.title} — ${opt.subtitle}`}
              aria-label={opt.title}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-80 bg-white dark:bg-[#161B22] rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 p-2 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
      <div className="px-3 py-2 border-b border-gray-100 dark:border-white/5 mb-1 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-400">
            Layouts da Área de Trabalho
          </span>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            Multi-painéis e sincronização automática
          </p>
        </div>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
          Link Set A
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {LAYOUT_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = workspaceLayout === opt.id;

          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all ${
                isActive
                  ? "bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-900 dark:text-blue-100"
                  : "hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 border border-transparent"
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400"
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">{opt.title}</span>
                  {opt.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                      {opt.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  {opt.subtitle}
                </p>
              </div>

              {isActive && (
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
