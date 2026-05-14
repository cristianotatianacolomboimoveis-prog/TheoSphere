"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Hash,
  ExternalLink,
  BookOpen,
  BarChart3,
  Languages,
  Library as LibraryIcon,
  FileText,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { logger } from "@/lib/logger";

interface LibraryHit {
  content: string;
  fileName: string;
  fileId?: string;
  similarity?: number;
  source: "vector" | "fulltext" | "hybrid";
}

interface LibraryLookupResponse {
  success: boolean;
  data: {
    term: string;
    excerpts: LibraryHit[];
  };
}

interface StrongOverlayProps {
  word: string;
  lemma?: string;
  strongId: string;
  definition: string;
  grammar?: string;
  occurrences?: number;
  bookOccurrences?: number;
  position: { x: number; y: number };
  onClose: () => void;
  transliteration?: string;
  pronunciation?: string;
  /** Abre o estudo completo da palavra no painel WordStudy. */
  onOpenWordStudy?: (strongId: string) => void;
}

/**
 * StrongOverlay — popover instantâneo que aparece quando o usuário clica
 * em uma palavra com Strong's tag no BibleReader.
 *
 * Replica o comportamento "tap a Greek/Hebrew word → lexical card" do
 * Logos / Olive Tree:
 *   • Cabeçalho com lema, transliteração (se houver), Strong's ID.
 *   • Glossa lexical curta (do dataset Strong's seed do app).
 *   • Estatísticas de ocorrência (no livro / global).
 *   • NOVO (Fase A integrada): mini-lista com até 3 trechos da biblioteca
 *     pessoal do usuário falando dessa palavra. Carregada async em paralelo,
 *     não bloqueia a renderização do overlay.
 *   • Ações: "Estudo Completo" → abre WordStudy no Strong's;
 *            "Sua Biblioteca" → expande/foca os trechos.
 *
 * Posicionamento defensivo: clampa coordenadas pra não sair da viewport e
 * fecha em Escape / click fora.
 */
