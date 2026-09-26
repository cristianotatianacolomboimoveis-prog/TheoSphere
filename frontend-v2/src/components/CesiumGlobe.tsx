"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  Viewer,
  Entity,
  PointGraphics,
  PolylineGraphics,
  LabelGraphics,
  useCesium,
} from "resium";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { SEED_LOCATIONS } from "@/data/geoSeedData";
import { useTheoStore } from "@/store/useTheoStore";
import { api } from "@/lib/api";
import type { ArchaeologicalFind } from "@/hooks/useArchaeology";
import { logger } from "@/lib/logger";
import { MapAdapter } from "@/lib/BibleMapAdapter";

// Set the base URL for Cesium assets and configure Ion token if provided
if (typeof window !== "undefined") {
  (window as any).CESIUM_BASE_URL = "/cesium";
  if (process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN) {
    Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
  }
}

/* ─── Color map for categories ───────────────────────────── */

function getCesiumColor(category: string): Cesium.Color {
  switch (category) {
    case "city":
      return Cesium.Color.fromCssColorString("#f59e0b");
    case "mountain":
      return Cesium.Color.fromCssColorString("#10b981");
    case "river":
      return Cesium.Color.fromCssColorString("#3b82f6");
    case "region":
      return Cesium.Color.fromCssColorString("#8b5cf6");
    case "temple":
      return Cesium.Color.fromCssColorString("#ef4444");
    case "sea":
      return Cesium.Color.fromCssColorString("#06b6d4");
    case "desert":
      return Cesium.Color.fromCssColorString("#eab308");
    default:
      return Cesium.Color.fromCssColorString("#f59e0b");
  }
}

function getRouteColor(routeId: string): string {
  switch (routeId) {
    case "abraao":
      return "#f59e0b"; // amber
    case "exodo":
      return "#ef4444"; // red
    case "terra_prometida":
      return "#10b981"; // emerald
    case "jesus_galileia":
      return "#3b82f6"; // blue
    case "paulo":
      return "#8b5cf6"; // purple
    case "paulo_roma":
      return "#ec4899"; // pink
    default:
      return "#38bdf8"; // sky
  }
}

interface CesiumGlobeProps {
  visibleRouteIds?: string[];
  routes?: any[];
  /** Exibe a camada do acervo arqueológico (pins no globo). */
  showArchaeology?: boolean;
}

