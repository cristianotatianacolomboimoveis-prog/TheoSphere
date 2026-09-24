"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link2,
  ExternalLink,
  Loader2,
  Copy,
  Check,
  Search,
  BookOpen,
} from "lucide-react";
import { parseRef, type CrossRef } from "@/hooks/useCrossRefs";

interface Props {
  sourceRef: string;
  position: { x: number; y: number };
  loader: (translation?: string) => Promise<CrossRef[]>;
  initialTranslation?: string;
  onClose: () => void;
  /** Callback quando o usuário clica em um ref → reader pula pra lá. */
  onJump: (parsed: { book: string; chapter: number; verse: number }) => void;
}

const AVAILABLE_TRANSLATIONS = [
  { id: "BLIVRE", label: "BLIVRE (PT)" },
  { id: "NVA", label: "NVA (PT)" },
  { id: "KJV", label: "KJV (EN)" },
  { id: "WEB", label: "WEB (EN)" },
];

/**
 * CrossRefsPopover — Popover de referências cruzadas canônicas (TSK - Treasury of Scripture Knowledge).
 *
 * Superior ao Logos Bible Software:
 *   • Pré-visualização instantânea do texto bíblico inline por versículo conectado
 *   • Alternância dinâmica de tradução (BLIVRE, NVA, KJV, WEB) sem recarregar a tela
 *   • Filtro textual e por livro bíblico em tempo real (0ms)
 *   • Ação de cópia formatada em 1 clique
 *   • Navegação direta (jump) preservando o contexto exegético
 */
