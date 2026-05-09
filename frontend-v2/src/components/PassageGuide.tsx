"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  X, BookOpen, Users, MapPin, Calendar, MessageSquare, ChevronDown, ChevronRight,
  Loader2, Link2, Lightbulb, ScrollText, ArrowLeft, ExternalLink,
  Library, Languages, Trash2, Save 
} from "lucide-react";
import { useToast } from "./Toast";

interface UserNote {
  id: string;
  reference: string;
  content: string;
  timestamp: number;
}
import { motion, AnimatePresence } from "framer-motion";
import { BIBLE_BOOKS, type BibleBook } from "@/data/bibleBooks";
import { CROSS_REFERENCES, findRelatedReferences } from "@/data/crossReferences";
import { BIBLICAL_PEOPLE, searchPeople } from "@/data/biblicalPeople";
import { BIBLICAL_EVENTS, searchEvents } from "@/data/biblicalEvents";
import { SEED_LOCATIONS, type GeoLocation3D } from "@/data/geoSeedData";
import { THEOLOGICAL_TOPICS, searchTopics } from "@/data/theologicalTopics";
import { COMMENTARIES, getCommentariesForReference } from "@/data/commentaries";
import { DICTIONARIES, searchDictionaries } from "@/data/dictionaries";

/* ─── Types ──────────────────────────────────────────────── */

interface VerseData {
  verse: number;
  text: string;
}

interface Section {
  id: string;
  title: string;
  icon: React.ElementType;
  open: boolean;
}

/* ─── Component ──────────────────────────────────────────── */

