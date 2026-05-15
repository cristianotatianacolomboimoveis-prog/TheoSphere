"use client";

import React from "react";
import { Link2 } from "lucide-react";

interface VerseRowProps {
  verse: number;
  text: string;
  secondaryText?: string;
  selected?: boolean;
  onClick: () => void;
  highlightQuery?: string;
  crossRefCount?: number;
  onCrossRefClick?: (e: React.MouseEvent) => void;
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-blue-600/20 text-blue-600 rounded px-0.5">{part}</mark>
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
  crossRefCount,
  onCrossRefClick,
}) => (
  <div className={`grid ${secondaryText ? "grid-cols-2 gap-12" : "grid-cols-1"} w-full max-w-4xl mx-auto`}>
    {/* Primary Version - Academic Book Page Style */}
    <div
      onClick={onClick}
      className={`group relative transition-all duration-300 py-4 px-8 rounded-lg cursor-pointer ${
        selected
          ? "bg-blue-50/50 dark:bg-blue-900/10"
          : "hover:bg-gray-50/50 dark:hover:bg-white/[0.02]"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Verse Marker - Subtle Academic Style */}
        <div className="flex flex-col items-center pt-2 min-w-[24px]">
          <span className="text-[10px] font-bold text-blue-600/40 dark:text-blue-400/30 tabular-nums select-none">
            {verse}
          </span>
          {crossRefCount !== undefined && crossRefCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCrossRefClick?.(e);
              }}
              className="mt-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex items-center justify-center w-5 h-5 rounded-full bg-blue-600/10 text-blue-600 text-[9px] font-bold border border-blue-600/20"
            >
              {crossRefCount}
            </button>
          )}
        </div>

        {/* Biblical Text - Serif Focus */}
        <span className="text-[20px] leading-[1.8] font-serif text-gray-800 dark:text-gray-200 tracking-normal text-justify hyphens-auto">
          {highlightQuery ? <HighlightedText text={text} query={highlightQuery} /> : text}
        </span>
      </div>
    </div>

    {/* Secondary Version (Parallel) - Academic Ghost Style */}
    {secondaryText && (
      <div className="py-4 px-8 border-l border-gray-100 dark:border-white/5 italic">
        <div className="flex items-start gap-4">
          <span className="text-[10px] font-bold text-gray-300 dark:text-white/10 pt-2 min-w-[24px]">
            {verse}
          </span>
          <span className="text-[20px] leading-[1.8] font-serif text-gray-400 dark:text-white/20 font-light tracking-normal text-justify">
            {secondaryText}
          </span>
        </div>
      </div>
    )}
  </div>
);
