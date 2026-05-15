"use client";

import { Search, Bell, Settings, Command, User } from "lucide-react";
import { motion } from "framer-motion";

export function CommandBar() {
  return (
    <header className="h-16 w-full border-b border-white/5 bg-surface/40 backdrop-blur-3xl px-6 flex items-center justify-between z-50">
      {/* Universal Search Box */}
      <div className="flex-grow max-w-2xl relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-white/40 group-focus-within:text-primary transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Search Scripture, Theology, Commentary..."
          className="w-full h-10 bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
        />
        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-black text-white/40">
            <Command className="w-2.5 h-2.5" /> K
          </div>
        </div>
      </div>

      {/* Action Icons */}
      <div className="flex items-center gap-4 ml-8">
        <button className="p-2.5 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-all relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-[#0B1120]" />
        </button>
        <button className="p-2.5 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-all">
          <Settings className="w-5 h-5" />
        </button>
        
        <div className="h-8 w-px bg-white/5 mx-2" />

        <button className="flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-amber-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg">
            AD
          </div>
          <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">Alex D.</span>
        </button>
      </div>
    </header>
  );
}
