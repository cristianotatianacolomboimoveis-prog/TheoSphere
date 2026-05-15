"use client";

import React from "react";
import { 
  LayoutDashboard, 
  Library, 
  Settings,
  Sparkles,
  Map as MapIcon,
  BookOpen,
  ScrollText,
  Search
} from "lucide-react";
import { ToolId } from "@/store/useTheoStore";

interface SidebarProps {
  activeTool: ToolId;
  onSelectTool: (tool: ToolId) => void;
}

export function Sidebar({ activeTool, onSelectTool }: SidebarProps) {
  const navItems = [
    { id: "dashboard", label: "Home", icon: LayoutDashboard },
    { id: "library", label: "Biblioteca", icon: Library },
    { id: "atlas", label: "Atlas 3D", icon: MapIcon },
    { id: "factbook", label: "Factbook", icon: Sparkles },
    { id: "encyclopedia", label: "Enciclopédia", icon: ScrollText },
    { id: "exegesis", label: "Exegese", icon: BookOpen },
    { id: "settings", label: "Ajustes", icon: Settings },
  ];

  return (
    <aside className="w-12 h-full bg-[#E8EBF0] dark:bg-[#1E252B] border-r border-gray-300 dark:border-black/20 flex flex-col items-center py-4 z-50">
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

      {/* User / Help */}
      <div className="mt-auto flex flex-col gap-2">
        <button className="w-8 h-8 rounded hover:bg-gray-300 dark:hover:bg-white/5 flex items-center justify-center text-gray-500">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
