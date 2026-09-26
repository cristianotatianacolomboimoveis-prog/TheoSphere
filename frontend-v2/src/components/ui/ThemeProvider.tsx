"use client";

import * as React from "react";

interface ThemeProviderProps {
  children: React.ReactNode;
}

const THEME_STORAGE_KEY = "theosphere-theme";

/**
 * TheoSphere Theme Provider (React 19 & Tailwind v4 Optimized)
 *
 * Sincroniza tanto o atributo 'data-theme' quanto a classe '.dark' no <html>,
 * permitindo alternância instantânea entre Modo Escuro (Obsidian) e Modo Claro (Clean SaaS).
 * Persiste a preferência do usuário em localStorage.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (saved === "light" || saved === "dark") return saved;
      } catch {
        // Ignora erro de acesso a localStorage
      }
    }
    return "dark";
  });

  // Sincroniza com o DOM e localStorage quando o tema muda
  React.useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;

    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignora erro de acesso a localStorage
    }
  }, [theme]);

  const setTheme = React.useCallback((t: "dark" | "light") => {
    setThemeState(t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

const ThemeContext = React.createContext<{
  theme: "dark" | "light";
  setTheme: (t: "dark" | "light") => void;
} | null>(null);

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "dark",
      resolvedTheme: "dark",
      setTheme: () => {},
      toggle: () => {},
    };
  }

  return {
    theme: ctx.theme,
    resolvedTheme: ctx.theme,
    setTheme: ctx.setTheme,
    toggle: () => ctx.setTheme(ctx.theme === "dark" ? "light" : "dark"),
  };
}
