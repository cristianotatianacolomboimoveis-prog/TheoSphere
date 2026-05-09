"use client";

import React, { useState, useEffect } from "react";
import { 
  Type, List, Layout, Save, Download, 
  Trash2, Wand2, ChevronDown, BookOpen, X, FileText, Plus 
} from "lucide-react";
import { useToast } from "./Toast";

interface Sermon {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export default function SermonBuilder({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("Meu Novo Sermão");
  const [content, setContent] = useState("");
  const [template, setTemplate] = useState("expositivo");
  const [isSaving, setIsSaving] = useState(false);
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { show } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem('theosphere-sermons');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSermons(parsed);
      } catch (e) {
        console.error("Erro ao carregar sermões", e);
      }
    }
  }, []);

  const createNew = () => {
    setTitle("Meu Novo Sermão");
    setContent("");
    setActiveId(null);
  };

  const loadSermon = (s: Sermon) => {
    setTitle(s.title);
    setContent(s.content);
    setActiveId(s.id);
  };

  const templates = {
    expositivo: "# Esboço Expositivo\n\n## I. Introdução\n[Contexto histórico e gancho inicial]\n\n## II. Exposição do Texto\n[Explicação verso a verso]\n\n## III. Aplicação Prática\n[Como viver isso hoje]\n\n## IV. Conclusão\n[Chamado à ação]",
    tematico: "# Esboço Temático\n\n## I. O Conceito de [Tema]\n\n## II. Evidências Bíblicas\n\n## III. O Impacto na Vida do Crente\n\n## IV. Conclusão",
    textual: "# Esboço Textual\n\n## I. A Ideia Central do Texto\n\n## II. Divisões Naturais do Versículo\n\n## III. Conclusão"
  };

  const applyTemplate = (type: string) => {
    if (confirm("Isso substituirá o conteúdo atual. Deseja continuar?")) {
      setTemplate(type);
      setContent(templates[type as keyof typeof templates]);
    }
  };

  const saveSermon = () => {
    setIsSaving(true);
    const newSermon: Sermon = {
      id: activeId || Date.now().toString(),
      title,
      content,
      createdAt: Date.now()
    };

    let updated: Sermon[];
    if (activeId) {
      updated = sermons.map(s => s.id === activeId ? newSermon : s);
    } else {
      updated = [newSermon, ...sermons];
      setActiveId(newSermon.id);
    }

    setSermons(updated);
    localStorage.setItem('theosphere-sermons', JSON.stringify(updated));
    
    setTimeout(() => {
      setIsSaving(false);
      show("Sermão salvo com sucesso!", "success");
    }, 500);
  };

  const deleteSermon = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Excluir este sermão permanentemente?")) return;
    const updated = sermons.filter(s => s.id !== id);
    setSermons(updated);
    localStorage.setItem('theosphere-sermons', JSON.stringify(updated));
    if (activeId === id) createNew();
    show("Sermão excluído", "info");
  };

  const exportSermon = () => {
    const fullText = `${title}\n\n${content}\n\n---\nGerado pelo TheoSphere OS - Homilética Profissional`;
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    show("Exportação concluída", "success");
  };

  return (
    <div className="flex h-full bg-[#05080f]/40 text-white overflow-hidden">
      {/* Sidebar Histórico */}
      <div className="w-64 border-r border-white/5 flex flex-col p-4 bg-black/20">
        <button 
          onClick={createNew}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all text-xs font-bold mb-6"
        >
          <Plus className="w-4 h-4" /> NOVO ESBOÇO
        </button>

        <div className="flex-grow overflow-y-auto space-y-2 custom-scrollbar pr-2">
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-3">Histórico de Esboços</p>
          {sermons.map(s => (
            <div 
              key={s.id}
              onClick={() => loadSermon(s)}
              className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                activeId === s.id ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-white/[0.02] border-transparent hover:border-white/10 text-white/50'
              }`}
            >
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-medium truncate flex-grow">{s.title}</span>
              <button 
                onClick={(e) => deleteSermon(s.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {sermons.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-8 h-8 text-white/5 mx-auto mb-2" />
              <p className="text-[10px] text-white/20 font-bold">Nenhum sermão salvo</p>
            </div>
          )}
        </div>
      </div>

      {/* Editor Principal */}
      <div className="flex-grow flex flex-col p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-black tracking-widest text-white/90 uppercase">Criador de Sermões</h2>
            <p className="text-[10px] text-blue-400 font-bold tracking-[0.1em]">MODO HOMILÉTICA</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={exportSermon}
              title="Exportar como .txt"
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white transition-all"
            >
              <Download className="w-4 h-4" />
            </button>
            <button 
              onClick={saveSermon}
              className={`p-2 rounded-xl border transition-all ${
                isSaving ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20'
              }`}
            >
              {isSaving ? <span className="animate-spin text-xs">...</span> : <Save className="w-4 h-4" />}
            </button>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/5 text-white/30 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex gap-2 mb-4 p-1.5 bg-white/5 rounded-2xl border border-white/5">
          <select 
            onChange={(e) => applyTemplate(e.target.value)}
            className="bg-transparent text-[10px] font-bold uppercase tracking-widest px-3 outline-none cursor-pointer text-white/50 hover:text-white"
          >
            <option value="expositivo" className="bg-[#05080f]">Template: Expositivo</option>
            <option value="tematico" className="bg-[#05080f]">Template: Temático</option>
            <option value="textual" className="bg-[#05080f]">Template: Textual</option>
          </select>
          <div className="ml-auto flex gap-1">
            <button className="p-1.5 rounded-lg hover:bg-white/10 text-white/30"><Type className="w-3.5 h-3.5" /></button>
            <button className="p-1.5 rounded-lg hover:bg-white/10 text-white/30"><List className="w-3.5 h-3.5" /></button>
            <button className="p-1.5 rounded-lg hover:bg-white/10 text-white/30"><Wand2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-grow flex flex-col bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden focus-within:border-blue-500/20 transition-all shadow-inner">
          <input 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent px-6 py-4 text-lg font-serif border-b border-white/5 outline-none text-white/90"
            placeholder="Título do Sermão..."
          />
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-grow bg-transparent p-6 outline-none text-sm font-serif leading-relaxed text-white/70 resize-none custom-scrollbar"
            placeholder="Comece a escrever seu sermão ou arraste insights da exegese..."
          />
        </div>

        {/* AI Assistance Suggestion */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 flex items-center gap-3 group cursor-pointer hover:from-indigo-500/20">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-indigo-400 group-hover:animate-pulse" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-white/80">TheoAI Homilética</p>
            <p className="text-[9px] text-white/40 truncate">Pedir para a IA sugerir ganchos ilustrativos para este sermão...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
