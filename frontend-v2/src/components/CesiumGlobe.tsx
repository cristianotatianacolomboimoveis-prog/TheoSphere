"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import type * as CesiumType from "cesium";
import { SEED_LOCATIONS } from "@/data/geoSeedData";
import { useTheoStore } from "@/store/useTheoStore";
import { api } from "@/lib/api";
import type { ArchaeologicalFind } from "@/hooks/useArchaeology";
import { logger } from "@/lib/logger";
import { MapAdapter } from "@/lib/BibleMapAdapter";

interface CesiumGlobeProps {
  visibleRouteIds?: string[];
  routes?: any[];
  showArchaeology?: boolean;
}

const ARCH_COLORS: Record<string, string> = {
  confirmada: "#f43f5e",
  debatida: "#f59e0b",
  disputada: "#94a3b8",
};

const HISTORICAL_SITE_IMAGES: Record<string, string> = {
  "monte-sinai":
    "https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=1200&q=80",
  jerusalem:
    "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=1200&q=80",
  babilonia:
    "https://images.unsplash.com/photo-1608958416629-106ab0e5c9b7?auto=format&fit=crop&w=1200&q=80",
  belem:
    "https://images.unsplash.com/photo-1547124220-405bbfd84f5c?auto=format&fit=crop&w=1200&q=80",
  "rio-jordao":
    "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80",
  roma: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80",
};

function getCategoryColorHex(category: string): string {
  switch (category) {
    case "city":
      return "#f59e0b";
    case "mountain":
      return "#10b981";
    case "river":
      return "#3b82f6";
    case "region":
      return "#8b5cf6";
    case "temple":
      return "#ef4444";
    case "sea":
      return "#06b6d4";
    case "desert":
      return "#eab308";
    default:
      return "#f59e0b";
  }
}

function getRouteColor(routeId: string): string {
  switch (routeId) {
    case "abraao":
      return "#f59e0b";
    case "exodo":
      return "#ef4444";
    case "terra_prometida":
      return "#10b981";
    case "jesus_galileia":
      return "#3b82f6";
    case "paulo":
      return "#8b5cf6";
    case "paulo_roma":
      return "#ec4899";
    default:
      return "#38bdf8";
  }
}

function configureCesiumScene(v: any) {
  if (!v || !v.scene) return;
  const ssc = v.scene.screenSpaceCameraController;
  if (ssc) {
    ssc.minimumZoomDistance = 350;
    ssc.maximumZoomDistance = 35000000;
    ssc.enableCollisionDetection = true;
  }
}

/**
 * Garante carregamento assíncrono dos scripts e CSS estáticos do Cesium
 * diretamente da pasta /cesium sem passar pelo bundler/transpiler.
 */
function loadCesiumScripts(): Promise<typeof CesiumType> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      return reject(new Error("Window not defined"));
    }
    const win = window as any;
    if (win.Cesium) {
      return resolve(win.Cesium);
    }

    win.CESIUM_BASE_URL = "/cesium";
    if (process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN) {
      win.CESIUM_ION_TOKEN = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
    }

    // Carrega CSS se ainda não estiver presente
    if (!document.getElementById("cesium-widgets-css")) {
      const link = document.createElement("link");
      link.id = "cesium-widgets-css";
      link.rel = "stylesheet";
      link.href = "/cesium/Widgets/widgets.css";
      document.head.appendChild(link);
    }

    // Carrega JS
    const existingScript = document.getElementById("cesium-js-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(win.Cesium));
      existingScript.addEventListener("error", (e) => reject(e));
      return;
    }

    const script = document.createElement("script");
    script.id = "cesium-js-script";
    script.src = "/cesium/Cesium.js";
    script.async = true;
    script.onload = () => {
      if (win.Cesium) {
        if (process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN) {
          win.Cesium.Ion.defaultAccessToken =
            process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
        }
        resolve(win.Cesium);
      } else {
        reject(new Error("Cesium global not found after load"));
      }
    };
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
}

