"use client";

import React from "react";
import { Clock } from "lucide-react";

interface TimeControllerProps {
  currentTime: number;
  onTimeChange: (year: number) => void;
}

export const TimeController: React.FC<TimeControllerProps> = ({ currentTime, onTimeChange }) => {
  const yearLabel = currentTime < 0 ? `${Math.abs(currentTime)} a.C.` : `${currentTime} d.C.`;

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 w-[85%] max-w-2xl glass-heavy p-6 rounded-[28px] border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.7)] animate-fade-in-up">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] block">Controle Temporal</span>
            <span className="text-xs font-bold text-white/70">História Redentiva</span>
          </div>
        </div>
        <div className="px-4 py-1.5 bg-amber-500/10 rounded-xl border border-amber-500/20 shadow-inner">
          <span className="text-xl font-black text-amber-400 font-serif tracking-tight glow-text">
            {yearLabel}
          </span>
        </div>
      </div>
      
      <input
        type="range"
        min={-4000}
        max={100}
        value={currentTime}
        onChange={(e) => onTimeChange(Number(e.target.value))}
        className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer mt-4
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
          [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:shadow-[0_0_25px_rgba(245,158,11,0.6)]
          [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-[#05080f]
          hover:[&::-webkit-slider-thumb]:scale-115 transition-all"
      />
      
      <div className="flex justify-between mt-4 text-[9px] text-white/20 font-black tracking-[0.2em] uppercase">
        <span>Gênesis (4000 AC)</span>
        <span className="text-white/40">Jesus Cristo</span>
        <span>Apocalipse (100 DC)</span>
      </div>
    </div>
  );
};
