"use client";

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type Variant = 'success' | 'error' | 'info';

interface ToastContextType {
  show: (message: string, variant?: Variant) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; message: string; variant: Variant }[]>([]);

  const show = useCallback((message: string, variant: Variant = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[10002] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border glass-heavy min-w-[280px] ${
                toast.variant === 'success' ? 'border-green-500/30 text-green-400' :
                toast.variant === 'error' ? 'border-red-500/30 text-red-400' :
                'border-amber-500/30 text-amber-400'
              }`}
            >
              {toast.variant === 'success' && <CheckCircle className="w-5 h-5" />}
              {toast.variant === 'error' && <AlertCircle className="w-5 h-5" />}
              {toast.variant === 'info' && <Info className="w-5 h-5" />}
              
              <span className="text-sm font-medium flex-grow">{toast.message}</span>
              
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="opacity-50 hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
