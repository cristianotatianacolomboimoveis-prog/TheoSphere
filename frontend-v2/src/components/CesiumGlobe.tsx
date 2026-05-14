"use client";

import React, { useMemo } from "react";
import { Viewer, Entity, PointGraphics, EntityDescription, Cesium3DTileset } from "resium";
import * as Cesium from "cesium";
import { SEED_LOCATIONS } from "@/data/geoSeedData";
import { useTheoStore } from "@/store/useTheoStore";

// Set the base URL for Cesium assets
if (typeof window !== "undefined") {
  (window as any).CESIUM_BASE_URL = "/cesium";
}

/* ─── Color map for categories ───────────────────────────── */

function getCesiumColor(category: string): Cesium.Color {
  switch (category) {
    case "city":     return Cesium.Color.fromCssColorString("#f59e0b");
    case "mountain": return Cesium.Color.fromCssColorString("#10b981");
    case "river":    return Cesium.Color.fromCssColorString("#3b82f6");
    case "region":   return Cesium.Color.fromCssColorString("#8b5cf6");
    case "temple":   return Cesium.Color.fromCssColorString("#ef4444");
    case "sea":      return Cesium.Color.fromCssColorString("#06b6d4");
    case "desert":   return Cesium.Color.fromCssColorString("#eab308");
    default:         return Cesium.Color.fromCssColorString("#f59e0b");
  }
}

export default function CesiumGlobe() {
  const currentTime = useTheoStore(state => state.currentTime);

  // Filtro Temporal 4D: Apenas locais ativos no ano selecionado
  const activeLocations = useMemo(() => {
    return SEED_LOCATIONS.filter((loc: any) => {
      const start = loc.period_start ?? loc.timeline?.start_year ?? -4000;
      const end = loc.period_end ?? loc.timeline?.end_year ?? 2100;
      return currentTime >= start && currentTime <= end;
    });
  }, [currentTime]);

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
        <Cesium3DTileset 
          url="https://assets.ion.cesium.com/us-east-1/69380/tileset.json" 
        />

        {activeLocations.map((loc) => (
          <Entity
            key={loc.id}
            position={Cesium.Cartesian3.fromDegrees(loc.coordinates[0], loc.coordinates[1], (loc.coordinates as any)[2] || 0)}
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
                <h3 className="text-amber-400 font-bold border-b border-border-strong pb-1 mb-2">{loc.names.pt}</h3>
                <p className="text-xs text-white/70 leading-relaxed mb-3">
                  {(loc as any).description || (loc as any).theologicalSignificance}
                </p>
                <div className="flex flex-wrap gap-1">
                  {loc.references.map(ref => (
                    <span key={ref} className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded border border-border-subtle text-amber-500/80">
                      {ref}
                    </span>
                  ))}
                </div>
              </div>
            </EntityDescription>
          </Entity>
        ))}
      </Viewer>
    </div>
  );
}
