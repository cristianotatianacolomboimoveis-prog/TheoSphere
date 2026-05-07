"use client";

import React from "react";
import { Hash, Loader2, ChevronRight } from "lucide-react";

interface ExegeticalConcordanceProps {
  loading: boolean;
  occurrences: Array<{
    reference: string;
    text: string;
  }>;
  lexicalData?: any;
}

export const ExegeticalConcordance: React.FC<ExegeticalConcordanceProps> = ({
  loading,
  occurrences,
  lexicalData
}) => (
  <div className="glass rounded-xl border border-white/5 p-4 mb-4">
    <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-400 mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Hash className="w-3.5 h-3.5" />
        Concordância Exegética (Ocorrências)
      </div>
      {occurrences.length > 0 && <span className="text-[9px] text-white/20">{occurrences.length} Versículos</span>}
    </h4>
    
    {loading ? (
      <div className="flex items-center gap-2 py-4 justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      </div>
    ) : occurrences.length > 0 ? (
      <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
        {occurrences.map((occ, i) => (
          <div key={i} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all cursor-pointer group">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-black text-blue-400 group-hover:text-blue-300">{occ.reference}</span>
              <ChevronRight className="w-3 h-3 text-white/10 group-hover:text-white/30" />
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed font-serif line-clamp-2">{occ.text}</p>
          </div>
        ))}
      </div>
    ) : (
      <div className="py-4 text-center">
        <p className="text-[10px] text-white/20 uppercase font-black tracking-widest">
          {lexicalData ? "Nenhuma outra ocorrência indexada" : "Ative a Análise Crítica para buscar"}
        </p>
      </div>
    )}
  </div>
);
