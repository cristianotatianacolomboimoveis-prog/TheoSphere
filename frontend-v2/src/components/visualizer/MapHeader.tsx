"use client";

import React from "react";
import {
  Box,
  Globe,
  Minimize2,
  Maximize2,
  X,
  PanelRightClose,
} from "lucide-react";

interface MapHeaderProps {
  mapMode: "satellite" | "vector";
  useCesium: boolean;
  fullscreen: boolean;
  onToggleMapMode: () => void;
  onToggleCesium: () => void;
  onToggleFullscreen: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onLiveIsrael?: () => void;
  onClose?: () => void;
}

export function MapHeader({
  mapMode,
  useCesium,
  fullscreen,
  onToggleMapMode,
  onToggleCesium,
  onToggleFullscreen,
  isSidebarOpen,
  onToggleSidebar,
  onLiveIsrael,
  onClose,
}: MapHeaderProps) {
  return (
    <div className="absolute top-5 left-5 z-20 flex items-center gap-2 max-w-[calc(100vw-40px)] select-none">
      <div className="glass-heavy px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2.5 shadow-2xl">
        {/* Brand Icon & Name */}
        <div className="flex items-center gap-2 pr-1">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md">
            <Box className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[11px] font-black text-white tracking-wider uppercase hidden sm:inline">
            TheoSphere 3D
          </span>
        </div>

        {/* Separator */}
        <div className="w-[1px] h-4 bg-white/15" />

        {/* Map Mode Toggle (Satélite / Esquemático) */}
        <button
          onClick={onToggleMapMode}
          className="px-2.5 py-1 bg-slate-900/60 hover:bg-slate-900/80 active:scale-95 rounded-full border border-white/10 flex items-center gap-1.5 transition-all text-white text-xs font-semibold"
          title={
            mapMode === "satellite"
              ? "Mudar para Mapa Esquemático"
              : "Mudar para Imagem Real (Satélite)"
          }
        >
          <Globe
            className="w-3.5 h-3.5 text-[#2DD4BF] animate-pulse"
            style={{ animationDuration: "3s" }}
          />
          <span className="text-[11px]">
            {mapMode === "satellite" ? "Imagem Real" : "Esquemático"}
          </span>
        </button>

        {/* Cesium Globe Toggle */}
        <button
          id="toggle-cesium-btn"
          onClick={onToggleCesium}
          className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 transition-all text-xs font-semibold active:scale-95 ${
            useCesium
              ? "bg-indigo-600/60 border-indigo-400 text-indigo-100"
              : "bg-slate-900/60 hover:bg-slate-900/80 border-white/10 text-white"
          }`}
          title={
            useCesium
              ? "Voltar para Visualizador MapLibre 2.5D"
              : "Mudar para Globo 3D Cesium (Cartografia Real)"
          }
        >
          <Globe
            className={`w-3.5 h-3.5 text-indigo-400 ${useCesium ? "animate-spin" : "animate-pulse"}`}
            style={{ animationDuration: useCesium ? "8s" : "3s" }}
          />
          <span className="text-[11px]">
            {useCesium ? "Globo 3D" : "Globo 2.5D"}
          </span>
        </button>

        {/* Botão Câmera de Solo / Live de Israel */}
        {onLiveIsrael && (
          <button
            id="live-israel-cam-btn"
            onClick={onLiveIsrael}
            className="px-2.5 py-1 rounded-full border border-emerald-500/40 bg-emerald-950/50 hover:bg-emerald-900/70 active:scale-95 text-emerald-300 flex items-center gap-1.5 transition-all text-xs font-semibold cursor-pointer"
            title="Sobrevoar Jerusalém com Câmera de Solo e Vídeo Real"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px]">Câmera Solo</span>
          </button>
        )}

        {/* Separator */}
        {onToggleSidebar && <div className="w-[1px] h-4 bg-white/15" />}

        {/* Botão Foco Total / Sidebar */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className={`px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 text-xs font-semibold ${
              !isSidebarOpen
                ? "bg-indigo-600/50 text-indigo-200 border-indigo-400/50 hover:bg-indigo-600/70"
                : "bg-white/5 hover:bg-white/10 text-white/70 border-white/10"
            }`}
            title={
              isSidebarOpen
                ? "Ocultar Painel Lateral (Modo Foco Total)"
                : "Mostrar Painel Lateral (Notas e Bíblia)"
            }
          >
            <PanelRightClose
              className={`w-3.5 h-3.5 transition-transform duration-300 ${
                !isSidebarOpen ? "rotate-180 text-indigo-400" : ""
              }`}
            />
            <span className="text-[11px] hidden sm:inline">
              {!isSidebarOpen ? "Imersão" : "Foco Total"}
            </span>
          </button>
        )}

        {/* Botão Tela Cheia */}
        <button
          onClick={onToggleFullscreen}
          className="p-1 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors"
          title={fullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
        >
          {fullscreen ? (
            <Minimize2 className="w-3.5 h-3.5" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Botão Fechar */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-red-500/20 text-red-400 rounded-full transition-colors ml-0.5"
            title="Fechar Atlas"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
