"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ChevronRight, BookOpen, ScrollText } from "lucide-react";
import { BIBLE_BOOKS } from "@/data/bibleBooks";
import { useTheoStore } from "@/store/useTheoStore";

/**
 * Plano de leitura diário REAL (QA 2026-07-14 — antes era mock estático).
 * Três trilhas determinísticas pela data (AT, NT e Salmos), com progresso
 * do dia persistido em localStorage e navegação direta para o leitor.
 */

/** Resolve o N-ésimo capítulo de uma faixa de livros (ex.: AT = livros 1-39). */
function nthChapter(
  n: number,
  fromBook: number,
  toBook: number,
): { book: string; chapter: number } {
  const books = BIBLE_BOOKS.filter((b) => b.id >= fromBook && b.id <= toBook);
  const total = books.reduce((s, b) => s + b.chapters, 0);
  let idx = ((n % total) + total) % total;
  for (const b of books) {
    if (idx < b.chapters) return { book: b.namePt, chapter: idx + 1 };
    idx -= b.chapters;
  }
  return { book: books[0].namePt, chapter: 1 };
}

/** Dias desde a época (UTC) — indexa o plano pela data local. */
function dayNumber(): number {
  const now = new Date();
  return Math.floor(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
      Date.UTC(2026, 0, 1)) /
      86_400_000,
  );
}

const PLAN_STORAGE_KEY = `theo-reading-plan-${new Date().toDateString()}`;

/** Lê o progresso do dia (client-only; SSR retorna vazio). */
function loadDone(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = window.localStorage.getItem(PLAN_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as number[]) : [];
  } catch {
    return [];
  }
}

export function ReadingPlanWidget() {
  const router = useRouter();
  const { setBibleReference } = useTheoStore();
  const [done, setDone] = useState<number[]>([]);

  // Carrega o progresso do dia após a hidratação (assíncrono para
  // respeitar a regra react-hooks/set-state-in-effect e evitar mismatch SSR)
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) setDone(loadDone());
    });
    return () => {
      active = false;
    };
  }, []);

  const day = dayNumber();
  const salmos = BIBLE_BOOKS.find((b) => b.id === 19)!;
  const tasks = [
    { id: 0, ...nthChapter(day, 1, 39) }, // trilha do AT
    { id: 1, ...nthChapter(day, 40, 66) }, // trilha do NT
    { id: 2, book: salmos.namePt, chapter: (day % salmos.chapters) + 1 }, // Salmo do dia
  ];

  const storageKey = PLAN_STORAGE_KEY;

  const toggle = (id: number) => {
    const next = done.includes(id)
      ? done.filter((d) => d !== id)
      : [...done, id];
    setDone(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // sem persistência
    }
  };

  const pct = Math.round((done.length / tasks.length) * 100);

  const openInReader = (book: string, chapter: number) => {
    setBibleReference(book, chapter);
    router.push("/study");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-widest">
            Progresso Diário
          </span>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-gray-800 dark:text-white">
              {pct}%
            </span>
            <div className="h-1.5 w-24 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => {
          const completed = done.includes(task.id);
          return (
            <div
              key={task.id}
              className="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-all border border-transparent hover:border-gray-100 dark:hover:border-white/5"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggle(task.id)}
                  aria-label={completed ? "Desmarcar" : "Marcar como lido"}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${completed ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-white/10"}`}
                >
                  {completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                </button>
                <button
                  onClick={() => openInReader(task.book, task.chapter)}
                  className={`text-sm font-medium text-left cursor-pointer ${completed ? "text-gray-400 dark:text-white/30 line-through" : "text-gray-700 dark:text-white/80 group-hover:text-blue-600 dark:group-hover:text-blue-400"}`}
                >
                  {task.book} {task.chapter}
                </button>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-white/20 group-hover:text-blue-600 transition-colors" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Fix 2026-07-20: os cards eram decorativos (cursor-pointer sem onClick).
 * Agora cada card abre o tópico correspondente na Enciclopédia (aba Tópicos)
 * e as tags abrem busca na Biblioteca — termos escolhidos entre os que
 * existem de fato nos dados (theologicalTopics / PUBLIC_BOOKS).
 */
export function TheologicalInsightsWidget() {
  const insights = [
    {
      title: "O Credo Niceno & A Trindade",
      category: "Teologia Sistemática",
      summary:
        "Estudo sobre a consubstancialidade (homoousios) e o impacto nas controvérsias arianas do século IV.",
      topic: "Trindade",
    },
    {
      title: "Graça nas Epístolas Paulinas",
      category: "Exegese Acadêmica",
      summary:
        "Análise da terminologia 'charis' em Romanos, destacando a justificação forense vs. transformativa.",
      topic: "Justificação",
    },
  ];

  const tags = [
    { label: "Patrística", href: "/library?q=Patr%C3%ADstica" },
    { label: "Agostinho", href: "/library?q=Agostinho" },
  ];

  return (
    <div className="space-y-4">
      {insights.map((insight) => (
        <div
          key={insight.title}
          className="p-4 rounded-xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:border-blue-500/30 transition-all group shadow-sm"
        >
          <Link
            href={`/encyclopedia?tab=topics&q=${encodeURIComponent(insight.topic)}`}
            className="block cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                {insight.category}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-white/20 group-hover:text-blue-600" />
            </div>
            <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-2 font-serif group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {insight.title}
            </h4>
            <p className="text-xs text-gray-500 dark:text-white/40 leading-relaxed line-clamp-2 italic">
              "{insight.summary}"
            </p>
          </Link>
          <div className="mt-4 flex gap-2">
            {tags.map((tag) => (
              <Link
                key={tag.label}
                href={tag.href}
                className="px-2 py-0.5 rounded bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[8px] font-bold text-gray-400 uppercase hover:text-blue-600 hover:border-blue-500/30 transition-colors"
              >
                {tag.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function WordOfTheDayWidget() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="px-2.5 py-1 rounded bg-blue-600/10 border border-blue-600/20 text-[9px] font-black text-blue-600 uppercase tracking-widest">
          Lema Acadêmico
        </div>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">
          Sola Scriptura
        </div>
      </div>

      <div className="space-y-1">
        <h2 className="text-3xl font-serif font-bold text-gray-900 dark:text-white">
          Ad Fontes
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-blue-600 italic">
            "Às Fontes"
          </span>
          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">
            [Latim • Renascimento]
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
            Significado Acadêmico
          </h5>
          <p className="text-sm text-gray-600 dark:text-white/70 leading-relaxed">
            O imperativo de retornar aos textos originais (Hebraico e Grego)
            para uma exegese pura e livre de tradições acumuladas.
          </p>
        </div>

        <div className="space-y-2">
          <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
            Conexões
          </h5>
          {/* Fix 2026-07-20: botões eram decorativos ("Humanismo"/"Erasmo" não
              existem nos dados — a busca voltaria vazia). Conexões agora
              apontam para destinos reais e fiéis ao lema Ad Fontes. */}
          <div className="flex gap-2">
            <Link
              href="/study"
              className="px-3 py-1.5 rounded-md bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[10px] font-bold text-gray-500 hover:text-blue-600 hover:border-blue-500/30 transition-all shadow-sm"
            >
              Interlinear Grego & Hebraico
            </Link>
            <Link
              href="/library"
              className="px-3 py-1.5 rounded-md bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[10px] font-bold text-gray-500 hover:text-blue-600 hover:border-blue-500/30 transition-all shadow-sm"
            >
              Clássicos da Fé
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
