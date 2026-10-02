"use client";

import React from "react";
import { Eye, EyeOff, ChevronDown, ChevronUp, X, Compass } from "lucide-react";
import { getRouteColor, getRouteInfo, ROUTE_CATEGORIES } from "./routeConfig";

interface RouteControlPanelProps {
  routes: any[];
  visibleRouteIds: string[];
  isLegendExpanded: boolean;
  onToggleLegend: () => void;
  onToggleRoute: (routeId: string) => void;
  onFlyToRouteStart: (routeId: string) => void;
  onShowAll: () => void;
  onClearAll: () => void;
}

/** Linha individual de rota com toggle de visibilidade */
function RouteItem({
  route,
  isVisible,
  onToggle,
  onFlyTo,
}: {
  route: any;
  isVisible: boolean;
  onToggle: () => void;
  onFlyTo: () => void;
}) {
  const { routeTitle } = getRouteInfo(route.id);
  const colorInfo = getRouteColor(route.id);

  return (
    <div
      className={`flex items-center justify-between p-2 rounded-xl transition-all duration-200 border group ${
        isVisible
          ? colorInfo.bgClass
          : "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10 text-slate-400 hover:text-slate-200"
      }`}
    >
      <button
        onClick={() => (isVisible ? onFlyTo() : onToggle())}
        className="flex-grow text-left text-[11px] font-bold tracking-tight truncate pr-2 select-text"
        title="Clique para voar até o início da rota"
      >
        {routeTitle}
      </button>
      <button
        onClick={onToggle}
        className={`p-1 rounded-lg transition-colors ${
          isVisible
            ? colorInfo.activeEyeClass
            : "bg-white/5 hover:bg-white/10 text-slate-500 hover:text-slate-300"
        }`}
      >
        {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

/** Seção de uma categoria de rotas (AT, Jesus, Apóstolos, Paulo) */
function RouteCategorySection({
  category,
  label,
  gradient,
  height,
  routes,
  visibleRouteIds,
  onToggleRoute,
  onFlyToRouteStart,
}: {
  category: string;
  label: string;
  gradient: string;
  height: string;
  routes: any[];
  visibleRouteIds: string[];
  onToggleRoute: (routeId: string) => void;
  onFlyToRouteStart: (routeId: string) => void;
}) {
  const filtered = routes.filter((r) => getRouteInfo(r.id).category === category);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <div className={`w-1.5 ${height} rounded-full ${gradient}`} />
        <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase">
          {label}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 pl-3">
        {filtered.length > 0 ? (
          filtered.map((r) => (
            <RouteItem
              key={r.id}
              route={r}
              isVisible={visibleRouteIds.includes(r.id)}
              onToggle={() => onToggleRoute(r.id)}
              onFlyTo={() => onFlyToRouteStart(r.id)}
            />
          ))
        ) : (
          <span className="text-[10px] text-slate-500 italic">
            Nenhuma rota carregada
          </span>
        )}
      </div>
    </div>
  );
}

export function RouteControlPanel({
  routes,
  visibleRouteIds,
  isLegendExpanded,
  onToggleLegend,
  onToggleRoute,
  onFlyToRouteStart,
  onShowAll,
  onClearAll,
}: RouteControlPanelProps) {
  return (
    <div
      className={`absolute top-5 right-5 z-20 bg-[#0d0e12]/95 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col transition-all duration-300 select-none ${
        isLegendExpanded
          ? "w-[290px] max-h-[calc(100vh-210px)] rounded-2xl p-4 gap-3 border-white/20"
          : "w-auto rounded-full px-4 py-2 hover:bg-[#151822] cursor-pointer"
      }`}
    >
      {/* Panel Header */}
      <div
        className="flex items-center justify-between gap-3 cursor-pointer"
        onClick={onToggleLegend}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <span className="text-[11px] font-black text-white tracking-[0.1em] uppercase">
            {isLegendExpanded ? "Rotas Bíblicas" : "Rotas & Locais"}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-white/10 text-emerald-400 font-mono">
            {routes.length}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLegend();
          }}
          className="p-1 hover:bg-white/15 rounded-md transition-colors text-slate-400 hover:text-white"
          title={isLegendExpanded ? "Recolher painel" : "Expandir rotas"}
        >
          {isLegendExpanded ? (
            <X className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Collapsible Content com scroll restrito para nunca sobrepor timeline */}
      {isLegendExpanded && (
        <div className="flex flex-col gap-3.5 overflow-y-auto custom-scrollbar pr-1 animate-fadeIn">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-1.5 text-[9px] font-extrabold tracking-wider uppercase">
            <button
              onClick={onShowAll}
              className="py-1.5 px-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 active:scale-95 rounded-lg text-white transition-all text-center flex items-center justify-center gap-1"
            >
              <Eye className="w-3 h-3 text-emerald-400" />
              Mostrar Todas
            </button>
            <button
              onClick={onClearAll}
              className="py-1.5 px-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 active:scale-95 rounded-lg text-white transition-all text-center flex items-center justify-center gap-1"
            >
              <EyeOff className="w-3 h-3 text-rose-400" />
              Ocultar Todas
            </button>
          </div>

          {/* Static Legend */}
          <div className="flex items-center gap-2 px-1 py-1.5 border-t border-b border-white/5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.5)] flex-shrink-0" />
            <span className="text-[9px] font-bold text-slate-400 tracking-[0.05em] uppercase truncate">
              Locais Históricos (Ativos)
            </span>
          </div>

          {/* Category Sections */}
          {ROUTE_CATEGORIES.map((cat) => (
            <RouteCategorySection
              key={cat.category}
              category={cat.category}
              label={cat.label}
              gradient={cat.gradient}
              height={cat.height}
              routes={routes}
              visibleRouteIds={visibleRouteIds}
              onToggleRoute={onToggleRoute}
              onFlyToRouteStart={onFlyToRouteStart}
            />
          ))}
        </div>
      )}
    </div>
  );
}