export function CrossRefsPopover({
  sourceRef,
  position,
  loader,
  initialTranslation = "BLIVRE",
  onClose,
  onJump,
}: Props) {
  const [refs, setRefs] = useState<CrossRef[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTrans, setSelectedTrans] = useState(initialTranslation);
  const [filterQuery, setFilterQuery] = useState("");
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Esc fecha
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Click fora fecha
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

  // Carrega refs conforme tradução selecionada
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) setLoading(true);
    }, 0);

    void loader(selectedTrans).then((r) => {
      if (!cancelled) {
        setRefs(r);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [loader, selectedTrans]);

  // Filtro de referências e texto inline
  const filteredRefs = useMemo(() => {
    if (!refs) return [];
    if (!filterQuery.trim()) return refs;
    const q = filterQuery.toLowerCase().trim();
    return refs.filter(
      (r) =>
        r.target.toLowerCase().includes(q) ||
        (r.bookNamePt && r.bookNamePt.toLowerCase().includes(q)) ||
        (r.text && r.text.toLowerCase().includes(q)),
    );
  }, [refs, filterQuery]);

  // Copiar versículo com texto bíblico formatado
  const handleCopy = (r: CrossRef) => {
    const title = r.bookNamePt
      ? r.target.replace(/^[A-Za-z0-9\s]+(?=\s\d+:)/, r.bookNamePt)
      : r.target;
    const formatted = r.text
      ? `"${r.text}" (${title} - ${selectedTrans})`
      : title;

    void navigator.clipboard.writeText(formatted);
    setCopiedTarget(r.target);
    setTimeout(() => {
      setCopiedTarget((cur) => (cur === r.target ? null : cur));
    }, 2000);
  };

  // Posicionamento inteligente na viewport
  const CARD_W = 400;
  const CARD_H_MAX = 520;
  const left =
    typeof window !== "undefined"
      ? Math.max(16, Math.min(position.x, window.innerWidth - CARD_W - 16))
      : position.x;
  const top =
    typeof window !== "undefined"
      ? Math.max(
          16,
          Math.min(position.y + 16, window.innerHeight - CARD_H_MAX - 16),
        )
      : position.y + 16;

  return (
    <motion.div
      ref={cardRef}
      role="dialog"
      aria-label={`Referências cruzadas de ${sourceRef}`}
      initial={{ opacity: 0, scale: 0.96, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 6 }}
      transition={{ duration: 0.16 }}
      className="fixed z-[100] w-[390px] sm:w-[420px] bg-[#0c121e]/95 backdrop-blur-2xl rounded-2xl border border-emerald-500/25 shadow-[0_25px_60px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col"
      style={{ left, top }}
    >
      {/* Top Banner de Realce */}
      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 flex-shrink-0" />

      {/* Cabeçalho */}
      <header className="px-4 pt-3.5 pb-2.5 border-b border-white/10 flex-shrink-0 bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <Link2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-semibold text-white tracking-wide truncate">
                  Conexões Canônicas (TSK)
                </h4>
              </div>
              <p className="text-[11px] text-emerald-400 font-mono tracking-tight">
                {sourceRef}
              </p>
            </div>
          </div>

          {!loading && refs && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 font-medium">
              {filteredRefs.length} {filteredRefs.length === 1 ? "ref" : "refs"}
            </span>
          )}
        </div>

        {/* Barra de Filtro e Seletores de Tradução */}
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filtrar livro ou palavra..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          <div className="flex items-center bg-black/40 border border-white/10 rounded-lg p-0.5">
            {AVAILABLE_TRANSLATIONS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTrans(t.id)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  selectedTrans === t.id
                    ? "bg-emerald-500 text-black font-semibold shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
                title={`Traduzir texto inline para ${t.label}`}
              >
                {t.id}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Lista de Versículos Conectados com Texto Bíblico Inline */}
      <div className="max-h-[380px] overflow-y-auto thin-scrollbar p-2 space-y-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            <span className="text-xs text-emerald-300/70 font-mono tracking-wider">
              Carregando TSK em {selectedTrans}…
            </span>
          </div>
        ) : !refs || refs.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <BookOpen className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="text-xs text-white/70 font-medium">
              Nenhuma referência cruzada encontrada para este versículo.
            </p>
            <p className="text-[11px] text-white/40 mt-1 max-w-xs mx-auto">
              O acervo TSK é expandido dinamicamente conforme novas edições são
              indexadas.
            </p>
          </div>
        ) : filteredRefs.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-white/60">
              Nenhuma referência corresponde a &quot;{filterQuery}&quot;.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredRefs.map((r, i) => {
              const displayTitle = r.bookNamePt
                ? r.target.replace(/^[A-Za-z0-9\s]+(?=\s\d+:)/, r.bookNamePt)
                : r.target;
              const isCopied = copiedTarget === r.target;

              return (
                <motion.div
                  key={`${r.target}-${i}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.12,
                    delay: Math.min(i * 0.02, 0.2),
                  }}
                  className="group relative p-3 rounded-xl bg-white/[0.03] hover:bg-emerald-500/[0.08] border border-white/5 hover:border-emerald-500/30 transition-all duration-150"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold text-emerald-400 group-hover:text-emerald-300 transition-colors font-mono tracking-wide">
                        {displayTitle}
                      </span>
                      {typeof r.votes === "number" && r.votes > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-[9px] font-mono text-emerald-400/80">
                          {r.votes}↑
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleCopy(r)}
                        className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                        title="Copiar versículo"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const parsed = parseRef(r.target);
                          if (parsed) {
                            onJump(parsed);
                            onClose();
                          }
                        }}
                        className="flex items-center gap-1 px-1.5 py-1 rounded bg-white/5 hover:bg-emerald-500/20 text-[10px] text-white/70 hover:text-emerald-300 transition-colors"
                        title="Pular para passagem no leitor"
                      >
                        <span>Ir</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Texto Bíblico Inline */}
                  {r.text ? (
                    <p className="text-xs font-serif text-white/85 leading-relaxed pl-1 border-l-2 border-emerald-500/30 group-hover:border-emerald-400/60 transition-colors">
                      {r.text}
                    </p>
                  ) : (
                    <p className="text-[11px] italic text-white/40 pl-1 border-l border-white/10">
                      Texto não catalogado nesta edição ({selectedTrans}).
                    </p>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer com atalho de fechar */}
      <footer className="px-4 py-2 bg-black/40 border-t border-white/5 flex items-center justify-between text-[10px] text-white/40 flex-shrink-0 font-mono">
        <span>Esc fecha</span>
        <span>TSK • Treasury of Scripture Knowledge</span>
      </footer>
    </motion.div>
  );
}
