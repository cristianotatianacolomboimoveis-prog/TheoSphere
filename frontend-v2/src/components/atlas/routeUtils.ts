// Utilitarios compartilhados para rotas biblicas
// Cores e classificacao de rotas usadas pelo painel de controle e camadas deck.gl

export interface RouteColorInfo {
  hex: string;
  rgb: [number, number, number];
  rgba: [number, number, number, number];
  bgClass: string;
  activeEyeClass: string;
}

export interface RouteInfo {
  category: "at" | "jesus" | "apostolos" | "paulo";
  routeIndex: number;
  routeTitle: string;
}

export function getRouteColor(routeId: string): RouteColorInfo {
  switch (routeId) {
    case "abraao":
      return {
        hex: "#ff2d55",
        rgb: [255, 45, 85],
        rgba: [255, 45, 85, 220],
        bgClass: "bg-[#ff2d55]/10 border-[#ff2d55]/30 text-white",
        activeEyeClass: "bg-[#ff2d55]/20 text-[#ff2d55]",
      };
    case "exodo":
      return {
        hex: "#f97316",
        rgb: [249, 115, 22],
        rgba: [249, 115, 22, 220],
        bgClass: "bg-[#f97316]/10 border-[#f97316]/30 text-white",
        activeEyeClass: "bg-[#f97316]/20 text-[#f97316]",
      };
    case "terra_prometida":
      return {
        hex: "#10b981",
        rgb: [16, 185, 129],
        rgba: [16, 185, 129, 220],
        bgClass: "bg-[#10b981]/10 border-[#10b981]/30 text-white",
        activeEyeClass: "bg-[#10b981]/20 text-[#10b981]",
      };
    case "exilio_assirio":
      return {
        hex: "#64748b",
        rgb: [100, 116, 139],
        rgba: [100, 116, 139, 220],
        bgClass: "bg-[#64748b]/10 border-[#64748b]/30 text-white",
        activeEyeClass: "bg-[#64748b]/20 text-[#64748b]",
      };
    case "exilio_babilonico":
      return {
        hex: "#f43f5e",
        rgb: [244, 63, 94],
        rgba: [244, 63, 94, 220],
        bgClass: "bg-[#f43f5e]/10 border-[#f43f5e]/30 text-white",
        activeEyeClass: "bg-[#f43f5e]/20 text-[#f43f5e]",
      };
    case "jesus_galileia":
      return {
        hex: "#2dd4bf",
        rgb: [45, 212, 191],
        rgba: [45, 212, 191, 220],
        bgClass: "bg-[#2dd4bf]/10 border-[#2dd4bf]/30 text-white",
        activeEyeClass: "bg-[#2dd4bf]/20 text-[#2dd4bf]",
      };
    case "paulo":
      return {
        hex: "#6366f1",
        rgb: [99, 102, 241],
        rgba: [99, 102, 241, 220],
        bgClass: "bg-[#6366f1]/10 border-[#6366f1]/30 text-white",
        activeEyeClass: "bg-[#6366f1]/20 text-[#6366f1]",
      };
    case "paulo_roma":
      return {
        hex: "#a855f7",
        rgb: [168, 85, 247],
        rgba: [168, 85, 247, 220],
        bgClass: "bg-[#a855f7]/10 border-[#a855f7]/30 text-white",
        activeEyeClass: "bg-[#a855f7]/20 text-[#a855f7]",
      };
    default:
      return {
        hex: "#6366f1",
        rgb: [99, 102, 241],
        rgba: [99, 102, 241, 220],
        bgClass: "bg-[#6366f1]/10 border-[#6366f1]/30 text-white",
        activeEyeClass: "bg-[#6366f1]/20 text-[#6366f1]",
      };
  }
}

export function getRouteInfo(routeId: string): RouteInfo {
  if (routeId === "abraao") {
    return { routeIndex: 1, routeTitle: "1. Jornada de Abraão", category: "at" };
  } else if (routeId === "exodo") {
    return { routeIndex: 2, routeTitle: "2. Rota do Êxodo", category: "at" };
  } else if (routeId === "terra_prometida") {
    return { routeIndex: 3, routeTitle: "3. Terra Prometida, 12 Tribos, Divisão dos Reinos", category: "at" };
  } else if (routeId === "exilio_assirio") {
    return { routeIndex: 4, routeTitle: "4. Exílio Assírio e Dispersão", category: "at" };
  } else if (routeId === "exilio_babilonico") {
    return { routeIndex: 5, routeTitle: "5. Exílio Babilônico e Nova Aliança", category: "at" };
  } else if (routeId === "jesus_galileia") {
    return { routeIndex: 1, routeTitle: "1. Ministério Galileu de Jesus", category: "jesus" };
  } else if (routeId === "paulo") {
    return { routeIndex: 1, routeTitle: "1. 1ª Viagem de Paulo (Apóstolos)", category: "apostolos" };
  } else if (routeId === "paulo_roma") {
    return { routeIndex: 1, routeTitle: "1. Viagem de Paulo a Roma", category: "paulo" };
  }
  return { category: "at", routeIndex: 1, routeTitle: routeId };
}