export const StrongOverlay: React.FC<StrongOverlayProps> = ({
  word,
  lemma,
  strongId,
  definition,
  grammar,
  occurrences,
  bookOccurrences,
  position,
  onClose,
  transliteration,
  pronunciation,
  onOpenWordStudy,
}) => {
  const [libraryHits, setLibraryHits] = useState<LibraryHit[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Esc para fechar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Click fora (mas não no próprio card)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Atraso 1 frame: senão fecha imediatamente no mesmo click que abriu.
    const t = setTimeout(() => {
      window.addEventListener("mousedown", onClick);
    }, 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener("mousedown", onClick);
    };
  }, [onClose]);

  // Lookup na biblioteca pessoal — async, falha em silêncio.
  useEffect(() => {
    let cancelled = false;
    setLibraryHits([]);
    setLoadingLibrary(true);

    const term = lemma || word;
    const run = async () => {
      try {
        const res = await api.get<LibraryLookupResponse>(
          `library/lookup?term=${encodeURIComponent(term)}&strongId=${encodeURIComponent(strongId)}&limit=3`,
          { timeoutMs: 8_000 },
        );
        if (!cancelled && res.success) {
          setLibraryHits(res.data.excerpts);
        }
      } catch (err) {
        // 401: usuário não logado. 404: backend antigo. Outros: rede.
        // Em qualquer caso o popover continua útil com Strong's seed.
        if (!(err instanceof ApiError)) {
          logger.warn("[StrongOverlay] library lookup falhou:", err);
        }
      } finally {
        if (!cancelled) setLoadingLibrary(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [strongId, lemma, word]);

  // Clampar coordenadas — w-80 (320px) + h-estimado para baixo
  const CARD_WIDTH = 320;
  const CARD_HEIGHT_ESTIMATE = 480;
  const left =
    typeof window !== "undefined"
      ? Math.min(position.x, window.innerWidth - CARD_WIDTH - 16)
      : position.x;
  const top =
    typeof window !== "undefined"
      ? Math.min(position.y + 20, window.innerHeight - CARD_HEIGHT_ESTIMATE - 16)
      : position.y + 20;

  return (
    <motion.div
      ref={cardRef}
      role="dialog"
      aria-label={`Análise lexical de ${word}`}
      initial={{ opacity: 0, scale: 0.9, y: 10, filter: "blur(10px)" }}
      animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.9, y: 10, filter: "blur(10px)" }}
      className="fixed z-[100] w-80 glass-heavy p-0 rounded-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
      style={{ left, top }}
    >
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />

      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1">
            <h4 className="text-xl font-serif font-bold text-white tracking-wide">
              {word}
            </h4>
            {lemma && lemma !== word && (
              <div className="flex items-center gap-1.5 text-[10px] text-blue-300 font-medium">
                <Languages className="w-3 h-3" />
                <span className="uppercase tracking-widest">Lema: {lemma}</span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-white/40 font-mono bg-white/5 px-2 py-0.5 rounded-full border border-border-strong flex items-center gap-1">
                <Hash className="w-2.5 h-2.5 text-blue-500" /> {strongId}
              </span>
            </div>
            {transliteration && (
              <p className="text-xs text-white/60 italic mt-1 font-serif">
                {transliteration} {pronunciation && <span className="text-[10px] opacity-50 not-italic ml-1">[{pronunciation}]</span>}
              </p>
            )}
          </div>
          <div className="bg-blue-500/20 text-blue-300 text-[9px] font-black px-2 py-0.5 rounded-md border border-blue-500/30 uppercase tracking-tighter">
            Análise PhD
          </div>
        </div>

        <div className="space-y-3">
          {grammar && (
            <div className="bg-indigo-500/10 rounded-lg p-2.5 border border-indigo-500/20">
              <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest mb-1">
                Morfologia
              </p>
              <p className="text-xs text-white/90 font-medium leading-tight">
                {grammar}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
              Definição Léxica
            </p>
            <p className="text-xs text-white/80 leading-relaxed font-light">
              {definition}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-white/5 rounded-xl p-2 border border-border-strong">
              <p className="text-[8px] text-white/40 font-bold uppercase tracking-tighter mb-0.5">
                No Livro
              </p>
              <div className="flex items-end gap-1">
                <span className="text-lg font-black text-cyan-400 leading-none">
                  {bookOccurrences || 0}
                </span>
                <BarChart3 className="w-3 h-3 text-cyan-400/50 mb-0.5" />
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-border-strong">
              <p className="text-[8px] text-white/40 font-bold uppercase tracking-tighter mb-0.5">
                Global (Bíblia)
              </p>
              <div className="flex items-end gap-1">
                <span className="text-lg font-black text-indigo-400 leading-none">
                  {occurrences || 0}
                </span>
                <BarChart3 className="w-3 h-3 text-indigo-400/50 mb-0.5" />
              </div>
            </div>
          </div>

          {/* Sua Biblioteca (Fase A integrada) */}
          <div className="pt-2 border-t border-white/5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-amber-300/80 font-bold uppercase tracking-widest flex items-center gap-1">
                <LibraryIcon className="w-3 h-3" /> Sua Biblioteca
              </p>
              {libraryHits.length > 0 && (
                <span className="text-[9px] text-amber-300/60 font-mono">
                  {libraryHits.length}
                </span>
              )}
            </div>

            {loadingLibrary ? (
              <div className="space-y-1.5">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="h-12 rounded-lg bg-white/[0.03] animate-pulse"
                  />
                ))}
              </div>
            ) : libraryHits.length === 0 ? (
              <p className="text-[10px] text-white/30 italic">
                Sem trechos para este Strong's nas suas obras.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {libraryHits.map((h, i) => (
                  <li
                    key={`${h.fileId ?? h.fileName}-${i}`}
                    className="bg-black/20 border border-white/5 rounded-lg p-2 hover:border-amber-500/30 transition-colors group"
                    title={h.content}
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-[9px] font-bold text-amber-200/80 truncate flex items-center gap-1 min-w-0">
                        <FileText className="w-2.5 h-2.5 flex-shrink-0" />
                        <span className="truncate">{h.fileName}</span>
                      </span>
                      {typeof h.similarity === "number" && (
                        <span className="text-[8px] font-mono text-emerald-400/60 flex-shrink-0">
                          {Math.round(h.similarity * 100)}%
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-white/55 leading-snug font-serif line-clamp-2">
                      {h.content}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                onOpenWordStudy?.(strongId);
                onClose();
              }}
              disabled={!onOpenWordStudy}
              className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-[9px] font-bold text-white/60 flex items-center justify-center gap-1.5 transition-all active:scale-95 border border-border-subtle"
            >
              <BookOpen className="w-3.5 h-3.5" /> Estudo Completo
            </button>
            <a
              href={`https://www.blueletterbible.org/lang/lexicon/lexicon.cfm?Strongs=${encodeURIComponent(strongId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-[9px] font-bold text-blue-400 flex items-center justify-center gap-1.5 transition-all active:scale-95 border border-blue-500/20 shadow-lg shadow-blue-500/5"
              title="Abrir no Blue Letter Bible"
            >
              <ExternalLink className="w-3.5 h-3.5" /> BLB
            </a>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
    </motion.div>
  );
};
