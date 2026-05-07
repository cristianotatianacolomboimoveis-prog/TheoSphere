export interface StrongsEntry {
  number: string;
  lemma: string;
  transliteration: string;
  pronunciation: string;
  definition: string;
  definitionPt: string;
  partOfSpeech: string;
  occurrences: number;
  kjvTranslations: { word: string; count: number }[];
  relatedWords: string[];
  keyVerses: string[];
}

export const STRONGS_HEBREW: Record<string, StrongsEntry> = {
  H430: {
    number: "H430", lemma: "אֱלֹהִים", transliteration: "Elohim", pronunciation: "el-oh-HEEM",
    definition: "God, gods, judges; the supreme God", definitionPt: "Deus, deuses, juízes; o Deus supremo (plural majestático)",
    partOfSpeech: "Noun, Masculine Plural", occurrences: 2606,
    kjvTranslations: [{ word: "God", count: 2346 }, { word: "god", count: 244 }, { word: "judge", count: 5 }],
    relatedWords: ["H410 (El)", "H433 (Eloah)"],
    keyVerses: ["Genesis 1:1", "Deuteronomy 6:4", "Psalm 19:1", "Isaiah 45:5"],
  },
  H3068: {
    number: "H3068", lemma: "יְהוָה", transliteration: "YHWH", pronunciation: "yah-WEH",
    definition: "The LORD, Jehovah; the proper name of the God of Israel", definitionPt: "O SENHOR, Jeová; o nome próprio do Deus de Israel (tetragrama)",
    partOfSpeech: "Noun, Proper", occurrences: 6519,
    kjvTranslations: [{ word: "LORD", count: 6510 }, { word: "GOD", count: 4 }, { word: "Jehovah", count: 4 }],
    relatedWords: ["H1961 (hayah)", "H3050 (Yah)"],
    keyVerses: ["Exodus 3:14-15", "Deuteronomy 6:4", "Psalm 23:1", "Isaiah 42:8"],
  },
  H2617: {
    number: "H2617", lemma: "חֶסֶד", transliteration: "chesed", pronunciation: "KHEH-sed",
    definition: "Lovingkindness, mercy, faithfulness, steadfast love", definitionPt: "Amor leal, misericórdia, fidelidade, bondade inabalável",
    partOfSpeech: "Noun, Masculine", occurrences: 249,
    kjvTranslations: [{ word: "mercy", count: 149 }, { word: "kindness", count: 40 }, { word: "lovingkindness", count: 30 }, { word: "goodness", count: 12 }],
    relatedWords: ["H2616 (chasad)", "H2623 (chasid)"],
    keyVerses: ["Psalm 136:1", "Lamentations 3:22-23", "Micah 6:8", "Hosea 6:6"],
  },
  H7965: {
    number: "H7965", lemma: "שָׁלוֹם", transliteration: "shalom", pronunciation: "shah-LOHM",
    definition: "Peace, completeness, welfare, wholeness", definitionPt: "Paz, completude, bem-estar, integridade, prosperidade",
    partOfSpeech: "Noun, Masculine", occurrences: 237,
    kjvTranslations: [{ word: "peace", count: 175 }, { word: "well", count: 14 }, { word: "peaceably", count: 9 }, { word: "welfare", count: 5 }],
    relatedWords: ["H7999 (shalam)", "H8010 (Shelomoh/Solomon)"],
    keyVerses: ["Numbers 6:26", "Isaiah 9:6", "Psalm 122:6", "Judges 6:24"],
  },
  H8451: {
    number: "H8451", lemma: "תּוֹרָה", transliteration: "torah", pronunciation: "toh-RAH",
    definition: "Law, instruction, teaching, direction", definitionPt: "Lei, instrução, ensino, direção; a Lei de Moisés",
    partOfSpeech: "Noun, Feminine", occurrences: 219,
    kjvTranslations: [{ word: "law", count: 219 }],
    relatedWords: ["H3384 (yarah)"],
    keyVerses: ["Psalm 1:2", "Psalm 19:7", "Deuteronomy 4:44", "Joshua 1:8"],
  },
  H6666: {
    number: "H6666", lemma: "צְדָקָה", transliteration: "tsedaqah", pronunciation: "tseh-dah-KAH",
    definition: "Righteousness, justice, rightness", definitionPt: "Justiça, retidão, equidade divina",
    partOfSpeech: "Noun, Feminine", occurrences: 159,
    kjvTranslations: [{ word: "righteousness", count: 128 }, { word: "justice", count: 15 }, { word: "right", count: 9 }],
    relatedWords: ["H6663 (tsadaq)", "H6662 (tsaddiq)"],
    keyVerses: ["Genesis 15:6", "Isaiah 64:6", "Psalm 23:3", "Proverbs 21:21"],
  },
  H1285: {
    number: "H1285", lemma: "בְּרִית", transliteration: "berith", pronunciation: "beh-REET",
    definition: "Covenant, alliance, treaty, agreement", definitionPt: "Aliança, pacto, tratado, acordo solene com Deus",
    partOfSpeech: "Noun, Feminine", occurrences: 284,
    kjvTranslations: [{ word: "covenant", count: 264 }, { word: "league", count: 17 }, { word: "confederacy", count: 1 }],
    relatedWords: ["H1262 (barah)"],
    keyVerses: ["Genesis 15:18", "Exodus 19:5", "Jeremiah 31:31", "2 Samuel 7:12-16"],
  },
  H3444: {
    number: "H3444", lemma: "יְשׁוּעָה", transliteration: "yeshuah", pronunciation: "yeh-shoo-AH",
    definition: "Salvation, deliverance, victory", definitionPt: "Salvação, libertação, vitória; raiz do nome Jesus",
    partOfSpeech: "Noun, Feminine", occurrences: 78,
    kjvTranslations: [{ word: "salvation", count: 65 }, { word: "deliverance", count: 3 }, { word: "help", count: 4 }],
    relatedWords: ["H3467 (yasha)", "H3091 (Yehoshua/Joshua)"],
    keyVerses: ["Exodus 14:13", "Psalm 27:1", "Isaiah 12:2", "Psalm 118:14"],
  },
  H6944: {
    number: "H6944", lemma: "קֹדֶשׁ", transliteration: "qodesh", pronunciation: "KOH-desh",
    definition: "Holiness, sacredness, holy thing, sanctuary", definitionPt: "Santidade, sacralidade, coisa sagrada, santuário",
    partOfSpeech: "Noun, Masculine", occurrences: 470,
    kjvTranslations: [{ word: "holy", count: 262 }, { word: "sanctuary", count: 68 }, { word: "hallowed", count: 25 }, { word: "holiness", count: 16 }],
    relatedWords: ["H6942 (qadash)", "H6918 (qadosh)"],
    keyVerses: ["Leviticus 19:2", "Exodus 3:5", "Isaiah 6:3", "Psalm 99:9"],
  },
  H1: {
    number: "H1", lemma: "אָב", transliteration: "ab", pronunciation: "ahv",
    definition: "Father, ancestor, originator", definitionPt: "Pai, ancestral, originador; título de Deus como Pai",
    partOfSpeech: "Noun, Masculine", occurrences: 1211,
    kjvTranslations: [{ word: "father", count: 1070 }, { word: "chief", count: 2 }, { word: "families", count: 1 }],
    relatedWords: ["G3962 (patēr)"],
    keyVerses: ["Genesis 2:24", "Exodus 20:12", "Psalm 68:5", "Malachi 2:10"],
  },
  H4899: {
    number: "H4899", lemma: "מָשִׁיחַ", transliteration: "mashiach", pronunciation: "mah-SHEE-akh",
    definition: "Anointed one, Messiah", definitionPt: "Ungido, Messias; o prometido libertador de Israel",
    partOfSpeech: "Adjective/Noun", occurrences: 39,
    kjvTranslations: [{ word: "anointed", count: 37 }, { word: "Messiah", count: 2 }],
    relatedWords: ["H4886 (mashach)", "G5547 (Christos)"],
    keyVerses: ["Daniel 9:25-26", "Psalm 2:2", "Isaiah 61:1", "1 Samuel 16:13"],
  },
  H7307: {
    number: "H7307", lemma: "רוּחַ", transliteration: "ruach", pronunciation: "ROO-akh",
    definition: "Spirit, wind, breath; the Spirit of God", definitionPt: "Espírito, vento, sopro; o Espírito de Deus",
    partOfSpeech: "Noun, Feminine", occurrences: 378,
    kjvTranslations: [{ word: "spirit", count: 232 }, { word: "wind", count: 92 }, { word: "breath", count: 28 }, { word: "mind", count: 6 }],
    relatedWords: ["G4151 (pneuma)"],
    keyVerses: ["Genesis 1:2", "Ezekiel 37:9", "Isaiah 11:2", "Joel 2:28"],
  },
  H3045: {
    number: "H3045", lemma: "יָדַע", transliteration: "yada", pronunciation: "yah-DAH",
    definition: "To know, perceive, discern, experience", definitionPt: "Conhecer, perceber, discernir, experimentar; conhecimento íntimo",
    partOfSpeech: "Verb", occurrences: 947,
    kjvTranslations: [{ word: "know", count: 645 }, { word: "known", count: 105 }, { word: "knowledge", count: 19 }, { word: "perceive", count: 18 }],
    relatedWords: ["H1847 (daath)"],
    keyVerses: ["Genesis 4:1", "Psalm 46:10", "Proverbs 1:7", "Jeremiah 31:34"],
  },
  H539: {
    number: "H539", lemma: "אָמַן", transliteration: "aman", pronunciation: "ah-MAN",
    definition: "To believe, be faithful, trust; Amen", definitionPt: "Crer, ser fiel, confiar; raiz da palavra Amém",
    partOfSpeech: "Verb", occurrences: 108,
    kjvTranslations: [{ word: "believe", count: 44 }, { word: "faithful", count: 20 }, { word: "sure", count: 11 }, { word: "established", count: 7 }],
    relatedWords: ["H530 (emunah)", "H543 (amen)"],
    keyVerses: ["Genesis 15:6", "Isaiah 7:9", "Habakkuk 2:4", "2 Chronicles 20:20"],
  },
  H3474: {
    number: "H3474", lemma: "כָּבוֹד", transliteration: "kabod", pronunciation: "kah-BOHD",
    definition: "Glory, honor, splendor, weightiness", definitionPt: "Glória, honra, esplendor, peso; a glória manifesta de Deus",
    partOfSpeech: "Noun, Masculine", occurrences: 200,
    kjvTranslations: [{ word: "glory", count: 156 }, { word: "honour", count: 32 }, { word: "glorious", count: 10 }],
    relatedWords: ["H3513 (kabad)"],
    keyVerses: ["Exodus 33:18", "Psalm 19:1", "Isaiah 6:3", "Ezekiel 1:28"],
  },
};

export function searchStrongsHebrew(query: string): StrongsEntry[] {
  const lower = query.toLowerCase();
  return Object.values(STRONGS_HEBREW).filter(entry =>
    entry.number.toLowerCase().includes(lower) ||
    entry.lemma.toLowerCase().includes(lower) ||
    entry.transliteration.toLowerCase().includes(lower) ||
    entry.definition.toLowerCase().includes(lower) ||
    entry.definitionPt.toLowerCase().includes(lower)
  );
}
