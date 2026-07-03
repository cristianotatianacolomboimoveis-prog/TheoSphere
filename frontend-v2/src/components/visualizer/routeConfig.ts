/**
 * Configuração de rotas bíblicas — cores e metadados.
 * Puro TS, sem dependências React.
 */

export interface RouteColorConfig {
  hex: string;
  rgb: [number, number, number];
  rgba: [number, number, number, number];
  bgClass: string;
  activeEyeClass: string;
}

export interface RouteInfoConfig {
  category: "at" | "jesus" | "apostolos" | "paulo";
  routeIndex: number;
  routeTitle: string;
}

const ROUTE_COLORS: Record<string, RouteColorConfig> = {
  abraao: {
    hex: "#ff2d55",
    rgb: [255, 45, 85],
    rgba: [255, 45, 85, 220],
    bgClass: "bg-[#ff2d55]/10 border-[#ff2d55]/30 text-white",
    activeEyeClass: "bg-[#ff2d55]/20 text-[#ff2d55]",
  },
  exodo: {
    hex: "#f97316",
    rgb: [249, 115, 22],
    rgba: [249, 115, 22, 220],
    bgClass: "bg-[#f97316]/10 border-[#f97316]/30 text-white",
    activeEyeClass: "bg-[#f97316]/20 text-[#f97316]",
  },
  terra_prometida: {
    hex: "#10b981",
    rgb: [16, 185, 129],
    rgba: [16, 185, 129, 220],
    bgClass: "bg-[#10b981]/10 border-[#10b981]/30 text-white",
    activeEyeClass: "bg-[#10b981]/20 text-[#10b981]",
  },
  exilio_assirio: {
    hex: "#64748b",
    rgb: [100, 116, 139],
    rgba: [100, 116, 139, 220],
    bgClass: "bg-[#64748b]/10 border-[#64748b]/30 text-white",
    activeEyeClass: "bg-[#64748b]/20 text-[#64748b]",
  },
  exilio_babilonico: {
    hex: "#f43f5e",
    rgb: [244, 63, 94],
    rgba: [244, 63, 94, 220],
    bgClass: "bg-[#f43f5e]/10 border-[#f43f5e]/30 text-white",
    activeEyeClass: "bg-[#f43f5e]/20 text-[#f43f5e]",
  },
  jesus_galileia: {
    hex: "#2dd4bf",
    rgb: [45, 212, 191],
    rgba: [45, 212, 191, 220],
    bgClass: "bg-[#2dd4bf]/10 border-[#2dd4bf]/30 text-white",
    activeEyeClass: "bg-[#2dd4bf]/20 text-[#2dd4bf]",
  },
  paulo: {
    hex: "#6366f1",
    rgb: [99, 102, 241],
    rgba: [99, 102, 241, 220],
    bgClass: "bg-[#6366f1]/10 border-[#6366f1]/30 text-white",
    activeEyeClass: "bg-[#6366f1]/20 text-[#6366f1]",
  },
  paulo_roma: {
    hex: "#a855f7",
    rgb: [168, 85, 247],
    rgba: [168, 85, 247, 220],
    bgClass: "bg-[#a855f7]/10 border-[#a855f7]/30 text-white",
    activeEyeClass: "bg-[#a855f7]/20 text-[#a855f7]",
  },
};

const DEFAULT_COLOR: RouteColorConfig = {
  hex: "#6366f1",
  rgb: [99, 102, 241],
  rgba: [99, 102, 241, 220],
  bgClass: "bg-[#6366f1]/10 border-[#6366f1]/30 text-white",
  activeEyeClass: "bg-[#6366f1]/20 text-[#6366f1]",
};

const ROUTE_INFO: Record<string, RouteInfoConfig> = {
  abraao: { category: "at", routeIndex: 1, routeTitle: "1. Jornada de Abraão" },
  exodo: { category: "at", routeIndex: 2, routeTitle: "2. Rota do Êxodo" },
  terra_prometida: { category: "at", routeIndex: 3, routeTitle: "3. Terra Prometida, 12 Tribos, Divisão dos Reinos" },
  exilio_assirio: { category: "at", routeIndex: 4, routeTitle: "4. Exílio Assírio e Dispersão" },
  exilio_babilonico: { category: "at", routeIndex: 5, routeTitle: "5. Exílio Babilônico e Nova Aliança" },
  jesus_galileia: { category: "jesus", routeIndex: 1, routeTitle: "1. Ministério Galileu de Jesus" },
  paulo: { category: "apostolos", routeIndex: 1, routeTitle: "1. 1ª Viagem de Paulo (Apóstolos)" },
  paulo_roma: { category: "paulo", routeIndex: 1, routeTitle: "1. Viagem de Paulo a Roma" },
};

const DEFAULT_INFO: RouteInfoConfig = {
  category: "at",
  routeIndex: 1,
  routeTitle: "Rota Desconhecida",
};

export function getRouteColor(routeId: string): RouteColorConfig {
  return ROUTE_COLORS[routeId] || DEFAULT_COLOR;
}

export function getRouteInfo(routeId: string): RouteInfoConfig {
  return ROUTE_INFO[routeId] || DEFAULT_INFO;
}

/** Mapeia categoria → label de exibição */
export function getCategoryLabel(category: RouteInfoConfig["category"]): string {
  switch (category) {
    case "at": return "Antigo Testamento (AT)";
    case "jesus": return "Ministério de Jesus";
    case "apostolos": return "Ministério dos Apóstolos";
    case "paulo": return "Ministério de Paulo";
  }
}

/** Configuração visual das seções de categoria na legenda */
export const ROUTE_CATEGORIES = [
  {
    category: "at" as const,
    label: "Antigo Testamento (AT)",
    gradient: "bg-gradient-to-b from-[#ff2d55] via-[#f97316] to-[#10b981]",
    height: "h-4",
  },
  {
    category: "jesus" as const,
    label: "Ministério de Jesus",
    gradient: "bg-[#2dd4bf]",
    height: "h-3",
  },
  {
    category: "apostolos" as const,
    label: "Ministério dos Apóstolos",
    gradient: "bg-[#6366f1]",
    height: "h-3",
  },
  {
    category: "paulo" as const,
    label: "Ministério de Paulo",
    gradient: "bg-[#a855f7]",
    height: "h-3",
  },
] as const;
