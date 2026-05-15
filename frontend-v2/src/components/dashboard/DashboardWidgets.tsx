"use client";

import { CheckCircle2, ChevronRight, BookOpen, ScrollText } from "lucide-react";

export function ReadingPlanWidget() {
  const tasks = [
    { id: 1, title: "Gênesis 32", completed: true },
    { id: 2, title: "Mateus 18", completed: false },
    { id: 3, title: "Atos 15", completed: false },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-widest">Progresso Diário</span>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-gray-800 dark:text-white">55%</span>
            <div className="h-1.5 w-24 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 w-[55%]" />
            </div>
          </div>
        </div>
        <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition-all shadow-sm">
          Concluir Hoje
        </button>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <div key={task.id} className="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-gray-100 dark:hover:border-white/5">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${task.completed ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-white/10"}`}>
                {task.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              <span className={`text-sm font-medium ${task.completed ? "text-gray-400 dark:text-white/30 line-through" : "text-gray-700 dark:text-white/80 group-hover:text-blue-600 dark:group-hover:text-blue-400"}`}>
                {task.title}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-white/20 group-hover:text-blue-600 transition-colors" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TheologicalInsightsWidget() {
  const insights = [
    { title: "O Credo Niceno & A Trindade", category: "Teologia Sistemática", summary: "Estudo sobre a consubstancialidade (homoousios) e o impacto nas controvérsias arianas do século IV." },
    { title: "Graça nas Epístolas Paulinas", category: "Exegese Acadêmica", summary: "Análise da terminologia 'charis' em Romanos, destacando a justificação forense vs. transformativa." }
  ];

  return (
    <div className="space-y-4">
      {insights.map((insight, i) => (
        <div key={insight.title} className="p-4 rounded-xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:border-blue-500/30 transition-all group cursor-pointer shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{insight.category}</span>
            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-white/20 group-hover:text-blue-600" />
          </div>
          <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-2 font-serif">{insight.title}</h4>
          <p className="text-xs text-gray-500 dark:text-white/40 leading-relaxed line-clamp-2 italic">"{insight.summary}"</p>
          <div className="mt-4 flex gap-2">
            <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[8px] font-bold text-gray-400 uppercase">Patrística</span>
            <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[8px] font-bold text-gray-400 uppercase">Agostinho</span>
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
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Sola Scriptura</div>
      </div>

      <div className="space-y-1">
        <h2 className="text-3xl font-serif font-bold text-gray-900 dark:text-white">Ad Fontes</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-blue-600 italic">"Às Fontes"</span>
          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">[Latim • Renascimento]</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Significado Acadêmico</h5>
          <p className="text-sm text-gray-600 dark:text-white/70 leading-relaxed">O imperativo de retornar aos textos originais (Hebraico e Grego) para uma exegese pura e livre de tradições acumuladas.</p>
        </div>
        
        <div className="space-y-2">
          <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Conexões</h5>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded-md bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[10px] font-bold text-gray-500 hover:text-blue-600 hover:border-blue-500/30 transition-all shadow-sm">Humanismo</button>
            <button className="px-3 py-1.5 rounded-md bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[10px] font-bold text-gray-500 hover:text-blue-600 hover:border-blue-500/30 transition-all shadow-sm">Erasmo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
