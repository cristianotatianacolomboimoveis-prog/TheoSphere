"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { X, Maximize2, Minimize2, ZoomIn, ZoomOut, Filter, Share2, Layers } from 'lucide-react';
import { useTheoStore } from '@/store/useTheoStore';
import { api } from '@/lib/api';

// Carregamento dinâmico para evitar erros de SSR com Three.js
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false });

interface GraphData {
  nodes: any[];
  links: any[];
}

export default function TheoSGraph({ onClose }: { onClose: () => void }) {
  const { activeBook, activeChapter } = useTheoStore();
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);

  const currentRef = `${activeBook} ${activeChapter}`;

  useEffect(() => {
    async function fetchGraph() {
      setLoading(true);
      try {
        const result = await api.get<any>(`rag/graph?q=${encodeURIComponent(currentRef)}`);
        if (result.success) {
          setData(result.data);
        }
      } catch (err) {
        console.error("Erro ao carregar grafo:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchGraph();
  }, [currentRef]);

  const nodeColor = (node: any) => {
    switch (node.type) {
      case 'verse': return '#2196f3'; // Azul
      case 'concept': return '#ffc107'; // Dourado
      case 'document': return '#4caf50'; // Verde
      case 'query': return '#ff5722'; // Laranja (Centro)
      default: return '#ffffff';
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] bg-background/95 backdrop-blur-2xl flex flex-col transition-all duration-500 ${fullscreen ? 'p-0' : 'p-6'}`}>
      {/* Background Aurora Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-600/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header Panel */}
      <div className="relative z-10 flex items-center justify-between mb-4 bg-white/5 border border-border-strong p-4 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight italic uppercase">Topologia Teológica 3D</h2>
            <p className="text-[10px] text-blue-400 font-bold tracking-[0.3em] uppercase">Visualizador de Conhecimento Semântico</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-3 mr-6 px-4 py-2 bg-black/20 rounded-xl border border-border-subtle">
             <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[9px] uppercase font-bold text-white/40">Versículos</span></div>
             <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-[9px] uppercase font-bold text-white/40">Conceitos</span></div>
             <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[9px] uppercase font-bold text-white/40">Seu Drive</span></div>
          </div>
          
          <button onClick={() => setFullscreen(!fullscreen)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white">
            {fullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button onClick={onClose} className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors text-red-400">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Graph Area */}
      <div className="flex-grow relative rounded-3xl border border-border-subtle overflow-hidden bg-black/40 group">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
            <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <p className="mt-4 text-xs font-bold text-blue-400 animate-pulse tracking-widest uppercase">Mapeando Sinapses Teológicas...</p>
          </div>
        )}

        {!loading && (
          <ForceGraph3D
            ref={graphRef}
            graphData={data}
            nodeLabel="label"
            nodeColor={nodeColor}
            nodeRelSize={6}
            nodeOpacity={0.9}
            linkColor={() => 'rgba(255,255,255,0.1)'}
            linkWidth={0.5}
            linkOpacity={0.3}
            backgroundColor="rgba(0,0,0,0)"
            showNavInfo={false}
            onNodeClick={(node: any) => {
              // Centraliza no nó clicado
              const distance = 40;
              const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
              graphRef.current.cameraPosition(
                { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
                node,
                3000
              );
            }}
          />
        )}

        {/* Legend/Controls Overlay */}
        <div className="absolute bottom-6 left-6 p-4 bg-slate-900/80 backdrop-blur-xl border border-border-strong rounded-2xl flex flex-col gap-3 shadow-2xl">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Nó Ativo</span>
            <span className="text-sm font-bold text-amber-500">{currentRef}</span>
          </div>
          <div className="flex gap-2">
             <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/50 transition-all"><ZoomIn className="w-4 h-4" /></button>
             <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/50 transition-all"><ZoomOut className="w-4 h-4" /></button>
             <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/50 transition-all"><Filter className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Tips Overlay */}
        <div className="absolute top-6 right-6 p-3 bg-white/5 border border-border-subtle rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
           <p className="text-[10px] text-white/40 leading-tight">Botão Esquerdo: Rotacionar<br/>Botão Direito: Panorâmica<br/>Scroll: Zoom</p>
        </div>
      </div>
    </div>
  );
}
