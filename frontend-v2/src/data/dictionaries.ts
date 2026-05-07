export interface DictionaryEntry {
  id: string;
  word: string;
  source: string; // Easton's, ISBE, Smith's
  definition: string;
}

export const DICTIONARIES: DictionaryEntry[] = [
  {
    id: "isbe-justification",
    word: "Justification",
    source: "International Standard Bible Encyclopedia (ISBE)",
    definition: "O ato forense ou declarativo de Deus pelo qual Ele declara justo o pecador que crê em Cristo, não com base no caráter do pecador, mas com base na justiça perfeita de Cristo imputada ao crente. Diferente da santificação, que é um processo moral interior.",
  },
  {
    id: "easton-grace",
    word: "Grace",
    source: "Easton's Bible Dictionary",
    definition: "O favor imerecido de Deus para com a humanidade. No Novo Testamento, refere-se ao amor de Deus manifestado no perdão e na salvação através de Jesus Cristo, apartados de qualquer mérito ou obras da lei.",
  },
  {
    id: "smith-baptize",
    word: "Baptism",
    source: "Smith's Bible Dictionary",
    definition: "Ato de iniciação ou profissão de fé. A palavra deriva do grego baptizo, que originalmente significa 'mergulhar' ou 'imergir'. Era usado para prosélitos judeus antes de ser ordenado por Cristo como o rito de entrada na comunidade cristã.",
  },
  {
    id: "isbe-sanctification",
    word: "Sanctification",
    source: "ISBE",
    definition: "O processo contínuo pelo qual o Espírito Santo transforma o caráter do crente à imagem de Cristo. Envolve a separação do pecado e a dedicação a Deus. É progressivo nesta vida e será concluído apenas na glorificação.",
  }
];

export function searchDictionaries(query: string): DictionaryEntry[] {
  const lowerQuery = query.toLowerCase();
  return DICTIONARIES.filter(d => d.word.toLowerCase().includes(lowerQuery) || d.definition.toLowerCase().includes(lowerQuery));
}
