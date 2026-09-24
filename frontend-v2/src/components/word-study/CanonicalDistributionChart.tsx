"use client";

import React from "react";
import { BarChart3, BookOpen } from "lucide-react";

interface CanonicalGroup {
  name: string;
  count: number;
  percentage: number;
}

interface BookOccurrence {
  bookId: number;
  bookName: string;
  count: number;
}

interface CanonicalDistributionChartProps {
  distribution: CanonicalGroup[];
  bookDistribution: BookOccurrence[];
  totalOccurrences: number;
  onSelectBook?: (bookName: string) => void;
}

const GROUP_COLORS: Record<string, { bar: string; text: string; bg: string }> =
  {
    Pentateuco: {
      bar: "bg-amber-500",
      text: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    "Históricos (AT)": {
      bar: "bg-orange-500",
      text: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    "Poéticos & Sabedoria": {
      bar: "bg-blue-500",
      text: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    "Profetas Maiores": {
      bar: "bg-purple-500",
      text: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    "Profetas Menores": {
      bar: "bg-violet-500",
      text: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    Evangelhos: {
      bar: "bg-emerald-500",
      text: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    "Atos dos Apóstolos": {
      bar: "bg-cyan-500",
      text: "text-cyan-500",
      bg: "bg-cyan-500/10",
    },
    "Epístolas Paulinas": {
      bar: "bg-indigo-500",
      text: "text-indigo-500",
      bg: "bg-indigo-500/10",
    },
    "Epístolas Gerais": {
      bar: "bg-pink-500",
      text: "text-pink-500",
      bg: "bg-pink-500/10",
    },
    Apocalipse: {
      bar: "bg-rose-500",
      text: "text-rose-500",
      bg: "bg-rose-500/10",
    },
  };

export const CanonicalDistributionChart: React.FC<
  CanonicalDistributionChartProps
> = ({ distribution, bookDistribution, totalOccurrences, onSelectBook }) => {
  if (distribution.length === 0 && bookDistribution.length === 0) {
    return null;
  }

  // Ordenar livros por número de ocorrências (top livros)
  const topBooks = [...bookDistribution].sort((a, b) => b.count - a.count);

  return (
    <div className="bg-white dark:bg-[#0D1117] rounded-xl border border-gray-200 dark:border-white/10 p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.05] pb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Distribuição Canônica
            </h4>
            <p className="text-[10px] text-gray-400">
              Ocorrência e frequência no cânon bíblico
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-200 dark:border-indigo-800/30">
          {totalOccurrences}{" "}
          {totalOccurrences === 1 ? "ocorrência" : "ocorrências"}
        </span>
      </div>

      {/* Gráfico de Barras por Divisão Canônica */}
      <div className="space-y-3">
        {distribution.map((item) => {
          const color = GROUP_COLORS[item.name] || {
            bar: "bg-indigo-500",
            text: "text-indigo-500",
            bg: "bg-indigo-500/10",
          };

          return (
            <div key={item.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {item.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-gray-500 dark:text-gray-400 text-[11px]">
                    {item.count}x
                  </span>
                  <span
                    className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${color.bg} ${color.text}`}
                  >
                    {item.percentage}%
                  </span>
                </div>
              </div>
              <div className="w-full h-2.5 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${color.bar} transition-all duration-500 ease-out`}
                  style={{ width: `${Math.max(item.percentage, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Frequência por Livro (Top Livros) */}
      {topBooks.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-white/[0.05]">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Frequência por Livro ({topBooks.length})</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {topBooks.map((b) => (
              <button
                key={b.bookId}
                onClick={
                  onSelectBook ? () => onSelectBook(b.bookName) : undefined
                }
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-white/[0.03] hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-gray-200/80 dark:border-white/[0.08] hover:border-indigo-300 dark:hover:border-indigo-700/50 transition-all text-left text-xs group"
                title={`${b.bookName}: ${b.count} ocorrências`}
              >
                <span className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {b.bookName}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-gray-200/60 dark:bg-white/10 text-[10px] font-mono font-bold text-gray-600 dark:text-gray-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">
                  {b.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
