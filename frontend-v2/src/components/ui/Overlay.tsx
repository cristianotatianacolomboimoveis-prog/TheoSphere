"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export function ToolOverlay({ 
  children, 
  onClose, 
  label 
}: { 
  children: React.ReactNode; 
  onClose: () => void; 
  label: string; 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="absolute top-6 right-6 bottom-6 w-[calc(100%-48px)] md:w-[600px] z-50 flex flex-col"
    >
      <div className="flex-grow glass-heavy rounded-[32px] border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col relative">
        {/* Subtle Inner Glow */}
        <div className="absolute inset-0 pointer-events-none border border-white/5 rounded-[32px]" />
        
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
             <h3 className="text-sm font-black text-white/90 uppercase tracking-[0.2em]">{label}</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all border border-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-grow overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </motion.div>
  );
}

export function FullScreenOverlay({ 
  children, 
  onClose 
}: { 
  children: React.ReactNode; 
  onClose: () => void; 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-3xl p-6 md:p-12 flex flex-col"
    >
      <div className="flex-grow relative rounded-[40px] border border-white/10 overflow-hidden shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 z-[110] w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-xl border border-white/10 transition-all hover:scale-110 active:scale-95"
        >
          <X className="w-6 h-6" />
        </button>
        {children}
      </div>
    </motion.div>
  );
}
