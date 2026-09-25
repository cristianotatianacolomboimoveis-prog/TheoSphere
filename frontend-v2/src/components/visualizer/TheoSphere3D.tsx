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
  Book,
  MapPin,
  Sparkles,
} from "lucide-react";
import { useTheoStore } from "@/store/useTheoStore";
import { api } from "@/lib/api";
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
import { logger } from "@/lib/logger";

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
    logger.error("[TheoSphere3D] Map component crashed:", error, errorInfo);
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
      return new MapboxOverlay({
        ...props,
        interleaved: false,
      });
    } catch (err) {
      logger.error("[TheoSphere3D] Failed to create MapboxOverlay:", err);
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
        overlay.setProps({
          ...props,
          interleaved: false,
        });
      } catch (err) {
        logger.error(
          "[TheoSphere3D] Failed to update MapboxOverlay props:",
          err,
        );
      }
    }
  }, [overlay, props]);

  return null;
}

export default function TheoSphere3D({
  onClose,
  isSidebarOpen,
  onToggleSidebar,
}: {
  onClose?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}) {
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
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isOrbiting, setIsOrbiting] = useState(false);

  const [rawLibertyStyle, setRawLibertyStyle] = useState<any>(null);

  const [visibleRouteIds, setVisibleRouteIds] = useState<string[]>([]);
  const [isLegendExpanded, setIsLegendExpanded] = useState(true);
  const [archFinds, setArchFinds] = useState<ArchaeologicalFind[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<{
    id?: string;
    name: string;
    step?: string;
    category?: string;
    verse?: string;
    quote?: string;
    description?: string;
    geo?: string;
    arch?: string;
    modelName?: string;
    img?: string;
    lat?: number;
    lng?: number;
    era?: number;
  } | null>(null);

  useEffect(() => {
    if (MapAdapter) {
      return MapAdapter.events.subscribe("onLocationSelected", (evt: any) => {
        if (evt) {
          setSelectedEvent(evt);
          setIsLegendExpanded(false); // Fecha o painel de rotas para dar visão ampla do relevo
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!MapAdapter) return;
    return MapAdapter.events.subscribe("cameraCommand", (cmd: any) => {
      if (cmd?.action === "orbitStopped") {
        setIsOrbiting(false);
      }
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedEvent(null);
        setIsOrbiting(false);
        MapAdapter?.events.publish("cameraCommand", { action: "stopOrbit" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Acervo arqueológico — pins no motor padrão (Deck.gl/MapLibre).
  // O CesiumGlobe tem camada própria; esta cobre o modo inicial (QA 2026-07-14).
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const json = await api.get<{
          success: boolean;
          data: { items: ArchaeologicalFind[] };
        }>("/archaeology?limit=200", {
          signal: controller.signal,
          throwOnError: false,
        });
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
        logger.error(
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
      logger.error(
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
        logger.warn(
          "Failed to fetch 3D locations (operating in offline fallback):",
          e,
        );
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
                logger.warn(`Route details for ${r.id} unavailable:`, err);
              }
              return null;
            }),
          );
          setRoutes(detailedRoutes.filter(Boolean));
        }
      } catch (e) {
        logger.warn(
          "Failed to fetch 3D routes (operating in offline fallback):",
          e,
        );
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
      jointRounded: true,
      capRounded: true,
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
        if (info.object) {
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
            step: info.object.step || `Passo ${info.object.indexInRoute}`,
            category: catLabel,
            routeTitle: routeTitle,
            verse: info.object.verse,
            quote: info.object.quote,
            description: info.object.bible || info.object.description,
            geo: info.object.geo,
            arch: info.object.arch,
            modelName: info.object.modelName,
            lat: info.object.coords[0],
            lng: info.object.coords[1],
            era: currentTime,
          };
          setSelectedEvent(mappedLocation);
          if (MapAdapter) {
            MapAdapter.events.publish("onLocationSelected", mappedLocation);
          }
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
        if (info.object) {
          const mappedLocation = {
            id: info.object.id || info.object.name,
            name: info.object.name,
            category: getCategoryLabel(info.object.category || "city"),
            description: info.object.description,
            lat: info.object.lat,
            lng: info.object.lng,
            era: info.object.era ?? currentTime,
          };
          setSelectedEvent(mappedLocation);
          if (MapAdapter) {
            MapAdapter.events.publish("onLocationSelected", mappedLocation);
          }
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
        if (f) {
          const mappedLocation = {
            id: `arch-${f.slug}`,
            name: `🏺 ${f.namePt}`,
            category: `Arqueologia (${f.authenticity})`,
            description: f.description,
            quote: f.significance,
            geo: `Descoberta: ${f.discoverySite}${f.discoveryYear ? ` (${f.discoveryYear})` : ""}`,
            arch: f.currentLocation
              ? `Acervo: ${f.currentLocation}`
              : undefined,
            lat: f.latitude as number,
            lng: f.longitude as number,
            era: currentTime,
          };
          setSelectedEvent(mappedLocation);
          if (MapAdapter) {
            MapAdapter.events.publish("onLocationSelected", mappedLocation);
          }
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
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar}
        onClose={onClose}
      />

      {/* Main Render Area — Map is now the primary container */}
      <div
        className="flex-grow relative w-full"
        style={{ minHeight: "500px", height: "100%" }}
      >
        <MapErrorBoundary
          key={useCesium ? "cesium" : "maplibre"}
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
              onLoad={() => setIsMapLoaded(true)}
              style={{ width: "100%", height: "100%" }}
              reuseMaps
            >
              {isMapLoaded && <DeckGLOverlay layers={layers} />}
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

      {/* Ficha de Campo Imersiva (Estilo National Geographic / Voyager) */}
      {selectedEvent && (
        <div className="absolute top-20 left-5 z-30 w-96 max-w-[calc(100vw-3rem)] max-h-[calc(100vh-160px)] overflow-y-auto custom-scrollbar glass-heavy rounded-2xl border border-white/10 shadow-2xl p-4 backdrop-blur-xl animate-in fade-in-0 slide-in-from-left-4 duration-200 select-none">
          {/* Banner Fotográfico Panorâmico do Sítio Histórico */}
          <div className="relative w-full h-44 rounded-xl overflow-hidden mb-3 border border-white/10 shadow-lg group bg-slate-900">
            <img
              src={
                selectedEvent.img ||
                "https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=1000&q=80"
              }
              alt={selectedEvent.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

            {/* Botão Fechar no topo da foto */}
            <button
              onClick={() => {
                setIsOrbiting(false);
                setSelectedEvent(null);
                MapAdapter?.events.publish("cameraCommand", {
                  action: "stopOrbit",
                });
              }}
              className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white backdrop-blur-md transition-colors"
              title="Fechar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Badges e Título sobre a foto */}
            <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-2">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/80 text-white shadow-md">
                  {selectedEvent.step ||
                    selectedEvent.category ||
                    "Sítio Histórico"}
                </span>
                <h3 className="text-base font-black text-white mt-1 drop-shadow-md leading-tight">
                  {selectedEvent.name}
                </h3>
              </div>
              {selectedEvent.era !== undefined && (
                <span className="text-[10px] font-extrabold text-amber-400 bg-black/70 px-2 py-0.5 rounded-md backdrop-blur-md whitespace-nowrap">
                  {selectedEvent.era < 0
                    ? `${Math.abs(selectedEvent.era)} a.C.`
                    : `${selectedEvent.era} d.C.`}
                </span>
              )}
            </div>
          </div>

          {/* Barra de Controle de Câmera Cinematográfica */}
          <div className="flex items-center gap-1.5 mb-3 bg-white/[0.04] p-1.5 rounded-xl border border-white/10">
            <button
              onClick={() => {
                const nextState = !isOrbiting;
                setIsOrbiting(nextState);
                MapAdapter?.events.publish("cameraCommand", {
                  action: "toggleOrbit",
                });
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                isOrbiting
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 animate-pulse"
                  : "bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
              }`}
              title="Ativar rotação 360° ao redor do sítio em tempo real"
            >
              <span>🔄</span>
              <span>{isOrbiting ? "Orbitando 360°" : "Órbita 360°"}</span>
            </button>
            <button
              onClick={() => {
                setIsOrbiting(false);
                if (selectedEvent.lat && selectedEvent.lng) {
                  MapAdapter?.events.publish("cameraCommand", {
                    action: "ground",
                    lat: selectedEvent.lat,
                    lng: selectedEvent.lng,
                  });
                }
              }}
              className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center gap-1 transition-all"
              title="Aproximação rente ao solo para visualizar as montanhas contra o horizonte"
            >
              <span>🏔️</span> Vista Solo
            </button>
            <button
              onClick={() => {
                setIsOrbiting(false);
                if (selectedEvent.lat && selectedEvent.lng) {
                  MapAdapter?.events.publish("cameraCommand", {
                    action: "aerial",
                    lat: selectedEvent.lat,
                    lng: selectedEvent.lng,
                  });
                }
              }}
              className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center gap-1 transition-all"
              title="Visão aérea orbital macro"
            >
              <span>🛰️</span> Orbital
            </button>
          </div>

          {/* Citação Bíblica e Teológica */}
          {selectedEvent.quote && (
            <blockquote className="text-xs italic text-amber-200/90 bg-amber-500/10 border-l-2 border-amber-400 p-2.5 rounded-r-lg mb-3 leading-relaxed">
              &ldquo;{selectedEvent.quote}&rdquo;
            </blockquote>
          )}

          {/* Versículo Canônico */}
          {selectedEvent.verse && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
                📜 {selectedEvent.verse}
              </span>
            </div>
          )}

          {/* Descrição Histórico-Exegética */}
          {selectedEvent.description && (
            <p className="text-xs text-slate-300 leading-relaxed mb-3 line-clamp-4">
              {selectedEvent.description.replace(/\*\*/g, "").replace(/_/g, "")}
            </p>
          )}

          {/* Dados de Terreno e Arqueologia */}
          {(selectedEvent.geo ||
            selectedEvent.arch ||
            selectedEvent.modelName) && (
            <div className="space-y-1.5 text-[11px] text-slate-400 bg-white/[0.03] p-2.5 rounded-xl border border-white/5 mb-3">
              {selectedEvent.geo && (
                <div>
                  <strong className="text-slate-200">🌍 Geografia:</strong>{" "}
                  {selectedEvent.geo}
                </div>
              )}
              {selectedEvent.arch && (
                <div>
                  <strong className="text-slate-200">🏺 Arqueologia:</strong>{" "}
                  {selectedEvent.arch}
                </div>
              )}
              {selectedEvent.modelName && (
                <div>
                  <strong className="text-slate-200">
                    🗿 Reconstituição 3D:
                  </strong>{" "}
                  {selectedEvent.modelName}
                </div>
              )}
            </div>
          )}

          {/* Rodapé de Ações */}
          <div className="flex items-center gap-2 pt-2 border-t border-white/10">
            {selectedEvent.verse && (
              <button
                onClick={() => {
                  const parts = selectedEvent.verse!.split(" ");
                  const bookName = parts.slice(0, -1).join(" ") || parts[0];
                  const chV = parts[parts.length - 1]?.split(":") || [];
                  const chapter = parseInt(chV[0], 10) || 1;
                  useTheoStore.getState().setBibleReference(bookName, chapter);
                  useTheoStore.getState().setActiveTool("exegesis");
                }}
                className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30"
              >
                <Book className="w-3.5 h-3.5" />
                Estudar na Exegese
              </button>
            )}
            <button
              onClick={() => {
                if (selectedEvent.lat && selectedEvent.lng && MapAdapter) {
                  MapAdapter.flyTo(selectedEvent.lat, selectedEvent.lng, 12);
                }
              }}
              className="py-1.5 px-3 bg-white/10 hover:bg-white/20 active:scale-95 text-slate-200 text-xs font-bold rounded-lg transition-all flex items-center gap-1"
              title="Focalizar Câmera"
            >
              <MapPin className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
