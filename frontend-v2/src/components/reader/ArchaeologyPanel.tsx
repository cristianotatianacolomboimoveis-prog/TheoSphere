"use client";

import React, { useState } from "react";
import { Landmark, ChevronDown, ExternalLink, MapPin } from "lucide-react";
import { useTheoStore } from "@/store/useTheoStore";
import { useArchaeology, ArchaeologicalFind } from "@/hooks/useArchaeology";

/**
 * Painel de arqueologia do leitor.
 * Mostra descobertas do acervo ligadas ao capítulo (ou livro) aberto,
 * com selo de autenticidade acadêmica em cada achado.
 */

const AUTHENTICITY_STYLES: Record<string, { label: string; cls: string }> = {
  confirmada: {
    label: "Confirmada",
    cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  debatida: {
    label: "Debatida",
    cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  disputada: {
    label: "Disputada",
    cls: "bg-red-500/10 text-red-400 border-red-500/20",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  inscricao: "Inscrição",
  manuscrito: "Manuscrito",
  estrutura: "Estrutura",
  selo: "Selo",
  ossuario: "Ossuário",
  tablete: "Tablete",
  artefato: "Artefato",
};

const FindCard: React.FC<{ find: ArchaeologicalFind }> = ({ find }) => {
  const [open, setOpen] = useState(false);
  const auth =
    AUTHENTICITY_STYLES[find.authenticity] ?? AUTHENTICITY_STYLES.confirmada;

  return (
    <div className="rounded-xl border border-border-subtle bg-surface/30 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full p-3 flex items-start justify-between gap-3 text-left cursor-pointer hover:bg-surface-hover transition-colors"
      >
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-foreground truncate">
            {find.namePt}
          </span>
          <span className="text-[10px] text-muted uppercase tracking-wider mt-0.5">
            {CATEGORY_LABELS[find.category] ?? find.category}
            {find.period ? ` • ${find.period}` : ""}
            {find.discoveryYear ? ` • descoberta em ${find.discoveryYear}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase ${auth.cls}`}
          >
            {auth.label}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2 text-xs text-foreground/80">
          <p>{find.description}</p>
          <p className="text-foreground/60 italic">{find.significance}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {find.discoverySite}
            </span>
            {find.currentLocation && (
              <span>Acervo: {find.currentLocation}</span>
            )}
          </div>
          {find.relatedRefs.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {find.relatedRefs.map((ref) => (
                <span
                  key={ref}
                  className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-semibold"
                >
                  {ref}
                </span>
              ))}
            </div>
          )}
          {find.externalUrl && (
            <a
              href={find.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-accent hover:underline"
            >
              <ExternalLink className="w-3 h-3" /> Saiba mais
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export const ArchaeologyPanel: React.FC = () => {
  const { activeBook, activeChapter } = useTheoStore();
  const { finds, scope, loading } = useArchaeology(activeBook, activeChapter);
  const [expanded, setExpanded] = useState(false);

  // Sem achados e sem carregamento → não ocupa espaço no leitor
  if (!loading && finds.length === 0) return null;

  return (
    <div className="mt-4 rounded-2xl border border-border-subtle bg-surface/20 p-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">
            Arqueologia
          </span>
          {!loading && (
            <span className="text-[10px] text-muted">
              {finds.length} {finds.length === 1 ? "descoberta" : "descobertas"}
              {scope === "book" ? " neste livro" : " neste capítulo"}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {loading ? (
            <p className="text-xs text-muted italic">Carregando acervo...</p>
          ) : (
            finds.map((f) => <FindCard key={f.slug} find={f} />)
          )}
        </div>
      )}
    </div>
  );
};
