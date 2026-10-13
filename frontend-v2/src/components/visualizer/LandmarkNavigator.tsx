"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  MapPin,
  Search,
  X,
  Compass,
  Mountain,
  Landmark,
  Waves,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  CANONICAL_LANDMARKS,
  CanonicalLandmark,
} from "@/data/canonicalRoutes";
import { MapAdapter } from "@/lib/BibleMapAdapter";
import { useTheoStore } from "@/store/useTheoStore";

interface LandmarkNavigatorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLandmark?: (landmark: CanonicalLandmark) => void;
}

export function LandmarkNavigator({
  isOpen,
  onClose,
  onSelectLandmark,
}: LandmarkNavigatorProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const { setCurrentTime } = useTheoStore();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  // Fechar com Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const filteredLandmarks = useMemo(() => {
    return CANONICAL_LANDMARKS.filter((item) => {
      const matchesCat =
        selectedCategory === "all" || item.category === selectedCategory;
      const q = query.toLowerCase().trim();
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.verse.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.geo.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [query, selectedCategory]);

  const handleChoose = (landmark: CanonicalLandmark) => {
    const [lat, lng] = landmark.coords;

    // Sincroniza a era histórica na linha do tempo
    if (landmark.era !== undefined) {
      setCurrentTime(landmark.era);
    }

    const eventPayload = {
      id: landmark.id,
      name: landmark.name,
      step: "Marco Geográfico Canônico",
      category: landmark.category,
      verse: landmark.verse,
      quote: landmark.quote,
      description: landmark.description,
      geo: landmark.geo,
      arch: landmark.arch,
      img: landmark.img,
      lat,
      lng,
      altitude: landmark.altitude,
      era: landmark.era,
    };

    if (MapAdapter) {
      // 1. Abre a Ficha de Campo
      MapAdapter.events.publish("onLocationSelected", eventPayload);

      // 2. Dispara o voo da câmera com perspectiva e altitude cinematográfica
      MapAdapter.events.publish("cameraCommand", {
        action: "ground",
        lat,
        lng,
        altitude: landmark.altitude,
      });

      // 3. Fallback flyTo para o motor 2.5D
      if (typeof MapAdapter.flyTo === "function") {
        MapAdapter.flyTo(lat, lng, 11);
      }
    }

    onSelectLandmark?.(landmark);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-md animate-in fade-in-0 duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl glass-heavy rounded-2xl border border-white/15 shadow-2xl overflow-hidden flex flex-col text-slate-200 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho com Campo de Busca */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-white/[0.02]">
          <Search className="w-5 h-5 text-indigo-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar marcos bíblicos (ex: Monte Sinai, Jerusalém, Mar da Galileia, Babilônia)..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors ml-1"
            title="Fechar (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Categorias / Filtros Rápidos */}
        <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs bg-slate-950/40">
          {[
            { id: "all", label: "Todos os Marcos" },
            { id: "city", label: "Cidades & Povos" },
            { id: "mountain", label: "Montes Sagrados" },
            { id: "water", label: "Mares & Rios" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {cat.label}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-slate-400 font-medium hidden sm:inline whitespace-nowrap">
            {filteredLandmarks.length} marco(s)
          </span>
        </div>

        {/* Lista de Resultados com Scroll Suave */}
        <div className="max-h-[380px] overflow-y-auto custom-scrollbar p-2 space-y-1">
          {filteredLandmarks.length > 0 ? (
            filteredLandmarks.map((item) => (
              <div
                key={item.id}
                onClick={() => handleChoose(item)}
                className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-white/[0.08] active:scale-[0.99] transition-all cursor-pointer group border border-transparent hover:border-white/10"
              >
                {/* Imagem / Thumbnail */}
                <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-slate-900 border border-white/10 shadow-sm">
                  <img
                    src={item.img}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-1 right-1 text-[10px]">
                    {item.category === "mountain" && "⛰️"}
                    {item.category === "city" && "🏛️"}
                    {item.category === "water" && "🌊"}
                  </div>
                </div>

                {/* Detalhes do Local */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                      {item.name}
                    </h4>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 whitespace-nowrap">
                      {item.era < 0 ? `${Math.abs(item.era)} a.C.` : `${item.era} d.C.`}
                    </span>
                  </div>

                  <p className="text-xs text-indigo-400/90 font-medium truncate mt-0.5">
                    📜 {item.verse}
                  </p>

                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {item.description}
                  </p>
                </div>

                {/* Ação de Voo */}
                <div className="flex items-center gap-1 text-slate-500 group-hover:text-indigo-400 transition-colors flex-shrink-0">
                  <span className="text-[11px] font-bold hidden sm:inline">Voar</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 px-4 text-slate-400">
              <Compass className="w-8 h-8 mx-auto text-slate-600 mb-2 animate-spin" style={{ animationDuration: "12s" }} />
              <p className="text-sm font-semibold text-slate-300">Nenhum marco bíblico encontrado para "{query}"</p>
              <p className="text-xs text-slate-500 mt-1">
                Tente buscar por "Sinai", "Jerusalém", "Cafarnaum", "Galileia" ou "Babilônia".
              </p>
            </div>
          )}
        </div>

        {/* Rodapé Informativo */}
        <div className="p-3 bg-black/40 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Voo cinematográfico em relevo 3D de alta definição</span>
          </div>
          <span className="hidden sm:inline text-slate-500 font-mono">Dica: Pressione Esc para fechar</span>
        </div>
      </div>
    </div>
  );
}
