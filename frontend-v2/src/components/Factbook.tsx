"use client";

import React, { useState, useMemo } from "react";
import {
  X, Search, Users, MapPin, Calendar, Lightbulb, ChevronRight, ArrowLeft,
  BookOpen, Clock, Link2, Globe2,
} from "lucide-react";
import * as Framer from "framer-motion";
const { motion, AnimatePresence } = Framer;
import { BIBLICAL_PEOPLE, searchPeople, type BiblicalPerson } from "@/data/biblicalPeople";
import { BIBLICAL_EVENTS, searchEvents, type BiblicalEvent } from "@/data/biblicalEvents";
import { SEED_LOCATIONS, type GeoLocation3D } from "@/data/geoSeedData";
import { THEOLOGICAL_TOPICS, searchTopics, type TheologicalTopic } from "@/data/theologicalTopics";
import { useRAG } from "@/hooks/useRAG";
import { Loader2, Sparkles, Wand2 } from "lucide-react";

/* ─── Types ──────────────────────────────────────────────── */

type Tab = "people" | "places" | "events" | "topics";
type SelectedItem = { type: Tab; data: BiblicalPerson | BiblicalEvent | GeoLocation3D | TheologicalTopic };

/* ─── Component ──────────────────────────────────────────── */

export default function Factbook({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("people");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  
  const { chat } = useRAG();
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const TABS: { id: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { id: "people", label: "Pessoas", icon: Users, count: BIBLICAL_PEOPLE.length },
    { id: "places", label: "Lugares", icon: MapPin, count: SEED_LOCATIONS.length },
    { id: "events", label: "Eventos", icon: Calendar, count: BIBLICAL_EVENTS.length },
    { id: "topics", label: "Tópicos", icon: Lightbulb, count: THEOLOGICAL_TOPICS.length },
  ];

  /* ── Search Indexing (Performance O(1)) ─────────── */
  const searchIndices = useMemo(() => {
    return {
      people: new Map(BIBLICAL_PEOPLE.map(p => [p.id, p])),
      places: new Map(SEED_LOCATIONS.map(l => [l.id, l])),
      events: new Map(BIBLICAL_EVENTS.map(e => [e.id, e])),
      topics: new Map(THEOLOGICAL_TOPICS.map(t => [t.id, t]))
    };
  }, []);

  const results = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) {
      switch (activeTab) {
        case "people": return BIBLICAL_PEOPLE;
        case "places": return SEED_LOCATIONS;
        case "events": return BIBLICAL_EVENTS;
        case "topics": return THEOLOGICAL_TOPICS;
      }
    }
    
    // Busca otimizada: Apenas filtra se houver query, usando campos específicos
    switch (activeTab) {
      case "people":
        return BIBLICAL_PEOPLE.filter(p => p.namePt.toLowerCase().includes(q) || p.theologicalFunction.toLowerCase().includes(q));
      case "places":
        return SEED_LOCATIONS.filter(l => l.names.pt.toLowerCase().includes(q) || l.theologicalSignificance.toLowerCase().includes(q));
      case "events":
        return BIBLICAL_EVENTS.filter(e => e.namePt.toLowerCase().includes(q) || e.soteriologicalSignificance.toLowerCase().includes(q));
      case "topics":
        return THEOLOGICAL_TOPICS.filter(t => t.namePt.toLowerCase().includes(q));
    }
  }, [activeTab, query]);

  const selectItem = (type: Tab, data: any) => {
    setSelected({ type, data });
    setAiAnalysis(null);
  };

  const generateAiAnalysis = async (item: any) => {
    setLoadingAi(true);
    const itemName = item.namePt || item.names?.pt || item.name;
    const itemType = selected?.type || "topic";
    const prompt = `Forneça uma análise teológica profunda e acadêmica sobre ${itemName} (${itemType} bíblico). Inclua referências, significado histórico e implicações teológicas.`;
    
    try {
      const res = await chat(prompt);
      setAiAnalysis(res.content);
    } catch (error) {
      setAiAnalysis("Erro ao gerar análise via RAG.");
    } finally {
      setLoadingAi(false);
    }
  };

  /* ── Detail Render ────────────────────────────────────── */
  const renderDetail = () => {
    if (!selected) return null;
    const { type, data } = selected;

    if (type === "people") {
      const p = data as BiblicalPerson;
      return (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-3 border border-amber-500/10">
              <Users className="w-7 h-7 text-amber-500/60" />
            </div>
            <h3 className="text-xl font-bold text-white font-serif">{p.namePt}</h3>
            <p className="text-xs text-white/30 italic">{p.nameHe}</p>
            <div className="flex justify-center gap-1.5 mt-2">
              <span className="tag tag-amber">{p.role || p.theologicalFunction}</span>
              <span className="tag tag-purple">{p.period}</span>
            </div>
          </div>
          <div className="glass-amber rounded-xl p-4">
            <p className="text-sm text-white/70 leading-relaxed font-serif">{p.description}</p>
          </div>
          <div className="glass rounded-xl border border-border-subtle p-4">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400 mb-2 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Período
            </h4>
            <p className="text-sm text-white/60">{p.timeline || p.period}</p>
          </div>
          <div className="glass rounded-xl border border-border-subtle p-4">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-400 mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3 h-3" /> Referências
            </h4>
            <div className="space-y-1">
              {p.keyVerses.map((v, i) => (
                <p key={i} className="text-xs text-blue-400/70 font-mono">{v}</p>
              ))}
            </div>
          </div>
          <div className="glass rounded-xl border border-border-subtle p-4">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-purple-400 mb-2 flex items-center gap-1.5">
              <Link2 className="w-3 h-3" /> Pessoas Relacionadas
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {(p.relatedPeople || []).map((rp, i) => (
                <span key={i} className="tag tag-purple text-[10px]">{rp}</span>
              ))}
            </div>
          </div>
          {(p.relatedLocations?.length ?? 0) > 0 && (
            <div className="glass rounded-xl border border-border-subtle p-4">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-400 mb-2 flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Locais
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(p.relatedLocations || []).map((loc, i) => (
                  <span key={i} className="tag tag-blue text-[10px]">{loc}</span>
                ))}
              </div>
            </div>
          )}

          {/* AI Analysis Section */}
          <div className="mt-6 border-t border-border-subtle pt-6">
            {!aiAnalysis && !loadingAi ? (
              <button 
                onClick={() => generateAiAnalysis(p)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 hover:border-amber-500/50 transition-all group"
              >
                <Wand2 className="w-4 h-4 text-amber-500 group-hover:animate-pulse" />
                <span className="text-xs font-bold text-amber-500">Gerar Análise IA Profunda (RAG)</span>
              </button>
            ) : loadingAi ? (
              <div className="flex flex-col items-center py-6 bg-white/[0.02] rounded-xl border border-dashed border-border-strong">
                <Loader2 className="w-6 h-6 text-amber-500 animate-spin mb-2" />
                <span className="text-[10px] font-bold text-amber-500/60 uppercase tracking-widest">Consultando Bibliotecas...</span>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-surface border border-blue-500/20 relative group">
                <div className="absolute top-4 right-4">
                  <Sparkles className="w-4 h-4 text-blue-400 opacity-30" />
                </div>
                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> Insight Teológico PhD
                </h4>
                <div className="prose prose-invert prose-xs max-w-none text-white/70 leading-relaxed font-serif whitespace-pre-wrap">
                  {aiAnalysis}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (type === "places") {
      const loc = data as GeoLocation3D;
      return (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-3 border border-blue-500/10">
              <MapPin className="w-7 h-7 text-blue-500/60" />
            </div>
            <h3 className="text-xl font-bold text-white font-serif">{loc.names.pt}</h3>
            <p className="text-xs text-white/30 italic">{loc.names.canonical}</p>
            <div className="flex justify-center gap-1.5 mt-2">
              <span className="tag tag-blue">{loc.era}</span>
              <span className="tag tag-emerald uppercase">{loc.type}</span>
            </div>
          </div>
          <div className="glass-amber rounded-xl p-4">
            <p className="text-sm text-white/70 leading-relaxed font-serif">
              {(loc as any).description || (loc as any).theologicalSignificance}
            </p>
          </div>
          <div className="glass rounded-xl border border-border-subtle p-4">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400 mb-2 flex items-center gap-1.5">
              <Globe2 className="w-3 h-3" /> Coordenadas
            </h4>
            <p className="text-xs text-white/40 font-mono">{loc.coordinates[1].toFixed(4)}, {loc.coordinates[0].toFixed(4)}</p>
          </div>
          <div className="glass rounded-xl border border-border-subtle p-4">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-400 mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3 h-3" /> Referências Bíblicas
            </h4>
            <div className="space-y-1">
              {loc.references.map((ref: string, i: number) => (
                <p key={i} className="text-xs text-blue-400/70 font-mono">{ref}</p>
              ))}
            </div>
          </div>

          {/* AI Analysis Section */}
          <div className="mt-6 border-t border-border-subtle pt-6">
            {!aiAnalysis && !loadingAi ? (
              <button 
                onClick={() => generateAiAnalysis(loc)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 hover:border-blue-500/50 transition-all group"
              >
                <Wand2 className="w-4 h-4 text-blue-400 group-hover:animate-pulse" />
                <span className="text-xs font-bold text-blue-400">Gerar Análise Geográfica (RAG)</span>
              </button>
            ) : loadingAi ? (
              <div className="flex flex-col items-center py-6 bg-white/[0.02] rounded-xl border border-dashed border-border-strong">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-2" />
                <span className="text-[10px] font-bold text-blue-500/60 uppercase tracking-widest">Consultando Atlas...</span>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-surface border border-blue-500/20 relative group">
                <div className="absolute top-4 right-4">
                  <Sparkles className="w-4 h-4 text-blue-400 opacity-30" />
                </div>
                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> Contexto Geográfico PhD
                </h4>
                <div className="prose prose-invert prose-xs max-w-none text-white/70 leading-relaxed font-serif whitespace-pre-wrap">
                  {aiAnalysis}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (type === "events") {
      const e = data as BiblicalEvent;
      return (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center mx-auto mb-3 border border-purple-500/10">
              <Calendar className="w-7 h-7 text-purple-500/60" />
            </div>
            <h3 className="text-xl font-bold text-white font-serif">{e.namePt}</h3>
            <p className="text-xs text-white/30 italic">{e.name}</p>
            <div className="flex justify-center gap-1.5 mt-2">
              <span className="tag tag-amber">{e.date || e.estimatedDate}</span>
              <span className="tag tag-purple">{e.period || "Histórico"}</span>
            </div>
          </div>
          <div className="glass-amber rounded-xl p-4">
            <p className="text-sm text-white/70 leading-relaxed font-serif">{e.description}</p>
          </div>
          <div className="glass rounded-xl border border-border-subtle p-4">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400 mb-2">Significado Teológico</h4>
            <p className="text-sm text-emerald-400/70 leading-relaxed italic font-serif">{e.significance || e.soteriologicalSignificance}</p>
          </div>
          <div className="glass rounded-xl border border-border-subtle p-4">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-400 mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3 h-3" /> Referências
            </h4>
            <div className="space-y-1">
              {(e.keyVerses || [e.scriptureBase]).map((v, i) => (
                <p key={i} className="text-xs text-blue-400/70 font-mono">{v}</p>
              ))}
            </div>
          </div>
          {e.people.length > 0 && (
            <div className="glass rounded-xl border border-border-subtle p-4">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-purple-400 mb-2">Pessoas Envolvidas</h4>
              <div className="flex flex-wrap gap-1.5">
                {e.people.map((p, i) => <span key={i} className="tag tag-purple text-[10px]">{p}</span>)}
              </div>
            </div>
          )}
          {e.locations.length > 0 && (
            <div className="glass rounded-xl border border-border-subtle p-4">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-400 mb-2">Locais</h4>
              <div className="flex flex-wrap gap-1.5">
                {e.locations.map((l, i) => <span key={i} className="tag tag-blue text-[10px]">{l}</span>)}
              </div>
            </div>
          )}

          {/* AI Analysis Section */}
          <div className="mt-6 border-t border-border-subtle pt-6">
            {!aiAnalysis && !loadingAi ? (
              <button 
                onClick={() => generateAiAnalysis(e)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 hover:border-purple-500/50 transition-all group"
              >
                <Wand2 className="w-4 h-4 text-purple-400 group-hover:animate-pulse" />
                <span className="text-xs font-bold text-purple-400">Reconstruir Evento via IA (RAG)</span>
              </button>
            ) : loadingAi ? (
              <div className="flex flex-col items-center py-6 bg-white/[0.02] rounded-xl border border-dashed border-border-strong">
                <Loader2 className="w-6 h-6 text-purple-500 animate-spin mb-2" />
                <span className="text-[10px] font-bold text-purple-500/60 uppercase tracking-widest">Processando Cronologia...</span>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-surface border border-accent/20 relative group">
                <div className="absolute top-4 right-4">
                  <Sparkles className="w-4 h-4 text-purple-400 opacity-30" />
                </div>
                <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> Reconstrução Histórica PhD
                </h4>
                <div className="prose prose-invert prose-xs max-w-none text-white/70 leading-relaxed font-serif whitespace-pre-wrap">
                  {aiAnalysis}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (type === "topics") {
      const t = data as TheologicalTopic;
      return (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center mx-auto mb-3 border border-amber-500/10">
              <Lightbulb className="w-7 h-7 text-amber-500/60" />
            </div>
            <h3 className="text-xl font-bold text-white font-serif">{t.namePt}</h3>
            <p className="text-xs text-white/30 italic">{t.name}</p>
            <span className="tag tag-amber mt-2 inline-block">{t.category}</span>
          </div>
          <div className="glass-amber rounded-xl p-4">
            <p className="text-sm text-white/70 leading-relaxed font-serif">{t.definition}</p>
          </div>
          <div className="glass rounded-xl border border-border-subtle p-4">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-400 mb-2">Referências Bíblicas</h4>
            <div className="space-y-1">
              {t.keyVerses.map((v, i) => (
                <p key={i} className="text-xs text-blue-400/70 font-mono">{v}</p>
              ))}
            </div>
          </div>
          {t.perspectives.length > 0 && (
            <div className="glass rounded-xl border border-border-subtle p-4">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-purple-400 mb-3">Perspectivas Teológicas</h4>
              <div className="space-y-3">
                {t.perspectives.map((p, i) => (
                  <div key={i} className="pl-3 border-l-2 border-purple-500/20">
                    <p className="text-xs font-bold text-purple-400/80">{p.tradition}</p>
                    <p className="text-xs text-white/40 leading-relaxed mt-0.5">{p.view}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {t.relatedTopics.length > 0 && (
            <div className="glass rounded-xl border border-border-subtle p-4">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-400 mb-2">Tópicos Relacionados</h4>
              <div className="flex flex-wrap gap-1.5">
                {t.relatedTopics.map((rt, i) => <span key={i} className="tag tag-amber text-[10px]">{rt}</span>)}
              </div>
            </div>
          )}

          {/* AI Analysis Section */}
          <div className="mt-6 border-t border-border-subtle pt-6">
            {!aiAnalysis && !loadingAi ? (
              <button 
                onClick={() => generateAiAnalysis(t)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/30 hover:border-amber-500/50 transition-all group"
              >
                <Wand2 className="w-4 h-4 text-amber-500 group-hover:animate-pulse" />
                <span className="text-xs font-bold text-amber-500">Aprofundar Tópico via RAG</span>
              </button>
            ) : loadingAi ? (
              <div className="flex flex-col items-center py-6 bg-white/[0.02] rounded-xl border border-dashed border-border-strong">
                <Loader2 className="w-6 h-6 text-amber-500 animate-spin mb-2" />
                <span className="text-[10px] font-bold text-amber-500/60 uppercase tracking-widest">Consultando Teologia...</span>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-surface border border-accent/20 relative group">
                <div className="absolute top-4 right-4">
                  <Sparkles className="w-4 h-4 text-amber-500 opacity-30" />
                </div>
                <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> Síntese Teológica PhD
                </h4>
                <div className="prose prose-invert prose-xs max-w-none text-white/70 leading-relaxed font-serif whitespace-pre-wrap">
                  {aiAnalysis}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  /* ── Render ───────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-border-subtle flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          {selected ? (
            <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-amber-500 hover:text-amber-400 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Voltar</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <BookOpen className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight">Enciclopédia Bíblica</h2>
                <p className="text-[10px] text-white/25 font-medium tracking-widest uppercase">Pessoas, Lugares e Eventos</p>
              </div>
            </div>
          )}
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-all text-white/30 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!selected && (
          <>
            {/* Search */}
            <div className="relative mb-3">
              <input
                type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar pessoas, lugares, eventos, tópicos..."
                className="input-glass w-full pl-10 text-sm"
              />
              <Search className="absolute left-3 top-3.5 w-4 h-4 text-white/25" />
            </div>

            {/* Tabs */}
            <div className="flex gap-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold transition-all border ${
                      activeTab === tab.id
                        ? "bg-amber-500 border-amber-500 text-slate-950"
                        : "bg-white/[0.03] border-border-subtle text-white/40 hover:text-white/70"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-grow overflow-y-auto custom-scrollbar px-5 py-4">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {renderDetail()}
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-[10px] text-white/20 mb-3 font-bold uppercase tracking-widest">
                {(results as any[]).length} resultados
              </p>
              <div className="space-y-1.5">
                {(results as any[]).map((item: any, i: number) => (
                  <button
                    key={item.id || i}
                    onClick={() => selectItem(activeTab, item)}
                    className="w-full text-left p-3 rounded-xl bg-white/[0.02] border border-white/[0.03] card-interactive flex items-center gap-3 group"
                  >
                    <div className="flex-grow min-w-0">
                      <h4 className="text-[13px] font-semibold text-white/80 group-hover:text-amber-400 transition-colors truncate">
                        {activeTab === "places" ? (item as GeoLocation3D).names.pt : (item.namePt || item.name)}
                      </h4>
                      <p className="text-[10px] text-white/25 truncate mt-0.5">
                        {activeTab === "people" && (item as BiblicalPerson).role}
                        {activeTab === "places" && (item as GeoLocation3D).era}
                        {activeTab === "events" && (item as BiblicalEvent).date}
                        {activeTab === "topics" && (item as TheologicalTopic).category}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/5 group-hover:text-amber-500/60 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-5 py-2.5 border-t border-border-subtle flex-shrink-0">
        <p className="text-[9px] text-white/12 text-center uppercase tracking-[0.15em] font-bold">
          Enciclopédia · TheoSphere OS
        </p>
      </div>
    </div>
  );
}
