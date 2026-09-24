"use client";

import React, { useState } from "react";
import {
  useSyntaxDiagram,
  ClauseNode,
  ClauseType,
} from "../../hooks/useSyntaxDiagram";

interface SyntaxDiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBookId?: number;
  currentBookName?: string;
  currentChapter?: number;
  currentVerse?: number;
}

function getBadgeStyle(type: ClauseType): string {
  switch (type) {
    case "main":
      return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    case "subordinate_purpose":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    case "subordinate_causal":
      return "bg-blue-500/20 text-blue-300 border-blue-500/40";
    case "subordinate_conditional":
      return "bg-orange-500/20 text-orange-300 border-orange-500/40";
    case "subordinate_relative":
      return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
    case "participial":
      return "bg-purple-500/20 text-purple-300 border-purple-500/40";
    case "infinitive_phrase":
      return "bg-pink-500/20 text-pink-300 border-pink-500/40";
    case "prepositional_phrase":
      return "bg-indigo-500/20 text-indigo-300 border-indigo-500/40";
    case "vocative_apposition":
      return "bg-teal-500/20 text-teal-300 border-teal-500/40";
    default:
      return "bg-zinc-800 text-zinc-300 border-zinc-700";
  }
}

interface NodeProps {
  node: ClauseNode;
  level: number;
}

