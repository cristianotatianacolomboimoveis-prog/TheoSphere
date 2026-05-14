"use client";

import React, { useState } from 'react';
import { 
    Book, 
    Map as MapIcon, 
    Box, 
    Share2, 
    Search, 
    Settings, 
    ChevronRight,
    MessageSquare,
    Maximize2,
    Layers,
    Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import dynamic from 'next/dynamic';

const TheoSphere3D = dynamic(() => import("@/components/visualizer/TheoSphere3D"), { ssr: false });
const TheoSGraph = dynamic(() => import("@/components/TheoSGraph"), { ssr: false });
const BibleReader = dynamic(() => import("@/components/BibleReader"), { ssr: false });

export default function StudyMode({ onClose }: { onClose: () => void }) {
    const { t } = useTranslation();
    const [leftPanel, setLeftPanel] = useState<'bible' | 'exegesis'>('bible');
    const [rightPanel, setRightPanel] = useState<'map' | '3d' | 'graph'>('map');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any>(null);
    const [searching, setSearching] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setSearching(true);
        try {
            const res = await fetch(`/api/v1/enterprise/search?q=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            setSearchResults(data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#05080F] flex flex-col overflow-hidden text-[#FFFFF0]">
            
            {/* Enterprise Top Bar */}
            <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#0F172A]/80 backdrop-blur-xl">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#CD7F32] flex items-center justify-center shadow-lg">
                            <Layers className="text-[#05080F] w-5 h-5" />
                        </div>
                        <h2 className="font-black text-sm uppercase tracking-[0.2em] italic">TheoSphere <span className="text-[#D4AF37]">Scholar</span></h2>
                    </div>
                    
                    <nav className="hidden md:flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5">
                        <button 
                            onClick={() => setLeftPanel('bible')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${leftPanel === 'bible' ? 'bg-[#D4AF37] text-[#05080F]' : 'text-slate-400 hover:text-white'}`}
                        >
                            {t('study.bible')}
                        </button>
                        <button 
                            onClick={() => setLeftPanel('exegesis')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${leftPanel === 'exegesis' ? 'bg-[#D4AF37] text-[#05080F]' : 'text-slate-400 hover:text-white'}`}
                        >
                            {t('study.exegesis')}
                        </button>
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <form onSubmit={handleSearch} className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('common.search')}
                            className="bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-xs w-64 focus:w-80 focus:border-[#D4AF37]/50 transition-all outline-none"
                        />
                        {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />}
                    </form>
                    <button className="p-2 hover:bg-white/5 rounded-lg text-slate-400" title={t('common.settings')}><Settings className="w-5 h-5" /></button>
                    <button onClick={onClose} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">{t('common.close')}</button>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                
                {/* Left Section: Textual */}
                <section className="flex-1 border-r border-white/5 flex flex-col relative bg-[#05080F]">
                    <div className="absolute top-4 left-4 z-10 flex gap-2">
                        <div className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-[9px] font-black text-[#D4AF37] uppercase tracking-widest">
                            Módulo de Texto
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <BibleReader onClose={onClose} />
                    </div>
                </section>

                {/* Right Section: Immersive */}
                <section className="flex-[1.2] flex flex-col relative bg-black">
                    
                    {/* Visual Switcher */}
                    <div className="absolute top-4 right-4 z-[1001] flex gap-1 bg-[#0F172A]/90 backdrop-blur-xl p-1 rounded-2xl border border-white/10 shadow-2xl">
                        <button 
                            onClick={() => setRightPanel('map')}
                            className={`p-2.5 rounded-xl transition-all ${rightPanel === 'map' ? 'bg-[#D4AF37] text-[#05080F]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                            title="Atlas Geoespacial"
                        >
                            <MapIcon className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => setRightPanel('3d')}
                            className={`p-2.5 rounded-xl transition-all ${rightPanel === '3d' ? 'bg-[#D4AF37] text-[#05080F]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                            title="Maquetes 3D"
                        >
                            <Box className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => setRightPanel('graph')}
                            className={`p-2.5 rounded-xl transition-all ${rightPanel === 'graph' ? 'bg-[#D4AF37] text-[#05080F]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                            title="Grafo Bíblico"
                        >
                            <Share2 className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 relative overflow-hidden">
                        <AnimatePresence mode="wait">
                            {rightPanel === 'map' && (
                                <motion.div 
                                    key="map"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="w-full h-full"
                                >
                                    <TheoSphere3D onClose={() => {}} />
                                </motion.div>
                            )}
                            {rightPanel === 'graph' && (
                                <motion.div 
                                    key="graph"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="w-full h-full"
                                >
                                    <TheoSGraph onClose={() => {}} />
                                </motion.div>
                            )}
                            {rightPanel === '3d' && (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950">
                                    <div className="text-[#D4AF37] animate-pulse font-black uppercase tracking-widest text-xs">Aguardando Seleção de Artefato...</div>
                                    <p className="text-slate-500 text-[10px] mt-2 uppercase tracking-widest">Navegue no Atlas para carregar modelos 3D</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* AI Insights Floating Panel */}
                    <div className="absolute bottom-6 left-6 right-6 z-[1001] pointer-events-none">
                        <div className="bg-[#0F172A]/90 backdrop-blur-2xl p-4 rounded-[24px] border border-white/10 shadow-2xl pointer-events-auto flex items-center justify-between max-w-2xl mx-auto">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                    <MessageSquare className="text-blue-400 w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Insight da IA Teológica</p>
                                    <p className="text-xs text-slate-300 line-clamp-1">Esta localização é estratégica para o entendimento do pacto mosaico...</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400" title="Ouvir Narração">
                                    <Volume2 className="w-4 h-4" />
                                </button>
                                <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all">Ver Detalhes</button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
