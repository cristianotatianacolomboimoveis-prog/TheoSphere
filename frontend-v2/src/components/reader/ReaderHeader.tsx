"use client";

import React from "react";
import { Zap, Maximize2, Star, Library, X } from "lucide-react";

interface ReaderHeaderProps {
  viewMode: "reading" | "exegesis";
  showResourceGuide: boolean;
  onToggleViewMode: () => void;
  onToggleResourceGuide: () => void;
  onExpand: () => void;
  onClose: () => void;
}

export const ReaderHeader: React.FC<ReaderHeaderProps> = ({
  viewMode,
  showResourceGuide,
  onToggleViewMode,
  onToggleResourceGuide,
  onExpand,
  onClose,
}) => (
  <div className="px-8 pt-8 pb-6 border-b border-border-subtle flex-shrink-0 bg-gradient-to-b from-surface to-transparent relative z-20">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center shadow-xl shadow-blue-500/10 border border-white/10">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2 font-display italic">
            <span className="text-gradient uppercase">TheoSphere Exegete</span>
          </h2>
          <p className="text-[10px] text-white/30 font-black tracking-[0.3em] uppercase">PhD Old/New Testament Specialization</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={onExpand} 
          className="p-2.5 hover:bg-accent/10 rounded-xl transition-all text-foreground/30 hover:text-accent"
          title="Expandir para nova janela"
        >
          <Maximize2 className="w-4.5 h-4.5" />
        </button>
        <div className="w-[1px] h-4 bg-border-subtle mx-1" />
        <button 
          onClick={onToggleViewMode} 
          className={`p-2.5 rounded-xl transition-all ${viewMode === "exegesis" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10" : "hover:bg-white/5 text-white/30 hover:text-white"}`}
        >
          <Star className={`w-4.5 h-4.5 ${viewMode === "exegesis" ? "fill-blue-400" : ""}`} />
        </button>
        <div className="w-[1px] h-4 bg-white/5 mx-1" />
        <button 
          onClick={onToggleResourceGuide} 
          className={`p-2.5 rounded-xl transition-all ${showResourceGuide ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10" : "hover:bg-white/5 text-white/30 hover:text-white"}`}
          title="Guia de Recursos (Olive Tree Style)"
        >
          <Library className={`w-4.5 h-4.5 ${showResourceGuide ? "fill-emerald-400/20" : ""}`} />
        </button>
        <div className="w-[1px] h-4 bg-white/5 mx-1" />
        <button onClick={onClose} className="p-2.5 hover:bg-red-500/10 rounded-xl transition-all text-foreground/30 hover:text-red-400">
          <X className="w-4.5 h-4.5" />
        </button>
      </div>
    </div>
  </div>
);
