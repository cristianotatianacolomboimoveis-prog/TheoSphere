"use client";

import { Filter, Quote, Minus, Plus } from "lucide-react";
import type { ParsedAdvanced } from "@/hooks/useAdvancedSearch";

interface Props {
  parsed: ParsedAdvanced | null;
  hitsCount: number;
}

/**
 * Renderiza pequenos chips abaixo da search bar mostrando o que o parser
 * interpretou da query do usuário. Imita o painel "parsing preview" do
 * Logos: o usuário vê na hora se "AND" virou operador ou termo literal,
 * se "book:" foi reconhecido, etc.
 *
 * Mostra apenas quando há estrutura — query free-text não polui a UI.
 */
export function QueryChips({ parsed, hitsCount }: Props) {
  if (!parsed || !parsed.hasStructure) return null;

  const chips: { icon?: typeof Filter; label: string; tone: string }[] = [];

  if (parsed.bookName) {
    chips.push({
      icon: Filter,
      label: `Livro: ${parsed.bookName}`,
      tone: "accent",
    });
  }
  if (parsed.chapterMin != null && parsed.chapterMax != null) {
    const range =
      parsed.chapterMin === parsed.chapterMax
        ? String(parsed.chapterMin)
        : `${parsed.chapterMin}–${parsed.chapterMax}`;
    chips.push({
      icon: Filter,
      label: `Capítulo: ${range}`,
      tone: "accent",
    });
  }
  for (const phrase of parsed.phrases) {
    chips.push({
      icon: Quote,
      label: `"${phrase}"`,
      tone: "primary",
    });
  }
  for (const term of parsed.must) {
    chips.push({
      icon: Plus,
      label: term,
      tone: "emerald",
    });
  }
  for (const group of parsed.shouldGroups) {
    chips.push({
      label: group.join(" OR "),
      tone: "indigo",
    });
  }
  for (const neg of parsed.mustNot) {
    chips.push({
      icon: Minus,
      label: neg,
      tone: "red",
    });
  }

  if (chips.length === 0) return null;

  const toneMap: Record<string, string> = {
    accent: "bg-accent/10 text-accent border-accent/20",
    primary: "bg-primary/10 text-primary border-primary/20",
    emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    indigo: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
    red: "bg-red-500/10 text-red-300 border-red-500/20",
  };

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 px-1 py-1"
      role="status"
      aria-live="polite"
    >
      {chips.map((c, i) => (
        <span
          key={i}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${toneMap[c.tone] ?? toneMap.accent}`}
        >
          {c.icon && <c.icon className="w-2.5 h-2.5" />}
          <span className="truncate max-w-[160px]">{c.label}</span>
        </span>
      ))}
      <span className="text-[10px] text-foreground/40 ml-1">
        · {hitsCount} resultado{hitsCount === 1 ? "" : "s"}
      </span>
    </div>
  );
}
