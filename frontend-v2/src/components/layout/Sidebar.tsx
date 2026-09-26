"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  LayoutDashboard,
  Library,
  Settings,
  Sparkles,
  Map as MapIcon,
  BookOpen,
  ScrollText,
  Compass,
  FileText,
  Share2,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Globe,
  User,
  ShieldCheck,
} from "lucide-react";
import { ToolId } from "@/store/useTheoStore";
import { useAuth } from "@/hooks/useAuth";

interface SidebarProps {
  activeTool: ToolId;
  onSelectTool: (tool: ToolId) => void;
}

interface NavSection {
  title: string;
  items: {
    id: ToolId;
    label: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
    badge?: string;
    badgeColor?: "blue" | "amber" | "emerald" | "purple";
  }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "PRINCIPAL",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "study_mode", label: "Leitor Bíblico", icon: BookOpen },
    ],
  },
  {
    title: "EXEGESE & PESQUISA",
    items: [
      { id: "exegesis", label: "Bancada Tríplice", icon: Compass },
      { id: "factbook", label: "Factbook & Tópicos", icon: Sparkles },
      { id: "encyclopedia", label: "Enciclopédia", icon: ScrollText },
    ],
  },
  {
    title: "ACERVO & DADOS",
    items: [
      {
        id: "library",
        label: "Biblioteca Clássica",
        icon: Library,
        badge: "89 obras",
        badgeColor: "amber",
      },
      { id: "graph", label: "Grafo Teológico", icon: Share2 },
    ],
  },
  {
    title: "CARTOGRAFIA 3D",
    items: [
      {
        id: "atlas",
        label: "Atlas Bíblico 3D",
        icon: Globe,
        badge: "360°",
        badgeColor: "emerald",
      },
    ],
  },
  {
    title: "PESSOAL & SISTEMA",
    items: [
      { id: "notes", label: "Caderno de Notas", icon: FileText },
      { id: "settings", label: "Configurações", icon: Settings },
    ],
  },
];

