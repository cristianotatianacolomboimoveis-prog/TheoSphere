"use client";

import { motion } from "framer-motion";
import { MoreHorizontal } from "lucide-react";

interface DashboardCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function DashboardCard({ title, subtitle, children, className = "" }: DashboardCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-[#0D1117] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col ${className}`}
    >
      <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
        <div>
          <h3 className="text-sm font-bold text-gray-800 dark:text-white/90 tracking-tight uppercase tracking-widest text-[11px]">{title}</h3>
          {subtitle && <p className="text-[10px] text-gray-400 dark:text-white/30 mt-0.5 font-medium">{subtitle}</p>}
        </div>
        <button className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-white/5 text-gray-400 dark:text-white/20 hover:text-gray-600 dark:hover:text-white/60 transition-all">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
      <div className="p-5 flex-grow">
        {children}
      </div>
    </motion.div>
  );
}
