import React from "react";
import { Zap, Check } from "lucide-react";

export function AgenticConsole() {
  return (
    <div className="bg-[#0f172a]/80 border border-blue-500/30 rounded-3xl p-8 shadow-2xl backdrop-blur-2xl">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center">
          <Zap className="w-7 h-7 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-black text-white tracking-tight">TheoAI Exegete (PhD Mode)</h3>
          <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Persona: Pastor, Theologian, PhD Old Testament (BHS Specialist)</p>
        </div>
      </div>
      <div className="space-y-3">
        {[
          "Performing detailed exegesis from Biblia Hebraica Stuttgartensia (BHS).",
          "Identifying Hebrew lexemes, transliterations, and morphological roots.",
          "Applying semantic sensitivity for triple-translation mapping (PT-BR).",
          "Formatting exegesis rows into a responsive HTML structure.",
          "Final review: Ensuring PhD-level detail and column integrity."
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <Check className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs text-white/60 font-medium">Step {i + 1}: {step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
