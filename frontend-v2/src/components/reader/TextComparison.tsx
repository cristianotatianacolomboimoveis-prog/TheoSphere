"use client";

import React, { useState, useMemo } from "react";
import {
  Columns2,
  Rows3,
  Copy,
  Check,
  X,
  SlidersHorizontal,
  Info,
  Sparkles,
  BookOpen,
} from "lucide-react";
import {
  useTextComparison,
  DiffToken,
  VerseVariantComparison,
} from "@/hooks/useTextComparison";

interface TextComparisonProps {
  bookId: number;
  chapter: number;
  verse?: number;
  initialBase?: string;
  initialTargets?: string[];
  onClose?: () => void;
  onSelectVerse?: (verseNum: number) => void;
}

const AVAILABLE_VERSIONS = [
  { code: "BLIVRE", name: "Bíblia Livre (TR)", lang: "PT", badge: "PT" },
  { code: "NVA", name: "Nova Versão Acesso (NA28)", lang: "PT", badge: "PT" },
  { code: "KJV", name: "King James Version", lang: "EN", badge: "EN" },
  { code: "WEB", name: "World English Bible", lang: "EN", badge: "EN" },
  { code: "TR", name: "Textus Receptus (Grego NT)", lang: "GRC", badge: "GR" },
  {
    code: "WLC",
    name: "Westminster Leningrad (Hebraico AT)",
    lang: "HEB",
    badge: "HE",
  },
  { code: "LXX", name: "Septuaginta (Grego AT)", lang: "GRC", badge: "GR" },
];

