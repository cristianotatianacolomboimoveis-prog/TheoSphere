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
          <mark key={i} className="bg-yellow-400/30 text-yellow-200 rounded px-0.5">{part}</mark>
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
          ? "bg-blue-600/20 border-blue-500/30 shadow-lg"
          : "hover:bg-white/[0.03]"
      }`}
    >
      <div className="flex gap-4">
        <span className="text-[11px] font-black text-blue-500/50 mt-1.5 min-w-[20px] tabular-nums">
          {verse}
        </span>
        <span className="text-[17px] leading-[1.8] font-serif text-white/90">
          {highlightQuery ? <HighlightedText text={text} query={highlightQuery} /> : text}
        </span>
      </div>
    </div>

    {/* Secondary Version (Parallel) */}
    {secondaryText && (
      <div className="py-4 px-4 rounded-2xl border border-transparent bg-amber-500/[0.02]">
        <div className="flex gap-4">
          <span className="text-[11px] font-black text-amber-500/30 mt-1.5 min-w-[20px] tabular-nums">
            {verse}
          </span>
          <span className="text-[17px] leading-[1.8] font-serif text-white/60 italic">
            {secondaryText}
          </span>
        </div>
      </div>
    )}
  </div>
);
