"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X, Search, Sparkles, BookOpen, MapPin, Users, Calendar, 
  Image as ImageIcon, Link2, ExternalLink, Info, Loader2,
  ChevronDown, ChevronRight, Share2, Printer, Copy, ScrollText,
  Clock, Hash, Library, MoreHorizontal, ArrowLeft
} from "lucide-react";
import * as Framer from "framer-motion";
const { motion, AnimatePresence } = Framer;
import { useRAG } from "@/hooks/useRAG";

interface FactbookSection {
  id: string;
  title: string;
  icon: string;
  content?: string;
  items?: string[];
  images?: string[];
  verses?: string[];
  tags?: string[];
  links?: string[];
}

interface FactbookData {
  title: string;
  subtitle: string;
  headerImage?: string;
  sections: FactbookSection[];
}

export default function Factbook({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FactbookData | null>(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [history, setHistory] = useState<string[]>([]);
  const { chat } = useRAG();
  
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleSearch = async (term: string) => {
    if (!term.trim()) return;
    setLoading(true);
    setQuery(term);
    
    // Improved Prompt for Logos-style data
    const prompt = `Gere um dossiê Factbook acadêmico profissional (estilo Logos Bible Software) para o termo "${term}". 
    O conteúdo deve ser profundo, exegético e histórico.
    Retorne um JSON estritamente com a seguinte estrutura:
    {
      "title": "${term}",
      "subtitle": "Categoria Acadêmica (Pessoa, Lugar, Evento, etc)",
      "headerImage": "URL de placeholder realista (ex: unsplash)",
      "sections": [
        { "id": "overview", "title": "Visão Geral", "icon": "Info", "content": "Resumo enciclopédico profundo..." },
        { "id": "key-articles", "title": "Artigos Principais", "icon": "BookOpen", "items": ["Artigo 1 de dicionário", "Artigo 2"] },
        { "id": "media", "title": "Mídia & Arqueologia", "icon": "ImageIcon", "images": ["url1", "url2"] },
        { "id": "passages", "title": "Passagens Chave", "icon": "ScrollText", "verses": ["Referência 1", "Referência 2"] },
        { "id": "events", "title": "Eventos Relacionados", "icon": "Calendar", "items": ["Evento 1", "Evento 2"] },
        { "id": "related", "title": "Tópicos Relacionados", "icon": "Link2", "tags": ["Tópico A", "Tópico B"] },
        { "id": "further-reading", "title": "Leitura Adicional", "icon": "ExternalLink", "links": ["Referência Bibliográfica 1", "Referência 2"] }
      ]
    }`;

    try {
      const res = await chat(prompt, [], undefined, true);
      let content = res.content;
      
      // Parse JSON from AI response
      let parsedData: FactbookData | null = null;
      if (typeof content === "object") {
          parsedData = content as unknown as FactbookData;
      } else {
          const jsonMatch = (content as string).match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content as string];
          try { 
              parsedData = JSON.parse(jsonMatch[1]!); 
          } catch { 
              parsedData = null; 
          }
      }

      if (parsedData) {
          setData(parsedData);
          if (!history.includes(term)) setHistory([term, ...history.slice(0, 4)]);
      }
    } catch (e) { 
        console.error("Factbook Error:", e); 
    } finally { 
        setLoading(false); 
    }
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Scroll spy to update active section in sidebar
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;
      const scrollPosition = contentRef.current.scrollTop + 100;

      for (const section of data?.sections || []) {
        const element = sectionRefs.current[section.id];
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(section.id);
        }
      }
    };

    const container = contentRef.current;
    container?.addEventListener("scroll", handleScroll);
    return () => container?.removeEventListener("scroll", handleScroll);
  }, [data]);

  const getIcon = (name: string) => {
    switch (name) {
      case "Info": return <Info className="w-3.5 h-3.5" />;
      case "BookOpen": return <BookOpen className="w-3.5 h-3.5" />;
      case "ImageIcon": return <ImageIcon className="w-3.5 h-3.5" />;
      case "ScrollText": return <ScrollText className="w-3.5 h-3.5" />;
      case "Calendar": return <Calendar className="w-3.5 h-3.5" />;
      case "Link2": return <Link2 className="w-3.5 h-3.5" />;
      case "ExternalLink": return <ExternalLink className="w-3.5 h-3.5" />;
      default: return <Hash className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F0F2F5] dark:bg-[#0A0D14] text-gray-900 dark:text-gray-100 overflow-hidden border-l border-gray-300 dark:border-white/10 shadow-2xl">
      
      {/* Logos Style Top Bar */}
      <div className="h-10 bg-[#E8EBF0] dark:bg-[#1E252B] border-b border-gray-300 dark:border-black/30 flex items-center px-2 justify-between z-30 shrink-0">
        <div className="flex items-center gap-1 overflow-hidden">
            <button className="p-1.5 hover:bg-gray-300 dark:hover:bg-white/5 rounded shrink-0">
                <Library className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <div className="w-px h-4 bg-gray-300 dark:bg-white/10 mx-1 shrink-0" />
            <div className="flex items-center gap-1 overflow-hidden">
                <Sparkles className="w-3 h-3 text-blue-600 shrink-0" />
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Factbook</span>
                {data && (
                    <>
                        <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="text-[10px] font-bold text-blue-600 truncate">{data.title}</span>
                    </>
                )}
            </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
            <button className="p-1.5 hover:bg-gray-300 dark:hover:bg-white/5 rounded">
                <Share2 className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <button className="p-1.5 hover:bg-gray-300 dark:hover:bg-white/5 rounded">
                <Printer className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-red-500/10 group rounded ml-2">
                <X className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
            </button>
        </div>
      </div>

      {/* Main Layout Area */}
      <div className="flex flex-grow overflow-hidden">
        
        {/* Left Navigation Sidebar (Logos Style) */}
        <aside className="w-56 bg-[#E8EBF0] dark:bg-[#15191F] border-r border-gray-300 dark:border-white/5 flex flex-col shrink-0 hidden md:flex">
            <div className="p-3 border-b border-gray-300 dark:border-white/5">
                <div className="relative group">
                    <input 
                        type="text" 
                        placeholder="Pesquisar..."
                        className="w-full pl-8 pr-2 py-1 bg-white dark:bg-[#0D1117] border border-gray-300 dark:border-white/10 rounded text-[11px] focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                        onKeyDown={(e) => e.key === "Enter" && handleSearch((e.target as HTMLInputElement).value)}
                    />
                    <Search className="absolute left-2.5 top-1.5 w-3.5 h-3.5 text-gray-400" />
                </div>
            </div>
            
            <div className="flex-grow overflow-y-auto py-2 px-1 space-y-0.5 custom-scrollbar">
                {data ? (
                    data.sections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => scrollToSection(section.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded text-[11px] font-medium transition-all text-left ${
                                activeSection === section.id 
                                ? "bg-white dark:bg-white/10 text-blue-600 shadow-sm border-l-2 border-blue-600" 
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-white/5"
                            }`}
                        >
                            <span className={activeSection === section.id ? "text-blue-600" : "text-gray-400"}>
                                {getIcon(section.icon)}
                            </span>
                            {section.title}
                        </button>
                    ))
                ) : (
                    <div className="p-4 text-center space-y-2 opacity-30">
                        <Sparkles className="w-8 h-8 mx-auto text-gray-400" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">Nenhum Dossiê Aberto</p>
                    </div>
                )}

                {history.length > 0 && (
                    <div className="pt-4 px-3">
                        <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <Clock className="w-2.5 h-2.5" /> Recentes
                        </h4>
                        {history.map((h) => (
                            <button 
                                key={h} 
                                onClick={() => handleSearch(h)}
                                className="block w-full text-left py-1 text-[11px] text-gray-500 hover:text-blue-600 truncate"
                            >
                                {h}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </aside>

        {/* Right Content Area */}
        <main 
            ref={contentRef}
            className="flex-grow bg-white dark:bg-[#0D1117] overflow-y-auto custom-scrollbar relative"
        >
            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div 
                        key="loader"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-[#0D1117]/80 z-20 backdrop-blur-sm"
                    >
                        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                        <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em]">Compilando Dossiê Acadêmico...</span>
                        <div className="w-48 h-1 bg-gray-200 dark:bg-white/10 rounded-full mt-6 overflow-hidden">
                            <motion.div 
                                className="h-full bg-blue-600" 
                                animate={{ x: [-200, 200] }} 
                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} 
                            />
                        </div>
                    </motion.div>
                ) : null}

                {data ? (
                    <motion.div 
                        key={data.title}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-4xl mx-auto p-12 space-y-12 pb-32"
                    >
                        {/* Report Header */}
                        <header className="border-b-2 border-gray-100 dark:border-white/5 pb-10">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div className="space-y-3">
                                    <h1 className="text-5xl font-serif font-bold text-gray-900 dark:text-white leading-tight">{data.title}</h1>
                                    <div className="flex items-center gap-3">
                                        <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest">{data.subtitle}</span>
                                        <div className="w-1 h-1 rounded-full bg-gray-300" />
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                            <BookOpen className="w-3 h-3" /> TheoSphere OS Library
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="px-3 py-1.5 border border-gray-200 dark:border-white/10 rounded text-[11px] font-bold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                        <Copy className="w-3.5 h-3.5 text-gray-400" /> Copiar
                                    </button>
                                    <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-[11px] font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all">
                                        <Sparkles className="w-3.5 h-3.5" /> Ferramentas
                                    </button>
                                </div>
                            </div>
                        </header>

                        {/* Sections Grid/List */}
                        <div className="space-y-16">
                            {data.sections.map((section) => (
                                <section 
                                    key={section.id} 
                                    ref={(el) => (sectionRefs.current[section.id] = el)}
                                    className="scroll-mt-10 group"
                                >
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                            {getIcon(section.icon)}
                                        </div>
                                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">{section.title}</h2>
                                        <div className="flex-grow h-px bg-gray-100 dark:bg-white/5" />
                                        <button className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MoreHorizontal className="w-4 h-4 text-gray-400" />
                                        </button>
                                    </div>

                                    <div className="pl-11">
                                        {section.content && (
                                            <p className="text-lg font-serif text-gray-800 dark:text-gray-200 leading-relaxed text-justify first-letter:text-4xl first-letter:font-bold first-letter:mr-1 first-letter:float-left">
                                                {section.content}
                                            </p>
                                        )}

                                        {section.items && (
                                            <ul className="space-y-2">
                                                {section.items.map((item, i) => (
                                                    <li key={i} className="flex items-start gap-3 group/item cursor-pointer">
                                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-600/30 group-hover/item:bg-blue-600 transition-colors" />
                                                        <span className="text-[13px] text-gray-600 dark:text-gray-400 group-hover/item:text-blue-600 transition-colors">{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}

                                        {section.verses && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {section.verses.map((v) => (
                                                    <button key={v} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-white/5 hover:border-blue-500/30 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all text-left group/verse">
                                                        <div className="flex items-center gap-3">
                                                            <ScrollText className="w-4 h-4 text-gray-400 group-hover/verse:text-blue-600" />
                                                            <span className="text-sm font-bold text-blue-600">{v}</span>
                                                        </div>
                                                        <ArrowLeft className="w-3.5 h-3.5 text-gray-300 rotate-180 opacity-0 group-hover/verse:opacity-100 transition-all" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {section.images && (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                {section.images.map((img, i) => (
                                                    <div key={i} className="aspect-square bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 flex items-center justify-center group/img overflow-hidden relative">
                                                        <ImageIcon className="w-6 h-6 text-gray-300 group-hover/img:scale-125 transition-transform" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                                            <span className="text-[10px] text-white font-bold truncate">Mídia Arqueológica</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {section.tags && (
                                            <div className="flex flex-wrap gap-2">
                                                {section.tags.map((tag) => (
                                                    <button key={tag} className="px-3 py-1 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[10px] font-bold text-gray-500 hover:border-blue-500/30 hover:text-blue-600 transition-all">
                                                        {tag}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {section.links && (
                                            <div className="space-y-1.5">
                                                {section.links.map((link, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-[11px] text-gray-400 hover:text-blue-600 cursor-pointer">
                                                        <ExternalLink className="w-3 h-3" />
                                                        <span>{link}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </section>
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto space-y-8 p-12"
                    >
                        <div className="relative">
                            <div className="absolute -inset-4 bg-blue-500/20 blur-3xl rounded-full" />
                            <Sparkles className="w-20 h-20 text-blue-600 relative z-10" />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-4xl font-serif font-bold text-gray-900 dark:text-white leading-tight">Sua Biblioteca, Organizada.</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                O Factbook é o centro nevrálgico do seu estudo. Ele compila automaticamente dados de todas as suas fontes para gerar dossiês acadêmicos sobre Pessoas, Lugares, Eventos e Conceitos Teológicos.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 w-full">
                            <div className="p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 text-left space-y-2">
                                <Users className="w-5 h-5 text-blue-600" />
                                <h4 className="text-xs font-bold uppercase tracking-widest">Pessoas</h4>
                                <p className="text-[10px] text-gray-400">Genealogias, biografia e conexões.</p>
                            </div>
                            <div className="p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 text-left space-y-2">
                                <MapPin className="w-5 h-5 text-green-600" />
                                <h4 className="text-xs font-bold uppercase tracking-widest">Lugares</h4>
                                <p className="text-[10px] text-gray-400">Contexto geográfico e arqueológico.</p>
                            </div>
                        </div>
                        <div className="pt-8">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Comece pesquisando no painel à esquerda</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
