"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  Viewer,
  Entity,
  PointGraphics,
  PolylineGraphics,
  EntityDescription,
  Cesium3DTileset,
} from "resium";
import * as Cesium from "cesium";
import { SEED_LOCATIONS } from "@/data/geoSeedData";
import { useTheoStore } from "@/store/useTheoStore";
import { api } from "@/lib/api";
import type { ArchaeologicalFind } from "@/hooks/useArchaeology";
import { logger } from "@/lib/logger";

// Set the base URL for Cesium assets
if (typeof window !== "undefined") {
  (window as any).CESIUM_BASE_URL = "/cesium";
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
        infoBox={true}
        terrainProvider={Cesium.createWorldTerrainAsync()}
      >
        {/* 3D Tiles: Jerusalem Photorealistic Model (Simulated Asset) */}
        <Cesium3DTileset url="https://assets.ion.cesium.com/us-east-1/69380/tileset.json" />

        {/* Locais Históricos Dinâmicos */}
        {activeLocations.map((loc) => (
          <Entity
            key={loc.id}
            position={Cesium.Cartesian3.fromDegrees(
              loc.coordinates[0],
              loc.coordinates[1],
              (loc.coordinates as any)[2] || 0,
            )}
            name={loc.names.pt}
          >
            <PointGraphics
              pixelSize={8}
              color={getCesiumColor(loc.type)}
              outlineColor={Cesium.Color.WHITE}
              outlineWidth={2}
            />
            <EntityDescription>
              <div className="p-2 bg-slate-900 text-white rounded-lg border border-border-strong">
                <h3 className="text-amber-400 font-bold border-b border-border-strong pb-1 mb-2">
                  {loc.names.pt}
                </h3>
                <p className="text-xs text-white/70 leading-relaxed mb-3">
                  {(loc as any).description ||
                    (loc as any).theologicalSignificance}
                </p>
                <div className="flex flex-wrap gap-1">
                  {loc.references.map((ref) => (
                    <span
                      key={ref}
                      className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded border border-border-subtle text-amber-500/80"
                    >
                      {ref}
                    </span>
                  ))}
                </div>
              </div>
            </EntityDescription>
          </Entity>
        ))}

        {/* Acervo Arqueológico — pins das descobertas */}
        {showArchaeology &&
          archFinds.map((find) => (
            <Entity
              key={`arch-${find.slug}`}
              position={Cesium.Cartesian3.fromDegrees(
                find.longitude as number,
                find.latitude as number,
                0,
              )}
              name={`🏺 ${find.namePt}`}
            >
              <PointGraphics
                pixelSize={9}
                color={Cesium.Color.fromCssColorString(
                  ARCH_COLORS[find.authenticity] ?? ARCH_COLORS.confirmada,
                )}
                outlineColor={Cesium.Color.WHITE}
                outlineWidth={2}
              />
              <EntityDescription>
                <div className="p-3 bg-slate-950/90 text-white rounded-xl border border-white/10 shadow-2xl min-w-[280px] backdrop-blur-xl">
                  <div className="flex items-center gap-2 border-b border-white/10 pb-2 mb-2">
                    <h4 className="text-sm font-bold text-white leading-none">
                      {find.namePt}
                    </h4>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 uppercase tracking-widest text-amber-400">
                      {find.authenticity}
                    </span>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed mb-2">
                    {find.description}
                  </p>
                  <p className="text-xs text-amber-200/90 italic mb-2">
                    {find.significance}
                  </p>
                  <div className="text-[10px] text-white/50 space-y-1 mb-2">
                    <div>
                      <strong className="text-white/70">Descoberta:</strong>{" "}
                      {find.discoverySite}
                      {find.discoveryYear ? ` (${find.discoveryYear})` : ""}
                    </div>
                    {find.currentLocation && (
                      <div>
                        <strong className="text-white/70">Acervo:</strong>{" "}
                        {find.currentLocation}
                      </div>
                    )}
                    {find.period && (
                      <div>
                        <strong className="text-white/70">Período:</strong>{" "}
                        {find.period}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {find.relatedRefs.map((ref) => (
                      <span
                        key={ref}
                        className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded border border-border-subtle text-amber-500/80"
                      >
                        {ref}
                      </span>
                    ))}
                  </div>
                </div>
              </EntityDescription>
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
                    position={position}
                    name={`${wp.step}: ${wp.title}`}
                  >
                    <PointGraphics
                      pixelSize={10}
                      color={cesiumColor}
                      outlineColor={Cesium.Color.WHITE}
                      outlineWidth={2}
                    />
                    <EntityDescription>
                      <div className="p-3 bg-slate-950/90 text-white rounded-xl border border-white/10 shadow-2xl min-w-[280px] backdrop-blur-xl">
                        <div className="flex items-center gap-2 border-b border-white/10 pb-2 mb-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 uppercase tracking-widest text-amber-400">
                            {wp.step}
                          </span>
                          <h4 className="text-sm font-bold text-white leading-none">
                            {wp.title}
                          </h4>
                        </div>
                        <p className="text-xs text-amber-200/90 italic mb-2 leading-relaxed">
                          &ldquo;{wp.quote}&rdquo;
                        </p>
                        <div className="text-[10px] text-white/50 space-y-1">
                          <div>
                            <strong className="text-white/70">
                              Escritura:
                            </strong>{" "}
                            {wp.verse}
                          </div>
                          <div>
                            <strong className="text-white/70">
                              Geografia:
                            </strong>{" "}
                            {wp.geo}
                          </div>
                          <div>
                            <strong className="text-white/70">
                              Arqueologia:
                            </strong>{" "}
                            {wp.arch}
                          </div>
                          {wp.modelName && (
                            <div>
                              <strong className="text-white/70">
                                Artefato 3D:
                              </strong>{" "}
                              {wp.modelName}
                            </div>
                          )}
                        </div>
                      </div>
                    </EntityDescription>
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
