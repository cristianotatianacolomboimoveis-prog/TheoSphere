// Tipos do Schema Local-First para a engine geoespacial 4D
import * as turf from "@turf/turf";

export type LocationType = "city" | "mountain" | "river" | "desert" | "border" | "region" | "body_of_water";

export interface BiblicalLocation {
  location_id: string;
  canonical_name: string;
  biblical_name: string;
  coordinates: [number, number]; // [longitude, latitude]
  period_start: number; // Anos a.C. são negativos
  period_end: number;
  type: LocationType;
  verse_refs: string[]; // Simplificado para simular a tabela relacional de menções
  description: string;
}

export interface TrekPoint {
  order: number;
  location_id: string;
  verse_ref: string;
}

export interface BiblicalTrek {
  trek_id: string;
  label: string;
  points: TrekPoint[];
  time_range: { start: number; end: number };
  color?: [number, number, number]; // Metadata extra para a UI
}

/* ─── Base de Dados "biblical_locations" ────────────────── */
export const BIBLE_LOCATIONS: BiblicalLocation[] = [
  {
    location_id: "loc_ur",
    canonical_name: "Ur",
    biblical_name: "Ur dos Caldeus",
    coordinates: [46.1033, 30.9622],
    period_start: -3800,
    period_end: -500,
    type: "city",
    verse_refs: ["Genesis 11:28", "Genesis 11:31", "Nehemiah 9:7"],
    description: "Antiga cidade da Mesopotâmia de onde Abrão iniciou sua jornada."
  },
  {
    location_id: "loc_haran",
    canonical_name: "Haran",
    biblical_name: "Harã",
    coordinates: [39.0305, 36.8653],
    period_start: -2500,
    period_end: 1000,
    type: "city",
    verse_refs: ["Genesis 11:31", "Genesis 12:4", "Genesis 27:43"],
    description: "Cidade estratégica onde Abrão permaneceu até a morte de seu pai."
  },
  {
    location_id: "loc_canaan_shechem",
    canonical_name: "Shechem",
    biblical_name: "Siquém",
    coordinates: [35.2819, 32.2131],
    period_start: -3000,
    period_end: 100,
    type: "city",
    verse_refs: ["Genesis 12:6", "Genesis 33:18", "Joshua 24:1"],
    description: "Primeiro local em Canaã onde Deus apareceu a Abrão."
  },
  {
    location_id: "loc_bethel",
    canonical_name: "Bethel",
    biblical_name: "Betel",
    coordinates: [35.2217, 31.9272],
    period_start: -2100,
    period_end: 100,
    type: "city",
    verse_refs: ["Genesis 12:8", "Genesis 28:19"],
    description: "Local onde Abrão armou sua tenda e invocou o nome do Senhor."
  },
  {
    location_id: "loc_egypt_negev",
    canonical_name: "Negev",
    biblical_name: "Neguebe",
    coordinates: [34.8, 31.2],
    period_start: -3000,
    period_end: 2000,
    type: "desert",
    verse_refs: ["Genesis 12:9", "Genesis 13:1"],
    description: "Região desértica ao sul de Canaã no caminho para o Egito."
  },
  {
    location_id: "loc_goshen",
    canonical_name: "Goshen",
    biblical_name: "Terra de Gósen",
    coordinates: [31.8333, 30.5833],
    period_start: -1900,
    period_end: -1400,
    type: "region",
    verse_refs: ["Genesis 45:10", "Exodus 8:22"],
    description: "Região fértil no Egito habitada pelos israelitas antes do Êxodo."
  },
  {
    location_id: "loc_succoth",
    canonical_name: "Succoth",
    biblical_name: "Sucote",
    coordinates: [32.5333, 29.9667],
    period_start: -1500,
    period_end: -1000,
    type: "city",
    verse_refs: ["Exodus 12:37", "Exodus 13:20"],
    description: "Primeiro ponto de acampamento após deixarem Ramessés."
  },
  {
    location_id: "loc_sinai",
    canonical_name: "Mount Sinai",
    biblical_name: "Monte Sinai",
    coordinates: [33.9750, 28.5391],
    period_start: -2000,
    period_end: 2000,
    type: "mountain",
    verse_refs: ["Exodus 19:2", "Exodus 24:16"],
    description: "Montanha onde Moisés recebeu a Lei."
  },
  {
    location_id: "loc_kadesh",
    canonical_name: "Kadesh Barnea",
    biblical_name: "Cades-Barneia",
    coordinates: [35.4500, 30.3167],
    period_start: -2000,
    period_end: -500,
    type: "desert",
    verse_refs: ["Numbers 13:26", "Deuteronomy 1:2"],
    description: "Local de rebelião de onde os espias foram enviados."
  },
  {
    location_id: "loc_moab",
    canonical_name: "Plains of Moab",
    biblical_name: "Planícies de Moabe",
    coordinates: [35.6167, 31.7667],
    period_start: -1500,
    period_end: 100,
    type: "region",
    verse_refs: ["Numbers 22:1", "Deuteronomy 34:1"],
    description: "Último acampamento antes de entrar na Terra Prometida."
  },
  {
    location_id: "antioquia",
    canonical_name: "Antioch",
    biblical_name: "Antioquia da Síria",
    coordinates: [36.1606, 36.2023],
    period_start: -300,
    period_end: 1500,
    type: "city",
    verse_refs: ["Acts 11:26", "Acts 13:4"],
    description: "Base missionária de Paulo e Barnabé."
  },
  {
    location_id: "seleucia",
    canonical_name: "Seleucia Pieria",
    biblical_name: "Selêucia",
    coordinates: [35.9333, 36.1167],
    period_start: -300,
    period_end: 600,
    type: "city",
    verse_refs: ["Acts 13:4"],
    description: "Porto marítimo de Antioquia."
  },
  {
    location_id: "salamis",
    canonical_name: "Salamis",
    biblical_name: "Salamina",
    coordinates: [33.9333, 35.1500],
    period_start: -1100,
    period_end: 700,
    type: "city",
    verse_refs: ["Acts 13:5"],
    description: "Principal cidade e porto comercial na costa leste de Chipre."
  },
  {
    location_id: "paphos",
    canonical_name: "Paphos",
    biblical_name: "Pafos",
    coordinates: [32.4167, 34.7667],
    period_start: -1200,
    period_end: 2000,
    type: "city",
    verse_refs: ["Acts 13:6"],
    description: "Sede do governo romano em Chipre."
  },
  {
    location_id: "perga",
    canonical_name: "Perga",
    biblical_name: "Perge",
    coordinates: [30.8833, 36.8667],
    period_start: -1000,
    period_end: 1000,
    type: "city",
    verse_refs: ["Acts 13:13"],
    description: "Onde João Marcos deixou a equipe."
  },
  {
    location_id: "antioch_pisidia",
    canonical_name: "Antioch in Pisidia",
    biblical_name: "Antioquia da Pisídia",
    coordinates: [32.4833, 37.8667],
    period_start: -300,
    period_end: 800,
    type: "city",
    verse_refs: ["Acts 13:14"],
    description: "Onde Paulo fez seu primeiro grande sermão registrado."
  }
];

