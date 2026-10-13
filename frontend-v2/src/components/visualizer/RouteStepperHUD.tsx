"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Play,
  Pause,
  X,
  MapPin,
  Sparkles,
} from "lucide-react";
import { CanonicalRoute, CanonicalWaypoint } from "@/data/canonicalRoutes";
import { MapAdapter } from "@/lib/BibleMapAdapter";
import { useTheoStore } from "@/store/useTheoStore";

interface RouteStepperHUDProps {
  route: CanonicalRoute | null;
  onClose?: () => void;
}

export function RouteStepperHUD({ route, onClose }: RouteStepperHUDProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlayingTour, setIsPlayingTour] = useState(false);
  const { setCurrentTime } = useTheoStore();

  // Resetar passo quando a rota mudar
  useEffect(() => {
    setCurrentStepIndex(0);
    setIsPlayingTour(false);
  }, [route?.id]);

  const goToStep = useCallback(
    (index: number) => {
      if (!route || !route.waypoints || route.waypoints.length === 0) return;
      const safeIndex = Math.max(
        0,
        Math.min(index, route.waypoints.length - 1),
      );
      setCurrentStepIndex(safeIndex);

      const wp: CanonicalWaypoint = route.waypoints[safeIndex];
      const [lat, lng] = wp.coords;

      // Sincroniza a era na linha do tempo se houver
      if (route.era !== undefined) {
        setCurrentTime(route.era);
      }

      // Publica seleção de local para abrir a Ficha de Campo correspondente
      if (MapAdapter) {
        MapAdapter.events.publish("onLocationSelected", {
          id: `${route.id}_step_${safeIndex + 1}`,
          name: wp.title,
          step: `${route.title} • ${wp.step}`,
          verse: wp.verse,
          quote: wp.quote,
          description: wp.bible,
          geo: wp.geo,
          arch: wp.arch,
          img: wp.img,
          modelName: wp.modelName,
          lat,
          lng,
          altitude: 2200,
          era: route.era,
        });

        // Voo cinematográfico
        MapAdapter.events.publish("cameraCommand", {
          action: "ground",
          lat,
          lng,
          altitude: 2200,
        });

        if (typeof MapAdapter.flyTo === "function") {
          MapAdapter.flyTo(lat, lng, 10);
        }
      }
    },
    [route, setCurrentTime],
  );

  const handleNext = useCallback(() => {
    if (!route) return;
    if (currentStepIndex < route.waypoints.length - 1) {
      goToStep(currentStepIndex + 1);
    } else {
      setIsPlayingTour(false);
    }
  }, [currentStepIndex, goToStep, route]);

  const handlePrev = useCallback(() => {
    if (!route) return;
    if (currentStepIndex > 0) {
      goToStep(currentStepIndex - 1);
    }
  }, [currentStepIndex, goToStep, route]);

  // Teclas de atalho: ArrowLeft e ArrowRight
  useEffect(() => {
    if (!route) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, route]);

  // Tour Automático com temporizador de 6 segundos por parada
  useEffect(() => {
    if (!isPlayingTour || !route) return;
    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < route.waypoints.length - 1) {
          const next = prev + 1;
          goToStep(next);
          return next;
        } else {
          setIsPlayingTour(false);
          return prev;
        }
      });
    }, 6000);
    return () => clearInterval(timer);
  }, [isPlayingTour, route, goToStep]);

  if (!route || !route.waypoints || route.waypoints.length === 0) return null;

  const currentWp = route.waypoints[currentStepIndex];
  const total = route.waypoints.length;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 select-none animate-in fade-in-0 slide-in-from-bottom-4 duration-200">
      <div className="glass-heavy px-4 py-2.5 rounded-2xl border border-white/15 shadow-2xl flex items-center gap-3 backdrop-blur-2xl text-white max-w-[calc(100vw-32px)]">
        {/* Botão Anterior */}
        <button
          onClick={handlePrev}
          disabled={currentStepIndex === 0}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 text-slate-300 hover:text-white"
          title="Passo Anterior (Seta Esquerda)"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Informações Centrais do Passo */}
        <div className="flex flex-col items-center min-w-[200px] max-w-sm sm:max-w-md text-center">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="truncate max-w-[220px]">{route.title}</span>
            <span className="text-white/40">•</span>
            <span>
              Passo {currentStepIndex + 1} de {total}
            </span>
          </div>

          <h4 className="text-sm font-extrabold text-white truncate max-w-full drop-shadow mt-0.5">
            {currentWp.title}
          </h4>

          {currentWp.verse && (
            <span className="text-[11px] text-indigo-300/90 font-mono truncate max-w-full">
              📜 {currentWp.verse}
            </span>
          )}
        </div>

        {/* Botão Próximo */}
        <button
          onClick={handleNext}
          disabled={currentStepIndex === total - 1}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 text-slate-300 hover:text-white"
          title="Próximo Passo (Seta Direita)"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Separator */}
        <div className="w-[1px] h-6 bg-white/15 mx-0.5" />

        {/* Botão Tour Automático */}
        <button
          onClick={() => setIsPlayingTour(!isPlayingTour)}
          className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 ${
            isPlayingTour
              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 animate-pulse"
              : "bg-white/10 hover:bg-white/20 text-slate-200"
          }`}
          title={
            isPlayingTour
              ? "Pausar Apresentação Automática"
              : "Iniciar Tour Automático (Avança a cada 6s)"
          }
        >
          {isPlayingTour ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline text-[11px]">Pausar Tour</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline text-[11px]">Tour Auto</span>
            </>
          )}
        </button>

        {/* Botão Fechar HUD */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors ml-1"
            title="Fechar Navegador de Rota"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