export default function PassageGuide({ onClose, initialRef }: { onClose: () => void; initialRef?: string }) {
  const [reference, setReference] = useState(initialRef || "John 3:16");
  const [inputRef, setInputRef] = useState(initialRef || "John 3:16");
  const [verses, setVerses] = useState<VerseData[]>([]);
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<Section[]>([
    { id: "text", title: "Texto Bíblico", icon: BookOpen, open: true },
    { id: "commentaries", title: "Comentários Clássicos", icon: Library, open: true },
    { id: "crossrefs", title: "Referências Cruzadas", icon: Link2, open: true },
    { id: "dictionaries", title: "Lexicon & Dicionários", icon: Languages, open: false },
    { id: "people", title: "Pessoas", icon: Users, open: false },
    { id: "places", title: "Lugares", icon: MapPin, open: false },
    { id: "events", title: "Eventos", icon: Calendar, open: false },
    { id: "topics", title: "Tópicos Teológicos", icon: Lightbulb, open: false },
    { id: "notes", title: "Minhas Notas", icon: MessageSquare, open: true },
  ]);

  const [noteContent, setNoteContent] = useState("");
  const [userNotes, setUserNotes] = useState<UserNote[]>([]);
  const { show } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem('theosphere-notes');
    if (saved) {
      try {
        setUserNotes(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar notas", e);
      }
    }
  }, []);

  const saveNote = () => {
    if (!noteContent.trim()) return;
    
    const newNote: UserNote = {
      id: Date.now().toString(),
      reference,
      content: noteContent,
      timestamp: Date.now()
    };

    const updated = [newNote, ...userNotes];
    try {
      localStorage.setItem('theosphere-notes', JSON.stringify(updated));
      setUserNotes(updated);
      setNoteContent("");
      show("Nota salva com sucesso!", "success");
    } catch (e) {
      show("Erro ao salvar: Espaço em disco insuficiente", "error");
    }
  };

  const deleteNote = (id: string) => {
    const updated = userNotes.filter(n => n.id !== id);
    setUserNotes(updated);
    localStorage.setItem('theosphere-notes', JSON.stringify(updated));
    show("Nota removida", "info");
  };

  const currentPassageNotes = userNotes.filter(n => 
    n.reference.toLowerCase().includes(reference.toLowerCase()) || 
    reference.toLowerCase().includes(n.reference.toLowerCase())
  );

  const toggleSection = (id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, open: !s.open } : s));
  };

  /* ── Fetch passage ────────────────────────────────────── */
  const fetchPassage = useCallback(async (ref: string) => {
    setLoading(true);
    try {
      const res = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=kjv`);
      const data = await res.json();
      if (data.verses) {
        setVerses(data.verses.map((v: { verse: number; text: string }) => ({
          verse: v.verse, text: v.text.trim(),
        })));
        setReference(data.reference || ref);
      }
    } catch { /* no-op */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPassage(reference); }, []);

  const handleSearch = () => {
    if (inputRef.trim()) fetchPassage(inputRef.trim());
  };

  /* ── Extract context from text ────────────────────────── */
  const fullText = useMemo(() => verses.map(v => v.text).join(" ").toLowerCase(), [verses]);

  /* ── Contextual Datasets (Memoized for Performance) ── */
  const relatedPeople = useMemo(() => {
    return BIBLICAL_PEOPLE.filter(p => fullText.includes(p.namePt.toLowerCase()));
  }, [fullText]);

  const relatedLocations = useMemo(() => {
    return SEED_LOCATIONS.filter(loc => fullText.includes(loc.names.pt.toLowerCase()));
  }, [fullText]);

  const relatedEvents = useMemo(() => {
    return BIBLICAL_EVENTS.filter(e => 
      e.scriptureBase.toLowerCase().includes(reference.toLowerCase()) ||
      reference.toLowerCase().includes(e.scriptureBase.toLowerCase())
    );
  }, [reference]);

  const relatedTopics = useMemo(() => {
    return THEOLOGICAL_TOPICS.filter(t =>
      t.keyVerses.some(v => v.toLowerCase().includes(reference.toLowerCase().split(" ")[0]))
    );
  }, [reference]);

  const crossRefs = findRelatedReferences(reference);
  const commentaries = getCommentariesForReference(reference);
  
  // Simulated dictionary extraction (would use NLP in real world)
  const commonTheologicalTerms = ["grace", "justification", "baptism", "sanctification", "love", "world", "believe"];
  const dictionaryMatches = DICTIONARIES.filter(d => 
    fullText.includes(d.word.toLowerCase()) || 
    commonTheologicalTerms.some(term => fullText.includes(term) && d.word.toLowerCase() === term)
  );

  /* ── Lazy Loading de Comentários ──────────────────────── */
  const [visibleCommentCount, setVisibleCommentCount] = useState(5);
  const observerTarget = React.useRef(null);

  useEffect(() => {
    setVisibleCommentCount(5); // Reseta ao mudar de passagem
  }, [reference]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setVisibleCommentCount(prev => prev + 5);
        }
      },
      { threshold: 1.0 }
    );
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => {
      if (observerTarget.current) observer.unobserve(observerTarget.current);
    };
  }, [observerTarget.current]);

  const visibleCommentaries = commentaries.slice(0, visibleCommentCount);

  /* ── Render ───────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full bg-[#05080f]/95 backdrop-blur-3xl text-white overflow-hidden shadow-2xl border-l border-white/5 relative animate-fade-in">
      {/* Absolute glow background for premium feel */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/5 flex-shrink-0 relative z-10 bg-gradient-to-b from-[#05080f] to-transparent">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25 animate-pulse-glow">
              <ScrollText className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight"><span className="text-gradient">GUIA DE PASSAGEM</span></h2>
              <p className="text-[10px] text-white/30 font-bold tracking-[0.2em] uppercase">Estudo Exegético Profundo</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-white/5 rounded-xl transition-all text-white/30 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reference input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={inputRef}
            onChange={(e) => setInputRef(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Ex: João 3:16, Romanos 8:28"
            className="input-glass flex-grow text-sm focus:border-amber-500/50"
          />
          <button onClick={handleSearch} className="btn-primary px-4 bg-gradient-to-br from-amber-500 to-orange-600 hover:shadow-amber-500/20">
            Pesquisar
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow overflow-y-auto custom-scrollbar px-5 py-4 relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
              <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full" />
            </div>
            <span className="mt-4 text-xs font-bold uppercase tracking-widest text-amber-500/60">Analisando passagem e bibliotecas...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map((section) => {
              const Icon = section.icon;
              
              // Count badges
              let badgeCount = 0;
              if (section.id === "crossrefs") badgeCount = crossRefs.length;
              if (section.id === "people") badgeCount = relatedPeople.length;
              if (section.id === "places") badgeCount = relatedLocations.length;
              if (section.id === "commentaries") badgeCount = commentaries.length;
              if (section.id === "dictionaries") badgeCount = dictionaryMatches.length;
              
              return (
                <div key={section.id} className="rounded-[18px] border border-white/5 bg-white/[0.01] overflow-hidden backdrop-blur-md transition-all hover:border-white/10 group/section">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center gap-3.5 px-5 py-4 hover:bg-white/[0.03] transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-white/[0.03] flex items-center justify-center group-hover:bg-amber-500/10 group-hover:text-amber-400 transition-all">
                      <Icon className="w-4.5 h-4.5 text-white/40 group-hover:text-amber-400" />
                    </div>
                    <span className="text-xs font-black text-white/70 flex-grow uppercase tracking-[0.15em] group-hover:text-white transition-colors">
                      {section.title}
                    </span>
                    {badgeCount > 0 && (
                      <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-1 rounded-lg text-[10px] font-black shadow-inner">
                        {badgeCount}
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-white/10 transition-transform duration-300 ${section.open ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {section.open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-1">
                          {/* ── Text Section ──────── */}
                          {section.id === "text" && (
                            <div className="bible-text text-[15px] leading-[1.9] p-4 bg-[#0a0f1a] rounded-xl border border-white/5 shadow-inner">
                              <h3 className="text-xl font-serif font-bold text-amber-400 mb-3">{reference}</h3>
                              {verses.map((v) => (
                                <span key={v.verse} className="verse inline">
                                  <sup className="verse-number text-amber-500/50 mr-1">{v.verse}</sup>
                                  {v.text}{" "}
                                </span>
                              ))}
                              {verses.length === 0 && (
                                <p className="text-xs text-white/20 italic">Nenhum texto encontrado para esta referência.</p>
                              )}
                            </div>
                          )}

                          {/* ── Commentaries Section ──── */}
                          {section.id === "commentaries" && (
                            <div className="space-y-3">
                              {visibleCommentaries.length > 0 ? visibleCommentaries.map((comm) => (
                                <div key={comm.id} className="p-4 rounded-xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.05] relative overflow-hidden group">
                                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50" />
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <h4 className="text-sm font-bold text-white/90">{comm.author}</h4>
                                      <p className="text-[10px] text-amber-400/60 font-medium">{comm.title} ({comm.year})</p>
                                    </div>
                                    <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/40 uppercase tracking-wider">{comm.tradition}</span>
                                  </div>
                                  <div className="relative">
                                    <p className="text-xs text-white/60 leading-relaxed italic border-l-2 border-white/10 pl-3 py-1">"{comm.text}"</p>
                                  </div>
                                </div>
                              )) : (
                                <p className="text-xs text-white/20 italic p-3 text-center border border-dashed border-white/10 rounded-lg">Nenhum comentário clássico indexado para esta passagem.</p>
                              )}
                              
                              {/* Elemento alvo para o Lazy Loading (Infinite Scroll) */}
                              {visibleCommentCount < commentaries.length && (
                                <div ref={observerTarget} className="py-4 flex justify-center">
                                  <Loader2 className="w-5 h-5 text-amber-500/50 animate-spin" />
                                </div>
                              )}
                            </div>
                          )}

                          {/* ── Dictionaries Section ──── */}
                          {section.id === "dictionaries" && (
                            <div className="space-y-3">
                              {dictionaryMatches.length > 0 ? dictionaryMatches.map((dict) => (
                                <div key={dict.id} className="p-3 rounded-lg bg-[#0a0f1a] border border-white/[0.05]">
                                  <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-2">
                                    <h4 className="text-sm font-bold text-blue-400">{dict.word}</h4>
                                    <span className="text-[9px] text-white/30 uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded">{dict.source}</span>
                                  </div>
                                  <p className="text-xs text-white/60 leading-relaxed">{dict.definition}</p>
                                </div>
                              )) : (
                                <p className="text-xs text-white/20 italic p-3 text-center border border-dashed border-white/10 rounded-lg">Nenhum termo de dicionário relevante detectado.</p>
                              )}
                            </div>
                          )}

                          {/* ── Cross References ──── */}
                          {section.id === "crossrefs" && (
                            <div className="space-y-1.5">
                              {crossRefs.length > 0 ? crossRefs.map((ref, i) => (
                                <button
                                  key={i}
                                  onClick={() => { setInputRef(ref); fetchPassage(ref); }}
                                  className="w-full text-left px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.03] hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-xs group flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-2">
                                    <Link2 className="w-3 h-3 text-amber-500/40 group-hover:text-amber-500" />
                                    <span className="text-white/70 font-mono font-medium group-hover:text-amber-400">{ref}</span>
                                  </div>
                                  <ChevronRight className="w-3 h-3 text-white/10 group-hover:text-amber-500" />
                                </button>
                              )) : (
                                <p className="text-xs text-white/20 italic">Nenhuma referência cruzada encontrada para esta passagem.</p>
                              )}
                            </div>
                          )}

                          {/* ── People ──────────── */}
                          {section.id === "people" && (
                            <div className="space-y-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                              {relatedPeople.length > 0 ? relatedPeople.map((person) => (
                                <div key={person.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.03] hover:border-blue-500/30 transition-colors">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                                      <Users className="w-3 h-3 text-blue-400" />
                                    </div>
                                    <h4 className="text-sm font-bold text-white/80">{person.namePt}</h4>
                                  </div>
                                  <p className="text-[10px] text-blue-400/60 font-medium mb-1.5">{person.role} · {person.period}</p>
                                  <p className="text-[11px] text-white/40 leading-relaxed line-clamp-2">{person.description}</p>
                                </div>
                              )) : (
                                <p className="text-xs text-white/20 italic col-span-2">Nenhuma pessoa identificada nesta passagem.</p>
                              )}
                            </div>
                          )}

                          {/* ── Places ──────────── */}
                          {section.id === "places" && (
                            <div className="space-y-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                              {relatedLocations.length > 0 ? relatedLocations.map((loc) => (
                                <div key={loc.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.03] hover:border-emerald-500/30 transition-colors">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                      <MapPin className="w-3 h-3 text-emerald-400" />
                                    </div>
                                    <h4 className="text-sm font-bold text-white/80">{loc.names.pt}</h4>
                                  </div>
                                  <p className="text-[10px] text-emerald-400/60 font-medium mb-1.5">{loc.era}</p>
                                  <p className="text-[11px] text-white/40 leading-relaxed line-clamp-2">
                  {(loc as any).description || (loc as any).theologicalSignificance}
                </p>
                                </div>
                              )) : (
                                <p className="text-xs text-white/20 italic col-span-2">Nenhum lugar identificado nesta passagem.</p>
                              )}
                            </div>
                          )}

                          {/* ── Events ──────────── */}
                          {section.id === "events" && (
                            <div className="space-y-2">
                              {relatedEvents.length > 0 ? relatedEvents.map((event) => (
                                <div key={event.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-purple-500/30 transition-colors relative overflow-hidden">
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500/50" />
                                  <div className="flex justify-between items-start mb-1">
                                    <h4 className="text-sm font-bold text-white/90">{event.namePt}</h4>
                                    <span className="text-[9px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded font-mono">{event.date}</span>
                                  </div>
                                  <p className="text-[10px] text-white/30 mb-2 uppercase tracking-wider">{event.period}</p>
                                  <p className="text-xs text-white/50 leading-relaxed">{event.description}</p>
                                  <div className="mt-3 pt-2 border-t border-white/5 flex gap-2">
                                    <span className="text-[10px] text-purple-400/80 font-medium">Significado:</span>
                                    <span className="text-[10px] text-white/40 italic">{event.significance}</span>
                                  </div>
                                </div>
                              )) : (
                                <p className="text-xs text-white/20 italic">Nenhum evento relacionado encontrado.</p>
                              )}
                            </div>
                          )}

                          {/* ── Topics ──────────── */}
                          {section.id === "topics" && (
                            <div className="space-y-3">
                              {relatedTopics.length > 0 ? relatedTopics.map((topic) => (
                                <div key={topic.id} className="p-4 rounded-xl bg-[#0a0f1a] border border-white/[0.05]">
                                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                                    <Lightbulb className="w-4 h-4 text-amber-500" />
                                    <h4 className="text-sm font-bold text-white/90">{topic.namePt}</h4>
                                    <span className="ml-auto text-[9px] bg-white/5 px-2 py-0.5 rounded text-white/40">{topic.category}</span>
                                  </div>
                                  <p className="text-xs text-white/60 leading-relaxed mb-3">{topic.definition}</p>
                                  {topic.perspectives.length > 0 && (
                                    <div className="bg-white/[0.02] rounded-lg p-3 space-y-2 border border-white/5">
                                      <span className="text-[9px] uppercase tracking-widest text-amber-500/60 font-bold block mb-1">Perspectivas Teológicas</span>
                                      {topic.perspectives.slice(0, 3).map((p, i) => (
                                        <div key={i} className="flex gap-2">
                                          <span className="text-[10px] font-bold text-white/50 whitespace-nowrap">{p.tradition}:</span>
                                          <span className="text-[10px] text-white/40">{p.view}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )) : (
                                <p className="text-xs text-white/20 italic">Nenhum tópico teológico relacionado.</p>
                              )}
                            </div>
                          )}

                          {/* ── Notes ───────────── */}
                          {section.id === "notes" && (
                            <div className="space-y-4">
                              <div>
                                <textarea
                                  value={noteContent}
                                  onChange={(e) => setNoteContent(e.target.value)}
                                  className="w-full h-28 bg-[#0a0f1a] border border-white/10 rounded-xl p-3 text-xs text-white/70 resize-none focus:outline-none focus:border-amber-500/50 transition-colors placeholder:text-white/20 shadow-inner"
                                  placeholder={`Escreva sua reflexão sobre ${reference}...`}
                                />
                                <div className="flex justify-end mt-2">
                                  <button 
                                    onClick={saveNote}
                                    className="flex items-center gap-2 text-[10px] bg-amber-500 text-slate-950 font-black px-4 py-2 rounded-lg hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20 active:scale-95"
                                  >
                                    <Save className="w-3 h-3" /> SALVAR NOTA
                                  </button>
                                </div>
                              </div>

                              {currentPassageNotes.length > 0 && (
                                <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-3">Notas salvas para esta referência</p>
                                  {currentPassageNotes.map(note => (
                                    <div key={note.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/5 group relative">
                                      <p className="text-[11px] text-white/60 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                                      <div className="flex items-center justify-between mt-2">
                                        <span className="text-[9px] text-white/20">{new Date(note.timestamp).toLocaleDateString()}</span>
                                        <button 
                                          onClick={() => deleteNote(note.id)}
                                          className="p-1 text-white/10 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between flex-shrink-0 bg-[#070b14]/80 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-1.5">
          <Library className="w-3.5 h-3.5 text-amber-500/50" />
          <p className="text-[9px] text-white/30 font-medium">BIBLE STUDY TOOLS V2</p>
        </div>
        <p className="text-[9px] text-white/12 text-center uppercase tracking-[0.15em] font-bold">
          TheoSphere OS
        </p>
      </div>
    </div>
  );
}

