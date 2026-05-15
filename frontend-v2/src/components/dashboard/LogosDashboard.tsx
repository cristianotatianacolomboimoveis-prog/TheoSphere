"use client";

import React, { useState, useEffect } from "react";
import { Search, Book, Bookmark, History, Plus, MapPin, Sparkles, X } from "lucide-react";
import { MapAdapter } from "@/lib/BibleMapAdapter";

interface Note {
  id: string;
  title: string;
  content: string;
  locationId?: string;
  coordinates?: [number, number];
}

export function LogosDashboard() {
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [verseOfDay, setVerseOfDay] = useState({
    text: "Pois eu bem sei os planos que tenho para vós, diz o Senhor...",
    ref: "Jeremias 29:11",
    coords: [31.7683, 35.2137] // Jerusalém
  });

  // ─── Carregar Notas (CRUD localStorage) ────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("logos_notes_data");
    if (saved) setNotes(JSON.parse(saved));

    // Listen for Map Events (Event Bus)
    if (MapAdapter) {
      const unsub = MapAdapter.events.subscribe('onLocationSelected', (loc: any) => {
        console.log("[LogosDashboard] Local selecionado no mapa:", loc);
        // Atualiza UI com base no clique do mapa
        setVerseOfDay(prev => ({
          ...prev,
          text: `Explorando ${loc.name || 'este local'} em profundidade...`,
          ref: `Geo-Contexto: ${loc.name}`
        }));
      });
      return unsub;
    }
  }, []);

  const saveNote = (note: Partial<Note>) => {
    const newNote = {
      id: activeNote?.id || Date.now().toString(),
      title: note.title || "Nova Nota",
      content: note.content || "",
      ...note
    } as Note;

    const updated = activeNote 
      ? notes.map(n => n.id === activeNote.id ? newNote : n)
      : [newNote, ...notes];
    
    setNotes(updated);
    localStorage.setItem("logos_notes_data", JSON.stringify(updated));
    setActiveNote(null);
  };

  // ─── Busca e Comando para o Mapa (Event Bus) ───────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search) return;

    // Simulação de busca geográfica (Egito)
    if (search.toLowerCase().includes("egito")) {
      MapAdapter?.flyTo(30.0444, 31.2357, 6);
    } else if (search.toLowerCase().includes("jerusalém")) {
      MapAdapter?.flyTo(31.7683, 35.2137, 12);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB] dark:bg-[#0A0D14] border-l border-gray-200 dark:border-white/10 w-[350px] shadow-2xl z-20">
      
      {/* Logos Search Bar */}
      <div className="p-4 border-b border-gray-200 dark:border-white/10">
        <form onSubmit={handleSearch} className="relative">
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar passagens ou locais..."
            className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-md py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        </form>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-6">
        
        {/* Verse of the Day (Contextual) */}
        <section className="bg-white dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Contexto Bíblico</h3>
          </div>
          <p className="text-sm italic text-gray-600 dark:text-gray-300 leading-relaxed mb-2">"{verseOfDay.text}"</p>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600">{verseOfDay.ref}</span>
            <button 
                onClick={() => MapAdapter?.flyTo(verseOfDay.coords[0], verseOfDay.coords[1], 10)}
                className="text-[10px] text-gray-400 hover:text-blue-500 flex items-center gap-1"
            >
                <MapPin className="w-3 h-3" /> Ver no Mapa
            </button>
          </div>
        </section>

        {/* Notes List */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Minhas Notas</h3>
            <button onClick={() => setActiveNote({ id: '', title: '', content: '' })} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded">
                <Plus className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          
          <div className="space-y-3">
            {notes.map(note => (
              <div 
                key={note.id} 
                onClick={() => setActiveNote(note)}
                className="p-3 rounded-lg border border-gray-100 dark:border-white/5 bg-white dark:bg-white/5 hover:border-blue-500/30 cursor-pointer transition-all"
              >
                <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-1">{note.title}</h4>
                <p className="text-xs text-gray-500 line-clamp-2">{note.content}</p>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Note Editor Overlay */}
      {activeNote && (
        <div className="absolute inset-0 bg-white dark:bg-[#0A0D14] z-30 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">Editar Nota</h2>
            <button onClick={() => setActiveNote(null)}><X className="w-5 h-5 text-gray-400" /></button>
          </div>
          <input 
            className="text-xl font-bold bg-transparent border-none focus:ring-0 mb-4" 
            placeholder="Título da Nota"
            defaultValue={activeNote.title}
            onBlur={(e) => setActiveNote({...activeNote, title: e.target.value})}
          />
          <textarea 
            className="flex-grow bg-transparent border-none focus:ring-0 text-sm leading-relaxed" 
            placeholder="Comece a escrever sua análise teológica..."
            defaultValue={activeNote.content}
            onBlur={(e) => setActiveNote({...activeNote, content: e.target.value})}
          />
          <button 
            onClick={() => saveNote(activeNote)}
            className="mt-4 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
          >
            Salvar Nota
          </button>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="p-3 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 flex justify-around">
        <Bookmark className="w-5 h-5 text-gray-400 hover:text-blue-500 cursor-pointer" />
        <Book className="w-5 h-5 text-gray-400 hover:text-blue-500 cursor-pointer" />
        <History className="w-5 h-5 text-gray-400 hover:text-blue-500 cursor-pointer" />
      </div>
    </div>
  );
}
