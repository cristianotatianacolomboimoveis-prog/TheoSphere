"use client";

import React, { useState, useMemo } from "react";
import {
  Mountain,
  TrendingUp,
  MapPin,
  Clock,
  Footprints,
  ChevronDown,
  ChevronUp,
  Layers,
} from "lucide-react";
import { CanonicalRoute, CanonicalWaypoint } from "@/data/canonicalRoutes";
import { MapAdapter } from "@/lib/BibleMapAdapter";

interface ElevationProfileHUDProps {
  route: CanonicalRoute | null;
  currentStepIndex?: number;
  onSelectStep?: (index: number) => void;
}

/** Tabela canônica de elevação (em metros) para os principais sítios bíblicos */
const SITE_ELEVATIONS: Record<string, number> = {
  // Depressão do Jordão & Mar Morto
  jericó: -258,
  "mar morto": -430,
  "en-gedi": -390,
  "vau do jaboque": 120,
  "rio jordão": -220,
  gilgal: -240,

  // Mar da Galileia & Norte
  "mar da galileia": -214,
  cafarnaum: -210,
  magdala: -210,
  caná: 300,
  nazaré: 350,
  tiro: 10,
  sidom: 10,
  "cesareia de filipe": 350,
  "monte hermom": 2814,
  hazor: 230,
  dã: 180,

  // Montes Sagrados & Região Central
  jerusalém: 754,
  "monte das oliveiras": 826,
  "monte moriá": 740,
  "monte sião": 765,
  getsêmani: 710,
  gólgota: 750,
  betânia: 650,
  belém: 775,
  hebrom: 930,
  berseba: 275,
  siquém: 550,
  "monte gerizim": 881,
  "monte ebal": 940,
  siló: 690,
  betel: 860,
  gibeá: 840,
  "caverna de adulão": 340,
  gate: 140,
  ecrom: 75,
  asbode: 40,
  asquelom: 20,
  gaza: 35,
  "cesaréia marítima": 15,
  jope: 35,
  lida: 50,
  "monte carmelo": 525,
  "ribeiro de quirite": -150,

  // Sinai, Deserto e Transjordânia
  ramsés: 10,
  "mar vermelho": 0,
  "deserto de sur": 80,
  mara: 40,
  elim: 60,
  refidim: 800,
  "monte sinai": 2285,
  horebe: 2285,
  "cades-barnéia": 460,
  "monte hor": 1330,
  arade: 570,
  "monte nebo": 817,
  hesbom: 890,
  dibom: 850,
  ribla: 550,

  // Mesopotâmia & Mediterrâneo
  "ur dos caldeus": 10,
  babilônia: 35,
  susa: 70,
  nínive: 220,
  harã: 380,
  damasco: 680,
  antioquia: 67,
  perge: 50,
  "antioquia da pisídia": 1230,
  icônio: 1020,
  listra: 1150,
  derbe: 1015,
  trôade: 25,
  filipos: 120,
  tessalônica: 20,
  atenas: 156,
  areópago: 115,
  corinto: 60,
  éfeso: 15,
  mileto: 10,
  creta: 200,
  malta: 50,
  roma: 37,
};