/* ─── Base de Dados "biblical_treks" ────────────────────── */
export const BIBLE_TREKS: BiblicalTrek[] = [
  {
    trek_id: "viagem_abraao_1",
    label: "A Jornada de Abrão",
    color: [245, 158, 11], // Amber-500
    time_range: { start: -2100, end: -1950 },
    points: [
      { order: 1, location_id: "loc_ur", verse_ref: "Genesis 11:31" },
      { order: 2, location_id: "loc_haran", verse_ref: "Genesis 11:31" },
      { order: 3, location_id: "loc_canaan_shechem", verse_ref: "Genesis 12:6" },
      { order: 4, location_id: "loc_bethel", verse_ref: "Genesis 12:8" },
      { order: 5, location_id: "loc_egypt_negev", verse_ref: "Genesis 12:9" }
    ]
  },
  {
    trek_id: "exodo_israel",
    label: "O Êxodo de Israel",
    color: [59, 130, 246], // Blue-500
    time_range: { start: -1446, end: -1406 }, // Data tradicional
    points: [
      { order: 1, location_id: "loc_goshen", verse_ref: "Exodus 12:37" },
      { order: 2, location_id: "loc_succoth", verse_ref: "Exodus 12:37" },
      { order: 3, location_id: "loc_sinai", verse_ref: "Exodus 19:1" },
      { order: 4, location_id: "loc_kadesh", verse_ref: "Numbers 13:26" },
      { order: 5, location_id: "loc_moab", verse_ref: "Numbers 22:1" }
    ]
  },
  {
    trek_id: "viagem_paulo_1",
    label: "Primeira Viagem Missionária de Paulo",
    color: [16, 185, 129], // Emerald-500
    time_range: { start: 46, end: 48 }, // Anos d.C.
    points: [
      { order: 1, location_id: "antioquia", verse_ref: "Acts 13:4" },
      { order: 2, location_id: "seleucia", verse_ref: "Acts 13:4" },
      { order: 3, location_id: "salamis", verse_ref: "Acts 13:5" },
      { order: 4, location_id: "paphos", verse_ref: "Acts 13:6" },
      { order: 5, location_id: "perga", verse_ref: "Acts 13:13" },
      { order: 6, location_id: "antioch_pisidia", verse_ref: "Acts 13:14" }
    ]
  }
];

// Utilitário para o Web Worker construir a Linha em GeoJSON 
// com base nos Treks e suas relações de ID com a tabela de Locations
export function buildGeoJSONFromTrek(trek: BiblicalTrek, locationsDB: BiblicalLocation[]) {
  // Ordena os pontos pelo campo order
  const sortedPoints = [...trek.points].sort((a, b) => a.order - b.order);
  
  const coordinates: [number, number][] = [];
  
  for (const point of sortedPoints) {
    const loc = locationsDB.find(l => l.location_id === point.location_id);
    if (loc) {
      coordinates.push(loc.coordinates);
    }
  }

  const lineString = turf.lineString(coordinates);
  
  // Cria uma interpolação de curvas com Turf.js (Bezier Spline)
  // Isso dá aquele efeito "rota de navio/viagem realista" em vez de retas duras
  let curvedLine;
  try {
    curvedLine = turf.bezierSpline(lineString, { resolution: 10000, sharpness: 0.85 });
  } catch (err) {
    // Se houverem apenas 2 pontos, bezier pode falhar, retornamos a linha reta
    curvedLine = lineString;
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name: trek.label, trek_id: trek.trek_id },
        geometry: curvedLine.geometry
      }
    ]
  };
}
