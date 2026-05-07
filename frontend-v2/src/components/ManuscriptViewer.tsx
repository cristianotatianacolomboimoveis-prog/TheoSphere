"use client";

import React, { useState } from "react";
import { Image as ImageIcon, ZoomIn, ZoomOut, Maximize, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CODICES = [
  { id: "sinaiticus", name: "Codex Sinaiticus", century: "IV", language: "Greek", url: "https://codexsinaiticus.org/en/manuscript.aspx" },
  { id: "vaticanus", name: "Codex Vaticanus", century: "IV", language: "Greek", url: "https://digi.vatlib.it/view/MSS_Vat.gr.1209" },
  { id: "alexandrinus", name: "Codex Alexandrinus", century: "V", language: "Greek", url: "https://www.bl.uk/manuscripts/FullDisplay.aspx?ref=Royal_MS_1_d_viii" }
];

export default function ManuscriptViewer({ reference }: { reference: string }) {
  const [selectedCodex, setSelectedCodex] = useState(CODICES[0]);
  const [zoom, setZoom] = useState(1);

  return (
    <div className="flex flex-col h-full bg-[#05080f]/40 text-white p-6 overflow-hidden">
      <div className="mb-6">
        <h2 className="text-sm font-black tracking-widest text-white/90 uppercase">Virtual Codex</h2>
        <p className="text-[10px] text-blue-400 font-bold tracking-[0.1em] uppercase">Visualização de Manuscritos Originais</p>
      </div>

      {/* Codex Selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2">
        {CODICES.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCodex(c)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
              selectedCodex.id === c.id 
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" 
                : "bg-white/5 text-white/30 hover:bg-white/10"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Viewer Area */}
      <div className="flex-grow relative bg-black/40 border border-white/5 rounded-3xl overflow-hidden group">
        <AnimatePresence mode="wait">
          <motion.div 
            key={selectedCodex.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-center p-8">
              <ImageIcon className="w-16 h-16 text-white/5 mx-auto mb-4" />
              <p className="text-xs text-white/20 italic max-w-[200px] mx-auto">
                Carregando fólio do {selectedCodex.name} contendo {reference}...
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Floating Controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="p-2 hover:bg-white/10 rounded-lg"><ZoomOut className="w-4 h-4" /></button>
          <div className="w-[1px] h-4 bg-white/10" />
          <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="p-2 hover:bg-white/10 rounded-lg"><ZoomIn className="w-4 h-4" /></button>
          <div className="w-[1px] h-4 bg-white/10" />
          <button className="p-2 hover:bg-white/10 rounded-lg"><Maximize className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Metadata */}
      <div className="mt-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-bold text-white/60 uppercase">{selectedCodex.name}</span>
          <span className="text-[9px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold uppercase">{selectedCodex.century} Century</span>
        </div>
        <p className="text-[11px] text-white/30 leading-relaxed italic">
          Este manuscrito é fundamental para a crítica textual. A visualização HD permite analisar variantes e glosas marginais em {selectedCodex.language}.
        </p>
      </div>

      <button 
        onClick={() => window.open(selectedCodex.url, '_blank')}
        className="mt-4 w-full py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all"
      >
        Abrir Fac-símile Completo
      </button>
    </div>
  );
}
