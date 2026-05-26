"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Map, { NavigationControl, useControl } from "@vis.gl/react-maplibre";
import maplibregl from "maplibre-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ScatterplotLayer, TextLayer, PathLayer } from "@deck.gl/layers";
import { FlyToInterpolator } from "@deck.gl/core";
import {
  Box,
  Minimize2,
  Maximize2,
  X,
  Globe,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useTheoStore } from "@/store/useTheoStore";
import { api } from "@/lib/api";
import { TimeController } from "../atlas/TimeController";
import CesiumGlobe from "@/components/CesiumGlobe";

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

  // Helper de Cores Customizadas por Rota
  const getRouteColor = useCallback((routeId: string) => {
    switch (routeId) {
      case "abraao":
        return {
          hex: "#ff2d55",
          rgb: [255, 45, 85] as [number, number, number],
          rgba: [255, 45, 85, 220] as [number, number, number, number],
          bgClass: "bg-[#ff2d55]/10 border-[#ff2d55]/30 text-white",
          activeEyeClass: "bg-[#ff2d55]/20 text-[#ff2d55]",
        };
      case "exodo":
        return {
          hex: "#f97316",
          rgb: [249, 115, 22] as [number, number, number],
          rgba: [249, 115, 22, 220] as [number, number, number, number],
          bgClass: "bg-[#f97316]/10 border-[#f97316]/30 text-white",
          activeEyeClass: "bg-[#f97316]/20 text-[#f97316]",
        };
      case "terra_prometida":
        return {
          hex: "#10b981",
          rgb: [16, 185, 129] as [number, number, number],
          rgba: [16, 185, 129, 220] as [number, number, number, number],
          bgClass: "bg-[#10b981]/10 border-[#10b981]/30 text-white",
          activeEyeClass: "bg-[#10b981]/20 text-[#10b981]",
        };
      case "exilio_assirio":
        return {
          hex: "#64748b",
          rgb: [100, 116, 139] as [number, number, number],
          rgba: [100, 116, 139, 220] as [number, number, number, number],
          bgClass: "bg-[#64748b]/10 border-[#64748b]/30 text-white",
          activeEyeClass: "bg-[#64748b]/20 text-[#64748b]",
        };
      case "exilio_babilonico":
        return {
          hex: "#f43f5e",
          rgb: [244, 63, 94] as [number, number, number],
          rgba: [244, 63, 94, 220] as [number, number, number, number],
          bgClass: "bg-[#f43f5e]/10 border-[#f43f5e]/30 text-white",
          activeEyeClass: "bg-[#f43f5e]/20 text-[#f43f5e]",
        };
      case "jesus_galileia":
        return {
          hex: "#2dd4bf",
          rgb: [45, 212, 191] as [number, number, number],
          rgba: [45, 212, 191, 220] as [number, number, number, number],
          bgClass: "bg-[#2dd4bf]/10 border-[#2dd4bf]/30 text-white",
          activeEyeClass: "bg-[#2dd4bf]/20 text-[#2dd4bf]",
        };
      case "paulo":
        return {
          hex: "#6366f1",
          rgb: [99, 102, 241] as [number, number, number],
          rgba: [99, 102, 241, 220] as [number, number, number, number],
          bgClass: "bg-[#6366f1]/10 border-[#6366f1]/30 text-white",
          activeEyeClass: "bg-[#6366f1]/20 text-[#6366f1]",
        };
      case "paulo_roma":
        return {
          hex: "#a855f7",
          rgb: [168, 85, 247] as [number, number, number],
          rgba: [168, 85, 247, 220] as [number, number, number, number],
          bgClass: "bg-[#a855f7]/10 border-[#a855f7]/30 text-white",
          activeEyeClass: "bg-[#a855f7]/20 text-[#a855f7]",
        };
      default:
        return {
          hex: "#6366f1",
          rgb: [99, 102, 241] as [number, number, number],
          rgba: [99, 102, 241, 220] as [number, number, number, number],
          bgClass: "bg-[#6366f1]/10 border-[#6366f1]/30 text-white",
          activeEyeClass: "bg-[#6366f1]/20 text-[#6366f1]",
        };
    }
  }, []);

  // Helper de Classificação de Rotas
  const getRouteInfo = useCallback((routeId: string) => {
    let routeIndex = 1;
    let routeTitle = "";
    let category: "at" | "jesus" | "apostolos" | "paulo" = "at";

    if (routeId === "abraao") {
      routeIndex = 1;
      routeTitle = "1. Jornada de Abraão";
      category = "at";
    } else if (routeId === "exodo") {
      routeIndex = 2;
      routeTitle = "2. Rota do Êxodo";
      category = "at";
    } else if (routeId === "terra_prometida") {
      routeIndex = 3;
      routeTitle = "3. Terra Prometida, 12 Tribos, Divisão dos Reinos";
      category = "at";
    } else if (routeId === "exilio_assirio") {
      routeIndex = 4;
      routeTitle = "4. Exílio Assírio e Dispersão";
      category = "at";
    } else if (routeId === "exilio_babilonico") {
      routeIndex = 5;
      routeTitle = "5. Exílio Babilônico e Nova Aliança";
      category = "at";
    } else if (routeId === "jesus_galileia") {
      routeIndex = 1;
      routeTitle = "1. Ministério Galileu de Jesus";
      category = "jesus";
    } else if (routeId === "paulo") {
      routeIndex = 1;
      routeTitle = "1. 1ª Viagem de Paulo (Apóstolos)";
      category = "apostolos";
    } else if (routeId === "paulo_roma") {
      routeIndex = 1;
      routeTitle = "1. Viagem de Paulo a Roma";
      category = "paulo";
    }
    return { category, routeIndex, routeTitle };
  }, []);

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
  }, [routes, visibleRouteIds, getRouteInfo]);

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
      {/* Unified Header */}
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

          {/* Elegant vertical separator */}
          <div className="w-[1px] h-6 bg-white/20 self-center" />

          {/* Premium Custom Map Mode Toggle (Teal/Cyan Globe Pill) */}
          <button
            onClick={() =>
              setMapMode(mapMode === "satellite" ? "vector" : "satellite")
            }
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

          {/* Elegant vertical separator */}
          <div className="w-[1px] h-6 bg-white/20 self-center" />

          {/* Premium Cesium Globe Toggle */}
          <button
            onClick={() => setUseCesium(!useCesium)}
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
            onClick={() => setFullscreen(!fullscreen)}
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

      {/* Premium 3D Route Control Panel & Legend */}
      <div
        className={`absolute top-6 right-6 z-10 bg-[#0d0e12]/95 backdrop-blur-md border border-white/10 shadow-2xl flex flex-col transition-all duration-300 select-none ${
          isLegendExpanded
            ? "w-[320px] rounded-[2rem] p-6 gap-5"
            : "w-[220px] rounded-full px-5 py-3 gap-0"
        }`}
      >
        {/* Panel Header */}
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsLegendExpanded(!isLegendExpanded)}
        >
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <span className="text-[11px] font-black text-white tracking-[0.12em] uppercase">
              {isLegendExpanded ? "Painel de Rotas" : "Rotas & Locais"}
            </span>
          </div>
          <button className="p-1 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
            {isLegendExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Collapsible Content */}
        {isLegendExpanded && (
          <div className="flex flex-col gap-5 animate-fadeIn">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-extrabold tracking-wider uppercase">
              <button
                onClick={showAllRoutes}
                className="py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 active:scale-95 rounded-xl text-white transition-all text-center flex items-center justify-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                Mostrar Todas
              </button>
              <button
                onClick={clearAllRoutes}
                className="py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 active:scale-95 rounded-xl text-white transition-all text-center flex items-center justify-center gap-1.5"
              >
                <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                Ocultar Todas
              </button>
            </div>

            {/* Static Legend References */}
            <div className="flex flex-col gap-2.5 border-t border-b border-white/5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                <span className="text-[10px] font-bold text-slate-400 tracking-[0.05em] uppercase">
                  Locais Históricos (Sempre Ativos)
                </span>
              </div>
            </div>

            {/* Antigo Testamento Routes */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-[#ff2d55] via-[#f97316] to-[#10b981]" />
                <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase">
                  Antigo Testamento (AT)
                </span>
              </div>
              <div className="flex flex-col gap-1.5 pl-3">
                {routes
                  .filter((r) => getRouteInfo(r.id).category === "at")
                  .map((r) => {
                    const { routeTitle } = getRouteInfo(r.id);
                    const isVisible = visibleRouteIds.includes(r.id);
                    const colorInfo = getRouteColor(r.id);
                    return (
                      <div
                        key={r.id}
                        className={`flex items-center justify-between p-2 rounded-xl transition-all duration-200 border group ${
                          isVisible
                            ? colorInfo.bgClass
                            : "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <button
                          onClick={() => {
                            if (!isVisible) {
                              toggleRoute(r.id);
                            } else {
                              flyToRouteStart(r.id);
                            }
                          }}
                          className="flex-grow text-left text-[11px] font-bold tracking-tight truncate pr-2 select-text"
                          title="Clique para voar até o início da rota"
                        >
                          {routeTitle}
                        </button>
                        <button
                          onClick={() => toggleRoute(r.id)}
                          className={`p-1 rounded-lg transition-colors ${
                            isVisible
                              ? colorInfo.activeEyeClass
                              : "bg-white/5 hover:bg-white/10 text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {isVisible ? (
                            <Eye className="w-3.5 h-3.5" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                {routes.filter((r) => getRouteInfo(r.id).category === "at")
                  .length === 0 && (
                  <span className="text-[10px] text-slate-500 italic">
                    Nenhuma rota carregada
                  </span>
                )}
              </div>
            </div>

            {/* Ministério de Jesus */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-3 rounded-full bg-[#2dd4bf]" />
                <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase">
                  Ministério de Jesus
                </span>
              </div>
              <div className="flex flex-col gap-1.5 pl-3">
                {routes
                  .filter((r) => getRouteInfo(r.id).category === "jesus")
                  .map((r) => {
                    const { routeTitle } = getRouteInfo(r.id);
                    const isVisible = visibleRouteIds.includes(r.id);
                    const colorInfo = getRouteColor(r.id);
                    return (
                      <div
                        key={r.id}
                        className={`flex items-center justify-between p-2 rounded-xl transition-all duration-200 border group ${
                          isVisible
                            ? colorInfo.bgClass
                            : "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <button
                          onClick={() => {
                            if (!isVisible) {
                              toggleRoute(r.id);
                            } else {
                              flyToRouteStart(r.id);
                            }
                          }}
                          className="flex-grow text-left text-[11px] font-bold tracking-tight truncate pr-2 select-text"
                          title="Clique para voar até o início da rota"
                        >
                          {routeTitle}
                        </button>
                        <button
                          onClick={() => toggleRoute(r.id)}
                          className={`p-1 rounded-lg transition-colors ${
                            isVisible
                              ? colorInfo.activeEyeClass
                              : "bg-white/5 hover:bg-white/10 text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {isVisible ? (
                            <Eye className="w-3.5 h-3.5" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                {routes.filter((r) => getRouteInfo(r.id).category === "jesus")
                  .length === 0 && (
                  <span className="text-[10px] text-slate-500 italic">
                    Nenhuma rota carregada
                  </span>
                )}
              </div>
            </div>

            {/* Ministério dos Apóstolos */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-3 rounded-full bg-[#6366f1]" />
                <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase">
                  Ministério dos Apóstolos
                </span>
              </div>
              <div className="flex flex-col gap-1.5 pl-3">
                {routes
                  .filter((r) => getRouteInfo(r.id).category === "apostolos")
                  .map((r) => {
                    const { routeTitle } = getRouteInfo(r.id);
                    const isVisible = visibleRouteIds.includes(r.id);
                    const colorInfo = getRouteColor(r.id);
                    return (
                      <div
                        key={r.id}
                        className={`flex items-center justify-between p-2 rounded-xl transition-all duration-200 border group ${
                          isVisible
                            ? colorInfo.bgClass
                            : "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <button
                          onClick={() => {
                            if (!isVisible) {
                              toggleRoute(r.id);
                            } else {
                              flyToRouteStart(r.id);
                            }
                          }}
                          className="flex-grow text-left text-[11px] font-bold tracking-tight truncate pr-2 select-text"
                          title="Clique para voar até o início da rota"
                        >
                          {routeTitle}
                        </button>
                        <button
                          onClick={() => toggleRoute(r.id)}
                          className={`p-1 rounded-lg transition-colors ${
                            isVisible
                              ? colorInfo.activeEyeClass
                              : "bg-white/5 hover:bg-white/10 text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {isVisible ? (
                            <Eye className="w-3.5 h-3.5" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                {routes.filter(
                  (r) => getRouteInfo(r.id).category === "apostolos",
                ).length === 0 && (
                  <span className="text-[10px] text-slate-500 italic">
                    Nenhuma rota carregada
                  </span>
                )}
              </div>
            </div>

            {/* Ministério de Paulo */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-3 rounded-full bg-[#a855f7]" />
                <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase">
                  Ministério de Paulo
                </span>
              </div>
              <div className="flex flex-col gap-1.5 pl-3">
                {routes
                  .filter((r) => getRouteInfo(r.id).category === "paulo")
                  .map((r) => {
                    const { routeTitle } = getRouteInfo(r.id);
                    const isVisible = visibleRouteIds.includes(r.id);
                    const colorInfo = getRouteColor(r.id);
                    return (
                      <div
                        key={r.id}
                        className={`flex items-center justify-between p-2 rounded-xl transition-all duration-200 border group ${
                          isVisible
                            ? colorInfo.bgClass
                            : "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <button
                          onClick={() => {
                            if (!isVisible) {
                              toggleRoute(r.id);
                            } else {
                              flyToRouteStart(r.id);
                            }
                          }}
                          className="flex-grow text-left text-[11px] font-bold tracking-tight truncate pr-2 select-text"
                          title="Clique para voar até o início da rota"
                        >
                          {routeTitle}
                        </button>
                        <button
                          onClick={() => toggleRoute(r.id)}
                          className={`p-1 rounded-lg transition-colors ${
                            isVisible
                              ? colorInfo.activeEyeClass
                              : "bg-white/5 hover:bg-white/10 text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {isVisible ? (
                            <Eye className="w-3.5 h-3.5" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                {routes.filter((r) => getRouteInfo(r.id).category === "paulo")
                  .length === 0 && (
                  <span className="text-[10px] text-slate-500 italic">
                    Nenhuma rota carregada
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
