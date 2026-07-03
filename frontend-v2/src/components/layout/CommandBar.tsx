"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Search,
  LayoutDashboard,
  Library,
  Map as MapIcon,
  Sparkles,
  ScrollText,
  BookOpen,
  Settings,
  BookMarked,
  Languages,
  PenTool,
  GraduationCap,
  StickyNote,
  Globe,
  Terminal,
  GitBranch,
  MessageSquare,
  Command,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ToolId } from "@/store/useTheoStore";

interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  action: () => void;
  keywords: string[];
}

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (tool: ToolId) => void;
}

export function CommandBar({ isOpen, onClose, onSelectTool }: CommandBarProps) {
  const [query, setQueryRaw] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Wrapper que reseta seleção ao mudar query (evita useEffect + setState)
  const setQuery = useCallback((value: string | ((prev: string) => string)) => {
    setQueryRaw(value);
    setSelectedIndex(0);
  }, []);

  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: "dashboard",
        label: "Home",
        description: "Tela inicial do TheoSphere",
        icon: LayoutDashboard,
        action: () => onSelectTool("dashboard"),
        keywords: ["home", "inicio", "dashboard", "principal"],
      },
      {
        id: "exegesis",
        label: "Exegese",
        description: "Analise critica e interlinear da Escritura",
        icon: BookOpen,
        action: () => onSelectTool("exegesis"),
        keywords: ["exegese", "exegesis", "interlinear", "critica", "analise"],
      },
      {
        id: "guide",
        label: "Guia de Passagem",
        description: "Comentarios e referencias cruzadas",
        icon: BookMarked,
        action: () => onSelectTool("guide"),
        keywords: ["guia", "passagem", "comentario", "referencia"],
      },
      {
        id: "word",
        label: "Estudo de Palavras",
        description: "Analise lexical e Strong's",
        icon: Languages,
        action: () => onSelectTool("word"),
        keywords: ["palavra", "lexical", "strong", "hebraico", "grego", "word"],
      },
      {
        id: "factbook",
        label: "Factbook",
        description: "Fatos biblicos, pessoas, lugares e eventos",
        icon: Sparkles,
        action: () => onSelectTool("factbook"),
        keywords: ["factbook", "fatos", "pessoas", "lugares", "eventos"],
      },
      {
        id: "encyclopedia",
        label: "Enciclopedia",
        description: "Enciclopedia teologica completa",
        icon: ScrollText,
        action: () => onSelectTool("encyclopedia"),
        keywords: ["enciclopedia", "encyclopedia", "teologia", "verbete"],
      },
      {
        id: "library",
        label: "Biblioteca Teologica",
        description: "Acervo de obras e comentarios",
        icon: Library,
        action: () => onSelectTool("library"),
        keywords: ["biblioteca", "livros", "obras", "acervo", "library"],
      },
      {
        id: "atlas",
        label: "Atlas 3D",
        description: "Mapa interativo do mundo biblico",
        icon: MapIcon,
        action: () => onSelectTool("atlas"),
        keywords: ["atlas", "mapa", "3d", "geografia", "terra santa"],
      },
      {
        id: "graph",
        label: "Grafo Teologico",
        description: "Rede de conexoes entre conceitos",
        icon: GitBranch,
        action: () => onSelectTool("graph"),
        keywords: ["grafo", "graph", "rede", "conexoes", "relacoes"],
      },
      {
        id: "sermon",
        label: "Construtor de Sermoes",
        description: "Monte sermoes com apoio de IA",
        icon: PenTool,
        action: () => onSelectTool("sermon"),
        keywords: ["sermao", "pregacao", "homiletica", "sermon"],
      },
      {
        id: "study",
        label: "Construtor de Estudos",
        description: "Crie estudos biblicos estruturados",
        icon: GraduationCap,
        action: () => onSelectTool("study"),
        keywords: ["estudo", "estudo biblico", "licao", "study"],
      },
      {
        id: "notes",
        label: "Notas",
        description: "Editor de anotacoes pessoais",
        icon: StickyNote,
        action: () => onSelectTool("notes"),
        keywords: ["notas", "anotacoes", "notes", "caderno"],
      },
      {
        id: "study_mode",
        label: "Modo Estudo",
        description: "Workspace de estudo com multiplos paineis",
        icon: Globe,
        action: () => onSelectTool("study_mode"),
        keywords: ["modo", "estudo", "workspace", "paineis"],
      },
      {
        id: "console",
        label: "Console Agentico",
        description: "Terminal de comandos com IA",
        icon: Terminal,
        action: () => onSelectTool("console"),
        keywords: ["console", "terminal", "comando", "agentico", "ia"],
      },
      {
        id: "ai",
        label: "Chat com IA",
        description: "Assistente teologico inteligente",
        icon: MessageSquare,
        action: () => onSelectTool("ai"),
        keywords: ["chat", "ia", "assistente", "inteligencia", "ai"],
      },
      {
        id: "settings",
        label: "Configuracoes",
        description: "Ajustes do aplicativo",
        icon: Settings,
        action: () => onSelectTool("settings"),
        keywords: ["configuracoes", "ajustes", "settings", "preferencias"],
      },
    ],
    [onSelectTool],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase().trim();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.keywords.some((k) => k.includes(q)),
    );
  }, [query, commands]);

  // Focus e reset quando o modal abre
  useEffect(() => {
    if (isOpen) {
      // Small delay to let the modal render
      requestAnimationFrame(() => {
        setQueryRaw("");
        setSelectedIndex(0);
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.children[selectedIndex] as HTMLElement;
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const executeItem = useCallback(
    (item: CommandItem) => {
      item.action();
      onClose();
    },
    [onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filtered.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filtered.length - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (filtered[selectedIndex]) {
            executeItem(filtered[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filtered, selectedIndex, executeItem, onClose],
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-lg mx-4 bg-[#1A1F2E] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
            onKeyDown={handleKeyDown}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
              <Search className="w-5 h-5 text-white/40 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar ferramenta ou acao..."
                className="flex-grow bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
              />
              <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-bold text-white/40">
                ESC
              </kbd>
            </div>

            {/* Results List */}
            <div
              ref={listRef}
              className="max-h-[50vh] overflow-y-auto py-2 px-2"
            >
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-white/30">
                  Nenhum resultado encontrado
                </div>
              ) : (
                filtered.map((item, index) => {
                  const Icon = item.icon;
                  const isSelected = index === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={() => executeItem(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isSelected
                          ? "bg-blue-600/20 text-white"
                          : "text-white/70 hover:bg-white/5"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-blue-600/30 text-blue-400"
                            : "bg-white/5 text-white/40"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="text-sm font-medium truncate">
                          {item.label}
                        </div>
                        <div className="text-xs text-white/30 truncate">
                          {item.description}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-4 px-4 py-2.5 border-t border-white/10 text-[10px] text-white/30">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 font-bold">
                  ↑↓
                </kbd>
                navegar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 font-bold">
                  ↵
                </kbd>
                abrir
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 font-bold">
                  esc
                </kbd>
                fechar
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
