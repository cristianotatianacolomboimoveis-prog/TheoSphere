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
    <div className="absolute top-5 left-5 z-20 flex flex-wrap items-center gap-3 max-w-[calc(100vw-360px)]">
      <div className="glass-heavy p-2.5 px-3.5 rounded-2xl border border-white/10 flex items-center gap-3.5 shadow-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg">
            <Box className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-xs font-black text-white tracking-tight uppercase">
              TheoSphere 3D
            </h2>
            <p className="text-[8px] text-indigo-400 font-bold tracking-widest uppercase hidden sm:block">
              Geoespacial
            </p>
          </div>
        </div>

        {/* Separator */}
        <div className="w-[1px] h-5 bg-white/20 self-center" />

        {/* Map Mode Toggle */}
        <button
          onClick={onToggleMapMode}
          className="px-4 py-2 bg-slate-900/60 hover:bg-slate-900/80 active:scale-95 rounded-full border border-white/10 flex items-center gap-2.5 transition-all shadow-lg select-none"
          title={
            mapMode === "satellite"
              ? "Mudar para Mapa Esquemático"
              : "Mudar para Imagem Real (Satélite)"
          }
        >
          <Globe
            className="w-5 h-5 text-[#2DD4BF] animate-pulse"
            style={{ animationDuration: "3s" }}
          />
          <span className="text-sm font-bold text-white tracking-tight">
            {mapMode === "satellite" ? "Imagem Real" : "Mapa Esquemático"}
          </span>
        </button>

        {/* Separator */}
        <div className="w-[1px] h-6 bg-white/20 self-center" />

        {/* Cesium Globe Toggle */}
        <button
          id="toggle-cesium-btn"
          onClick={onToggleCesium}
          className={`px-4 py-2 hover:bg-slate-900/80 active:scale-95 rounded-full border flex items-center gap-2.5 transition-all shadow-lg select-none ${
            useCesium
              ? "bg-indigo-600/60 border-indigo-500 text-indigo-200"
              : "bg-slate-900/60 border-white/10 text-white"
          }`}
          title={
            useCesium
              ? "Voltar para Visualizador MapLibre"
              : "Mudar para Globo 3D Cesium (Cartografia Real)"
          }
        >
          <Globe
            className={`w-5 h-5 text-indigo-400 ${useCesium ? "animate-spin" : "animate-pulse"}`}
            style={{ animationDuration: useCesium ? "8s" : "3s" }}
          />
          <span className="text-sm font-bold tracking-tight">
            {useCesium ? "Globo Cesium 3D" : "Globo 2.5D"}
          </span>
        </button>

        {/* Botão Câmera de Solo / Live de Israel */}
        {onLiveIsrael && (
          <>
            <div className="w-[1px] h-6 bg-white/20 self-center" />
            <button
              id="live-israel-cam-btn"
              onClick={onLiveIsrael}
              className="px-3.5 py-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/60 active:scale-95 text-emerald-300 flex items-center gap-2 transition-all shadow-lg select-none cursor-pointer"
              title="Sobrevoar Jerusalém com Câmera de Solo e Vídeo Real"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold tracking-tight">
                Câmera de Solo Israel
              </span>
            </button>
          </>
        )}
      </div>

      <div className="flex gap-2">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className={`p-2.5 px-3 rounded-xl border backdrop-blur-md transition-all flex items-center gap-1.5 shadow-lg select-none ${
              !isSidebarOpen
                ? "bg-indigo-600/40 text-indigo-200 border-indigo-400/50 hover:bg-indigo-600/60"
                : "bg-white/5 hover:bg-white/10 text-white/70 border-white/10"
            }`}
            title={
              isSidebarOpen
                ? "Ocultar Painel Lateral (Modo Imersão / Foco Total na Terra)"
                : "Mostrar Painel Lateral (Notas e Bíblia)"
            }
          >
            <PanelRightClose
              className={`w-4 h-4 transition-transform duration-300 ${
                !isSidebarOpen ? "rotate-180 text-indigo-400" : ""
              }`}
            />
            <span className="text-xs font-bold hidden sm:inline">
              {!isSidebarOpen ? "Modo Imersão Ativo" : "Foco Total"}
            </span>
          </button>
        )}

        <button
          onClick={onToggleFullscreen}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/50 border border-white/10 backdrop-blur-md"
        >
          {fullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="p-3 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-400 border border-red-500/20 backdrop-blur-md"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