export function TextComparison({
  bookId,
  chapter,
  verse,
  initialBase = "BLIVRE",
  initialTargets = ["BLIVRE", "NVA", "KJV"],
  onClose,
  onSelectVerse,
}: TextComparisonProps) {
  const [baseTranslation, setBaseTranslation] = useState(initialBase);
  const [selectedTranslations, setSelectedTranslations] =
    useState<string[]>(initialTargets);
  const [viewMode, setViewMode] = useState<"columns" | "interleaved">(
    "columns",
  );
  const [showAdditions, setShowAdditions] = useState(true);
  const [showOmissions, setShowOmissions] = useState(true);
  const [copied, setCopied] = useState(false);

  // Hook de consumo do backend com diff e alinhamento
  const { data, loading, error } = useTextComparison(
    bookId,
    chapter,
    baseTranslation,
    selectedTranslations,
    verse,
  );

  const toggleTranslation = (code: string) => {
    if (code === baseTranslation) return; // Base é fixa no conjunto
    setSelectedTranslations((prev) => {
      if (prev.includes(code)) {
        if (prev.length <= 2) return prev; // Mantém pelo menos 2 versões
        return prev.filter((t) => t !== code);
      } else {
        return [...prev, code];
      }
    });
  };

  const handleCopy = () => {
    if (!data) return;
    let markdown = `# Comparação Sinótica — ${data.reference.display}\n\n`;
    markdown += `**Versão Base:** ${data.baseTranslation}\n\n`;

    for (const v of data.verses) {
      markdown += `### Versículo ${v.verse}\n`;
      markdown += `* **[${v.base.translation}]**: ${v.base.text}\n`;
      for (const [trans, res] of Object.entries(v.targets)) {
        markdown += `* **[${trans}]** (${res.diff.similarity}% similaridade): ${res.text}\n`;
      }
      markdown += "\n";
    }

    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#FCFBF7] dark:bg-[#0B0E14] text-gray-900 dark:text-gray-100 rounded-xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden">
      {/* ── Top Bar de Controle Exegético ── */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-gray-900 dark:text-white">
                Comparação de Versões & Variantes
              </h2>
              {data?.reference && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {data.reference.display}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Alinhamento sinótico com destaque léxico de adições e omissões
              textuais
            </p>
          </div>
        </div>

        {/* Controles de Visualização */}
        <div className="flex items-center gap-2">
          {/* Seletor de Modo (Colunas vs Intercalado) */}
          <div className="flex items-center bg-gray-100 dark:bg-white/5 p-1 rounded-lg border border-gray-200 dark:border-white/10">
            <button
              onClick={() => setViewMode("columns")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === "columns"
                  ? "bg-white dark:bg-white/15 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
              title="Visualização em colunas paralelas (Grid Sinótico)"
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Colunas</span>
            </button>
            <button
              onClick={() => setViewMode("interleaved")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === "interleaved"
                  ? "bg-white dark:bg-white/15 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
              title="Visualização verso a verso intercalada"
            >
              <Rows3 className="w-3.5 h-3.5" />
              <span>Intercalado</span>
            </button>
          </div>

          {/* Botão Copiar */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:border-blue-500/40 bg-white/50 dark:bg-white/5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
            title="Copiar estudo comparativo em Markdown"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copied ? "Copiado!" : "Copiar"}</span>
          </button>

          {/* Botão Fechar */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-all"
              title="Fechar Comparação"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Barra de Seleção de Versões & Filtros ── */}
      <div className="px-6 py-2.5 bg-gray-50/70 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Versão Base */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">
            Base de Referência:
          </span>
          <select
            value={baseTranslation}
            onChange={(e) => {
              const newBase = e.target.value;
              setBaseTranslation(newBase);
              if (!selectedTranslations.includes(newBase)) {
                setSelectedTranslations((prev) => [newBase, ...prev]);
              }
            }}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/15 rounded-lg px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {AVAILABLE_VERSIONS.map((v) => (
              <option key={v.code} value={v.code}>
                {v.code} — {v.name}
              </option>
            ))}
          </select>
        </div>

        {/* Versões Ativas para Comparar */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px] mr-1">
            Comparar com:
          </span>
          {AVAILABLE_VERSIONS.map((v) => {
            const isBase = v.code === baseTranslation;
            const isSelected = selectedTranslations.includes(v.code);
            return (
              <button
                key={v.code}
                onClick={() => toggleTranslation(v.code)}
                disabled={isBase}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 border ${
                  isBase
                    ? "bg-blue-600 text-white border-blue-600 cursor-default shadow-sm"
                    : isSelected
                      ? "bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400"
                      : "bg-transparent border-gray-200 dark:border-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                <span>{v.code}</span>
                <span className="text-[9px] px-1 rounded bg-black/10 dark:bg-white/10">
                  {v.badge}
                </span>
                {isBase && (
                  <span className="text-[9px] font-normal">(Base)</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Toggles de Destaque Textual */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={showAdditions}
              onChange={(e) => setShowAdditions(e.target.checked)}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
            />
            <span className="text-[11px]">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />
              Adições
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={showOmissions}
              onChange={(e) => setShowOmissions(e.target.checked)}
              className="rounded border-gray-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
            />
            <span className="text-[11px]">
              <span className="inline-block w-2 h-2 rounded-full bg-rose-500 mr-1" />
              Omissões
            </span>
          </label>
        </div>
      </div>

      {/* ── Área de Conteúdo da Comparação ── */}
      <div className="flex-grow overflow-y-auto p-6 custom-scrollbar-academic">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Alinhando variantes textuais em alta precisão...
            </p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-rose-500 bg-rose-500/10 rounded-xl border border-rose-500/20 max-w-md mx-auto my-12">
            <p className="font-semibold">{error}</p>
          </div>
        ) : !data || data.verses.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              Nenhum versículo encontrado para esta seleção.
            </p>
          </div>
        ) : viewMode === "columns" ? (
          /* ── MODO 1: GRID SINÓTICO (COLUNAS) ── */
          <div className="space-y-6">
            {/* Cabeçalho das Colunas com Métricas */}
            <div
              className="grid gap-4 sticky top-0 bg-[#FCFBF7]/90 dark:bg-[#0B0E14]/90 backdrop-blur-md py-3 z-10 border-b border-gray-200 dark:border-white/10"
              style={{
                gridTemplateColumns: `60px repeat(${data.translations.length}, minmax(260px, 1fr))`,
              }}
            >
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center self-end pb-1">
                Verso
              </div>
              {data.translations.map((trans) => {
                const isBase = trans === data.baseTranslation;
                const metric = data.metrics[trans];
                return (
                  <div
                    key={trans}
                    className={`p-3 rounded-lg border ${
                      isBase
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
                        : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm">{trans}</span>
                      {isBase ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white">
                          BASE
                        </span>
                      ) : metric ? (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            metric.averageSimilarity >= 80
                              ? "bg-emerald-500/20 text-emerald-400"
                              : metric.averageSimilarity >= 50
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {metric.averageSimilarity}% similar
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Linhas de Versículos Alinhados */}
            {data.verses.map((row) => (
              <div
                key={row.verse}
                className="grid gap-4 items-start py-3 border-b border-gray-100 dark:border-white/[0.04] hover:bg-gray-50/50 dark:hover:bg-white/[0.01] rounded-lg transition-colors"
                style={{
                  gridTemplateColumns: `60px repeat(${data.translations.length}, minmax(260px, 1fr))`,
                }}
              >
                <div
                  onClick={() => onSelectVerse?.(row.verse)}
                  className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400 text-center cursor-pointer hover:underline pt-1"
                >
                  {row.verse}
                </div>

                {data.translations.map((trans) => {
                  const isBase = trans === data.baseTranslation;
                  if (isBase) {
                    return (
                      <div
                        key={trans}
                        className={`text-sm leading-relaxed ${
                          trans === "WLC"
                            ? "font-serif text-base dir-rtl text-right"
                            : trans === "TR" || trans === "LXX"
                              ? "font-serif text-sm"
                              : ""
                        }`}
                      >
                        {row.base.text || (
                          <span className="text-gray-300 dark:text-gray-600 italic">
                            (não disponível)
                          </span>
                        )}
                      </div>
                    );
                  }

                  const targetData = row.targets[trans];
                  if (!targetData || !targetData.text) {
                    return (
                      <div
                        key={trans}
                        className="text-xs text-gray-300 dark:text-gray-600 italic"
                      >
                        (omite ou não traduzido)
                      </div>
                    );
                  }

                  return (
                    <div
                      key={trans}
                      className={`text-sm leading-relaxed ${
                        trans === "WLC"
                          ? "font-serif text-base dir-rtl text-right"
                          : trans === "TR" || trans === "LXX"
                            ? "font-serif text-sm"
                            : ""
                      }`}
                    >
                      <RenderDiffTokens
                        tokens={targetData.diff.tokens}
                        showAdditions={showAdditions}
                        showOmissions={showOmissions}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          /* ── MODO 2: INTERCALADO (VERSO A VERSO EM CASCATA) ── */
          <div className="space-y-6 max-w-4xl mx-auto">
            {data.verses.map((row) => (
              <div
                key={row.verse}
                className="p-5 rounded-xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.05] pb-2">
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                    Versículo {row.verse}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Base: {row.base.translation}
                  </span>
                </div>

                {/* Versão Base */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-600 text-white">
                      {row.base.translation}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">
                      Padrão de Referência
                    </span>
                  </div>
                  <p className="text-sm font-serif leading-relaxed text-gray-800 dark:text-gray-200 pl-2 border-l-2 border-blue-500/40">
                    {row.base.text}
                  </p>
                </div>

                {/* Demais Versões com Alinhamento de Variantes */}
                <div className="space-y-3 pt-2">
                  {Object.entries(row.targets).map(([trans, targetData]) => {
                    const similarity = targetData.diff.similarity;
                    return (
                      <div key={trans} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                              {trans}
                            </span>
                            <span
                              className={`text-[10px] font-bold ${
                                similarity >= 80
                                  ? "text-emerald-500"
                                  : similarity >= 50
                                    ? "text-amber-500"
                                    : "text-rose-500"
                              }`}
                            >
                              {similarity}% concordância
                            </span>
                          </div>
                        </div>

                        <p
                          className={`text-sm leading-relaxed pl-2 border-l-2 border-gray-200 dark:border-white/10 ${
                            trans === "WLC"
                              ? "font-serif text-base dir-rtl text-right"
                              : trans === "TR" || trans === "LXX"
                                ? "font-serif text-sm"
                                : "font-serif"
                          }`}
                        >
                          <RenderDiffTokens
                            tokens={targetData.diff.tokens}
                            showAdditions={showAdditions}
                            showOmissions={showOmissions}
                          />
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer com Legenda Exegética ── */}
      <div className="px-6 py-2.5 bg-gray-100/80 dark:bg-white/[0.03] border-t border-gray-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4 text-[11px] text-gray-500">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-gray-400 uppercase tracking-widest text-[9px]">
            Legenda de Variantes:
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/40 inline-block" />
            <strong className="text-emerald-600 dark:text-emerald-400">
              Adição
            </strong>{" "}
            (presente na tradução alvo)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-rose-500/20 border border-rose-500/40 inline-block" />
            <strong className="text-rose-600 dark:text-rose-400">
              Omissão
            </strong>{" "}
            (ausente na tradução alvo)
          </span>
        </div>
        <div>TheoSphere Engine • Comparação e Variantes em Milissegundos</div>
      </div>
    </div>
  );
}

/**
 * Renderizador de Tokens com Destaques Visuais Coloridos.
 */
function RenderDiffTokens({
  tokens,
  showAdditions,
  showOmissions,
}: {
  tokens: DiffToken[];
  showAdditions: boolean;
  showOmissions: boolean;
}) {
  return (
    <>
      {tokens.map((token, idx) => {
        if (token.type === "equal") {
          return (
            <span key={idx} className="text-gray-800 dark:text-gray-200">
              {token.text}{" "}
            </span>
          );
        }

        if (token.type === "added") {
          return (
            <span
              key={idx}
              className={`${
                showAdditions
                  ? "bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold px-1 py-0.5 rounded mx-0.5 border border-emerald-500/30"
                  : "text-gray-800 dark:text-gray-200"
              }`}
              title="Palavra adicionada em relação à versão base"
            >
              {token.text}{" "}
            </span>
          );
        }

        if (token.type === "removed") {
          if (!showOmissions) return null;
          return (
            <span
              key={idx}
              className="line-through text-rose-600/70 dark:text-rose-400/70 bg-rose-500/10 px-1 py-0.5 rounded mx-0.5 text-xs opacity-75 border border-rose-500/20"
              title="Palavra omitida em relação à versão base"
            >
              {token.text}{" "}
            </span>
          );
        }

        return null;
      })}
    </>
  );
}
