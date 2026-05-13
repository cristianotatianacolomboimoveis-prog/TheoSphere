"use client";

import React from "react";

interface VerseRowProps {
  verse: number;
  text: string;
  secondaryText?: string;
  selected?: boolean;
  onClick: () => void;
  highlightQuery?: string;
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-primary/30 text-primary rounded px-0.5">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export const VerseRow: React.FC<VerseRowProps> = ({
  verse,
  text,
  secondaryText,
  selected,
  onClick,
  highlightQuery,
}) => (
  <div className={`grid ${secondaryText ? "grid-cols-2 gap-8" : "grid-cols-1"} w-full`}>
    {/* Primary Version */}
    <div
      onClick={onClick}
      className={`group relative transition-all duration-300 py-4 px-4 rounded-2xl border border-transparent ${
        selected
          ? "bg-accent/20 border-accent/30 shadow-lg"
          : "hover:bg-surface-hover"
      }`}
    >
      <div className="flex gap-4">
        <span className="text-[11px] font-black text-accent/50 mt-1.5 min-w-[20px] tabular-nums">
          {verse}
        </span>
        <span className="text-[17px] leading-[1.8] font-serif text-foreground/90">
          {highlightQuery ? <HighlightedText text={text} query={highlightQuery} /> : text}
        </span>
      </div>
    </div>

    {/* Secondary Version (Parallel) */}
    {secondaryText && (
      <div className="py-4 px-4 rounded-2xl border border-transparent bg-primary/[0.04]">
        <div className="flex gap-4">
          <span className="text-[11px] font-black text-primary/30 mt-1.5 min-w-[20px] tabular-nums">
            {verse}
          </span>
          <span className="text-[17px] leading-[1.8] font-serif text-foreground/60 italic">
            {secondaryText}
          </span>
        </div>
      </div>
    )}
  </div>
);
