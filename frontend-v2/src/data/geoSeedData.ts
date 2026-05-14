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
  },
  {
    id: "terra",
    type: "region",
    coordinates: [35.0, 31.0], // Representativo (Israel)
    names: { canonical: "The Earth", pt: "Terra" },
    theologicalSignificance: "O palco da história humana e da revelação divina. Criada boa, corrompida pela Queda e destinada à renovação em Cristo.",
    archaeologicalNotes: "O domínio material criado por Deus 'ex nihilo'.",
    era: "Criação - Presente",
    events: ["A Criação", "O Dilúvio", "Nova Terra"],
    references: ["Genesis 1:1", "Psalm 24:1", "Revelation 21:1"]
  },
  {
    id: "ceus",
    type: "region",
    coordinates: [35.0, 32.0], // Representativo
    names: { canonical: "The Heavens", pt: "Céus" },
    theologicalSignificance: "O domínio da morada de Deus e das hostes celestiais. Criado simultaneamente com a terra como a esfera espiritual da realidade.",
    archaeologicalNotes: "Designa tanto a expansão física quanto a dimensão espiritual.",
    era: "Criação - Presente",
    events: ["A Criação", "Ascensão de Cristo"],
    references: ["Genesis 1:1", "Matthew 6:9", "Acts 1:11"]
  },
  {
    id: "eden",
    type: "region",
    coordinates: [45.0, 31.0], // Localização teórica (Mesopotâmia)
    names: { canonical: "Garden of Eden", pt: "Éden" },
    theologicalSignificance: "O protótipo do Templo; lugar de comunhão perfeita entre Deus e o homem. O paraíso perdido que será restaurado.",
    archaeologicalNotes: "Muitos sugerem a localização próxima aos rios Tigre e Eufrates.",
    era: "Era Primitiva",
    events: ["A Criação do Homem", "A Queda"],
    references: ["Genesis 2:8", "Genesis 3:24", "Ezekiel 28:13"]
  }
];
