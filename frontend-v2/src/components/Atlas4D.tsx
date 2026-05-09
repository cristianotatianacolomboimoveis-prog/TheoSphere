"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Map, { NavigationControl, Source } from "react-map-gl/mapbox";
import DeckGL from "@deck.gl/react";
import { ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import { TripsLayer } from "@deck.gl/geo-layers";
import { FlyToInterpolator } from "@deck.gl/core";
import { Clock, Layers, MapPin, WifiOff } from "lucide-react";
import { SEED_LOCATIONS, GeoLocation3D } from "@/data/geoSeedData";
import { Protocol } from "pmtiles";
import { useTheoStore } from "@/store/useTheoStore";
import { decodeBinaryPath } from "@/lib/geoBinary";
import { useTheoWorker } from "@/hooks/useTheoWorker";
import { TimeController } from "./atlas/TimeController";

// Registrar Protocolo PMTiles para o mapa offline (safely)
if (typeof window !== "undefined") {
  try {
    const maplibregl = require("maplibre-gl");
    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
  } catch (e) {
    console.warn("maplibre-gl not available for PMTiles protocol, skipping.");
  }
}

// Definindo o Token como fallback para evitar erros na UI (Em produção, vem do .env)
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "mocktoken";
const isInvalidToken = MAPBOX_TOKEN === "mocktoken" || MAPBOX_TOKEN === "your_real_mapbox_token_here" || !MAPBOX_TOKEN;

interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  transitionDuration?: number | "auto";
  transitionInterpolator?: any;
}

