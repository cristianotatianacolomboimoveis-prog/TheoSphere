"use client";

import React, { useState, useEffect } from "react";
import {
  Compass,
  Plus,
  Minus,
  RotateCw,
  Mountain,
  Globe2,
  Maximize2,
} from "lucide-react";
import { MapAdapter } from "@/lib/BibleMapAdapter";

interface CameraControlsHUDProps {
  isOrbiting?: boolean;
  onToggleOrbit?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetNorth?: () => void;
}

export function CameraControlsHUD({
  isOrbiting,
  onToggleOrbit,
  onZoomIn,
  onZoomOut,
  onResetNorth,
}: CameraControlsHUDProps) {
  const [altitudeMode, setAltitudeMode] = useState<"ground" | "orbital">("ground");

  const toggleAltitude = () => {
    const next = altitudeMode === "ground" ? "orbital" : "ground";
    setAltitudeMode(next);
    if (MapAdapter) {
      MapAdapter.events.publish("cameraCommand", {
        action: next === "ground" ? "ground" : "aerial",
      });
    }
  };

  return (
    <div className="absolute bottom-6 right-5 z-20 flex flex-col items-center gap-2 select-none">
      {/* Controles de Câmera e Orientação */}
      <div className="glass-heavy p-1.5 rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center gap-1.5 backdrop-blur-xl">
        {/* Bússola / Resetar para o Norte */}
        <button
          onClick={onResetNorth}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/15 active:scale-95 text-slate-300 hover:text-white transition-all"
          title="Resetar Orientação para o Norte (0°)"
        >
          <Compass className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
        </button>

        {/* Separator */}
        <div className="w-5 h-[1px] bg-white/10" />

        {/* Alternar Altitude: Solo vs Orbital */}
        <button
          onClick={toggleAltitude}
          className={`p-2 rounded-xl transition-all active:scale-95 ${
            altitudeMode === "ground"
              ? "bg-indigo-600/60 text-indigo-200 border border-indigo-400/40"
              : "bg-white/5 hover:bg-white/15 text-slate-300"
          }`}
          title={
            altitudeMode === "ground"
              ? "Perspectiva de Solo (2.400m de relevo). Clique para visão Orbital."
              : "Visão Orbital (25.000m). Clique para visão de Solo."
          }
        >
          {altitudeMode === "ground" ? (
            <Mountain className="w-4 h-4 text-emerald-400" />
          ) : (
            <Globe2 className="w-4 h-4 text-sky-400" />
          )}
        </button>

        {/* Giro 360° Rápido */}
        {onToggleOrbit && (
          <button
            onClick={onToggleOrbit}
            className={`p-2 rounded-xl transition-all active:scale-95 ${
              isOrbiting
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 animate-pulse"
                : "bg-white/5 hover:bg-white/15 text-slate-300"
            }`}
            title={
              isOrbiting
                ? "Pausar Rotação 360°"
                : "Ativar Giro Contínuo 360° da Câmera"
            }
          >
            <RotateCw
              className={`w-4 h-4 ${isOrbiting ? "animate-spin" : ""}`}
              style={{ animationDuration: "8s" }}
            />
          </button>
        )}

        {/* Separator */}
        <div className="w-5 h-[1px] bg-white/10" />

        {/* Zoom In */}
        {onZoomIn && (
          <button
            onClick={onZoomIn}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 active:scale-95 text-slate-300 hover:text-white transition-all"
            title="Aproximar (Zoom In)"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}

        {/* Zoom Out */}
        {onZoomOut && (
          <button
            onClick={onZoomOut}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 active:scale-95 text-slate-300 hover:text-white transition-all"
            title="Afastar (Zoom Out)"
          >
            <Minus className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
