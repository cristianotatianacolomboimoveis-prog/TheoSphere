export type BiblicalCovenant = 
  | "Adâmica" 
  | "Noética" 
  | "Abraâmica" 
  | "Mosaica" 
  | "Davídica" 
  | "Nova Aliança";

export interface BiblicalPerson {
  id: string;
  namePt: string;
  nameHe: string;
  etymology: string;
  covenant: BiblicalCovenant;
  theologicalFunction: string;
  genealogy: string;
  description: string;
  keyVerses: string[];
  period: string;
  // UI Compatibility fields
  role?: string;
  timeline?: string;
  relatedPeople?: string[];
  relatedLocations?: string[];
}

export const BIBLICAL_PEOPLE: BiblicalPerson[] = [
  {
    id: "adao",
    namePt: "Adão",
    nameHe: "אָדָם (Adam)",
    etymology: "Solo, terra vermelha, humanidade.",
    covenant: "Adâmica",
    theologicalFunction: "Cabeça federal da humanidade; tipo de Cristo (o 'Último Adão').",
    genealogy: "Criado diretamente por Deus; pai de Sete, Caim e Abel.",
    description: "O primeiro homem, representante de toda a raça humana no pacto das obras.",
    keyVerses: ["Genesis 2:7", "Romans 5:12-21", "1 Corinthians 15:45"],
    period: "Início da Criação"
  },
  {
    id: "deus",
    namePt: "Deus",
    nameHe: "אֱלֹהִים (Elohim) / יהוה (Yahweh)",
    etymology: "O Ser Supremo, o Criador.",
    covenant: "Adâmica",
    theologicalFunction: "Criador, Sustentador, Legislador e Redentor. O motor primário de toda a história bíblica.",
    genealogy: "Autoexistente (Sem princípio nem fim).",
    description: "O Deus Triúno que traz todas as coisas à existência e governa com soberania absoluta.",
    keyVerses: ["Genesis 1:1", "Exodus 3:14", "Revelation 1:8"],
    period: "Eternidade"
  },
  {
    id: "noe",
    namePt: "Noé",
    nameHe: "נֹחַ (Noach)",
    etymology: "Descanso, consolo.",
    covenant: "Noética",
    theologicalFunction: "Preservador da vida pós-julgamento; receptor da aliança da graça comum.",
    genealogy: "Filho de Lameque; pai de Sem, Cam e Jafé.",
    description: "Patriarca que sobreviveu ao Dilúvio, através de quem Deus renovou a vida na terra.",
    keyVerses: ["Genesis 6:8", "Genesis 9:1-17", "Hebrews 11:7"],
    period: "Antediluviano / Pós-Diluviano"
  },
  {
    id: "abrahao",
    namePt: "Abraão",
    nameHe: "אַבְרָהָם (Avraham)",
    etymology: "Pai de uma multidão.",
    covenant: "Abraâmica",
    theologicalFunction: "Pai de todos os que creem; recebedor da promessa da semente e da terra.",
    genealogy: "Filho de Terá; pai de Isaque e Ismael.",
    description: "Chamado de Ur para fundar a nação de Israel, através de quem todas as famílias da terra seriam abençoadas.",
    keyVerses: ["Genesis 12:1-3", "Genesis 15:6", "Galatians 3:7-9"],
    period: "Era Patriarcal (c. 2000 a.C.)"
  },
  {
    id: "moises",
    namePt: "Moisés",
    nameHe: "מֹשֶׁה (Moshe)",
    etymology: "Tirado das águas.",
    covenant: "Mosaica",
    theologicalFunction: "Mediador da Antiga Aliança; legislador e tipo do grande Profeta vindouro.",
    genealogy: "Filho de Anrão (tribo de Levi); irmão de Arão e Miriã.",
    description: "Libertador de Israel do Egito e receptor da Torá no Sinai.",
    keyVerses: ["Exodus 3", "Deuteronomy 18:15", "Hebrews 3:1-6"],
    period: "O Êxodo (c. 1446 a.C.)"
  },
  {
    id: "davi",
    namePt: "Davi",
    nameHe: "דָּוִד (Dawid)",
    etymology: "Amado.",
    covenant: "Davídica",
    theologicalFunction: "Rei teocrático ideal; protótipo do Messias (o 'Filho de Davi').",
    genealogy: "Filho de Jessé; da tribo de Judá; ancestral de Jesus.",
    description: "Segundo rei de Israel, estabeleceu o trono eterno através da promessa messiânica.",
    keyVerses: ["2 Samuel 7:12-16", "Psalm 110", "Matthew 1:1"],
    period: "Monarquia Unida (c. 1000 a.C.)"
  },
  {
    id: "jesus",
    namePt: "Jesus",
    nameHe: "יֵשׁוּעַ (Yeshua)",
    etymology: "O Senhor é Salvação.",
    covenant: "Nova Aliança",
    theologicalFunction: "Mediador da Nova Aliança; o Messias, Deus encarnado, Salvador e Sumo Sacerdote.",
    genealogy: "Linhagem de Davi; Filho de Deus e Filho do Homem.",
    description: "O cumprimento de todas as alianças anteriores e o Redentor do mundo.",
    keyVerses: ["John 1:14", "Luke 22:20", "Hebrews 9:15"],
    period: "Século I"
  },
  {
    id: "paulo",
    namePt: "Paulo",
    nameHe: "שָׁאוּל (Sha'ul) / Paulus",
    etymology: "Desejado (Shaul) / Pequeno (Paulus).",
    covenant: "Nova Aliança",
    theologicalFunction: "Apóstolo dos gentios; principal sistematizador da teologia da Nova Aliança.",
    genealogy: "Tribo de Benjamim; cidadão romano.",
    description: "Missionário e autor de grande parte do Novo Testamento, expandiu a fé para o mundo greco-romano.",
    keyVerses: ["Acts 9", "Romans 1:16-17", "2 Timothy 4:7-8"],
    period: "Igreja Primitiva (c. 5-67 d.C.)"
  }
];

export function searchPeople(query: string): BiblicalPerson[] {
  const q = query.toLowerCase();
  return BIBLICAL_PEOPLE.filter(p => 
    p.namePt.toLowerCase().includes(q) || 
    p.theologicalFunction.toLowerCase().includes(q) ||
    p.covenant.toLowerCase().includes(q)
  );
}
