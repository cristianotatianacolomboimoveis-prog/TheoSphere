"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Map, { NavigationControl } from "@vis.gl/react-maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
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
import { TimeController, TIMELINE_EVENTS, CATEGORY_COLORS, TimelineEvent } from "./atlas/TimeController";

// Registrar Protocolo PMTiles para o mapa offline (safely)
if (typeof window !== "undefined") {
  try {
    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
  } catch (e) {
    console.warn("PMTiles protocol registration skipped:", e);
  }
}

// Mudança para o mapa colorido (Carto Voyager)
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
const VALHALLA_URL = process.env.NEXT_PUBLIC_VALHALLA_URL || "http://localhost:8002/route";

interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  transitionDuration?: number | "auto";
  transitionInterpolator?: any;
}

const hexToRgb = (hex: string): [number, number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b, 255];
};

export default function Atlas4D() {
  const [viewState, setViewState] = useState<ViewState>({
    longitude: 35.2137, // Jerusalem Default
    latitude: 31.7683,
    zoom: 5,
    pitch: 45,
    bearing: 0,
  });

  // Store state
  const { activeVerseId, currentTime, setCurrentTime } = useTheoStore();
  // activeTrekId não está no store atualmente — feature de "treks" foi removida.
  const activeTrekId: string | null = null;

  const [locations, setLocations] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]); // GeoJSON routes
  const [offlineMode, setOfflineMode] = useState(false);
  const [time, setTime] = useState(0); // Para animação do TripsLayer
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

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
    
    postMessage("FIND_LOCATIONS_BY_VERSE", { verseRef: activeVerseId });
  }, [activeVerseId, postMessage]);

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
    }),

    // TIMELINE EVENTS ON MAP
    new ScatterplotLayer<TimelineEvent>({
      id: "timeline-events-layer",
      data: TIMELINE_EVENTS.filter(ev => ev.location && Math.abs(ev.year - currentTime) <= 50),
      pickable: true,
      opacity: 1,
      stroked: true,
      filled: true,
      radiusScale: 15,
      radiusMinPixels: 12,
      radiusMaxPixels: 25,
      getPosition: (d) => d.location as [number, number],
      getFillColor: (d) => hexToRgb(CATEGORY_COLORS[d.category]),
      getLineColor: [255, 255, 255, 255],
      lineWidthMinPixels: 3,
      onClick: ({ object }) => object && setSelectedEvent(object),
      transitions: {
        getPosition: 600,
        getFillColor: 600
      }
    }),

    // TIMELINE EVENT TEXTS
    new TextLayer<TimelineEvent>({
      id: "timeline-text-layer",
      data: TIMELINE_EVENTS.filter(ev => ev.location && Math.abs(ev.year - currentTime) <= 50),
      getPosition: (d) => [d.location![0], d.location![1] + 0.15],
      getText: (d) => `${d.icon} ${d.label}\n📍 ${d.locationName}\n(${d.year < 0 ? Math.abs(d.year) + ' a.C.' : d.year + ' d.C.'})`,
      getSize: 15,
      getAngle: 0,
      getTextAnchor: "middle",
      getAlignmentBaseline: "center",
      getColor: [0, 0, 0, 255],
      fontFamily: "Inter, Arial, sans-serif",
      fontWeight: 800,
      background: true,
      getBackgroundColor: [255, 255, 255, 245],
      backgroundPadding: [10, 6],
      getBorderColor: (d) => hexToRgb(CATEGORY_COLORS[d.category]),
      getBorderWidth: 2,
      // CRITICAL: Incluir caracteres latinos para suportar acentos portugueses
      characterSet: " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~áàâãéèêíïóòôõúùûçÁÀÂÃÉÈÊÍÏÓÒÔÕÚÙÛÇ"
    })
  ], [locations, routes, currentTime, time, userPins]);

  const yearLabel = currentTime < 0 ? `${Math.abs(currentTime)} a.C.` : `${currentTime} d.C.`;

  return (
    <div className="relative w-full h-full bg-[#05080f] overflow-hidden rounded-[24px] border border-white/5 shadow-2xl animate-fade-in">
      {/* MAPA DECK.GL 4D */}
      <DeckGL
        viewState={viewState}
        controller={true}
        layers={layers}
        onViewStateChange={(e) => {
          // Deferir a atualização para fora do ciclo de renderização para evitar o erro de colisão de estado
          Promise.resolve().then(() => {
            setViewState(e.viewState as ViewState);
          });
        }}
        getTooltip={({ object }: any) => object && !selectedEvent && `${object.name || object.label || 'Evento'}\n${object.locationName || ''}\n${object.description || ''}`}
      >
          <Map
            mapStyle={MAP_STYLE}
            reuseMaps
            onLoad={(e) => {
              const map = e.target;
              try {
                const style = map.getStyle();
                if (style && style.layers) {
                  style.layers.forEach((layer: any) => {
                    if (layer.layout && layer.layout["text-field"]) {
                      map.setLayoutProperty(layer.id, "text-field", [
                        "coalesce",
                        ["get", "name:pt"],
                        ["get", "name_pt"],
                        ["get", "name:en"],
                        ["get", "name_en"],
                        ["get", "name"]
                      ]);
                    }
                  });
                }
              } catch (err) {
                console.warn("Falha ao localizar mapa:", err);
              }
            }}
          >
            <NavigationControl position="top-right" />
          </Map>
      </DeckGL>

      {/* OVERLAYS UI */}
      <div className="absolute top-6 left-6 z-10 glass-heavy p-4 rounded-2xl border border-white/10 flex items-center gap-5 shadow-2xl animate-fade-in-down">
        <div>
          <h2 className="text-sm font-black text-white flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-emerald-500 animate-pulse-glow" /> 
            <span className="text-gradient">ATLAS 4D (Motor Valhalla)</span>
          </h2>
          <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-bold">MapLibre + Roteamento Open-Source</p>
        </div>
        
        {/* Offline Badge */}
        {offlineMode && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <WifiOff className="w-3 h-3" />
            <span className="text-[8px] font-black uppercase tracking-widest">SINCRONISMO OFFLINE</span>
          </div>
        )}
      </div>

      {/* IMAGE VIEWER MODAL */}
      {selectedEvent && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-12 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-5xl bg-slate-900 rounded-[32px] border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col md:flex-row h-full max-h-[700px]">
             {/* Close Button */}
             <button 
              onClick={() => setSelectedEvent(null)}
              className="absolute top-6 right-6 z-[110] w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-xl border border-white/10 transition-all"
             >
               <span className="text-xl font-bold">✕</span>
             </button>

             {/* Image side */}
             <div className="flex-grow relative bg-black group overflow-hidden">
               {selectedEvent.imageUrl ? (
                 <img 
                  src={selectedEvent.imageUrl} 
                  alt={selectedEvent.label}
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                 />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-white/20">Sem Imagem Disponível</div>
               )}
               <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
             </div>

             {/* Content side */}
             <div className="w-full md:w-[380px] p-8 flex flex-col justify-center bg-gradient-to-b from-slate-900 to-[#05080f]">
               <div className="mb-6">
                 <span 
                  className="text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full border border-current mb-4 inline-block"
                  style={{ color: CATEGORY_COLORS[selectedEvent.category] }}
                 >
                   {selectedEvent.year < 0 ? `${Math.abs(selectedEvent.year)} a.C.` : `${selectedEvent.year} d.C.`}
                 </span>
                 <h3 className="text-3xl font-black text-white leading-tight mb-2">{selectedEvent.label}</h3>
                 <p className="text-amber-500 font-bold flex items-center gap-2 text-sm">
                   <span>📍</span> {selectedEvent.locationName}
                 </p>
               </div>
               
               <div className="h-px w-full bg-white/10 mb-6" />
               
               <p className="text-white/60 text-sm leading-relaxed mb-8 overflow-y-auto max-h-48 pr-1" style={{scrollbarWidth: 'thin'}}>
                 {selectedEvent.summary || selectedEvent.description}
               </p>

               <button 
                onClick={() => setSelectedEvent(null)}
                className="w-full py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-amber-500 transition-colors"
               >
                 Voltar ao Mapa
               </button>
             </div>
          </div>
        </div>
      )}

      <TimeController 
        currentTime={currentTime} 
        onTimeChange={(year, location) => {
          setCurrentTime(year);
          // Auto-select event if clicking on card
          const ev = TIMELINE_EVENTS.find(e => e.year === year);
          if (ev && ev.imageUrl) setSelectedEvent(ev);

          if (location) {
            setViewState({
              longitude: location[0],
              latitude: location[1],
              zoom: 7,
              pitch: 45,
              bearing: 0,
              transitionDuration: 1500,
              transitionInterpolator: new FlyToInterpolator()
            });
          }
        }} 
      />
    </div>
  );
}