/** Cores dos pins de arqueologia por status de autenticidade. */
const ARCH_COLORS: Record<string, string> = {
  confirmada: "#f43f5e", // rose
  debatida: "#f59e0b", // amber
  disputada: "#94a3b8", // slate
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

function configureCesiumScene(v: any) {
  if (!v || !v.scene) return;
  const ssc = v.scene.screenSpaceCameraController;
  if (ssc) {
    ssc.minimumZoomDistance = 120;
    ssc.maximumZoomDistance = 35000000;
    ssc.enableCollisionDetection = true;
  }
}

function CesiumEventsBridge() {
  const { viewer } = useCesium();

  useEffect(() => {
    if (!viewer) return;

    // Configurações anti-distorção de zoom e perspectiva do Cesium
    configureCesiumScene(viewer);

    // Escuta seleção de entidades no Cesium Viewer (cliques no globo 3D)
    const removeSelectionListener =
      viewer.selectedEntityChanged.addEventListener(
        (entity?: Cesium.Entity) => {
          if (!entity) return;

          const props = entity.properties;
          const getVal = (propName: string) => {
            if (!props) return undefined;
            try {
              const p = (props as any)[propName];
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
        },
      );

    // Escuta comandos de voo do MapAdapter (MCP e UI) — perspectiva de solo rente ao relevo
    const unsubLocation = MapAdapter
      ? MapAdapter.events.subscribe("onLocationSelected", (evt: any) => {
          if (evt?.lat != null && evt?.lng != null) {
            try {
              // Altitude cinematográfica rente ao solo para visualizar as montanhas contra o horizonte
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

    // Comandos avançados de câmera: Órbita 360°, Perspectiva de Solo e Vista Orbital
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
      const baseSpeed = 22; // ~22 graus/segundo (duração total: ~18 segundos)

      removeTickListener = viewer.clock.onTick.addEventListener(() => {
        const now = performance.now();
        const deltaSeconds = Math.min((now - lastTimestamp) / 1000, 0.1);
        lastTimestamp = now;

        // Curva cinematográfica: Aceleração inicial suave (Ease-In) e desaceleração final (Ease-Out)
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
          } else if (cmd.action === "ground" && cmd.lat && cmd.lng) {
            stopOrbit();
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(
                cmd.lng,
                cmd.lat,
                1800,
              ),
              orientation: {
                heading: Cesium.Math.toRadians(15),
                pitch: Cesium.Math.toRadians(-18),
                roll: 0.0,
              },
              duration: 1.8,
            });
          } else if (cmd.action === "aerial" && cmd.lat && cmd.lng) {
            stopOrbit();
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(
                cmd.lng,
                cmd.lat,
                25000,
              ),
              orientation: {
                heading: 0,
                pitch: Cesium.Math.toRadians(-45),
                roll: 0.0,
              },
              duration: 2.0,
            });
          }
        })
      : () => {};

    // Se o usuário arrastar ou der zoom no mapa manualmente, interrompe a rotação
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

    // Cursor pointer ao passar o mouse por cima de entidades (idêntico ao 2.5D)
    const pointerHandler = new Cesium.ScreenSpaceEventHandler(
      viewer.scene.canvas,
    );
    pointerHandler.setInputAction(
      (movement: { endPosition: Cesium.Cartesian2 }) => {
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
    };
  }, [viewer]);

  return null;
}

export default function CesiumGlobe({
  visibleRouteIds = [],
  routes = [],
  showArchaeology = true,
}: CesiumGlobeProps) {
  const currentTime = useTheoStore((state) => state.currentTime);
  const [routePaths, setRoutePaths] = useState<
    Record<string, [number, number][]>
  >({});
  const [loadingRoutes, setLoadingRoutes] = useState<Record<string, boolean>>(
    {},
  );
  const [archFinds, setArchFinds] = useState<ArchaeologicalFind[]>([]);

  // Suprimir erros e avisos do Cesium Ion no Next.js DevTools overlay
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reasonStr = String(event.reason?.message || event.reason || "");
      if (
        event.reason?.statusCode === 401 ||
        reasonStr.includes("401") ||
        reasonStr.includes("Request has failed")
      ) {
        event.preventDefault();
        logger.warn(
          "[CesiumGlobe] Suprimida rejeição 401 do Cesium:",
          event.reason,
        );
      }
    };

    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const err = args[0];
      const msg =
        typeof err === "string" ? err : err?.message || err?.toString?.() || "";
      if (
        msg.includes("ImageryLayer") ||
        msg.includes("Request has failed") ||
        err?.name === "RequestErrorEvent" ||
        (typeof err === "object" && err !== null && "statusCode" in err)
      ) {
        logger.warn(
          "[CesiumGlobe] Silenciado erro interno do Cesium:",
          ...args,
        );
        return;
      }
      originalConsoleError.apply(console, args);
    };

    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
      console.error = originalConsoleError;
    };
  }, []);

  // Camada de satélite de alta precisão submétrica ESRI World Imagery (resolução nativa até nível 19 com interpolação linear suave)
  const imageryProvider = useMemo(() => {
    return new Cesium.UrlTemplateImageryProvider({
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      maximumLevel: 19,
      enablePickFeatures: false,
    });
  }, []);

  const baseImageryLayer = useMemo(() => {
    const layer = new Cesium.ImageryLayer(imageryProvider);
    layer.errorEvent.addEventListener((err) => {
      logger.warn("[CesiumGlobe] Falha de tile tratada silenciosamente:", err);
    });
    return layer;
  }, [imageryProvider]);

  const terrainProvider = useMemo(() => {
    return new Cesium.EllipsoidTerrainProvider();
  }, []);

  // Camada de arqueologia: carrega o acervo (uma vez) para plotar no globo
  useEffect(() => {
    if (!showArchaeology) return;
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
            json.data.items.filter(
              (f) => f.latitude != null && f.longitude != null,
            ),
          );
        }
      } catch {
        // rede/abort — camada simplesmente não aparece
      }
    })();
    return () => controller.abort();
  }, [showArchaeology]);

  // Filtro Temporal 4D: Apenas locais ativos no ano selecionado
  const activeLocations = useMemo(() => {
    return SEED_LOCATIONS.filter((loc: any) => {
      const start = loc.period_start ?? loc.timeline?.start_year ?? -4000;
      const end = loc.period_end ?? loc.timeline?.end_year ?? 2100;
      return currentTime >= start && currentTime <= end;
    });
  }, [currentTime]);

  // Carregar trajetórias de rotas dinamicamente via Valhalla do backend
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

  return (
    <div className="w-full h-full absolute inset-0">
      <Viewer
        full
        timeline={false}
        animation={false}
        baseLayerPicker={false}
        geocoder={false}
        homeButton={false}
        sceneModePicker={false}
        navigationHelpButton={false}
        infoBox={false}
        baseLayer={baseImageryLayer}
        terrainProvider={terrainProvider}
      >
        <CesiumEventsBridge />

        {/* Locais Históricos Dinâmicos */}
        {activeLocations.map((loc) => (
          <Entity
            key={loc.id}
            id={loc.id}
            position={Cesium.Cartesian3.fromDegrees(
              loc.coordinates[0],
              loc.coordinates[1],
              (loc.coordinates as any)[2] || 0,
            )}
            name={loc.names.pt}
            properties={
              new Cesium.PropertyBag({
                name: loc.names.pt,
                category: loc.type,
                description:
                  (loc as any).description ||
                  (loc as any).theologicalSignificance,
                verse: loc.references?.[0] || "",
                quote: (loc as any).theologicalSignificance || "",
                lat: loc.coordinates[1],
                lng: loc.coordinates[0],
              })
            }
          >
            <PointGraphics
              pixelSize={8}
              color={getCesiumColor(loc.type)}
              outlineColor={Cesium.Color.WHITE}
              outlineWidth={2}
            />
            <LabelGraphics
              text={loc.names.pt}
              font="12px Inter, system-ui, sans-serif"
              fillColor={Cesium.Color.WHITE}
              outlineColor={Cesium.Color.BLACK}
              outlineWidth={2}
              style={Cesium.LabelStyle.FILL_AND_OUTLINE}
              pixelOffset={new Cesium.Cartesian2(0, -14)}
              horizontalOrigin={Cesium.HorizontalOrigin.CENTER}
              verticalOrigin={Cesium.VerticalOrigin.BOTTOM}
              distanceDisplayCondition={
                new Cesium.DistanceDisplayCondition(0, 3500000)
              }
            />
          </Entity>
        ))}

        {/* Acervo Arqueológico — pins das descobertas */}
        {showArchaeology &&
          archFinds.map((find) => (
            <Entity
              key={`arch-${find.slug}`}
              id={`arch-${find.slug}`}
              position={Cesium.Cartesian3.fromDegrees(
                find.longitude as number,
                find.latitude as number,
                0,
              )}
              name={`🏺 ${find.namePt}`}
              properties={
                new Cesium.PropertyBag({
                  name: find.namePt,
                  category: "archaeological_site",
                  description: find.description,
                  arch: `${find.discoverySite} (${find.discoveryYear ? find.discoveryYear : "antigo"}) • ${find.authenticity}`,
                  verse: find.relatedRefs?.[0] || "",
                  quote: find.significance,
                  lat: find.latitude,
                  lng: find.longitude,
                })
              }
            >
              <PointGraphics
                pixelSize={9}
                color={Cesium.Color.fromCssColorString(
                  ARCH_COLORS[find.authenticity] ?? ARCH_COLORS.confirmada,
                )}
                outlineColor={Cesium.Color.WHITE}
                outlineWidth={2}
              />
              <LabelGraphics
                text={find.namePt}
                font="11px Inter, system-ui, sans-serif"
                fillColor={Cesium.Color.fromCssColorString("#fed7aa")}
                outlineColor={Cesium.Color.BLACK}
                outlineWidth={2}
                style={Cesium.LabelStyle.FILL_AND_OUTLINE}
                pixelOffset={new Cesium.Cartesian2(0, -14)}
                horizontalOrigin={Cesium.HorizontalOrigin.CENTER}
                verticalOrigin={Cesium.VerticalOrigin.BOTTOM}
                distanceDisplayCondition={
                  new Cesium.DistanceDisplayCondition(0, 2500000)
                }
              />
            </Entity>
          ))}

        {/* Rotas Teológicas Dinâmicas do Valhalla */}
        {visibleRouteIds.map((routeId) => {
          const routeObj = routes.find((r) => r.id === routeId);
          if (!routeObj) return null;

          const colorHex = getRouteColor(routeId);
          const cesiumColor = Cesium.Color.fromCssColorString(colorHex);
          const path = routePaths[routeId];

          return (
            <React.Fragment key={routeId}>
              {/* Desenhar Caminho com Efeito Neon */}
              {path && path.length >= 2 && (
                <Entity name={routeObj.title}>
                  <PolylineGraphics
                    positions={Cesium.Cartesian3.fromDegreesArray(
                      path.flatMap(([lat, lng]) => [lng, lat]),
                    )}
                    width={6}
                    material={
                      new Cesium.PolylineGlowMaterialProperty({
                        glowPower: 0.35,
                        color: cesiumColor,
                      })
                    }
                  />
                </Entity>
              )}

              {/* Desenhar Waypoints */}
              {routeObj.waypoints.map((wp: any, idx: number) => {
                const position = Cesium.Cartesian3.fromDegrees(
                  wp.coords[1], // longitude
                  wp.coords[0], // latitude
                  0,
                );

                return (
                  <Entity
                    key={`${routeId}-wp-${idx}`}
                    id={`${routeId}-wp-${idx}`}
                    position={position}
                    name={`${wp.step}: ${wp.title}`}
                    properties={
                      new Cesium.PropertyBag({
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
                      })
                    }
                  >
                    <PointGraphics
                      pixelSize={10}
                      color={cesiumColor}
                      outlineColor={Cesium.Color.WHITE}
                      outlineWidth={2}
                    />
                    <LabelGraphics
                      text={`${wp.step}: ${wp.title}`}
                      font="bold 12px Inter, system-ui, sans-serif"
                      fillColor={Cesium.Color.WHITE}
                      outlineColor={Cesium.Color.BLACK}
                      outlineWidth={2}
                      style={Cesium.LabelStyle.FILL_AND_OUTLINE}
                      pixelOffset={new Cesium.Cartesian2(0, -16)}
                      horizontalOrigin={Cesium.HorizontalOrigin.CENTER}
                      verticalOrigin={Cesium.VerticalOrigin.BOTTOM}
                      distanceDisplayCondition={
                        new Cesium.DistanceDisplayCondition(0, 4000000)
                      }
                    />
                  </Entity>
                );
              })}
            </React.Fragment>
          );
        })}
      </Viewer>
    </div>
  );
}
