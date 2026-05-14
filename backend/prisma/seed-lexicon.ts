import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GREEK_LEXICON = [
  {
    strongId: "G26",
    word: "ἀγάπη",
    language: "GK",
    definition: "Amor incondicional, afeição divina, benevolência sacrificial; ágape",
    academicRef: "1 Corinthians 13:4-8",
    morphology: {
      transliteration: "agapē",
      pronunciation: "ah-GAH-pay",
      definitionEn: "Love, affection, benevolence; love-feast",
      partOfSpeech: "Noun, Feminine",
      occurrences: 116,
      relatedWords: ["G25", "G27"]
    }
  },
  {
    strongId: "G4102",
    word: "πίστις",
    language: "GK",
    definition: "Fé, crença, confiança; fidelidade, lealdade",
    academicRef: "Hebrews 11:1",
    morphology: {
      transliteration: "pistis",
      pronunciation: "PIS-tis",
      definitionEn: "Faith, belief, trust, confidence; fidelity, faithfulness",
      partOfSpeech: "Noun, Feminine",
      occurrences: 244,
      relatedWords: ["G4100", "G4103"]
    }
  },
  {
    strongId: "G3056",
    word: "λόγος",
    language: "GK",
    definition: "Palavra, discurso, razão; o Verbo divino; expressão do pensamento",
    academicRef: "John 1:1",
    morphology: {
      transliteration: "logos",
      pronunciation: "LO-gos",
      definitionEn: "Word, speech, discourse; reason, account; the divine Word",
      partOfSpeech: "Noun, Masculine",
      occurrences: 330,
      relatedWords: ["G3004", "G4487"]
    }
  }
];

async function main() {
  console.log('Seed Lexicon: Populando léxicos Strong...');
  for (const entry of GREEK_LEXICON) {
    await prisma.lexicalEntry.upsert({
      where: { strongId: entry.strongId },
      update: entry,
      create: entry,
    });
  }
  console.log('Seed Lexicon: Concluído!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