export default function Atlas4D() {
  const [viewState, setViewState] = useState<ViewState>({
    longitude: 35.2137, // Jerusalem Default
    latitude: 31.7683,
    zoom: 5,
    pitch: 45,
    bearing: 0,
  });

  // Store state
  const { activeVerseId, currentTime, setCurrentTime, activeTrekId } = useTheoStore();

  const [locations, setLocations] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]); // GeoJSON routes
  const [offlineMode, setOfflineMode] = useState(false);
  const [time, setTime] = useState(0); // Para animação do TripsLayer
  const workerRef = useRef<Worker | null>(null);

  // Loop de Animação 4D
  useEffect(() => {
    let animationFrame: number;
    const animate = () => {
      setTime(t => (t + 2) % 1000); // 0 a 1000 loop
      animationFrame = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const handleWorkerMessage = useCallback((type: string, payload: any) => {
    if (type === "FILTERED_DATA" || type === "FILTERED_DATA_BINARY") {
      if (type === "FILTERED_DATA_BINARY") {
        const decodedRoutes = payload.routes.map((r: any) => decodeBinaryPath(r));
        setLocations(payload.locations);
        setRoutes(decodedRoutes);
      } else {
        setLocations(payload.locations);
        setRoutes(payload.routes);
      }
    } else if (type === "VERSE_LOCATIONS") {
      if (payload.locations.length > 0) {
        const loc = payload.locations[0];
        setViewState({
          longitude: loc.coordinates[0],
          latitude: loc.coordinates[1],
          zoom: 8,
          pitch: 60,
          bearing: 0,
          transitionDuration: 2000,
          transitionInterpolator: new FlyToInterpolator()
        });
        const avgYear = (loc.period_start + loc.period_end) / 2;
        setCurrentTime(avgYear);
      }
    } else if (type === "OFFLINE_CACHE_STATUS") {
      setOfflineMode(true);
    }
  }, [setCurrentTime]);

  const { postMessage } = useTheoWorker(handleWorkerMessage);

  useEffect(() => {
    postMessage("LOAD_OFFLINE_TILES", {});
  }, [postMessage]);

  /* ── Consulta Analítica via DuckDB (Sync Map to Text) ── */
  useEffect(() => {
    if (!activeVerseId) return;
    
    const query = activeVerseId.toLowerCase();
    
    // Observer do Leitor (Travessia do Mar Vermelho)
    if (query.includes("exodus 14")) {
      setCurrentTime(-1446);
      
      setViewState({
        longitude: 32.3300,
        latitude: 29.9800,
        zoom: 9,
        pitch: 60,
        bearing: 45,
        transitionDuration: 4000,
        transitionInterpolator: new FlyToInterpolator()
      });
      return;
    }
    
    workerRef.current?.postMessage({
      type: "FIND_LOCATIONS_BY_VERSE",
      payload: { verseRef: activeVerseId }
    });
  }, [activeVerseId]);

  /* ── 2. Time Slider Effect (4D) with Debounce ── */
  useEffect(() => {
    const handler = setTimeout(() => {
      postMessage("FILTER_BY_TIME", { startYear: currentTime - 50, endYear: currentTime + 50 });
    }, 150); // 150ms debounce prevents Web Worker spam during rapid slider drag

    return () => clearTimeout(handler);
  }, [currentTime, postMessage]);

  /* ── 3. Camada de Relevo e Altitude Dinâmica ── */
  const isLocationActive = (d: any) => {
    const start = d.period_start ?? d.timeline?.start_year;
    const end = d.period_end ?? d.timeline?.end_year;
    return currentTime >= start && currentTime <= end;
  };

  const userPins = useTheoStore(state => state.userPins);

  const layers = useMemo(() => [
    // Trajetos Animados em GPU (Rastro de Fogo/Fumaça)
    new TripsLayer({
      id: "routes-layer",
      data: routes,
      getPath: (d: any) => d.path,
      getTimestamps: (d: any) => d.timestamps,
      getColor: (d: any) => d.color || [255, 215, 0],
      opacity: 0.9,
      widthMinPixels: 4,
      trailLength: 150,
      currentTime: time,
    }),
    
    // Cidades / Montes
    new ScatterplotLayer({
      id: "locations-layer",
      data: locations,
      pickable: true,
      opacity: 1,
      stroked: true,
      filled: true,
      radiusScale: 6,
      radiusMinPixels: 5,
      radiusMaxPixels: 100,
      lineWidthMinPixels: 1,
      getPosition: (d: any) => d.coordinates,
      // Normalização Temporal: Cinza escuro com 20% opacidade se inativo, Âmbar 100% se ativo
      getFillColor: (d: any) => isLocationActive(d) ? [245, 158, 11, 255] : [100, 100, 100, 50],
      getLineColor: (d: any) => isLocationActive(d) ? [255, 255, 255, 255] : [50, 50, 50, 50]
    }),

    // Nomes das Cidades
    new TextLayer({
      id: "text-layer",
      data: locations,
      getPosition: (d: any) => [d.coordinates[0], d.coordinates[1] + 0.1],
      getText: (d: any) => d.canonical_name ?? d.names?.canonical,
      getSize: 14,
      getAngle: 0,
      getTextAnchor: "middle",
      getAlignmentBaseline: "center",
      getColor: (d: any) => isLocationActive(d) ? [255, 255, 255, 255] : [150, 150, 150, 80],
      fontFamily: "Inter, sans-serif",
      fontWeight: 800,
    }),

    // Memory Palace: User Pins Layer
    new ScatterplotLayer({
      id: "user-pins-layer",
      data: userPins.filter(p => Math.abs(p.year - currentTime) < 100),
      pickable: true,
      opacity: 0.8,
      stroked: true,
      filled: true,
      radiusScale: 10,
      radiusMinPixels: 8,
      getPosition: (p: any) => p.coordinates,
      getFillColor: [236, 72, 153], // Pink-500
      getLineColor: [255, 255, 255],
      lineWidthMinPixels: 2,
    }),

    // PhD: Archaeology Layer (Evidence)
    new ScatterplotLayer({
      id: "archaeology-layer",
      data: locations.filter(l => l.type === "artifact" || l.type === "excavation"),
      pickable: true,
      opacity: 1,
      stroked: true,
      filled: true,
      radiusScale: 12,
      radiusMinPixels: 7,
      getPosition: (d: any) => d.coordinates,
      getFillColor: (d: any) => isLocationActive(d) ? [16, 185, 129, 255] : [100, 100, 100, 30],
      getLineColor: [255, 255, 255, 200],
      lineWidthMinPixels: 2,
    })
  ], [locations, routes, currentTime, time, userPins]);

  const yearLabel = currentTime < 0 ? `${Math.abs(currentTime)} a.C.` : `${currentTime} d.C.`;

  return (
    <div className="relative w-full h-full bg-[#05080f] overflow-hidden rounded-[24px] border border-white/5 shadow-2xl animate-fade-in">
      {/* MAPA DECK.GL 4D */}
      <DeckGL
        initialViewState={viewState}
        controller={true}
        layers={layers}
        onViewStateChange={(e) => setViewState(e.viewState as ViewState)}
        getTooltip={({ object }: any) => object && `${object.name || 'Trajeto'}\n${object.description || ''}`}
      >
        {!isInvalidToken && (
          <Map
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle={offlineMode ? "mapbox://styles/mapbox/satellite-v9" : "mapbox://styles/mapbox/dark-v11"}
            reuseMaps
            terrain={{ source: "mapbox-dem", exaggeration: 1.5 }}
          >
            <Source
              id="mapbox-dem"
              type="raster-dem"
              url="mapbox://mapbox.mapbox-terrain-dem-v1"
              tileSize={512}
              maxzoom={14}
            />
            <NavigationControl position="top-right" />
          </Map>
        )}

        {isInvalidToken && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#05080f]/90 z-[5]">
             <div className="max-w-md text-center p-12 glass-heavy rounded-[32px] border border-amber-500/20 shadow-2xl">
                <MapPin className="w-12 h-12 text-amber-500 mx-auto mb-6 animate-bounce" />
                <h3 className="text-xl font-bold text-white mb-4">Mapa de Alta Resolução Indisponível</h3>
                <p className="text-sm text-white/40 leading-relaxed mb-8">
                  Para habilitar o Atlas 4D com topografia 3D e satélite, insira um token válido do Mapbox em <code className="bg-white/5 px-2 py-1 rounded">frontend-v2/.env.local</code>.
                </p>
                <div className="flex flex-col gap-3">
                  <a href="https://account.mapbox.com/" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-widest rounded-xl transition-all">
                    Obter Token Gratuito
                  </a>
                  <button onClick={() => setOfflineMode(true)} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
                    Tentar Modo Offline (Experimental)
                  </button>
                </div>
             </div>
          </div>
        )}
      </DeckGL>

      {/* OVERLAYS UI */}
      <div className="absolute top-6 left-6 z-10 glass-heavy p-4 rounded-2xl border border-white/10 flex items-center gap-5 shadow-2xl animate-fade-in-down">
        <div>
          <h2 className="text-sm font-black text-white flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-amber-500 animate-pulse-glow" /> 
            <span className="text-gradient">THEOSPHERE ATLAS 4D</span>
          </h2>
          <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-bold">Motor WebGL Local-First</p>
        </div>
        
        {/* Offline Badge */}
        {offlineMode && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <WifiOff className="w-3 h-3" />
            <span className="text-[8px] font-black uppercase tracking-widest">OFFLINE SYNC</span>
          </div>
        )}
      </div>

      <TimeController 
        currentTime={currentTime} 
        onTimeChange={(year) => setCurrentTime(year)} 
      />
    </div>
  );
}
