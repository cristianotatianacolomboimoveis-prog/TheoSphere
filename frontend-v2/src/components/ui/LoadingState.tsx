"use client";

import { Loader2 } from "lucide-react";

export type LoadingVariant = "spinner" | "skeleton" | "inline" | "fullscreen";

export interface LoadingStateProps {
  variant?: LoadingVariant;
  label?: string;
  className?: string;
  /** Number of skeleton rows when variant="skeleton" */
  rows?: number;
  /** Color accent — defaults to amber (matches TheoSphere palette) */
  accent?: "amber" | "blue" | "emerald" | "white";
}

const accentClass: Record<NonNullable<LoadingStateProps["accent"]>, string> = {
  amber: "text-amber-500",
  blue: "text-blue-500",
  emerald: "text-emerald-500",
  white: "text-white/60",
};

/**
 * Padronized loading indicator. Use across modals, panels and async sections
 * to keep the UX consistent (avoid mixing ad-hoc spinners and text-only states).
 */
export function LoadingState({
  variant = "spinner",
  label = "Carregando…",
  className = "",
  rows = 3,
  accent = "amber",
}: LoadingStateProps) {
  if (variant === "skeleton") {
    return (
      <div className={`space-y-3 animate-pulse ${className}`} aria-label={label} role="status">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded bg-white/5"
            style={{ width: `${85 - i * 10}%` }}
          />
        ))}
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <span
        className={`inline-flex items-center gap-2 text-xs text-white/50 ${className}`}
        role="status"
        aria-live="polite"
      >
        <Loader2 className={`w-3.5 h-3.5 animate-spin ${accentClass[accent]}`} />
        <span>{label}</span>
      </span>
    );
  }

  if (variant === "fullscreen") {
    return (
      <div
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#05080f]/80 backdrop-blur-sm gap-4 ${className}`}
        role="status"
        aria-live="polite"
      >
        <Loader2 className={`w-12 h-12 animate-spin ${accentClass[accent]}`} />
        <p className="text-xs text-white/50 font-medium tracking-widest uppercase">
          {label}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center py-12 gap-3 ${className}`}
      role="status"
      aria-live="polite"
    >
      <Loader2 className={`w-10 h-10 animate-spin ${accentClass[accent]}`} />
      <p className="text-xs text-white/40 font-medium tracking-wider uppercase">{label}</p>
    </div>
  );
}
