export interface GeoLocation3D {
  id: string;
  type: "city" | "mountain" | "region" | "water";
  coordinates: [number, number]; // [lng, lat]
  names: {
    canonical: string;
    pt: string;
  };
  theologicalSignificance: string; // Coordenada Teológica
  archaeologicalNotes: string;
  era: string;
  events: string[];
  references: string[];
}

export const SEED_LOCATIONS: GeoLocation3D[] = [
  {
    id: "jerusalem",
    type: "city",
    coordinates: [35.2137, 31.7683],
    names: { canonical: "Jerusalem", pt: "Jerusalém" },
    theologicalSignificance: "O Centro do Mundo Teológico; local da morada de Deus (Templo) e da Redenção (Cruz). Antítese da Babilônia.",
    archaeologicalNotes: "Escavações na Cidade de Davi e no Túnel de Ezequias confirmam a ocupação contínua desde o Bronze Médio.",
    era: "Bronze Médio - Presente",
    events: ["Construção do Templo", "Crucificação", "Pentecostes"],
    references: ["Psalm 122", "Isaiah 2:3", "Matthew 21"]
  },
  {
    id: "babilonia",
    type: "city",
    coordinates: [44.4208, 32.5430],
    names: { canonical: "Babylon", pt: "Babilônia" },
    theologicalSignificance: "Símbolo da confusão, do orgulho humano contra Deus e do exílio. Representa o sistema mundial oposto a Sião.",
    archaeologicalNotes: "Ruínas do Etemenanki (Zigurante) e o Portão de Ishtar (atualmente no Museu de Pérgamo).",
    era: "c. 2300 a.C. - 1000 d.C.",
    events: ["Torre de Babel", "Exílio de Judá", "Visões de Daniel"],
    references: ["Genesis 11", "Jeremiah 51", "Revelation 17"]
  },
  {
    id: "monte-sinai",
    type: "mountain",
    coordinates: [33.9751, 28.5394],
    names: { canonical: "Mount Sinai", pt: "Monte Sinai" },
    theologicalSignificance: "Local da Teofania e da Aliança Mosaica. Onde a santidade de Deus foi revelada através da Lei.",
    archaeologicalNotes: "Identificação tradicional em Jebel Musa, embora existam teorias alternativas (ex: na Arábia Saudita).",
    era: "Bronze Tardio",
    events: ["Entrega da Lei", "Bezerro de Ouro", "Visão de Elias"],
    references: ["Exodus 19-20", "Galatians 4:24"]
  },
  {
    id: "belem",
    type: "city",
    coordinates: [35.2023, 31.7054],
    names: { canonical: "Bethlehem", pt: "Belém" },
    theologicalSignificance: "Cidade Messiânica; o 'Pão da Vida' nasceu na 'Casa do Pão'. Cumprimento da linhagem Davídica.",
    archaeologicalNotes: "Igreja da Natividade construída sobre uma gruta venerada desde o século II.",
    era: "Idade do Ferro - Presente",
    events: ["Nascimento de Jesus", "Unção de Davi", "História de Rute"],
    references: ["Micah 5:2", "Matthew 2", "Luke 2"]
  },
  {
    id: "rio-jordao",
    type: "water",
    coordinates: [35.5769, 31.9056],
    names: { canonical: "Jordan River", pt: "Rio Jordão" },
    theologicalSignificance: "Fronteira da Promessa; símbolo de transição, batismo e novo começo teológico.",
    archaeologicalNotes: "Locais de batismo identificados em Al-Maghtas e Qasr al-Yahud.",
    era: "Geológica",
    events: ["Travessia de Israel", "Batismo de Jesus", "Cura de Naamã"],
    references: ["Joshua 3", "Matthew 3", "2 Kings 5"]
  },
  {
    id: "roma",
    type: "city",
    coordinates: [12.4964, 41.9028],
    names: { canonical: "Rome", pt: "Roma" },
    theologicalSignificance: "O Palco do Império; local onde o Reino de Deus confrontou o poder humano. Destino final da missão paulina.",
    archaeologicalNotes: "Catacumbas e o Fórum Romano testemunham a perseguição e posterior triunfo do cristianismo.",
    era: "Século VIII a.C. - Presente",
    events: ["Martírio de Pedro/Paulo", "Incêndio de Roma", "Edito de Milão"],
    references: ["Acts 28", "Romans 1", "Revelation 17"]
  }
];