/** Distância geodésica em km entre duas coordenadas [lat, lng] (Fórmula de Haversine) */
function getDistanceKm(
  coord1: [number, number],
  coord2: [number, number],
): number {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Descobre a altitude canônica aproximada para um waypoint */
function resolveElevation(wp: CanonicalWaypoint): number {
  const normalized = wp.title.toLowerCase();
  for (const [key, elevation] of Object.entries(SITE_ELEVATIONS)) {
    if (normalized.includes(key)) {
      return elevation;
    }
  }

  // Fallback baseado em coordenadas conhecidas do Oriente Médio
  const [lat, lng] = wp.coords;
  if (lng > 35.1 && lng < 35.6 && lat > 31.4 && lat < 31.8) {
    // Depressão do Mar Morto / Vale da Fenda
    return -250;
  }
  if (lng > 35.1 && lng < 35.3 && lat > 31.7 && lat < 31.9) {
    // Montanhas de Judá
    return 750;
  }
  return 150;
}

export function ElevationProfileHUD({
  route,
  currentStepIndex = 0,
  onSelectStep,
}: ElevationProfileHUDProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Calcula os pontos de elevação e distâncias acumuladas
  const profileData = useMemo(() => {
    if (!route || !route.waypoints || route.waypoints.length === 0) return null;

    let totalDist = 0;
    let minAlt = Infinity;
    let maxAlt = -Infinity;
    let elevationGain = 0;

    const points = route.waypoints.map((wp, idx) => {
      const elevation = resolveElevation(wp);
      minAlt = Math.min(minAlt, elevation);
      maxAlt = Math.max(maxAlt, elevation);

      if (idx > 0) {
        const prevWp = route.waypoints[idx - 1];
        const dist = getDistanceKm(prevWp.coords, wp.coords);
        totalDist += dist;

        const prevAlt = resolveElevation(prevWp);
        const diff = elevation - prevAlt;
        if (diff > 0) elevationGain += diff;
      }

      return {
        title: wp.title,
        coords: wp.coords,
        elevation,
        cumulativeDist: totalDist,
      };
    });

    // Média de marcha bíblica a pé na antiguidade: ~25 a 30 km/dia (terreno plano) ou ~15 a 20 km/dia (montanhoso)
    const travelDays = Math.max(1, Math.round(totalDist / 22));

    return {
      points,
      totalDist: Math.round(totalDist),
      elevationGain: Math.round(elevationGain),
      minAlt,
      maxAlt,
      travelDays,
    };
  }, [route]);

  if (!route || !profileData || profileData.points.length < 2) return null;

  const { points, totalDist, elevationGain, minAlt, maxAlt, travelDays } =
    profileData;
  const altRange = Math.max(100, maxAlt - minAlt);

  // Dimensões do SVG
  const width = 460;
  const height = 110;
  const paddingX = 30;
  const paddingY = 20;

  // Mapeia os waypoints para coordenadas de tela [x, y]
  const svgPoints = points.map((p, idx) => {
    const x =
      paddingX + (p.cumulativeDist / (totalDist || 1)) * (width - 2 * paddingX);
    // Inverte Y porque 0 no SVG é topo
    const normalizedY = (p.elevation - minAlt) / altRange;
    const y = height - paddingY - normalizedY * (height - 2 * paddingY);
    return { x, y, ...p, idx };
  });

  // Constrói o caminho SVG da linha do terreno
  const pathD = svgPoints.reduce((acc, curr, idx) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    return `${acc} L ${curr.x} ${curr.y}`;
  }, "");

  // Constrói a área preenchida abaixo do relevo
  const areaD = `${pathD} L ${svgPoints[svgPoints.length - 1].x} ${
    height - paddingY
  } L ${svgPoints[0].x} ${height - paddingY} Z`;

  const handlePointClick = (idx: number) => {
    if (onSelectStep) {
      onSelectStep(idx);
    } else {
      const wp = route.waypoints[idx];
      if (MapAdapter) {
        MapAdapter.flyTo(wp.coords[0], wp.coords[1], 10);
      }
    }
  };

  return (
    <div className="fixed bottom-20 left-5 z-30 select-none animate-fade-in font-sans">
      <div className="rounded-2xl bg-slate-950/85 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/60 overflow-hidden text-slate-100 transition-all duration-300 w-[340px] sm:w-[480px]">
        {/* Header Compacto com Toggle */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between px-3.5 py-2.5 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Mountain className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block leading-tight">
                Perfil Altimétrico do Terreno
              </span>
              <span className="text-[10px] text-slate-400">
                {route.title} • {totalDist} km
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              +{elevationGain}m
            </span>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </div>

        {/* Estatísticas Rápidas (Sempre Visíveis) */}
        <div className="grid grid-cols-3 gap-2 px-3 py-2 border-b border-white/5 text-[11px] bg-slate-900/40">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Footprints className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div>
              <span className="text-slate-500 text-[9px] block">Extensão</span>
              <span className="font-bold text-white">{totalDist} km</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <div>
              <span className="text-slate-500 text-[9px] block">Altitude</span>
              <span className="font-bold text-white">
                {minAlt}m a {maxAlt}m
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div>
              <span className="text-slate-500 text-[9px] block">
                Marcha Bíblica
              </span>
              <span className="font-bold text-white">~{travelDays} dias</span>
            </div>
          </div>
        </div>

        {/* Gráfico Altimétrico SVG Expansível */}
        {isExpanded && (
          <div className="p-3 bg-slate-950/70">
            <div className="relative">
              <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-auto overflow-visible"
              >
                <defs>
                  {/* Gradiente do terreno iluminado */}
                  <linearGradient
                    id="elevationGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#6366F1" stopOpacity="0.45" />
                    <stop
                      offset="100%"
                      stopColor="#6366F1"
                      stopOpacity="0.02"
                    />
                  </linearGradient>
                </defs>

                {/* Linha do Nível do Mar (0m) se aplicável */}
                {minAlt < 0 && maxAlt > 0 && (
                  <line
                    x1={paddingX}
                    x2={width - paddingX}
                    y1={
                      height -
                      paddingY -
                      ((0 - minAlt) / altRange) * (height - 2 * paddingY)
                    }
                    y2={
                      height -
                      paddingY -
                      ((0 - minAlt) / altRange) * (height - 2 * paddingY)
                    }
                    stroke="#06B6D4"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                    opacity="0.4"
                  />
                )}

                {/* Preenchimento de Área sob o Relevo */}
                <path d={areaD} fill="url(#elevationGrad)" />

                {/* Traço da Linha de Elevação do Terreno */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#818CF8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Pontos dos Waypoints */}
                {svgPoints.map((p) => {
                  const isCurrent = p.idx === currentStepIndex;
                  const isHovered = p.idx === hoveredIndex;

                  return (
                    <g
                      key={p.idx}
                      className="cursor-pointer transition-transform"
                      onClick={() => handlePointClick(p.idx)}
                      onMouseEnter={() => setHoveredIndex(p.idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isCurrent ? 6 : isHovered ? 5 : 3.5}
                        fill={
                          isCurrent
                            ? "#F59E0B"
                            : isHovered
                              ? "#38BDF8"
                              : "#A5B4FC"
                        }
                        stroke="#0F172A"
                        strokeWidth="1.5"
                      />
                      {isCurrent && (
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={10}
                          fill="none"
                          stroke="#F59E0B"
                          strokeWidth="1.5"
                          opacity="0.6"
                          className="animate-ping"
                        />
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Tooltip Dinâmico de Elevação no Hover */}
              {hoveredIndex !== null && svgPoints[hoveredIndex] && (
                <div
                  className="absolute -top-7 transform -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-900 border border-indigo-500/40 text-[10px] font-semibold text-white shadow-lg pointer-events-none whitespace-nowrap"
                  style={{
                    left: `${(svgPoints[hoveredIndex].x / width) * 100}%`,
                  }}
                >
                  {svgPoints[hoveredIndex].title}:{" "}
                  <span className="text-amber-300">
                    {svgPoints[hoveredIndex].elevation}m
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-[9px] text-slate-500 mt-2 px-1">
              <span>
                {points[0].title} ({minAlt}m)
              </span>
              <span className="text-indigo-400 font-medium">
                Clique nos pontos para mover a câmera 3D
              </span>
              <span>
                {points[points.length - 1].title} ({maxAlt}m)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