function TreeNode({ node, level }: NodeProps) {
  const badgeClass = getBadgeStyle(node.clauseType);

  return (
    <div
      className={`my-3 transition-all ${
        level > 0
          ? "ml-4 md:ml-8 pl-4 border-l-2 border-emerald-500/20 hover:border-emerald-500/50"
          : ""
      }`}
    >
      <div className="bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-4 shadow-sm backdrop-blur-sm transition-colors">
        {/* Header da Cláusula */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${badgeClass}`}
            >
              {node.labelPt}
            </span>
            {node.conjunction && (
              <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700">
                Conjunção:{" "}
                <strong className="text-zinc-200">{node.conjunction}</strong>
              </span>
            )}
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">
            Nível {level}
          </span>
        </div>

        {/* Texto Original */}
        {node.textOriginal && (
          <div className="mb-2">
            <p className="font-serif text-lg text-emerald-200/90 tracking-wide selection:bg-emerald-800 selection:text-white leading-relaxed">
              {node.textOriginal}
            </p>
          </div>
        )}

        {/* Texto Tradução em Português */}
        <div className="mb-3">
          <p className="text-sm text-zinc-300 leading-relaxed font-sans">
            &ldquo;{node.textTranslation}&rdquo;
          </p>
        </div>

        {/* Sujeito, Verbo e Morfologia */}
        {(node.grammaticalSubject || node.mainVerb) && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800/60 text-xs">
            {node.grammaticalSubject && (
              <div className="flex items-center gap-1.5 bg-zinc-950/60 px-2.5 py-1 rounded-md border border-zinc-800 text-zinc-400">
                <span className="text-zinc-500">Sujeito:</span>
                <span className="text-blue-300 font-medium font-serif">
                  {node.grammaticalSubject}
                </span>
              </div>
            )}
            {node.mainVerb && (
              <div className="flex items-center gap-1.5 bg-zinc-950/60 px-2.5 py-1 rounded-md border border-zinc-800 text-zinc-400">
                <span className="text-zinc-500">Verbo Regente:</span>
                <span className="text-amber-300 font-medium font-serif">
                  {node.mainVerb}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Nota Exegética / Teológica */}
        {node.theologicalNote && (
          <div className="mt-2.5 bg-emerald-950/20 border border-emerald-900/30 rounded-lg p-2.5 text-xs text-emerald-300/90 flex items-start gap-2">
            <span className="text-base leading-none">💡</span>
            <p className="leading-relaxed">{node.theologicalNote}</p>
          </div>
        )}
      </div>

      {/* Renderização recursiva de orações filhas */}
      {node.children && node.children.length > 0 && (
        <div className="space-y-2">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SyntaxDiagramModal({
  isOpen,
  onClose,
  currentBookId = 49,
  currentBookName = "Efésios",
  currentChapter = 1,
  currentVerse = 3,
}: SyntaxDiagramModalProps) {
  const {
    predefinedList,
    activeDiagram,
    selectedCanonicalId,
    isLoading,
    error,
    copied,
    loadCanonicalDiagram,
    loadVerseDiagram,
    copyDiagramMarkdown,
  } = useSyntaxDiagram({
    bookId: currentBookId,
    chapter: currentChapter,
    verse: currentVerse,
  });

  const [inputChapter, setInputChapter] = useState(currentChapter.toString());
  const [inputVerse, setInputVerse] = useState(currentVerse.toString());

  if (!isOpen) return null;

  const handleCustomSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const ch = parseInt(inputChapter, 10) || 1;
    const vs = parseInt(inputVerse, 10) || 1;
    loadVerseDiagram(currentBookId, ch, vs);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl font-bold">
              🌲
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-zinc-100">
                  Diagramador Estrutural de Frases & Cláusulas
                </h2>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded font-mono font-semibold">
                  Accordance-Grade
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Desconstrução sintática hierárquica de orações bíblicas nos
                textos originais
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyDiagramMarkdown}
              disabled={!activeDiagram}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-700 flex items-center gap-1.5 transition-colors disabled:opacity-40"
              title="Copiar esboço exegético em formato Markdown"
            >
              {copied ? (
                <>
                  <span className="text-emerald-400">✓</span> Copiado!
                </>
              ) : (
                <>
                  <span>📋</span> Copiar Markdown
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Toolbar de Passagens Canônicas */}
        <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/30 flex flex-wrap items-center justify-between gap-3">
          {/* Seletor rápido de canônicos */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
            <span className="text-xs font-semibold text-zinc-400 mr-1 whitespace-nowrap">
              Canônicos Célebres:
            </span>
            {predefinedList.map((item) => (
              <button
                key={item.id}
                onClick={() => loadCanonicalDiagram(item.id)}
                className={`text-xs px-3 py-1 rounded-lg border transition-all whitespace-nowrap ${
                  selectedCanonicalId === item.id
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-medium"
                    : "bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                {item.reference}
              </button>
            ))}
          </div>

          {/* Navegação para versículo atual */}
          <form
            onSubmit={handleCustomSearch}
            className="flex items-center gap-2 text-xs"
          >
            <span className="text-zinc-400 font-medium">{currentBookName}</span>
            <input
              type="number"
              min={1}
              value={inputChapter}
              onChange={(e) => setInputChapter(e.target.value)}
              className="w-14 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-center text-zinc-200 focus:outline-none focus:border-emerald-500"
              placeholder="Cap"
            />
            <span className="text-zinc-500">:</span>
            <input
              type="number"
              min={1}
              value={inputVerse}
              onChange={(e) => setInputVerse(e.target.value)}
              className="w-14 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-center text-zinc-200 focus:outline-none focus:border-emerald-500"
              placeholder="Ver"
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1 rounded border border-emerald-500 transition-colors"
            >
              Analisar
            </button>
          </form>
        </div>

        {/* Conteúdo Principal / Árvore de Cláusulas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500 space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">
                Decompondo cláusulas e relações sintáticas originais...
              </p>
            </div>
          ) : error ? (
            <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-4 text-red-300 text-sm">
              <p className="font-semibold mb-1">Aviso:</p>
              <p>{error}</p>
            </div>
          ) : activeDiagram ? (
            <div>
              {/* Resumo da Passagem */}
              <div className="mb-4 bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-zinc-100">
                    {activeDiagram.titlePt}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {activeDiagram.reference} • Fonte: {activeDiagram.authorPt}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="bg-zinc-800 px-3 py-1 rounded-md border border-zinc-700 text-zinc-300">
                    {activeDiagram.totalClauses} Cláusula(s)
                  </span>
                  <span className="bg-zinc-800 px-3 py-1 rounded-md border border-zinc-700 text-zinc-300">
                    Profundidade Máx: {activeDiagram.maxNestingDepth}
                  </span>
                </div>
              </div>

              {/* Árvore de Cláusulas */}
              <div className="space-y-1">
                {activeDiagram.rootClauses.map((rootNode) => (
                  <TreeNode key={rootNode.id} node={rootNode} level={0} />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Rodapé */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Motor Exegético Ativo • Alinhamento Morfo-Sintático TAGNT / STEP
              Bible
            </span>
          </div>
          <div className="text-[11px] text-zinc-500">
            Pressione{" "}
            <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-300">
              Esc
            </kbd>{" "}
            para fechar
          </div>
        </div>
      </div>
    </div>
  );
}
