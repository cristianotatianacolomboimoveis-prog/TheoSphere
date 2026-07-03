"use client";

import React, { useState } from "react";
import {
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getRouteColor, getRouteInfo } from "./routeUtils";

// Componente de lista de rotas por categoria
function RouteCategorySection({
  label,
  gradientClass,
  routes,
  visibleRouteIds,
  onToggleRoute,
  onFlyToRoute,
}: {
  label: string;
  gradientClass: string;
  routes: any[];
  visibleRouteIds: string[];
  onToggleRoute: (routeId: string) => void;
  onFlyToRoute: (routeId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <div className={gradientClass} />
        <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase">
          {label}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 pl-3">
        {routes.map((r) => {
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
                    onToggleRoute(r.id);
                  } else {
                    onFlyToRoute(r.id);
                  }
                }}
                className="flex-grow text-left text-[11px] font-bold tracking-tight truncate pr-2 select-text"
                title="Clique para voar até o início da rota"
              >
                {routeTitle}
              </button>
              <button
                onClick={() => onToggleRoute(r.id)}
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
        {routes.length === 0 && (
          <span className="text-[10px] text-slate-500 italic">
            Nenhuma rota carregada
          </span>
        )}
      </div>
    </div>
  );
}

interface RouteControlPanelProps {
  routes: any[];
  visibleRouteIds: string[];
  onToggleRoute: (routeId: string) => void;
  onShowAllRoutes: () => void;
  onClearAllRoutes: () => void;
  onFlyToRoute: (routeId: string) => void;
}

export default function RouteControlPanel({
  routes,
  visibleRouteIds,
  onToggleRoute,
  onShowAllRoutes,
  onClearAllRoutes,
  onFlyToRoute,
}: RouteControlPanelProps) {
  const [isLegendExpanded, setIsLegendExpanded] = useState(true);

  // Filtrar rotas por categoria
  const atRoutes = routes.filter((r) => getRouteInfo(r.id).category === "at");
  const jesusRoutes = routes.filter((r) => getRouteInfo(r.id).category === "jesus");
  const apostolosRoutes = routes.filter((r) => getRouteInfo(r.id).category === "apostolos");
  const pauloRoutes = routes.filter((r) => getRouteInfo(r.id).category === "paulo");

  return (
    <div
      className={`absolute top-6 right-6 z-10 bg-[#0d0e12]/95 backdrop-blur-md border border-white/10 shadow-2xl flex flex-col transition-all duration-300 select-none ${
        isLegendExpanded
          ? "w-[320px] rounded-[2rem] p-6 gap-5"
          : "w-[220px] rounded-full px-5 py-3 gap-0"
      }`}
    >
      {/* Cabecalho do Painel */}
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

      {/* Conteudo colapsavel */}
      {isLegendExpanded && (
        <div className="flex flex-col gap-5 animate-fadeIn">
          {/* Acoes rapidas */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-extrabold tracking-wider uppercase">
            <button
              onClick={onShowAllRoutes}
              className="py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 active:scale-95 rounded-xl text-white transition-all text-center flex items-center justify-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              Mostrar Todas
            </button>
            <button
              onClick={onClearAllRoutes}
              className="py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 active:scale-95 rounded-xl text-white transition-all text-center flex items-center justify-center gap-1.5"
            >
              <EyeOff className="w-3.5 h-3.5 text-rose-400" />
              Ocultar Todas
            </button>
          </div>

          {/* Legenda de referencia estatica */}
          <div className="flex flex-col gap-2.5 border-t border-b border-white/5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              <span className="text-[10px] font-bold text-slate-400 tracking-[0.05em] uppercase">
                Locais Históricos (Sempre Ativos)
              </span>
            </div>
          </div>

          {/* Antigo Testamento */}
          <RouteCategorySection
            label="Antigo Testamento (AT)"
            gradientClass="w-1.5 h-4 rounded-full bg-gradient-to-b from-[#ff2d55] via-[#f97316] to-[#10b981]"
            routes={atRoutes}
            visibleRouteIds={visibleRouteIds}
            onToggleRoute={onToggleRoute}
            onFlyToRoute={onFlyToRoute}
          />

          {/* Ministerio de Jesus */}
          <RouteCategorySection
            label="Ministério de Jesus"
            gradientClass="w-1.5 h-3 rounded-full bg-[#2dd4bf]"
            routes={jesusRoutes}
            visibleRouteIds={visibleRouteIds}
            onToggleRoute={onToggleRoute}
            onFlyToRoute={onFlyToRoute}
          />

          {/* Ministerio dos Apostolos */}
          <RouteCategorySection
            label="Ministério dos Apóstolos"
            gradientClass="w-1.5 h-3 rounded-full bg-[#6366f1]"
            routes={apostolosRoutes}
            visibleRouteIds={visibleRouteIds}
            onToggleRoute={onToggleRoute}
            onFlyToRoute={onFlyToRoute}
          />

          {/* Ministerio de Paulo */}
          <RouteCategorySection
            label="Ministério de Paulo"
            gradientClass="w-1.5 h-3 rounded-full bg-[#a855f7]"
            routes={pauloRoutes}
            visibleRouteIds={visibleRouteIds}
            onToggleRoute={onToggleRoute}
            onFlyToRoute={onFlyToRoute}
          />
        </div>
      )}
    </div>
  );
}
