"use client";

import React from "react";
import { Layers, ChevronRight, Hash } from "lucide-react";
import { translateMorphology } from "@/lib/morphology";

interface InflectedFormItem {
  word: string;
  translit: string;
  morph: string | null;
  gloss: string;
  count: number;
  sampleRef: string;
}

interface InflectedFormsTableProps {
  forms: InflectedFormItem[];
  isNT?: boolean;
  onSelectRef?: (reference: string) => void;
}

export const InflectedFormsTable: React.FC<InflectedFormsTableProps> = ({
  forms,
  isNT = true,
  onSelectRef,
}) => {
  if (forms.length === 0) return null;

  return (
    <div className="bg-white dark:bg-[#0D1117] rounded-xl border border-gray-200 dark:border-white/10 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.05] pb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Formas Flexionadas no Texto ({forms.length})
            </h4>
            <p className="text-[10px] text-gray-400">
              Variações gramaticais encontradas no corpus bíblico
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-100 dark:border-white/[0.05] text-[10px] font-bold uppercase tracking-wider text-gray-400">
              <th className="py-2.5 px-3">Forma Original</th>
              <th className="py-2.5 px-3">Morfologia Exegética</th>
              <th className="py-2.5 px-3">Glosa</th>
              <th className="py-2.5 px-3 text-center">Frequência</th>
              <th className="py-2.5 px-3 text-right">Passagem Exemplo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/[0.03]">
            {forms.map((item, idx) => {
              const decodedMorph = item.morph
                ? translateMorphology(item.morph, isNT)
                : null;

              return (
                <tr
                  key={`${item.word}-${idx}`}
                  className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="py-3 px-3">
                    <div className="flex flex-col">
                      <span
                        className="text-base font-serif font-bold text-gray-900 dark:text-gray-100"
                        dir="auto"
                      >
                        {item.word}
                      </span>
                      <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400 italic">
                        {item.translit}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-3 max-w-[220px]">
                    <div className="flex flex-col gap-0.5">
                      {decodedMorph ? (
                        <span className="text-[11px] text-gray-700 dark:text-gray-300 font-medium">
                          {decodedMorph}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">
                          Não especificada
                        </span>
                      )}
                      {item.morph && (
                        <span className="text-[9px] font-mono text-gray-400">
                          [{item.morph}]
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-3 text-gray-600 dark:text-gray-300 font-serif">
                    {item.gloss || "—"}
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 text-[10px] font-bold font-mono border border-purple-200/50 dark:border-purple-800/30">
                      <Hash className="w-2.5 h-2.5" />
                      {item.count}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-right">
                    {item.sampleRef ? (
                      <button
                        onClick={
                          onSelectRef
                            ? () => onSelectRef(item.sampleRef)
                            : undefined
                        }
                        disabled={!onSelectRef}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/10 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 border border-indigo-200/60 dark:border-indigo-800/30 transition-all disabled:opacity-50"
                        title={`Abrir ${item.sampleRef} no leitor`}
                      >
                        <span>{item.sampleRef}</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
