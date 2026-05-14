"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link2, ExternalLink, Loader2 } from "lucide-react";
import { parseRef, type CrossRef } from "@/hooks/useCrossRefs";

interface Props {
  sourceRef: string;
  position: { x: number; y: number };
  loader: () => Promise<CrossRef[]>;
  onClose: () => void;
  /** Callback quando o usuário clica em um ref → reader pula pra lá. */
  onJump: (parsed: { book: string; chapter: number; verse: number }) => void;
}

/**
 * CrossRefsPopover — lista clicável de cross-references (TSK).
 *
 * Aparece quando o usuário toca no badge "🔗 N" ao lado de um versículo.
 * Faithlife (Logos) chama isso de "Passage List"; OliveTree de "Cross
 * References Card". Comportamento essencial:
 *   • Carrega refs sob demanda (não no mount do reader inteiro)
 *   • Mostra rank/votos quando disponíveis
 *   • Click em qualquer ref dispara `onJump` para mover o reader
 *   • Esc / click-fora fecham
 *   • Clamping de viewport pra não sair da tela
 *
 * Pequeno e intencionalmente sem deps de UI exotic — Tailwind + framer-motion
 * (já no projeto) bastam.
 */
export function CrossRefsPopover({
  sourceRef,
  position,
  loader,
  onClose,
  onJump,
}: Props) {
  const [refs, setRefs] = useState<CrossRef[] | null>(null);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  // Esc fecha
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Click fora fecha (defer 1 frame para não fechar no click que abriu)
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const t = setTimeout(() => {
      window.addEventListener("mousedown", onMouseDown);
    }, 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [onClose]);

  // Carrega refs
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loader().then((r) => {
      if (!cancelled) {
        setRefs(r);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loader]);

  // Clamp à viewport
  const CARD_W = 320;
  const CARD_H_MAX = 420;
  const left =
    typeof window !== "undefined"
      ? Math.min(position.x, window.innerWidth - CARD_W - 16)
      : position.x;
  const top =
    typeof window !== "undefined"
      ? Math.min(position.y + 20, window.innerHeight - CARD_H_MAX - 16)
      : position.y + 20;

  return (
    <motion.div
      ref={cardRef}
      role="dialog"
      aria-label={`Referências cruzadas de ${sourceRef}`}
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      transition={{ duration: 0.15 }}
      className="fixed z-[100] w-80 glass-heavy rounded-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
      style={{ left, top }}
    >
      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400" />

      <header className="px-4 pt-3 pb-2 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Link2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <h4 className="text-sm font-bold text-white truncate">
              Referências Cruzadas
            </h4>
          </div>
          {!loading && refs && (
            <span className="text-[10px] text-emerald-300/70 font-mono">
              {refs.length}
            </span>
          )}
        </div>
        <p className="text-[10px] text-white/40 font-mono mt-0.5">
          {sourceRef}
        </p>
      </header>

      <div className="max-h-[340px] overflow-y-auto thin-scrollbar">
        {loading ? (
          <div className="flex items-center gap-2 px-4 py-6 justify-center">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            <span className="text-[10px] text-emerald-300/60 uppercase tracking-widest font-bold">
              Buscando TSK…
            </span>
          </div>
        ) : !refs || refs.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-white/50">
              Nenhuma referência cruzada para este versículo.
            </p>
            <p className="text-[10px] text-white/30 mt-1">
              Rode <code className="text-amber-400">npm run db:seed:tsk</code>{" "}
              ou <code className="text-amber-400">npm run tsk:import</code>{" "}
              para popular o corpus.
            </p>
          </div>
        ) : (
          <ul className="py-1">
            {refs.map((r, i) => (
              <li key={`${r.target}-${i}`}>
                <button
                  type="button"
                  onClick={() => {
                    const parsed = parseRef(r.target);
                    if (parsed) {
                      onJump(parsed);
                      onClose();
                    }
                  }}
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-emerald-500/10 transition-colors text-left group"
                >
                  <span className="text-sm font-serif text-white/85 group-hover:text-emerald-300 transition-colors">
                    {r.target}
                  </span>
                  <span className="flex items-center gap-2 flex-shrink-0">
                    {typeof r.votes === "number" && r.votes > 0 && (
                      <span className="text-[9px] font-mono text-emerald-400/70">
                        {r.votes}↑
                      </span>
                    )}
                    <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-emerald-400 transition-colors" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
    </motion.div>
  );
}
