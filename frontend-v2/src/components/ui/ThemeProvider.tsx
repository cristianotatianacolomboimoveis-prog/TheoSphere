"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

/**
 * useTheme — wrapper sobre next-themes com helper `toggle()`.
 * Usa o hook oficial do next-themes (nunca require()).
 */
export function useTheme() {
  const ctx = useNextTheme();
  return {
    theme: ctx.theme,
    resolvedTheme: ctx.resolvedTheme,
    setTheme: ctx.setTheme,
    toggle: () =>
      ctx.setTheme(ctx.resolvedTheme === "dark" ? "light" : "dark"),
  };
}