export function Sidebar({ activeTool, onSelectTool }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isAuthenticated } = useAuth();

  const handleSelectTool = useCallback(
    (tool: ToolId) => {
      onSelectTool(tool);
      setMobileOpen(false);
    },
    [onSelectTool],
  );

  // Fecha o menu mobile com tecla ESC
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [mobileOpen]);

  const getBadgeStyle = (color?: string) => {
    switch (color) {
      case "amber":
        return "bg-amber-500/15 text-amber-400 border border-amber-500/30";
      case "emerald":
        return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
      case "purple":
        return "bg-purple-500/15 text-purple-400 border border-purple-500/30";
      case "blue":
      default:
        return "bg-blue-500/15 text-blue-400 border border-blue-500/30";
    }
  };

  return (
    <>
      {/* ─── Mobile: Botão Hamburger Flutuante ─────────────────────────── */}
      <button
        className="fixed top-2.5 left-3 z-[70] md:hidden p-2 rounded-xl bg-slate-900/90 text-white border border-white/10 backdrop-blur-md shadow-xl"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu size={18} />
      </button>

      {/* ─── Mobile: Drawer Retrátil ──────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[80] md:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
          />

          <nav className="relative w-72 h-full bg-[#090C12] border-r border-white/10 shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-200 flex flex-col justify-between">
            {/* Header Mobile */}
            <div>
              <div className="flex items-center justify-between p-4 border-b border-white/8">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/30">
                    <BookOpen className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white tracking-tight font-display block">
                      TheoSphere
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      SaaS Exegese
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  aria-label="Fechar menu"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Seções de Navegação Mobile */}
              <div className="p-3 space-y-5">
                {NAV_SECTIONS.map((sec) => (
                  <div key={sec.title} className="space-y-1">
                    <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase px-2 block mb-1">
                      {sec.title}
                    </span>
                    {sec.items.map((item) => {
                      const isActive = activeTool === item.id;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectTool(item.id)}
                          className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-left transition-all ${
                            isActive
                              ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25"
                              : "text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="text-xs">{item.label}</span>
                          </div>
                          {item.badge && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getBadgeStyle(
                                item.badgeColor,
                              )}`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Mobile */}
            <div className="p-4 border-t border-white/8 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                  {isAuthenticated ? "P" : "V"}
                </div>
                <div className="overflow-hidden">
                  <span className="text-xs font-bold text-white block truncate">
                    {isAuthenticated ? "Pesquisador" : "Modo Visitante"}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {isAuthenticated ? "Sessão Ativa" : "Exploração Livre"}
                  </span>
                </div>
              </div>
            </div>
          </nav>
        </div>
      )}

      {/* ─── Desktop: Sidebar Kenlo Imob Dark Tech SaaS ────────────────── */}
      <aside
        className={`hidden md:flex relative h-full bg-[#080B11] border-r border-white/8 flex-col justify-between transition-all duration-300 z-50 select-none ${
          isCollapsed ? "w-18" : "w-64"
        }`}
      >
        {/* Topo: Logo & Branding */}
        <div>
          <div
            className={`flex items-center h-14 border-b border-white/8 px-4 ${
              isCollapsed ? "justify-center" : "justify-between"
            }`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-600/25 shrink-0 border border-white/10">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black tracking-tight text-white font-display">
                      TheoSphere
                    </span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      SaaS
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium block truncate">
                    Bancada Exegética
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Navegação Vertical Segmentada estilo Kenlo CRM */}
          <nav className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-140px)] custom-scrollbar">
            {NAV_SECTIONS.map((sec) => (
              <div key={sec.title} className="space-y-1">
                {!isCollapsed && (
                  <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase px-2.5 block mb-1">
                    {sec.title}
                  </span>
                )}
                {sec.items.map((item) => {
                  const isActive = activeTool === item.id;
                  const Icon = item.icon;
                  return (
                    <div key={item.id} className="relative group">
                      <button
                        onClick={() => onSelectTool(item.id)}
                        className={`flex items-center w-full rounded-xl transition-all duration-150 ${
                          isCollapsed
                            ? "h-11 justify-center px-0"
                            : "px-3 py-2 justify-between"
                        } ${
                          isActive
                            ? "bg-blue-600/15 border border-blue-500/30 text-white font-semibold shadow-sm"
                            : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] font-medium"
                        }`}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <div
                          className={`flex items-center gap-3 ${
                            isCollapsed ? "justify-center" : ""
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              isActive
                                ? "text-blue-400"
                                : "text-slate-400 group-hover:text-slate-200"
                            }`}
                          />
                          {!isCollapsed && (
                            <span className="text-xs truncate">
                              {item.label}
                            </span>
                          )}
                        </div>

                        {/* Indicador de Rota Ativa (borda esquerda iluminada) */}
                        {isActive && isCollapsed && (
                          <div className="absolute left-0 w-1 h-5 bg-blue-500 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                        )}

                        {!isCollapsed && item.badge && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getBadgeStyle(
                              item.badgeColor,
                            )}`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>

                      {/* Tooltip flutuante quando colapsado */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900 border border-white/10 text-white text-xs font-semibold rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100] flex items-center gap-2">
                          <span>{item.label}</span>
                          {item.badge && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getBadgeStyle(
                                item.badgeColor,
                              )}`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Rodapé: Mini Card de Perfil & Alternador de Recolhimento */}
        <div className="p-3 border-t border-white/8 bg-white/[0.01]">
          <div
            className={`flex items-center ${
              isCollapsed ? "justify-center flex-col gap-2" : "justify-between"
            }`}
          >
            {/* Usuário / Status */}
            <div
              className={`flex items-center gap-2.5 overflow-hidden ${
                isCollapsed ? "justify-center" : ""
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md">
                {isAuthenticated ? "P" : "V"}
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <span className="text-xs font-bold text-white block truncate">
                    {isAuthenticated ? "Pesquisador" : "Modo Visitante"}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {isAuthenticated ? "Sessão Ativa" : "Exploração Livre"}
                  </span>
                </div>
              )}
            </div>

            {/* Botão de Recolher / Expandir */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title={
                isCollapsed
                  ? "Expandir barra lateral"
                  : "Recolher barra lateral"
              }
              aria-label={
                isCollapsed
                  ? "Expandir barra lateral"
                  : "Recolher barra lateral"
              }
            >
              {isCollapsed ? (
                <ChevronRight size={16} />
              ) : (
                <ChevronLeft size={16} />
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
