import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash, ExternalLink, BookOpen } from 'lucide-react';

interface StrongOverlayProps {
  word: string;
  strongId: string;
  definition: string;
  grammar?: string;
  position: { x: number; y: number };
  onClose: () => void;
}

export const StrongOverlay: React.FC<StrongOverlayProps> = ({ 
  word, strongId, definition, grammar, position, onClose 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className="fixed z-[100] w-64 glass-heavy p-4 rounded-xl border border-white/10 shadow-2xl glow-blue"
      style={{ 
        left: Math.min(position.x, window.innerWidth - 270), 
        top: position.y + 20 
      }}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="text-sm font-black text-blue-400 flex items-center gap-1.5 uppercase tracking-tight">
            {word}
          </h4>
          <span className="text-[10px] text-white/40 font-mono flex items-center gap-1">
            <Hash className="w-2.5 h-2.5" /> {strongId}
          </span>
        </div>
        <div className="bg-blue-500/10 text-blue-400 text-[8px] font-bold px-1.5 py-0.5 rounded border border-blue-500/20">
          STRONG
        </div>
      </div>

      <div className="space-y-3">
        {grammar && (
          <p className="text-[10px] text-white/60 font-medium italic border-l-2 border-blue-500/50 pl-2">
            {grammar}
          </p>
        )}
        
        <p className="text-xs text-white/80 leading-relaxed line-clamp-4">
          {definition}
        </p>

        <div className="flex gap-2 pt-2">
          <button className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] font-bold text-white/60 flex items-center justify-center gap-1.5 transition-colors">
            <BookOpen className="w-3 h-3" /> Ver Léxico
          </button>
          <button className="flex-1 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-[9px] font-bold text-blue-400 flex items-center justify-center gap-1.5 transition-colors">
            <ExternalLink className="w-3 h-3" /> Logos Link
          </button>
        </div>
      </div>
    </motion.div>
  );
};
