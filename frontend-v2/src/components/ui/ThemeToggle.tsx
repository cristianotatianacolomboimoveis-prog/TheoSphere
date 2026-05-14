"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Retornar um skeleton/placeholder com a exata mesma estrutura para evitar hydration mismatch
  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Carregando tema"
        className={`p-2 rounded-xl text-foreground/40 hover:text-foreground hover:bg-surface-hover transition-colors opacity-0 ${className}`}
      >
        <div className="w-4 h-4" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";
  const label = isDark ? "Ativar modo claro" : "Ativar modo escuro";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className={`p-2 rounded-xl text-foreground/40 hover:text-foreground hover:bg-surface-hover transition-colors ${className}`}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
