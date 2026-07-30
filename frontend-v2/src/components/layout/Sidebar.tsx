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
  Search,
  Menu,
  X,
} from "lucide-react";
import { ToolId } from "@/store/useTheoStore";

interface SidebarProps {
  activeTool: ToolId;
  onSelectTool: (tool: ToolId) => void;
}

export function Sidebar({ activeTool, onSelectTool }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: "dashboard", label: "Home", icon: LayoutDashboard },
    { id: "library", label: "Biblioteca", icon: Library },
    { id: "atlas", label: "Atlas 3D", icon: MapIcon },
    { id: "factbook", label: "Factbook", icon: Sparkles },
    { id: "encyclopedia", label: "Enciclopedia", icon: ScrollText },
    { id: "exegesis", label: "Exegese", icon: BookOpen },
    { id: "settings", label: "Ajustes", icon: Settings },
  ];

  const handleSelectTool = useCallback(
    (tool: ToolId) => {
      onSelectTool(tool);
      setMobileOpen(false);
    },
    [onSelectTool],
  );

  // Close drawer on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [mobileOpen]);

  return (
    <>
      {/* ─── Mobile: Hamburger Button (fixed top-left) ─────────────────── */}
      <button
        className="fixed top-2.5 left-3 z-[70] md:hidden p-2 rounded-lg bg-gray-800/90 text-white backdrop-blur-sm shadow-lg"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      {/* ─── Mobile: Drawer Overlay ────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[80] md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer */}
          <nav className="relative w-64 h-full bg-[#E8EBF0] dark:bg-[#1E252B] shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                  TheoSphere
                </span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-300 dark:hover:bg-white/10 text-gray-500"
                aria-label="Fechar menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Nav Items (with labels) */}
            <div className="flex flex-col gap-1 p-3">
              {navItems.map((item) => {
                const isActive = activeTool === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTool(item.id as ToolId)}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-all duration-150 ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      )}

      {/* ─── Desktop: Icon sidebar (unchanged) ─────────────────────────── */}
      <aside className="hidden md:flex relative w-12 h-full bg-[#E8EBF0] dark:bg-[#1E252B] border-r border-gray-300 dark:border-black/20 flex-col items-center py-4 z-50">
        {/* Logos App Icon */}
        <div className="mb-6">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-grow flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = activeTool === item.id;
            const Icon = item.icon;
            return (
              <div key={item.id} className="relative group px-1">
                <button
                  onClick={() => onSelectTool(item.id as ToolId)}
                  className={`w-10 h-10 rounded flex items-center justify-center transition-all duration-200 relative ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-white/5"
                  }`}
                  title={item.label}
                >
                  <Icon className="w-5 h-5" />

                  {/* Active Indicator Dot (Left) */}
                  {isActive && (
                    <div className="absolute left-0 w-1 h-4 bg-white rounded-r-full" />
                  )}
                </button>

                {/* Tooltip */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100] shadow-xl">
                  {item.label}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User / Help — a engrenagem não tinha onClick (varredura 2026-07-29) */}
        <div className="mt-auto flex flex-col gap-2">
          <button
            onClick={() => handleSelectTool("settings")}
            title="Ajustes"
            aria-label="Ajustes"
            className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
              activeTool === "settings"
                ? "bg-blue-600 text-white"
                : "text-gray-500 hover:bg-gray-300 dark:hover:bg-white/5"
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
}
