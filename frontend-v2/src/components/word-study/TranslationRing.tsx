"use client";

import React from "react";
import { BarChart3 } from "lucide-react";

interface TranslationRingProps {
  occurrences: number;
  data: Array<{
    word: string;
    count: number;
    percent: number;
    start: number;
    color: string;
  }>;
}

export const TranslationRing: React.FC<TranslationRingProps> = ({ occurrences, data }) => (
  <div className="glass rounded-xl border border-border-subtle p-4 mb-4">
    <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-400 mb-3 flex items-center gap-2">
      <BarChart3 className="w-3.5 h-3.5" />
      Traduções na KJV
    </h4>
    <div className="flex gap-4 items-center">
      {/* SVG Ring */}
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {data.map((item, i) => {
            const circumference = 2 * Math.PI * 40;
            const strokeDash = (item.percent / 100) * circumference;
            const strokeOffset = -((item.start / 100) * circumference);
            return (
              <circle
                key={i}
                cx="50" cy="50" r="40"
                fill="none"
                stroke={item.color}
                strokeWidth="8"
                strokeDasharray={`${strokeDash} ${circumference - strokeDash}`}
                strokeDashoffset={strokeOffset}
                className="transition-all duration-500"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-white">{occurrences}</span>
        </div>
      </div>
      {/* Legend */}
      <div className="flex-grow space-y-1">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
            <span className="text-xs text-white/60 flex-grow">{item.word}</span>
            <span className="text-[10px] text-white/30 font-mono">{item.count}x ({item.percent.toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);
