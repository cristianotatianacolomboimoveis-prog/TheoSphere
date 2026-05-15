"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Map, { NavigationControl } from "@vis.gl/react-maplibre";
import DeckGL from "@deck.gl/react";
import { ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import { TripsLayer } from "@deck.gl/geo-layers";
import { FlyToInterpolator } from "@deck.gl/core";
import { Layers, MapPin, Box, Clock, Minimize2, Maximize2, X } from "lucide-react";
import { useTheoStore } from "@/store/useTheoStore";
import { api } from "@/lib/api";
import { TimeController, TIMELINE_EVENTS, CATEGORY_COLORS } from "../atlas/TimeController";

// Estilo de mapa premium
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  transitionDuration?: number;
  transitionInterpolator?: any;
}

import { MapAdapter } from "@/lib/BibleMapAdapter";

export default function TheoSphere3D({ onClose }: { onClose?: () => void }) {
  const [viewState, setViewState] = useState<ViewState>({
    longitude: 35.2137,
    latitude: 31.7683,
    zoom: 5,
    pitch: 45,
    bearing: 0,
  });

  const { currentTime, setCurrentTime, activeVerseId } = useTheoStore();
  const [locations, setLocations] = useState<any[]>([]);
  const [time, setTime] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  // ─── Integração com Adapter (Facade) ───────────────────────────────────
  useEffect(() => {
    if (MapAdapter) {
      MapAdapter.registerMap({
        flyTo: (lat: number, lng: number, zoom: number) => {
          setViewState(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng,
            zoom,
            transitionDuration: 2000,
            transitionInterpolator: new FlyToInterpolator(),
          }));
        },
        setTime: (year: number) => setCurrentTime(year)
      });
    }
  }, [setCurrentTime]);

  // 1. Carregar Locais do Banco (Enterprise API)
  useEffect(() => {
    const fetchLocs = async () => {
      try {
        const res = await api.get<any>(`geo/locations?era=${currentTime}`);
        if (res.success && Array.isArray(res.data)) {
          setLocations(res.data);
        } else {
          setLocations([]);
        }
      } catch (e) {
        console.error("Failed to fetch 3D locations:", e);
        setLocations([]);
      }
    };
    fetchLocs();
  }, [currentTime]);

  // 2. Loop de Animação para rotas
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(t => (t + 1) % 1000);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // 3. Camadas Deck.gl Unificadas
  const layers = useMemo(() => [
    new ScatterplotLayer({
      id: "points",
      data: locations || [],
      getPosition: (d: any) => [d?.lng || 0, d?.lat || 0],
      getFillColor: [245, 158, 11, 200],
      getRadius: 100,
      radiusMinPixels: 6,
      pickable: true,
      onClick: (info: any) => {
        if (info.object && MapAdapter) {
          MapAdapter.events.publish('onLocationSelected', info.object);
        }
      }
    }),
    new TextLayer({
      id: "labels",
      data: locations || [],
      getPosition: (d: any) => [d?.lng || 0, d?.lat || 0],
      getText: (d: any) => d?.name || "",
      getSize: 14,
      getColor: [255, 255, 255, 255],
      getAlignmentBaseline: "bottom",
      fontFamily: "Inter, sans-serif",
      fontWeight: "bold",
    })
  ], [locations]);

  return (
    <div className={`relative w-full h-full bg-slate-950 flex flex-col ${fullscreen ? 'fixed inset-0 z-[200]' : 'rounded-3xl border border-white/10 shadow-2xl overflow-hidden'}`}>
      
      {/* Unified Header */}
      <div className="absolute top-6 left-6 z-10 flex items-center gap-4">
        <div className="glass-heavy p-4 rounded-2xl border border-white/10 flex items-center gap-4 shadow-2xl">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Box className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white tracking-tight italic uppercase">TheoSphere 3D Visualizer</h2>
            <p className="text-[9px] text-blue-400 font-bold tracking-widest uppercase">Motor Geoespacial Enterprise</p>
          </div>
        </div>

        <div className="flex gap-2">
            <button onClick={() => setFullscreen(!fullscreen)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/50 border border-white/10 backdrop-blur-md">
                {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            {onClose && (
                <button onClick={onClose} className="p-3 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-400 border border-red-500/20 backdrop-blur-md">
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
      </div>

      {/* Main Render Area */}
      <div className="flex-grow relative">
        <DeckGL
            viewState={viewState}
            controller={true}
            layers={layers}
            onViewStateChange={(e) => setViewState(e.viewState as any)}
        >
            <Map mapStyle={MAP_STYLE} reuseMaps>
                <NavigationControl position="bottom-right" />
            </Map>
        </DeckGL>
      </div>

      {/* Unified Time Controller */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl z-10">
        <TimeController 
            currentTime={currentTime} 
            onTimeChange={(year) => setCurrentTime(year)} 
        />
      </div>

      {/* 3D Legend */}
      <div className="absolute top-6 right-6 z-10 glass-heavy p-3 rounded-xl border border-white/5 flex flex-col gap-2">
         <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-[8px] font-bold text-white/40 uppercase">Locais Bíblicos</span></div>
         <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[8px] font-bold text-white/40 uppercase">Rotas de Viagem</span></div>
      </div>
    </div>
  );
}
