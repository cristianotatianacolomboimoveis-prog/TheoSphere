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
  jaco: {
    hex: "#f43f5e",
    rgb: [244, 63, 94],
    rgba: [244, 63, 94, 220],
    bgClass: "bg-[#f43f5e]/10 border-[#f43f5e]/30 text-white",
    activeEyeClass: "bg-[#f43f5e]/20 text-[#f43f5e]",
  },
  jose_egito: {
    hex: "#fb923c",
    rgb: [251, 146, 60],
    rgba: [251, 146, 60, 220],
    bgClass: "bg-[#fb923c]/10 border-[#fb923c]/30 text-white",
    activeEyeClass: "bg-[#fb923c]/20 text-[#fb923c]",
  },
  exodo: {
    hex: "#f97316",
    rgb: [249, 115, 22],
    rgba: [249, 115, 22, 220],
    bgClass: "bg-[#f97316]/10 border-[#f97316]/30 text-white",
    activeEyeClass: "bg-[#f97316]/20 text-[#f97316]",
  },
  conquista_canaa: {
    hex: "#eab308",
    rgb: [234, 179, 8],
    rgba: [234, 179, 8, 220],
    bgClass: "bg-[#eab308]/10 border-[#eab308]/30 text-white",
    activeEyeClass: "bg-[#eab308]/20 text-[#eab308]",
  },
  arca_alianca: {
    hex: "#f59e0b",
    rgb: [245, 158, 11],
    rgba: [245, 158, 11, 220],
    bgClass: "bg-[#f59e0b]/10 border-[#f59e0b]/30 text-white",
    activeEyeClass: "bg-[#f59e0b]/20 text-[#f59e0b]",
  },
  davi_fugitivo: {
    hex: "#84cc16",
    rgb: [132, 204, 22],
    rgba: [132, 204, 22, 220],
    bgClass: "bg-[#84cc16]/10 border-[#84cc16]/30 text-white",
    activeEyeClass: "bg-[#84cc16]/20 text-[#84cc16]",
  },
  elias: {
    hex: "#10b981",
    rgb: [16, 185, 129],
    rgba: [16, 185, 129, 220],
    bgClass: "bg-[#10b981]/10 border-[#10b981]/30 text-white",
    activeEyeClass: "bg-[#10b981]/20 text-[#10b981]",
  },
  jonas: {
    hex: "#06b6d4",
    rgb: [6, 182, 212],
    rgba: [6, 182, 212, 220],
    bgClass: "bg-[#06b6d4]/10 border-[#06b6d4]/30 text-white",
    activeEyeClass: "bg-[#06b6d4]/20 text-[#06b6d4]",
  },
  terra_prometida: {
    hex: "#14b8a6",
    rgb: [20, 184, 166],
    rgba: [20, 184, 166, 220],
    bgClass: "bg-[#14b8a6]/10 border-[#14b8a6]/30 text-white",
    activeEyeClass: "bg-[#14b8a6]/20 text-[#14b8a6]",
  },
  exilio_assirio: {
    hex: "#64748b",
    rgb: [100, 116, 139],
    rgba: [100, 116, 139, 220],
    bgClass: "bg-[#64748b]/10 border-[#64748b]/30 text-white",
    activeEyeClass: "bg-[#64748b]/20 text-[#64748b]",
  },
  exilio_babilonico: {
    hex: "#78716c",
    rgb: [120, 113, 108],
    rgba: [120, 113, 108, 220],
    bgClass: "bg-[#78716c]/10 border-[#78716c]/30 text-white",
    activeEyeClass: "bg-[#78716c]/20 text-[#78716c]",
  },
  retorno_esdras_neemias: {
    hex: "#d97706",
    rgb: [217, 119, 6],
    rgba: [217, 119, 6, 220],
    bgClass: "bg-[#d97706]/10 border-[#d97706]/30 text-white",
    activeEyeClass: "bg-[#d97706]/20 text-[#d97706]",
  },
  jesus_nascimento_infancia: {
    hex: "#38bdf8",
    rgb: [56, 189, 248],
    rgba: [56, 189, 248, 220],
    bgClass: "bg-[#38bdf8]/10 border-[#38bdf8]/30 text-white",
    activeEyeClass: "bg-[#38bdf8]/20 text-[#38bdf8]",
  },
  jesus_galileia: {
    hex: "#2dd4bf",
    rgb: [45, 212, 191],
    rgba: [45, 212, 191, 220],
    bgClass: "bg-[#2dd4bf]/10 border-[#2dd4bf]/30 text-white",
    activeEyeClass: "bg-[#2dd4bf]/20 text-[#2dd4bf]",
  },
  jesus_peregrino_norte: {
    hex: "#0ea5e9",
    rgb: [14, 165, 233],
    rgba: [14, 165, 233, 220],
    bgClass: "bg-[#0ea5e9]/10 border-[#0ea5e9]/30 text-white",
    activeEyeClass: "bg-[#0ea5e9]/20 text-[#0ea5e9]",
  },
  jesus_paixao_jerusalem: {
    hex: "#ef4444",
    rgb: [239, 68, 68],
    rgba: [239, 68, 68, 220],
    bgClass: "bg-[#ef4444]/10 border-[#ef4444]/30 text-white",
    activeEyeClass: "bg-[#ef4444]/20 text-[#ef4444]",
  },
  filipe_evangelista: {
    hex: "#8b5cf6",
    rgb: [139, 92, 246],
    rgba: [139, 92, 246, 220],
    bgClass: "bg-[#8b5cf6]/10 border-[#8b5cf6]/30 text-white",
    activeEyeClass: "bg-[#8b5cf6]/20 text-[#8b5cf6]",
  },
  pedro_missoes: {
    hex: "#0284c7",
    rgb: [2, 132, 199],
    rgba: [2, 132, 199, 220],
    bgClass: "bg-[#0284c7]/10 border-[#0284c7]/30 text-white",
    activeEyeClass: "bg-[#0284c7]/20 text-[#0284c7]",
  },
  paulo: {
    hex: "#6366f1",
    rgb: [99, 102, 241],
    rgba: [99, 102, 241, 220],
    bgClass: "bg-[#6366f1]/10 border-[#6366f1]/30 text-white",
    activeEyeClass: "bg-[#6366f1]/20 text-[#6366f1]",
  },
  paulo_2_viagem: {
    hex: "#818cf8",
    rgb: [129, 140, 248],
    rgba: [129, 140, 248, 220],
    bgClass: "bg-[#818cf8]/10 border-[#818cf8]/30 text-white",
    activeEyeClass: "bg-[#818cf8]/20 text-[#818cf8]",
  },
  paulo_3_viagem: {
    hex: "#9333ea",
    rgb: [147, 51, 234],
    rgba: [147, 51, 234, 220],
    bgClass: "bg-[#9333ea]/10 border-[#9333ea]/30 text-white",
    activeEyeClass: "bg-[#9333ea]/20 text-[#9333ea]",
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
  abraao: {
    category: "at",
    routeIndex: 1,
    routeTitle: "1. A Peregrinação de Fé de Abraão",
  },
  jaco: {
    category: "at",
    routeIndex: 2,
    routeTitle: "2. A Peregrinação de Jacó",
  },
  jose_egito: {
    category: "at",
    routeIndex: 3,
    routeTitle: "3. A Trajetória de José no Egito",
  },
  exodo: {
    category: "at",
    routeIndex: 4,
    routeTitle: "4. Rota do Êxodo e Peregrinação no Deserto",
  },
  conquista_canaa: {
    category: "at",
    routeIndex: 5,
    routeTitle: "5. Conquista de Canaã sob Josué",
  },
  arca_alianca: {
    category: "at",
    routeIndex: 6,
    routeTitle: "6. A Peregrinação da Arca da Aliança",
  },
  davi_fugitivo: {
    category: "at",
    routeIndex: 7,
    routeTitle: "7. A Fuga e Refúgio de Davi",
  },
  elias: {
    category: "at",
    routeIndex: 8,
    routeTitle: "8. A Jornada Profética de Elias",
  },
  jonas: {
    category: "at",
    routeIndex: 9,
    routeTitle: "9. A Missão do Profeta Jonas",
  },
  terra_prometida: {
    category: "at",
    routeIndex: 10,
    routeTitle: "10. Terra Prometida, 12 Tribos, Divisão dos Reinos",
  },
  exilio_assirio: {
    category: "at",
    routeIndex: 11,
    routeTitle: "11. Exílio Assírio e Dispersão",
  },
  exilio_babilonico: {
    category: "at",
    routeIndex: 12,
    routeTitle: "12. Exílio Babilônico e Nova Aliança",
  },
  retorno_esdras_neemias: {
    category: "at",
    routeIndex: 13,
    routeTitle: "13. O Retorno dos Exilados e Reconstrução",
  },
  jesus_nascimento_infancia: {
    category: "jesus",
    routeIndex: 14,
    routeTitle: "14. Nascimento e Infância de Jesus",
  },
  jesus_galileia: {
    category: "jesus",
    routeIndex: 15,
    routeTitle: "15. Ministério Galileu de Jesus Cristo",
  },
  jesus_peregrino_norte: {
    category: "jesus",
    routeIndex: 16,
    routeTitle: "16. Viagens ao Norte e Revelação Messiânica",
  },
  jesus_paixao_jerusalem: {
    category: "jesus",
    routeIndex: 17,
    routeTitle: "17. A Última Jornada de Jesus e a Paixão",
  },
  filipe_evangelista: {
    category: "apostolos",
    routeIndex: 18,
    routeTitle: "18. Missão Evangelística de Filipe",
  },
  pedro_missoes: {
    category: "apostolos",
    routeIndex: 19,
    routeTitle: "19. Viagens Apostólicas de Pedro",
  },
  paulo: {
    category: "paulo",
    routeIndex: 20,
    routeTitle: "20. 1ª Viagem Missionária de Paulo e Barnabé",
  },
  paulo_2_viagem: {
    category: "paulo",
    routeIndex: 21,
    routeTitle: "21. 2ª Viagem Missionária de Paulo",
  },
  paulo_3_viagem: {
    category: "paulo",
    routeIndex: 22,
    routeTitle: "22. 3ª Viagem Missionária de Paulo",
  },
  paulo_roma: {
    category: "paulo",
    routeIndex: 23,
    routeTitle: "23. A Viagem de Paulo a Roma (Prisioneiro de Cristo)",
  },
};

const DEFAULT_INFO: RouteInfoConfig = {
  category: "at",
  routeIndex: 1,
  routeTitle: "Rota Bíblica",
};

export function getRouteColor(routeId: string): RouteColorConfig {
  return ROUTE_COLORS[routeId] || DEFAULT_COLOR;
}

export function getRouteInfo(routeId: string): RouteInfoConfig {
  return ROUTE_INFO[routeId] || DEFAULT_INFO;
}

/** Mapeia categoria → label de exibição */
export function getCategoryLabel(
  category: RouteInfoConfig["category"],
): string {
  switch (category) {
    case "at":
      return "Antigo Testamento (AT)";
    case "jesus":
      return "Ministério de Jesus";
    case "apostolos":
      return "Ministério dos Apóstolos";
    case "paulo":
      return "Ministério de Paulo";
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
