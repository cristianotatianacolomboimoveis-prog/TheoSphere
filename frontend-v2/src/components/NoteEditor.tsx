"use client";

import React, { useState, useEffect } from "react";
import { Save, Trash2, MessageSquare, Clock } from "lucide-react";

export default function NoteEditor({ reference }: { reference: string }) {
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<{ref: string, text: string, date: string}[]>([]);

  useEffect(() => {
    const savedNote = localStorage.getItem(`note_${reference}`);
    setNote(savedNote || "");

    const savedHistory = JSON.parse(localStorage.getItem("note_history") || "[]");
    setHistory(savedHistory);
  }, [reference]);

  const saveNote = () => {
    localStorage.setItem(`note_${reference}`, note);
    const newEntry = { ref: reference, text: note, date: new Date().toLocaleString() };
    const newHistory = [newEntry, ...history.filter(h => h.ref !== reference)].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem("note_history", JSON.stringify(newHistory));
  };

  const clearNote = () => {
    if (confirm("Deseja apagar esta nota?")) {
      setNote("");
      localStorage.removeItem(`note_${reference}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background/20 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black tracking-widest text-white/90 uppercase">Caderno de Notas</h2>
          <p className="text-[10px] text-emerald-400 font-bold tracking-[0.1em]">{reference}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={clearNote} className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={saveNote} className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all">
            <Save className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-grow flex flex-col">
        <textarea 
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Escreva suas reflexões sobre este versículo aqui..."
          className="flex-grow bg-white/[0.02] border border-border-subtle rounded-3xl p-6 outline-none text-sm font-serif leading-relaxed text-white/70 focus:border-emerald-500/20 transition-all resize-none"
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] flex items-center gap-2">
          <Clock className="w-3 h-3" /> Histórico Recente
        </h3>
        <div className="space-y-2">
          {history.map((h, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/[0.01] border border-white/[0.03] flex justify-between items-center group cursor-pointer hover:bg-white/[0.03]">
              <span className="text-[10px] font-bold text-white/40 group-hover:text-emerald-400">{h.ref}</span>
              <span className="text-[8px] text-white/10">{h.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
