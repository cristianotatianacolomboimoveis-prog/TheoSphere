"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  X,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Share2,
  Layers,
  BookOpen,
  Calendar,
  MapPin,
  User,
  Award,
  FileText,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheoStore } from "@/store/useTheoStore";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";

// Carregamento dinâmico para evitar erros de SSR com Three.js
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
});

interface GraphData {
  nodes: any[];
  links: any[];
}

export default function TheoSGraph({ onClose }: { onClose: () => void }) {
  const { activeBook, activeChapter } = useTheoStore();
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const graphRef = useRef<any>(null);

  const currentRef = `${activeBook} ${activeChapter}`;

  /**
   * Vizinhos diretos de um nó, lidos dos links do próprio grafo. O ForceGraph
   * substitui source/target por objetos após a simulação — daí o normalizeId.
   */
  const neighborsOf = (node: any) => {
    if (!node) return [];
    const normalizeId = (end: any) =>
      typeof end === "object" && end !== null ? end.id : end;
    const ids = new Set<string>();
    for (const link of data.links ?? []) {
      const source = normalizeId(link.source);
      const target = normalizeId(link.target);
      if (source === node.id) ids.add(target);
      else if (target === node.id) ids.add(source);
    }
    return (data.nodes ?? []).filter((n: any) => ids.has(n.id));
  };

  /** Seleciona um nó e centraliza a câmera nele. */
  const focusNode = (node: any) => {
    setSelectedNode(node);
    const graph = graphRef.current;
    if (!graph?.cameraPosition || typeof node.x !== "number") return;
    const distRatio = 1 + 45 / Math.hypot(node.x, node.y, node.z);
    graph.cameraPosition(
      { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
      node,
      1200,
    );
  };

  /**
   * Aproxima (fator < 1) ou afasta (fator > 1) escalando a posição da câmera
   * em relação à origem do grafo.
   */
  const zoomBy = (factor: number) => {
    const graph = graphRef.current;
    if (!graph?.cameraPosition) return;
    const { x, y, z } = graph.cameraPosition();
    graph.cameraPosition(
      { x: x * factor, y: y * factor, z: z * factor },
      undefined,
      400,
    );
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "person":
        return <User className="w-5 h-5 text-pink-400" />;
      case "place":
        return <MapPin className="w-5 h-5 text-blue-400" />;
      case "event":
        return <Calendar className="w-5 h-5 text-amber-400" />;
      case "doctrine":
        return <Award className="w-5 h-5 text-purple-400" />;
      case "verse":
        return <BookOpen className="w-5 h-5 text-teal-400" />;
      default:
        return <FileText className="w-5 h-5 text-white" />;
    }
  };

  const getNodeTypeLabel = (type: string) => {
    switch (type) {
      case "person":
        return "Figura Histórica";
      case "place":
        return "Localidade";
      case "event":
        return "Acontecimento";
      case "doctrine":
        return "Doutrina Semântica";
      case "verse":
        return "Referência Bíblica";
      default:
        return "Nó do Grafo";
    }
  };

  useEffect(() => {
    async function fetchGraph() {
      setLoading(true);
      setError(null);
      try {
        const result = await api.get<any>(
          `enterprise/graph?q=${encodeURIComponent(currentRef)}`,
        );
        if (result.success) {
          setData(result.data);
        }
      } catch (err) {
        // Sem isto o grafo ficava simplesmente vazio, sem explicação
        // (varredura 2026-07-29).
        logger.error("Erro ao carregar grafo:", err);
        setError("Não foi possível carregar o grafo de conhecimento.");
      } finally {
        setLoading(false);
      }
    }
    fetchGraph();
  }, [currentRef]);

  const nodeColor = (node: any) => {
    switch (node.type) {
      case "person":
        return "#f472b6"; // Rosa (Pessoas)
      case "place":
        return "#60a5fa"; // Azul (Lugares)
      case "event":
        return "#fbbf24"; // Âmbar (Eventos)
      case "doctrine":
        return "#a78bfa"; // Roxo (Doutrinas)
      case "verse":
        return "#2dd4bf"; // Teal (Versículos)
      default:
        return "#ffffff";
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[100] bg-background/95 backdrop-blur-2xl flex flex-col transition-all duration-500 ${fullscreen ? "p-0" : "p-6"}`}
    >
      {/* Background Aurora Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-600/5 blur-[120px] rounded-full animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      {/* Header Panel */}
      <div className="relative z-10 flex items-center justify-between mb-4 bg-white/5 border border-border-strong p-4 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight italic uppercase">
              Topologia Teológica 3D
            </h2>
            <p className="text-[10px] text-blue-400 font-bold tracking-[0.3em] uppercase">
              Visualizador de Conhecimento Semântico
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-3 mr-6 px-4 py-2 bg-black/20 rounded-xl border border-border-subtle">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[9px] uppercase font-bold text-white/40">
                Versículos
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[9px] uppercase font-bold text-white/40">
                Conceitos
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[9px] uppercase font-bold text-white/40">
                Seu Drive
              </span>
            </div>
          </div>

          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white"
          >
            {fullscreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Graph Area */}
      <div className="flex-grow relative rounded-3xl border border-border-subtle overflow-hidden bg-black/40 group">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
            <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <p className="mt-4 text-xs font-bold text-blue-400 animate-pulse tracking-widest uppercase">
              Mapeando Sinapses Teológicas...
            </p>
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="absolute inset-0 flex flex-col items-center justify-center z-20 px-8 text-center"
          >
            <p className="text-sm text-amber-300/90 max-w-sm leading-relaxed">
              {error}
            </p>
          </div>
        )}

        {!loading && !error && (
          <ForceGraph3D
            ref={graphRef}
            graphData={data}
            nodeLabel="label"
            nodeColor={nodeColor}
            nodeRelSize={6}
            nodeOpacity={0.9}
            linkColor={() => "rgba(255,255,255,0.1)"}
            linkWidth={0.5}
            linkOpacity={0.3}
            backgroundColor="rgba(0,0,0,0)"
            showNavInfo={false}
            onNodeClick={(node: any) => {
              setSelectedNode(node);

              // Centraliza no nó clicado
              const distance = 45;
              const distRatio =
                1 + distance / Math.hypot(node.x, node.y, node.z);
              graphRef.current.cameraPosition(
                {
                  x: node.x * distRatio,
                  y: node.y * distRatio,
                  z: node.z * distRatio,
                },
                node,
                2000,
              );
            }}
          />
        )}

        {/* Legend/Controls Overlay */}
        <div className="absolute bottom-6 left-6 p-4 bg-slate-900/80 backdrop-blur-xl border border-border-strong rounded-2xl flex flex-col gap-3 shadow-2xl">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">
              Nó Ativo
            </span>
            <span className="text-sm font-bold text-amber-500">
              {currentRef}
            </span>
          </div>
          {/* Os três botões não tinham onClick (varredura 2026-07-29).
              Zoom passou a mover a câmera; o filtro foi removido porque não
              existe mecanismo de filtragem por trás dele. */}
          <div className="flex gap-2">
            <button
              onClick={() => zoomBy(0.75)}
              title="Aproximar"
              aria-label="Aproximar"
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-all"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => zoomBy(1.35)}
              title="Afastar"
              aria-label="Afastar"
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-all"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tips Overlay */}
        <div className="absolute top-6 right-6 p-3 bg-white/5 border border-border-subtle rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-[10px] text-white/40 leading-tight">
            Botão Esquerdo: Rotacionar
            <br />
            Botão Direito: Panorâmica
            <br />
            Scroll: Zoom
          </p>
        </div>

        {/* Sliding Drawer Sidebar */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 bottom-0 w-full sm:w-[400px] z-50 bg-[#0A0D14]/90 backdrop-blur-3xl border-l border-white/10 flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Sidebar Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getNodeIcon(selectedNode.type)}
                  <div>
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                      Detalhes do Nó ({getNodeTypeLabel(selectedNode.type)})
                    </span>
                    <h3 className="text-lg font-bold text-white leading-tight mt-0.5">
                      {selectedNode.label}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sidebar Content */}
              <div className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar text-white/80">
                <div className="space-y-4">
                  <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                    Significado Teológico / Descrição
                  </div>
                  <p className="text-sm font-serif leading-relaxed text-gray-300 text-justify">
                    {selectedNode.metadata?.description ||
                      selectedNode.description ||
                      selectedNode.definition ||
                      `Este nó representa um elemento semântico associado à passagem "${currentRef}". Ele funciona como uma sinapse de conexão lógica para a análise acadêmica de passagens correlatas.`}
                  </p>
                </div>

                {selectedNode.metadata?.strongId && (
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">
                      Código de Concordância Strong
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-serif text-white">
                        {selectedNode.metadata.word || selectedNode.label}
                      </span>
                      <span className="text-sm font-bold bg-blue-500/20 border border-blue-500/30 px-2.5 py-0.5 rounded-full text-blue-400">
                        {selectedNode.metadata.strongId}
                      </span>
                    </div>
                  </div>
                )}

                {/* Antes este bloco imprimia Gênesis 1:1-2 fixo para QUALQUER
                    nó de versículo, e as correlações eram "Justificação" e
                    "Apóstolo Paulo" hardcoded (varredura 2026-07-29). Agora
                    ambos vêm do grafo; sem dado, o bloco não aparece. */}
                {selectedNode.type === "verse" &&
                  (selectedNode.text || selectedNode.metadata?.text) && (
                    <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 italic">
                      <div className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-2">
                        Texto Bíblico
                      </div>
                      <p className="text-sm font-serif text-gray-300 leading-relaxed">
                        &ldquo;
                        {selectedNode.text || selectedNode.metadata?.text}
                        &rdquo;
                      </p>
                    </div>
                  )}

                {/* Connections list — vizinhos reais do nó no grafo */}
                <div className="space-y-3">
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    Correlações Semânticas
                  </div>
                  {neighborsOf(selectedNode).length > 0 ? (
                    <div className="space-y-2">
                      {neighborsOf(selectedNode).map((n) => (
                        <button
                          key={n.id}
                          onClick={() => focusNode(n)}
                          className="w-full flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl text-xs hover:bg-white/10 transition-all text-left"
                        >
                          <span className="font-bold text-gray-300">
                            {n.label}
                          </span>
                          <span className="text-[9px] uppercase font-bold text-blue-400 bg-blue-400/10 border border-blue-400/20 px-1.5 py-0.5 rounded shrink-0 ml-2">
                            {getNodeTypeLabel(n.type)}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-white/30">
                      Nenhuma correlação registrada para este nó.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
