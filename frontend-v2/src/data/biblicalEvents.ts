export interface BiblicalEvent {
  id: string;
  namePt: string;
  estimatedDate: string;
  soteriologicalSignificance: string; // Significado Soteriológico
  scriptureBase: string; // Texto Bíblico Base
  description: string;
  people: string[];
  locations: string[];
  // UI Compatibility fields
  name?: string;
  date?: string;
  period?: string;
  significance?: string;
  keyVerses?: string[];
}

export const BIBLICAL_EVENTS: BiblicalEvent[] = [
  {
    id: "criacao",
    namePt: "A Criação (Ex Nihilo)",
    estimatedDate: "Início dos Tempos",
    soteriologicalSignificance: "Estabelece a bondade original e a imago Dei; o fundamento para a restauração de todas as coisas em Cristo.",
    scriptureBase: "Gênesis 1:1 - 2:3",
    description: "Deus traz o universo à existência pela Sua Palavra, estabelecendo a ordem e o propósito para a humanidade.",
    people: ["Adão", "Eva"],
    locations: ["Éden"]
  },
  {
    id: "queda",
    namePt: "A Queda",
    estimatedDate: "Era Primitiva",
    soteriologicalSignificance: "A entrada do pecado e da morte; a necessidade universal de redenção e a promessa do Protoevangelho (Gn 3:15).",
    scriptureBase: "Gênesis 3",
    description: "A desobediência humana que rompeu a comunhão com Deus e corrompeu a criação.",
    people: ["Adão", "Eva", "Serpente"],
    locations: ["Éden"]
  },
  {
    id: "chamado-abrahao",
    namePt: "O Chamado de Abraão",
    estimatedDate: "c. 2091 a.C.",
    soteriologicalSignificance: "Início da linhagem messiânica e da fé como meio de justificação; a promessa de benção para todas as nações.",
    scriptureBase: "Gênesis 12:1-3; 15:6",
    description: "Deus chama Abrão de Ur dos Caldeus para uma terra que lhe seria mostrada, iniciando a nação de Israel.",
    people: ["Abraão", "Sara"],
    locations: ["Ur", "Harã", "Canaã"]
  },
  {
    id: "exodo",
    namePt: "O Êxodo e a Páscoa",
    estimatedDate: "c. 1446 a.C.",
    soteriologicalSignificance: "O paradigma da redenção; o sangue do cordeiro como meio de escape do julgamento divino.",
    scriptureBase: "Êxodo 12-14",
    description: "A libertação milagrosa de Israel do Egito através das dez pragas e da travessia do Mar Vermelho.",
    people: ["Moisés", "Arão", "Faraó"],
    locations: ["Egito", "Mar Vermelho", "Monte Sinai"]
  },
  {
    id: "exilio-babel",
    namePt: "O Exílio Babilônico",
    estimatedDate: "586 a.C.",
    soteriologicalSignificance: "Julgamento da idolatria e o anseio pela Nova Aliança e pelo retorno à presença de Deus (Sião).",
    scriptureBase: "2 Reis 25; Jeremias 29",
    description: "A queda de Jerusalém e a deportação de Judá para a Babilônia após persistente infidelidade à Aliança.",
    people: ["Nabucodonosor", "Jeremias", "Daniel"],
    locations: ["Jerusalém", "Babilônia"]
  },
  {
    id: "encarnacao",
    namePt: "A Encarnação de Cristo",
    estimatedDate: "c. 5 a.C.",
    soteriologicalSignificance: "O Verbo tornando-se carne; a união hipostática para que o homem pudesse ser reconciliado com Deus.",
    scriptureBase: "João 1:14; Lucas 2",
    description: "O nascimento de Jesus em Belém, cumprindo as profecias davídicas e abraâmicas.",
    people: ["Jesus", "Maria", "José"],
    locations: ["Belém", "Nazaré"]
  },
  {
    id: "crucificacao-ressurreicao",
    namePt: "Morte e Ressurreição de Jesus",
    estimatedDate: "c. 30/33 d.C.",
    soteriologicalSignificance: "A expiação vicária e a vitória sobre a morte; o centro de toda a história bíblica e da fé cristã.",
    scriptureBase: "Mateus 27-28; 1 Coríntios 15",
    description: "O sacrifício final na cruz e o triunfo do terceiro dia, garantindo a ressurreição dos crentes.",
    people: ["Jesus", "Poncio Pilatos", "Pedro"],
    locations: ["Jerusalém", "Gólgota"]
  },
  {
    id: "pentecostes",
    namePt: "Pentecostes",
    estimatedDate: "c. 30/33 d.C.",
    soteriologicalSignificance: "O derramamento do Espírito Santo; o início da missão global da Igreja sob a Nova Aliança.",
    scriptureBase: "Atos 2",
    description: "O cumprimento da promessa do Pai, equipando os discípulos para testemunharem até aos confins da terra.",
    people: ["Pedro", "Os Apóstolos"],
    locations: ["Jerusalém", "Cenáculo"]
  }
];

export function searchEvents(query: string): BiblicalEvent[] {
  const q = query.toLowerCase();
  return BIBLICAL_EVENTS.filter(e => 
    e.namePt.toLowerCase().includes(q) || 
    e.soteriologicalSignificance.toLowerCase().includes(q) ||
    e.description.toLowerCase().includes(q)
  );
}
