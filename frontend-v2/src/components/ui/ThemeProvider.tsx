"use client";

import * as React from "react";

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * TheoSphere Theme Provider (React 19 Optimized)
 * 
 * Bypasses next-themes script injection which crashes React 19/Next 16.
 * Manages 'data-theme' attribute manually on the document element.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<"dark" | "light">("dark");

  React.useEffect(() => {
    // Sincroniza com o DOM
    const root = window.document.documentElement;
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

const ThemeContext = React.createContext<{
  theme: string;
  setTheme: (t: "dark" | "light") => void;
} | null>(null);

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) return { theme: "dark", setTheme: () => {}, toggle: () => {} };

  return {
    theme: ctx.theme,
    resolvedTheme: ctx.theme,
    setTheme: ctx.setTheme,
    toggle: () => ctx.setTheme(ctx.theme === "dark" ? "light" : "dark"),
  };
}
