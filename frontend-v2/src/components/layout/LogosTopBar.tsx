"use client";

import React from "react";
import { 
  Search, 
  Library, 
  Layout, 
  Settings, 
  User, 
  Bell, 
  ChevronDown, 
  Menu,
  BookOpen,
  Sparkles,
  Command
} from "lucide-react";

export function LogosTopBar() {
  return (
    <div className="h-10 bg-[#E8EBF0] dark:bg-[#1E252B] border-b border-gray-300 dark:border-black/20 flex items-center px-4 gap-4 z-[60]">
      {/* Logos Icon / Menu */}
      <button className="p-1 hover:bg-gray-300 dark:hover:bg-white/5 rounded transition-colors">
        <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      {/* Command Box (Central Focus of Logos) */}
      <div className="flex-grow max-w-2xl relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <Command className="w-3.5 h-3.5 text-gray-400" />
        </div>
        <input 
            type="text" 
            placeholder="Ir para Gênesis 1:1, Pesquisar 'Justificação'..."
            className="w-full h-7 pl-10 pr-4 bg-white dark:bg-[#0D1117] border border-gray-300 dark:border-white/10 rounded text-[12px] focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-400 outline-none"
        />
        <button className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-gray-100 dark:bg-white/5 text-[10px] font-bold text-gray-500 rounded border border-gray-200 dark:border-white/10">
            IR
        </button>
      </div>

      {/* Tools Icons */}
      <div className="flex items-center gap-1">
        <TopBarButton icon={Library} label="Biblioteca" />
        <TopBarButton icon={Search} label="Busca" />
        <TopBarButton icon={Sparkles} label="Factbook" />
        <div className="w-px h-4 bg-gray-300 dark:bg-white/10 mx-2" />
        <TopBarButton icon={Layout} label="Layouts" />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button className="p-1.5 hover:bg-gray-300 dark:hover:bg-white/5 rounded">
            <Bell className="w-4 h-4 text-gray-500" />
        </button>
        <button className="p-1.5 hover:bg-gray-300 dark:hover:bg-white/5 rounded flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-[10px] text-white font-bold">A</div>
            <ChevronDown className="w-3 h-3 text-gray-500" />
        </button>
      </div>
    </div>
  );
}

function TopBarButton({ icon: Icon, label }: { icon: any, label: string }) {
  return (
    <button className="flex items-center gap-2 px-3 py-1 hover:bg-gray-300 dark:hover:bg-white/5 rounded transition-colors group">
      <Icon className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" />
      <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">{label}</span>
    </button>
  );
}