export default function CesiumGlobe({
  visibleRouteIds = [],
  routes = [],
  showArchaeology = true,
}: CesiumGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [isCesiumReady, setIsCesiumReady] = useState(false);
  const currentTime = useTheoStore((state) => state.currentTime);
  const [routePaths, setRoutePaths] = useState<
    Record<string, [number, number][]>
  >({});
  const [loadingRoutes, setLoadingRoutes] = useState<Record<string, boolean>>(
    {},
  );
  const [archFinds, setArchFinds] = useState<ArchaeologicalFind[]>([]);

  // 1. Carregar Cesium estático
  useEffect(() => {
    let mounted = true;
    loadCesiumScripts()
      .then(() => {
        if (mounted) setIsCesiumReady(true);
      })
      .catch((err) => {
        logger.error("[CesiumGlobe] Falha ao carregar script do Cesium:", err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Carregar achados arqueológicos
  useEffect(() => {
    if (!showArchaeology) return;
    let cancelled = false;
    api
      .get<{ success: boolean; data: ArchaeologicalFind[] }>(
        "/geo/archaeology",
        { throwOnError: false },
      )
      .then((res) => {
        if (!cancelled && res?.data && Array.isArray(res.data)) {
          setArchFinds(res.data);
        }
      })
      .catch((err) => {
        logger.warn("[CesiumGlobe] Falha ao carregar arqueologia:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [showArchaeology]);

  // 3. Inicializar Cesium.Viewer nativo
  useEffect(() => {
    if (!isCesiumReady || !containerRef.current) return;
    const Cesium = (window as any).Cesium as typeof CesiumType;
    if (!Cesium) return;

    // Provedor de satélite de alta definição ESRI World Imagery
    // maximumLevel: 16 garante que o Cesium faça upsampling contínuo em montanhas/desertos
    // em vez de requisitar tiles inexistentes da ESRI que devolvem "Map data not yet available".
    const imageryProvider = new Cesium.UrlTemplateImageryProvider({
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      maximumLevel: 16,
      enablePickFeatures: false,
      hasAlphaChannel: false,
    });

    const baseImageryLayer = new Cesium.ImageryLayer(imageryProvider);
    baseImageryLayer.errorEvent.addEventListener((err) => {
      logger.warn("[CesiumGlobe] Falha de tile tratada silenciosamente:", err);
    });

    let terrainProvider: any;
    try {
      terrainProvider = new Cesium.EllipsoidTerrainProvider();
    } catch {
      terrainProvider = undefined;
    }

    const viewer = new Cesium.Viewer(containerRef.current, {
      timeline: false,
      animation: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      infoBox: false,
      baseLayer: false, // Evita camada default do Bing/Ion com marcas d'água
      terrainProvider,
    });

    // Adiciona explicitamente a camada de satélite real de alta definição
    viewer.imageryLayers.removeAll();
    viewer.imageryLayers.add(baseImageryLayer);

    configureCesiumScene(viewer);
    viewerRef.current = viewer;

    // Posição inicial da câmera sobre a Terra Santa (Jerusalém e Oriente Médio Bíblico)
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(35.2137, 31.7683, 1400000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0.0,
      },
    });

    // Escuta cliques em entidades
    const removeSelectionListener =
      viewer.selectedEntityChanged.addEventListener((entity?: any) => {
        if (!entity) return;

        const props = entity.properties;
        const getVal = (propName: string) => {
          if (!props) return undefined;
          try {
            const p = props[propName];
            return p && typeof p.getValue === "function"
              ? p.getValue(Cesium.JulianDate.now())
              : p;
          } catch {
            return undefined;
          }
        };

        const name = getVal("name") || entity.name || "Local Bíblico";
        const step = getVal("step");
        const quote = getVal("quote");
        const verse = getVal("verse");
        const description = getVal("description");
        const geo = getVal("geo");
        const arch = getVal("arch");
        const modelName = getVal("modelName");
        const category = getVal("category") || "biblical_site";
        const era = getVal("era");
        const lat = getVal("lat");
        const lng = getVal("lng");
        const img =
          getVal("img") ||
          (entity.id ? HISTORICAL_SITE_IMAGES[entity.id] : undefined) ||
          (category === "archaeological_site"
            ? "https://images.unsplash.com/photo-1609198092458-38a293c7ac4b?auto=format&fit=crop&w=1200&q=80"
            : undefined);

        if (MapAdapter) {
          MapAdapter.events.publish("onLocationSelected", {
            id: entity.id,
            name,
            step,
            quote,
            verse,
            description,
            geo,
            arch,
            modelName,
            category,
            era,
            lat,
            lng,
            img,
          });
        }
      });

    // Escuta comandos de seleção de localização para flyTo
    const unsubLocation = MapAdapter
      ? MapAdapter.events.subscribe("onLocationSelected", (evt: any) => {
          if (evt?.lat != null && evt?.lng != null) {
            try {
              const altitude =
                evt.altitude || (evt.category === "mountain" ? 2800 : 2000);
              viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(
                  evt.lng,
                  evt.lat,
                  altitude,
                ),
                orientation: {
                  heading: Cesium.Math.toRadians(20),
                  pitch: Cesium.Math.toRadians(-22),
                  roll: 0.0,
                },
                duration: 2.2,
              });
            } catch (e) {
              logger.warn("[CesiumGlobe] Erro no flyTo de entidade:", e);
            }
          }
        })
      : () => {};

    // Órbita 360° e controles de câmera
    let isOrbiting = false;
    let removeTickListener: (() => void) | undefined;

    const stopOrbit = () => {
      if (isOrbiting) {
        isOrbiting = false;
        removeTickListener?.();
        removeTickListener = undefined;
        MapAdapter?.events.publish("cameraCommand", { action: "orbitStopped" });
      }
    };

    const startOrbit360Tour = () => {
      if (isOrbiting) {
        stopOrbit();
        return;
      }

      isOrbiting = true;
      let accumulatedDegrees = 0;
      let lastTimestamp = performance.now();
      const targetDegrees = 360;
      const baseSpeed = 22;

      removeTickListener = viewer.clock.onTick.addEventListener(() => {
        const now = performance.now();
        const deltaSeconds = Math.min((now - lastTimestamp) / 1000, 0.1);
        lastTimestamp = now;

        let currentSpeed = baseSpeed;
        if (accumulatedDegrees < 25) {
          currentSpeed = Math.max(4, baseSpeed * (accumulatedDegrees / 25));
        } else if (accumulatedDegrees > 315) {
          const remaining = targetDegrees - accumulatedDegrees;
          currentSpeed = Math.max(3, baseSpeed * (remaining / 45));
        }

        let stepDegrees = currentSpeed * deltaSeconds;
        if (accumulatedDegrees + stepDegrees >= targetDegrees) {
          stepDegrees = targetDegrees - accumulatedDegrees;
          accumulatedDegrees = targetDegrees;
        } else {
          accumulatedDegrees += stepDegrees;
        }

        viewer.camera.rotate(
          Cesium.Cartesian3.UNIT_Z,
          Cesium.Math.toRadians(stepDegrees),
        );

        if (accumulatedDegrees >= targetDegrees) {
          stopOrbit();
        }
      });
    };

    const unsubCamera = MapAdapter
      ? MapAdapter.events.subscribe("cameraCommand", (cmd: any) => {
          if (!cmd) return;
          if (cmd.action === "toggleOrbit") {
            startOrbit360Tour();
          } else if (cmd.action === "stopOrbit") {
            stopOrbit();
          } else if (cmd.action === "ground") {
            stopOrbit();
            try {
              const currentCarto = Cesium.Cartographic.fromCartesian(
                viewer.camera.position,
              );
              const lng =
                cmd.lng != null
                  ? cmd.lng
                  : Cesium.Math.toDegrees(currentCarto.longitude);
              const lat =
                cmd.lat != null
                  ? cmd.lat
                  : Cesium.Math.toDegrees(currentCarto.latitude);
              const alt = cmd.altitude || 1800;
              viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(lng, lat, alt),
                orientation: {
                  heading: Cesium.Math.toRadians(15),
                  pitch: Cesium.Math.toRadians(-18),
                  roll: 0.0,
                },
                duration: 1.8,
              });
            } catch (err) {
              logger.warn("[CesiumGlobe] Erro no comando ground:", err);
            }
          } else if (cmd.action === "aerial") {
            stopOrbit();
            try {
              const currentCarto = Cesium.Cartographic.fromCartesian(
                viewer.camera.position,
              );
              const lng =
                cmd.lng != null
                  ? cmd.lng
                  : Cesium.Math.toDegrees(currentCarto.longitude);
              const lat =
                cmd.lat != null
                  ? cmd.lat
                  : Cesium.Math.toDegrees(currentCarto.latitude);
              viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(lng, lat, 25000),
                orientation: {
                  heading: 0,
                  pitch: Cesium.Math.toRadians(-45),
                  roll: 0.0,
                },
                duration: 2.0,
              });
            } catch (err) {
              logger.warn("[CesiumGlobe] Erro no comando aerial:", err);
            }
          }
        })
      : () => {};

    // Parar órbita ao interagir manualmente com a tela
    const dragHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    dragHandler.setInputAction(() => {
      if (isOrbiting) stopOrbit();
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
    dragHandler.setInputAction(() => {
      if (isOrbiting) stopOrbit();
    }, Cesium.ScreenSpaceEventType.RIGHT_DOWN);
    dragHandler.setInputAction(() => {
      if (isOrbiting) stopOrbit();
    }, Cesium.ScreenSpaceEventType.MIDDLE_DOWN);
    dragHandler.setInputAction(() => {
      if (isOrbiting) stopOrbit();
    }, Cesium.ScreenSpaceEventType.WHEEL);

    // Cursor pointer ao passar mouse por entidades
    const pointerHandler = new Cesium.ScreenSpaceEventHandler(
      viewer.scene.canvas,
    );
    pointerHandler.setInputAction(
      (movement: { endPosition: any }) => {
        try {
          const picked = viewer.scene.pick(movement.endPosition);
          if (Cesium.defined(picked) && picked?.id instanceof Cesium.Entity) {
            viewer.canvas.style.cursor = "pointer";
          } else {
            viewer.canvas.style.cursor = "default";
          }
        } catch {
          viewer.canvas.style.cursor = "default";
        }
      },
      Cesium.ScreenSpaceEventType.MOUSE_MOVE,
    );

    return () => {
      removeTickListener?.();
      dragHandler.destroy();
      pointerHandler.destroy();
      removeSelectionListener();
      unsubLocation();
      unsubCamera();
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [isCesiumReady]);

  // 4. Carregar trajetórias de rotas via backend Valhalla
  useEffect(() => {
    visibleRouteIds.forEach(async (routeId) => {
      if (routePaths[routeId] || loadingRoutes[routeId]) return;

      const routeObj = routes.find((r) => r.id === routeId);
      if (!routeObj || !routeObj.waypoints || routeObj.waypoints.length < 2)
        return;

      setLoadingRoutes((prev) => ({ ...prev, [routeId]: true }));

      try {
        const allSegments: [number, number][] = [];

        for (let i = 0; i < routeObj.waypoints.length - 1; i++) {
          const start = routeObj.waypoints[i].coords;
          const end = routeObj.waypoints[i + 1].coords;

          if (!start || !end) continue;

          try {
            const data = await api.get<{
              success: boolean;
              coordinates?: [number, number][];
            }>(
              `/geo/route-path?startLat=${start[0]}&startLng=${start[1]}&endLat=${end[0]}&endLng=${end[1]}&costing=pedestrian`,
              { throwOnError: false },
            );

            if (data && data.success && data.coordinates) {
              allSegments.push(...data.coordinates);
            } else {
              allSegments.push([start[0], start[1]], [end[0], end[1]]);
            }
          } catch {
            allSegments.push([start[0], start[1]], [end[0], end[1]]);
          }
        }

        setRoutePaths((prev) => ({ ...prev, [routeId]: allSegments }));
      } catch (err) {
        logger.error(`Error loading path for route ${routeId}:`, err);
      } finally {
        setLoadingRoutes((prev) => ({ ...prev, [routeId]: false }));
      }
    });
  }, [visibleRouteIds, routes, routePaths, loadingRoutes]);

  // 5. Atualizar entidades no viewer quando locations, rotas ou tempo mudarem
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const Cesium = (window as any).Cesium as typeof CesiumType;
    if (!Cesium) return;

    // Limpar entidades anteriores
    viewer.entities.removeAll();

    // Locais Históricos 4D
    const activeLocations = SEED_LOCATIONS.filter((loc: any) => {
      const start = loc.period_start ?? loc.timeline?.start_year ?? -4000;
      const end = loc.period_end ?? loc.timeline?.end_year ?? 2100;
      return currentTime >= start && currentTime <= end;
    });

    for (const loc of activeLocations) {
      viewer.entities.add({
        id: loc.id,
        position: Cesium.Cartesian3.fromDegrees(
          loc.coordinates[0],
          loc.coordinates[1],
          (loc.coordinates as any)[2] || 0,
        ),
        name: loc.names.pt,
        properties: new Cesium.PropertyBag({
          name: loc.names.pt,
          category: loc.type,
          description:
            (loc as any).description || (loc as any).theologicalSignificance,
          verse: loc.references?.[0] || "",
          quote: (loc as any).theologicalSignificance || "",
          lat: loc.coordinates[1],
          lng: loc.coordinates[0],
        }),
        point: {
          pixelSize: 8,
          color: Cesium.Color.fromCssColorString(getCategoryColorHex(loc.type)),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
        },
        label: {
          text: loc.names.pt,
          font: "12px Inter, system-ui, sans-serif",
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -14),
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
            0,
            3500000,
          ),
        },
      });
    }

    // Achados Arqueológicos
    if (showArchaeology) {
      for (const find of archFinds) {
        viewer.entities.add({
          id: `arch-${find.slug}`,
          position: Cesium.Cartesian3.fromDegrees(
            find.longitude as number,
            find.latitude as number,
            0,
          ),
          name: `🏺 ${find.namePt}`,
          properties: new Cesium.PropertyBag({
            name: find.namePt,
            category: "archaeological_site",
            description: find.description,
            arch: `${find.discoverySite} (${find.discoveryYear ? find.discoveryYear : "antigo"}) • ${find.authenticity}`,
            verse: find.relatedRefs?.[0] || "",
            quote: find.significance,
            lat: find.latitude,
            lng: find.longitude,
          }),
          point: {
            pixelSize: 9,
            color: Cesium.Color.fromCssColorString(
              ARCH_COLORS[find.authenticity] ?? ARCH_COLORS.confirmada,
            ),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
          },
          label: {
            text: find.namePt,
            font: "11px Inter, system-ui, sans-serif",
            fillColor: Cesium.Color.fromCssColorString("#fed7aa"),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -14),
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
              0,
              2500000,
            ),
          },
        });
      }
    }

    // Rotas Bíblicas
    for (const routeId of visibleRouteIds) {
      const routeObj = routes.find((r) => r.id === routeId);
      if (!routeObj) continue;

      const colorHex = getRouteColor(routeId);
      const cesiumColor = Cesium.Color.fromCssColorString(colorHex);
      const path = routePaths[routeId];

      // Linha com brilho neon
      if (path && path.length >= 2) {
        viewer.entities.add({
          name: routeObj.title,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray(
              path.flatMap(([lat, lng]) => [lng, lat]),
            ),
            width: 6,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.35,
              color: cesiumColor,
            }),
          },
        });
      }

      // Waypoints
      if (routeObj.waypoints) {
        routeObj.waypoints.forEach((wp: any, idx: number) => {
          viewer.entities.add({
            id: `${routeId}-wp-${idx}`,
            position: Cesium.Cartesian3.fromDegrees(
              wp.coords[1],
              wp.coords[0],
              0,
            ),
            name: `${wp.step}: ${wp.title}`,
            properties: new Cesium.PropertyBag({
              name: wp.title,
              step: wp.step,
              quote: wp.quote,
              verse: wp.verse,
              geo: wp.geo,
              arch: wp.arch,
              modelName: wp.modelName,
              category: "waypoint",
              lat: wp.coords[0],
              lng: wp.coords[1],
              img: wp.img,
            }),
            point: {
              pixelSize: 10,
              color: cesiumColor,
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
            },
            label: {
              text: `${wp.step}: ${wp.title}`,
              font: "bold 12px Inter, system-ui, sans-serif",
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, -16),
              horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
                0,
                4000000,
              ),
            },
          });
        });
      }
    }
  }, [
    isCesiumReady,
    currentTime,
    showArchaeology,
    archFinds,
    visibleRouteIds,
    routes,
    routePaths,
  ]);

  return (
    <div className="w-full h-full absolute inset-0 bg-[#090C12]">
      <div ref={containerRef} className="w-full h-full" />
      {!isCesiumReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-xs z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-xs text-slate-300 font-medium tracking-wide">
              Carregando motor cartográfico Cesium 3D...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
