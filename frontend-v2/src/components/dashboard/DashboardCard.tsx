"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface DashboardCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function DashboardCard({
  title,
  subtitle,
  children,
  className = "",
}: DashboardCardProps) {
  // Fix 2026-07-20: o botão "..." era decorativo (sem onClick).
  // Agora recolhe/expande o conteúdo do card.
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-[#0D1117] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col ${className}`}
    >
      <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
        <div>
          <h3 className="text-sm font-bold text-gray-800 dark:text-white/90 tracking-tight uppercase tracking-widest text-[11px]">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[10px] text-gray-400 dark:text-white/30 mt-0.5 font-medium">
              {subtitle}
            </p>
          )}
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? `Expandir ${title}` : `Recolher ${title}`}
          aria-expanded={!collapsed}
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-white/5 text-gray-400 dark:text-white/20 hover:text-gray-600 dark:hover:text-white/60 transition-all cursor-pointer"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform ${collapsed ? "-rotate-90" : ""}`}
          />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-grow"
          >
            <div className="p-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
