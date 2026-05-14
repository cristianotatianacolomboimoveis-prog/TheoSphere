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
  /**
   * Quantidade de cross-references disponíveis para este versículo
   * (vinda do hook useChapterCrossRefs). Undefined ou 0 → badge oculto.
   */
  crossRefCount?: number;
  /**
   * Click no badge "🔗 N" — recebe a posição do click pra ancorar o
   * CrossRefsPopover. Sem este handler o badge fica decorativo
   * (não-clicável).
   */
  onCrossRefClick?: (e: React.MouseEvent) => void;
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
  crossRefCount,
  onCrossRefClick,
}) => (
  <div className={`grid ${secondaryText ? "grid-cols-2 gap-8" : "grid-cols-1"} w-full`}>
    {/* Primary Version */}
    <div
      onClick={onClick}
      className={`group relative transition-all duration-500 py-6 px-6 rounded-[24px] border border-transparent ${
        selected
          ? "bg-primary/5 border-primary/20 shadow-[0_0_40px_rgba(255,215,0,0.08)]"
          : "hover:bg-white/5"
      }`}
    >
      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-1 min-w-[20px]">
          <span className="text-[11px] font-black text-accent mt-1.5 tabular-nums drop-shadow-[0_0_8px_rgba(212,175,55,0.3)]">
            {verse}
          </span>
          {crossRefCount !== undefined && crossRefCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCrossRefClick?.(e);
              }}
              title={`${crossRefCount} referências cruzadas (TSK)`}
              aria-label={`${crossRefCount} referências cruzadas`}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex items-center gap-0.5 px-1 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-[9px] font-mono text-emerald-300"
            >
              <Link2 className="w-2.5 h-2.5" />
              {crossRefCount}
            </button>
          )}
        </div>
        <span className="text-[19px] leading-[1.85] font-serif text-white/90 tracking-tight">
          {highlightQuery ? <HighlightedText text={text} query={highlightQuery} /> : text}
        </span>
      </div>
    </div>

    {/* Secondary Version (Parallel) */}
    {secondaryText && (
      <div className="py-6 px-6 rounded-[24px] border border-white/5 bg-white/[0.02]">
        <div className="flex gap-4">
          <span className="text-[11px] font-black text-white/40 mt-1.5 min-w-[20px] tabular-nums">
            {verse}
          </span>
          <span className="text-[19px] leading-[1.85] font-serif text-white/40 italic font-light tracking-tight">
            {secondaryText}
          </span>
        </div>
      </div>
    )}
  </div>
);
