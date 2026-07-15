"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Map, { NavigationControl, useControl } from "@vis.gl/react-maplibre";
import maplibregl from "maplibre-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ScatterplotLayer, TextLayer, PathLayer } from "@deck.gl/layers";
import { FlyToInterpolator } from "@deck.gl/core";
import {
  Box,
  Globe,
  Minimize2,
  Maximize2,
  X,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";
import { useTheoStore } from "@/store/useTheoStore";
import { api } from "@/lib/api";
import { CONFIG } from "@/lib/config";
import type { ArchaeologicalFind } from "@/hooks/useArchaeology";
import { TimeController } from "../atlas/TimeController";
import { getRouteColor, getRouteInfo, getCategoryLabel } from "./routeConfig";
import { RouteControlPanel } from "./RouteControlPanel";
import { MapHeader } from "./MapHeader";

const CesiumGlobe = dynamic(() => import("@/components/CesiumGlobe"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full w-full bg-black/50">
      <div className="text-white text-sm animate-pulse">
        Carregando globo 3D...
      </div>
    </div>
  ),
});

// CartoDB Voyager — free, no API key needed
const MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

// Esri World Imagery (Satellite) + CartoDB transparent labels overlay + 3D Terrain + Atmospheric Sky
const SATELLITE_STYLE = {
  version: 8,
  sources: {
    satellite: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution:
        "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    },
    terrain: {
      type: "raster-dem",
      tiles: [
        "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      encoding: "terrarium",
    },
    labels: {
      type: "raster",
      tiles: [
        "https://basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: "satellite-layer",
      type: "raster",
      source: "satellite",
      minzoom: 0,
      maxzoom: 20,
    },
    {
      id: "labels-layer",
      type: "raster",
      source: "labels",
      minzoom: 0,
      maxzoom: 20,
    },
  ],
  terrain: {
    source: "terrain",
    exaggeration: 1.5,
  },
  sky: {
    "sky-color": "#070c14",
    "horizon-color": "#1e293b",
    "fog-color": "#0f172a",
    "fog-ground-blend": 0.3,
    "horizon-fog-blend": 0.5,
    "sky-horizon-blend": 0.5,
    "atmosphere-blend": 0.7,
  },
};

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

// ─── Map Error Boundary to catch maplibre / WebGL / deck.gl crashes ───
class MapErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("[TheoSphere3D] Map component crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// ─── Deck.gl Overlay component (vis.gl recommended pattern for React 19) ───
function DeckGLOverlay(props: any) {
  const overlay = useControl(() => {
    try {
      return new MapboxOverlay(props);
    } catch (err) {
      console.error("[TheoSphere3D] Failed to create MapboxOverlay:", err);
      // Fallback object to prevent crashing standard react-map-gl operations
      return {
        setProps: () => {},
        onAdd: () => {},
        onRemove: () => {},
      } as any;
    }
  });

  useEffect(() => {
    if (overlay && typeof overlay.setProps === "function") {
      try {
        overlay.setProps(props);
      } catch (err) {
        console.error(
          "[TheoSphere3D] Failed to update MapboxOverlay props:",
          err,
        );
      }
    }
  }, [overlay, props]);

  return null;
}

export default function TheoSphere3D({ onClose }: { onClose?: () => void }) {
  const [viewState, setViewState] = useState<ViewState>({
    longitude: 35.2137,
    latitude: 31.7683,
    zoom: 5,
    pitch: 45,
    bearing: 0,
  });

  const { currentTime, setCurrentTime } = useTheoStore();
  const [locations, setLocations] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [mapMode, setMapMode] = useState<"satellite" | "vector">("satellite");
  const [useCesium, setUseCesium] = useState(false);

  const [rawLibertyStyle, setRawLibertyStyle] = useState<any>(null);

  const [visibleRouteIds, setVisibleRouteIds] = useState<string[]>([]);
  const [isLegendExpanded, setIsLegendExpanded] = useState(true);
  const [archFinds, setArchFinds] = useState<ArchaeologicalFind[]>([]);

  // Acervo arqueológico — pins no motor padrão (Deck.gl/MapLibre).
  // O CesiumGlobe tem camada própria; esta cobre o modo inicial (QA 2026-07-14).
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const baseUrl = CONFIG.API_BASE_URL.replace(/\/$/, "");
        const res = await fetch(`${baseUrl}/archaeology?limit=200`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const json = await res.json();
        if (json?.success) {
          setArchFinds(
            (json.data.items as ArchaeologicalFind[]).filter(
              (f) => f.latitude != null && f.longitude != null,
            ),
          );
        }
      } catch {
        // sem rede — camada simplesmente não aparece
      }
    })();
    return () => controller.abort();
  }, []);

  const flyToRouteStart = useCallback(
    (routeId: string) => {
      // Sincroniza a era da linha do tempo com a rota selecionada
      let targetYear = currentTime;
      if (routeId === "abraao") targetYear = -2000;
      else if (routeId === "exodo") targetYear = -1446;
      else if (routeId === "terra_prometida") targetYear = -1000;
      else if (routeId === "exilio_assirio") targetYear = -722;
      else if (routeId === "exilio_babilonico") targetYear = -586;
      else if (routeId === "jesus_galileia") targetYear = 29;
      else if (routeId === "paulo") targetYear = 47;
      else if (routeId === "paulo_roma") targetYear = 59;
      setCurrentTime(targetYear);

      // Encontra o primeiro waypoint para mover a câmera do mapa
      const route = routes.find((r) => r.id === routeId);
      if (route && route.waypoints && route.waypoints.length > 0) {
        const firstWaypoint = route.waypoints[0];
        if (firstWaypoint && firstWaypoint.coords) {
          const [lat, lng] = firstWaypoint.coords;
          if (MapAdapter && typeof MapAdapter.flyTo === "function") {
            MapAdapter.flyTo(lat, lng, 7);
          }
        }
      }
    },
    [routes, currentTime, setCurrentTime],
  );

  const toggleRoute = useCallback(
    (routeId: string) => {
      setVisibleRouteIds((prev) => {
        const isVisible = prev.includes(routeId);
        let nextVisible: string[];
        if (isVisible) {
          nextVisible = prev.filter((id) => id !== routeId);
        } else {
          nextVisible = [...prev, routeId];

          // Sempre sincroniza a era e voa até o início ao ativar
          setTimeout(() => {
            flyToRouteStart(routeId);
          }, 0);
        }
        return nextVisible;
      });
    },
    [flyToRouteStart],
  );

  const showAllRoutes = useCallback(() => {
    const allIds = routes.map((r) => r.id);
    setVisibleRouteIds(allIds);
  }, [routes]);

  const clearAllRoutes = useCallback(() => {
    setVisibleRouteIds([]);
  }, []);

  // Load OpenFreeMap style on mount for crisp localized vector labels & boundaries
  useEffect(() => {
    let active = true;
    const fetchStyle = async () => {
      try {
        const res = await fetch("https://tiles.openfreemap.org/styles/liberty");
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const styleJson = await res.json();
        if (active) {
          setRawLibertyStyle(styleJson);
        }
      } catch (err) {
        console.error(
          "[TheoSphere3D] Failed to fetch Liberty style, falling back to raster:",
          err,
        );
      }
    };
    fetchStyle();
    return () => {
      active = false;
    };
  }, []);

  // Process style dynamically based on mapMode and user browser language
  const customStyle = useMemo(() => {
    if (!rawLibertyStyle) return null;

    try {
      // Deep clone style to avoid mutation side effects
      const style = JSON.parse(JSON.stringify(rawLibertyStyle));

      // Resolve browser language
      const userLang =
        typeof navigator !== "undefined"
          ? navigator.language.split("-")[0] || "pt"
          : "pt";

      // 1. Process layers to localize text dynamically based on the exact user locale
      style.layers = style.layers.map((layer: any) => {
        if (
          layer.type === "symbol" &&
          layer.layout &&
          layer.layout["text-field"]
        ) {
          const id = layer.id || "";
          if (
            id.startsWith("label_") ||
            id.startsWith("water_name_") ||
            id.startsWith("poi_")
          ) {
            // High-resolution vector localization targeting browser language
            layer.layout["text-field"] = [
              "coalesce",
              ["get", `name_${userLang}`],
              ["get", `name:${userLang}`],
              ["get", "name_en"],
              ["get", "name:en"],
              ["get", "name"],
            ];
          }
        }
        return layer;
      });

      if (mapMode === "satellite") {
        // Inject Esri Satellite source
        style.sources = {
          ...style.sources,
          satellite: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution:
              "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
          },
          terrain: {
            type: "raster-dem",
            tiles: [
              "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            encoding: "terrarium",
          },
        };

        // Keep only boundary, place label, and water label layers
        style.layers = style.layers.filter((layer: any) => {
          const id = layer.id || "";
          return (
            id.startsWith("label_") ||
            id.startsWith("boundary_") ||
            id.startsWith("water_name_")
          );
        });

        // Optimize colors for high readability on satellite background
        style.layers = style.layers.map((layer: any) => {
          if (layer.type === "symbol" && layer.paint) {
            layer.paint["text-color"] = "#ffffff";
            layer.paint["text-halo-color"] = "rgba(0, 0, 0, 0.85)";
            layer.paint["text-halo-width"] = 2.0;
            layer.paint["text-halo-blur"] = 0.5;
          } else if (layer.type === "line" && layer.paint) {
            layer.paint["line-color"] = "rgba(255, 255, 255, 0.65)";
          }
          return layer;
        });

        // Insert satellite layer at bottom (first layer)
        style.layers.unshift({
          id: "satellite-layer",
          type: "raster",
          source: "satellite",
          minzoom: 0,
          maxzoom: 20,
        });

        // 3D terrain
        style.terrain = {
          source: "terrain",
          exaggeration: 1.5,
        };

        // Dark atmosphere sky
        style.sky = {
          "sky-color": "#070c14",
          "horizon-color": "#1e293b",
          "fog-color": "#0f172a",
          "fog-ground-blend": 0.3,
          "horizon-fog-blend": 0.5,
          "sky-horizon-blend": 0.5,
          "atmosphere-blend": 0.7,
        };
      }

      return style;
    } catch (e) {
      console.error(
        "[TheoSphere3D] Error parsing/localizing style, falling back:",
        e,
      );
      return null;
    }
  }, [rawLibertyStyle, mapMode]);

  // ─── Integração com Adapter (Facade) ───────────────────────────────────
  useEffect(() => {
    if (MapAdapter) {
      MapAdapter.registerMap({
        flyTo: (lat: number, lng: number, zoom: number) => {
          setViewState((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lng,
            zoom,
            transitionDuration: 2000,
            transitionInterpolator: new FlyToInterpolator(),
          }));
        },
        setTime: (year: number) => setCurrentTime(year),
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

  // Carregar Rotas do Banco (Enterprise API)
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const res = await api.get<any>("geo/routes");
        if (res.success && Array.isArray(res.data)) {
          const detailedRoutes = await Promise.all(
            res.data.map(async (r: any) => {
              try {
                const detailedRes = await api.get<any>(`geo/routes/${r.id}`);
                if (detailedRes.success && detailedRes.data) {
                  return detailedRes.data;
                }
              } catch (err) {
                console.error(
                  `Failed to fetch route details for ${r.id}:`,
                  err,
                );
              }
              return null;
            }),
          );
          setRoutes(detailedRoutes.filter(Boolean));
        }
      } catch (e) {
        console.error("Failed to fetch 3D routes:", e);
      }
    };
    fetchRoutes();
  }, []);

  // getRouteColor importado de ./routeConfig

  // getRouteInfo importado de ./routeConfig

  // Extrair todos os waypoints das rotas (apenas as ativas/visíveis)
  const allWaypoints = useMemo(() => {
    return routes
      .filter((r) => visibleRouteIds.includes(r.id))
      .flatMap((r) => {
        const { category } = getRouteInfo(r.id);
        return (r.waypoints || []).map((w: any, index: number) => ({
          ...w,
          routeId: r.id,
          category,
          indexInRoute: index + 1, // Começa do 1
        }));
      });
  }, [routes, visibleRouteIds]);

  // 2. Camadas Deck.gl Unificadas (Locais + Rotas em Linha e Pontos)
  const layers = [
    // Linhas das Rotas de Viagem (PathLayer)
    new PathLayer({
      id: "route-paths",
      data: routes.filter(
        (r) =>
          visibleRouteIds.includes(r.id) &&
          r.waypoints &&
          r.waypoints.length >= 2,
      ),
      getPath: (d: any) =>
        d.waypoints.map((w: any) => [w.coords[1], w.coords[0]]),
      getColor: (d: any) => getRouteColor(d.id).rgba,
      getWidth: 6,
      widthMinPixels: 3,
      widthMaxPixels: 8,
      pickable: true,
      rounded: true,
      shadowEnabled: true,
    }),

    // Pontos das Rotas de Viagem (ScatterplotLayer)
    new ScatterplotLayer({
      id: "route-waypoints",
      data: allWaypoints,
      getPosition: (w: any) => [w.coords[1], w.coords[0]],
      getFillColor: (w: any) => [...getRouteColor(w.routeId).rgb, 240],
      getRadius: 80,
      radiusMinPixels: 6.5,
      radiusMaxPixels: 10,
      pickable: true,
      onClick: (info: any) => {
        if (info.object && MapAdapter) {
          const { category, routeIndex, routeTitle } = getRouteInfo(
            info.object.routeId,
          );
          let catLabel = "Antigo Testamento (AT)";
          if (category === "jesus") catLabel = "Ministério de Jesus";
          else if (category === "apostolos")
            catLabel = "Ministério dos Apóstolos";
          else if (category === "paulo") catLabel = "Ministério de Paulo";

          const mappedLocation = {
            id: info.object.title,
            name: `${info.object.indexInRoute}. ${info.object.title}`,
            description: `**${catLabel}** • Rota ${routeIndex}: ${routeTitle.split(". ")[1]}\n\n${info.object.description || info.object.quote || info.object.bible}`,
            lat: info.object.coords[0],
            lng: info.object.coords[1],
            era: currentTime,
            category: "route-waypoint",
          };
          MapAdapter.events.publish("onLocationSelected", mappedLocation);
        }
      },
    }),

    // Rótulos dos Pontos das Rotas de Viagem (TextLayer)
    new TextLayer({
      id: "route-waypoint-labels",
      data: allWaypoints,
      getPosition: (w: any) => [w.coords[1], w.coords[0]],
      getText: (w: any) => `${w.indexInRoute}. ${w.title || ""}`,
      getSize: 12,
      getColor: [255, 255, 255, 255],
      getAlignmentBaseline: "bottom",
      fontFamily: "Inter, sans-serif",
      fontWeight: "bold",
    }),

    // Locais Bíblicos Originais (ScatterplotLayer)
    new ScatterplotLayer({
      id: "points",
      data: locations || [],
      getPosition: (d: any) => [d?.lng || 0, d?.lat || 0],
      getFillColor: [245, 158, 11, 200], // Amber/Orange (#f59e0b) to match the legend
      getRadius: 100,
      radiusMinPixels: 6,
      pickable: true,
      onClick: (info: any) => {
        if (info.object && MapAdapter) {
          MapAdapter.events.publish("onLocationSelected", info.object);
        }
      },
    }),

    // Acervo Arqueológico (ScatterplotLayer) — cor por autenticidade
    new ScatterplotLayer({
      id: "arch-finds",
      data: archFinds,
      getPosition: (f: ArchaeologicalFind) => [
        f.longitude as number,
        f.latitude as number,
      ],
      getFillColor: (f: ArchaeologicalFind) =>
        f.authenticity === "confirmada"
          ? [244, 63, 94, 220] // rose
          : f.authenticity === "debatida"
            ? [245, 158, 11, 220] // amber
            : [148, 163, 184, 220], // slate (disputada)
      getRadius: 90,
      radiusMinPixels: 5,
      radiusMaxPixels: 9,
      pickable: true,
      onClick: (info: any) => {
        const f = info.object as ArchaeologicalFind | undefined;
        if (f && MapAdapter) {
          MapAdapter.events.publish("onLocationSelected", {
            id: `arch-${f.slug}`,
            name: `🏺 ${f.namePt}`,
            description:
              `**Arqueologia** • ${f.period || ""} • Autenticidade: ${f.authenticity}\n\n` +
              `${f.description}\n\n_${f.significance}_\n\n` +
              `Descoberta: ${f.discoverySite}${f.discoveryYear ? ` (${f.discoveryYear})` : ""}` +
              (f.currentLocation ? `\nAcervo: ${f.currentLocation}` : ""),
            lat: f.latitude,
            lng: f.longitude,
            era: currentTime,
            category: "archaeology",
          });
        }
      },
    }),

    // Rótulos dos Locais Bíblicos (TextLayer)
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
    }),
  ];

  return (
    <div
      className={`relative w-full h-full bg-slate-950 flex flex-col ${fullscreen ? "fixed inset-0 z-[200]" : "rounded-3xl border border-white/10 shadow-2xl overflow-hidden"}`}
    >
      <MapHeader
        mapMode={mapMode}
        useCesium={useCesium}
        fullscreen={fullscreen}
        onToggleMapMode={() =>
          setMapMode(mapMode === "satellite" ? "vector" : "satellite")
        }
        onToggleCesium={() => setUseCesium(!useCesium)}
        onToggleFullscreen={() => setFullscreen(!fullscreen)}
        onClose={onClose}
      />

      {/* Main Render Area — Map is now the primary container */}
      <div
        className="flex-grow relative w-full"
        style={{ minHeight: "500px", height: "100%" }}
      >
        <MapErrorBoundary
          fallback={
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white select-none">
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-xl animate-pulse" />
                <svg
                  className="w-20 h-20 text-indigo-400 animate-spin"
                  style={{ animationDuration: "12s" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1}
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeDasharray="4 4"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 2a10 10 0 0110 10M12 22a10 10 0 01-10-10"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-widest animate-pulse">
                    3D
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-extrabold text-white tracking-tight uppercase mb-2">
                Motor WebGL Suspenso
              </h3>
              <p className="text-xs text-slate-400 max-w-md text-center leading-relaxed mb-6">
                Detectamos uma limitação ou erro de inicialização WebGL no seu
                navegador. Ativamos o modo de contingência inteligente para
                preservar a sua experiência.
              </p>

              {/* Glassmorphic Fallback Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mb-6 text-left">
                <div className="glass-heavy p-4 rounded-xl border border-white/5 flex flex-col gap-2 bg-white/5 backdrop-blur-md">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">
                    Locais Disponíveis ({locations.length})
                  </span>
                  <div className="max-h-28 overflow-y-auto pr-1 space-y-1 text-[11px]">
                    {locations.length > 0 ? (
                      locations.map((loc) => (
                        <button
                          key={loc.id || loc.name}
                          onClick={() => {
                            if (MapAdapter) {
                              MapAdapter.events.publish(
                                "onLocationSelected",
                                loc,
                              );
                            }
                          }}
                          className="w-full text-left p-1.5 rounded hover:bg-white/10 transition-all truncate font-medium text-slate-300 hover:text-white"
                        >
                          📍 {loc.name}
                        </button>
                      ))
                    ) : (
                      <span className="text-slate-500 italic">
                        Carregando locais históricos...
                      </span>
                    )}
                  </div>
                </div>

                <div className="glass-heavy p-4 rounded-xl border border-white/5 flex flex-col justify-between bg-white/5 backdrop-blur-md">
                  <div>
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                      Depuração Técnica
                    </span>
                    <p className="text-[9px] text-slate-400 mt-1 leading-normal">
                      Isso costuma ocorrer devido à falta de aceleração de
                      hardware no navegador ou conflitos de drivers locais.
                    </p>
                  </div>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-3 w-full bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase py-2 px-3 rounded-lg tracking-widest transition-all shadow-lg shadow-indigo-600/20"
                  >
                    Forçar Recarregamento
                  </button>
                </div>
              </div>
            </div>
          }
        >
          {useCesium ? (
            <CesiumGlobe visibleRouteIds={visibleRouteIds} routes={routes} />
          ) : (
            <Map
              mapLib={maplibregl}
              mapStyle={
                customStyle ||
                (mapMode === "satellite" ? (SATELLITE_STYLE as any) : MAP_STYLE)
              }
              {...viewState}
              onMove={(evt) => setViewState(evt.viewState as any)}
              style={{ width: "100%", height: "100%" }}
              reuseMaps
            >
              <DeckGLOverlay layers={layers} />
              <NavigationControl position="bottom-right" />
            </Map>
          )}
        </MapErrorBoundary>
      </div>

      {/* Unified Time Controller */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl z-10">
        <TimeController
          currentTime={currentTime}
          onTimeChange={(year) => setCurrentTime(year)}
        />
      </div>

      <RouteControlPanel
        routes={routes}
        visibleRouteIds={visibleRouteIds}
        isLegendExpanded={isLegendExpanded}
        onToggleLegend={() => setIsLegendExpanded(!isLegendExpanded)}
        onToggleRoute={toggleRoute}
        onFlyToRouteStart={flyToRouteStart}
        onShowAll={showAllRoutes}
        onClearAll={clearAllRoutes}
      />
    </div>
  );
}
