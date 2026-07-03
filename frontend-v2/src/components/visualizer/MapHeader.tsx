"use client";

import React from "react";
import { Box, Globe, Minimize2, Maximize2, X } from "lucide-react";

interface MapHeaderProps {
  mapMode: "satellite" | "vector";
  useCesium: boolean;
  fullscreen: boolean;
  onToggleMapMode: () => void;
  onToggleCesium: () => void;
  onToggleFullscreen: () => void;
  onClose?: () => void;
}

export function MapHeader({
  mapMode,
  useCesium,
  fullscreen,
  onToggleMapMode,
  onToggleCesium,
  onToggleFullscreen,
  onClose,
}: MapHeaderProps) {
  return (
    <div className="absolute top-6 left-6 z-10 flex items-center gap-4">
      <div className="glass-heavy p-4 rounded-2xl border border-white/10 flex items-center gap-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Box className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white tracking-tight italic uppercase">
              TheoSphere 3D Visualizer
            </h2>
            <p className="text-[9px] text-blue-400 font-bold tracking-widest uppercase">
              Motor Geoespacial Enterprise
            </p>
          </div>
        </div>

        {/* Separator */}
        <div className="w-[1px] h-6 bg-white/20 self-center" />

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
          onClick={onToggleCesium}
          className={`px-4 py-2 hover:bg-slate-900/80 active:scale-95 rounded-full border flex items-center gap-2.5 transition-all shadow-lg select-none ${
            useCesium
              ? "bg-blue-600/60 border-blue-500 text-blue-200"
              : "bg-slate-900/60 border-white/10 text-white"
          }`}
          title={
            useCesium
              ? "Voltar para Visualizador MapLibre"
              : "Mudar para Globo 3D Cesium (Cartografia Real)"
          }
        >
          <Globe
            className={`w-5 h-5 text-[#3b82f6] ${useCesium ? "animate-spin" : "animate-pulse"}`}
            style={{ animationDuration: useCesium ? "8s" : "3s" }}
          />
          <span className="text-sm font-bold tracking-tight">
            {useCesium ? "Globo Cesium 3D" : "Globo 2.5D"}
          </span>
        </button>
      </div>

      <div className="flex gap-2">
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
