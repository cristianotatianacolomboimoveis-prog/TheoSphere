import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL ?? '';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const GREEK_LEXICON = [
  {
    strongId: 'G26',
    word: 'ἀγάπη',
    language: 'GK',
    definition:
      'Amor incondicional, afeição divina, benevolência sacrificial; ágape',
    academicRef: '1 Corinthians 13:4-8',
    morphology: {
      transliteration: 'agapē',
      pronunciation: 'ah-GAH-pay',
      definitionEn: 'Love, affection, benevolence; love-feast',
      partOfSpeech: 'Noun, Feminine',
      occurrences: 116,
      relatedWords: ['G25', 'G27'],
    },
  },
  {
    strongId: 'G4102',
    word: 'πίστις',
    language: 'GK',
    definition: 'Fé, crença, confiança; fidelidade, lealdade',
    academicRef: 'Hebrews 11:1',
    morphology: {
      transliteration: 'pistis',
      pronunciation: 'PIS-tis',
      definitionEn: 'Faith, belief, trust, confidence; fidelity, faithfulness',
      partOfSpeech: 'Noun, Feminine',
      occurrences: 244,
      relatedWords: ['G4100', 'G4103'],
    },
  },
  {
    strongId: 'G3056',
    word: 'λόγος',
    language: 'GK',
    definition:
      'Palavra, discurso, razão; o Verbo divino; expressão do pensamento',
    academicRef: 'John 1:1',
    morphology: {
      transliteration: 'logos',
      pronunciation: 'LO-gos',
      definitionEn: 'Word, speech, discourse; reason, account; the divine Word',
      partOfSpeech: 'Noun, Masculine',
      occurrences: 330,
      relatedWords: ['G3004', 'G4487'],
    },
  },
];

const HEBREW_LEXICON = [
  {
    strongId: 'H430',
    word: 'אֱלֹהִים',
    language: 'HB',
    definition: 'Deus, deuses, juízes; o Deus supremo (plural majestático)',
    academicRef: 'Genesis 1:1',
    morphology: {
      transliteration: 'Elohim',
      pronunciation: 'el-oh-HEEM',
      definitionEn: 'God, gods, judges; the supreme God',
      partOfSpeech: 'Noun, Masculine Plural',
      occurrences: 2606,
      relatedWords: ['H410', 'H433'],
    },
  },
  {
    strongId: 'H3068',
    word: 'יְהוָה',
    language: 'HB',
    definition:
      'O SENHOR, Jeová; o nome próprio do Deus de Israel (tetragrama)',
    academicRef: 'Exodus 3:14-15',
    morphology: {
      transliteration: 'YHWH',
      pronunciation: 'yah-WEH',
      definitionEn: 'The LORD, Jehovah; the proper name of the God of Israel',
      partOfSpeech: 'Noun, Proper',
      occurrences: 6519,
      relatedWords: ['H1961', 'H3050'],
    },
  },
  {
    strongId: 'H2617',
    word: 'חֶסֶד',
    language: 'HB',
    definition: 'Amor leal, misericórdia, fidelidade, bondade inabalável',
    academicRef: 'Psalm 136:1',
    morphology: {
      transliteration: 'chesed',
      pronunciation: 'KHEH-sed',
      definitionEn: 'Lovingkindness, mercy, faithfulness, steadfast love',
      partOfSpeech: 'Noun, Masculine',
      occurrences: 249,
      relatedWords: ['H2616', 'H2623'],
    },
  },
  {
    strongId: 'H7965',
    word: 'שָׁלוֹם',
    language: 'HB',
    definition: 'Paz, completude, bem-estar, integridade, prosperidade',
    academicRef: 'Numbers 6:26',
    morphology: {
      transliteration: 'shalom',
      pronunciation: 'shah-LOHM',
      definitionEn: 'Peace, completeness, welfare, wholeness',
      partOfSpeech: 'Noun, Masculine',
      occurrences: 237,
      relatedWords: ['H7999', 'H8010'],
    },
  },
  {
    strongId: 'H8451',
    word: 'תּוֹرָה',
    language: 'HB',
    definition: 'Lei, instrução, ensino, direção; a Lei de Moisés',
    academicRef: 'Psalm 1:2',
    morphology: {
      transliteration: 'torah',
      pronunciation: 'toh-RAH',
      definitionEn: 'Law, instruction, teaching, direction',
      partOfSpeech: 'Noun, Feminine',
      occurrences: 219,
      relatedWords: ['H3384'],
    },
  },
  {
    strongId: 'H6666',
    word: 'צְדָקָה',
    language: 'HB',
    definition: 'Justiça, retidão, equidade divina',
    academicRef: 'Genesis 15:6',
    morphology: {
      transliteration: 'tsedaqah',
      pronunciation: 'tseh-dah-KAH',
      definitionEn: 'Righteousness, justice, rightness',
      partOfSpeech: 'Noun, Feminine',
      occurrences: 159,
      relatedWords: ['H6663', 'H6662'],
    },
  },
  {
    strongId: 'H1285',
    word: 'בְּרִית',
    language: 'HB',
    definition: 'Aliança, pacto, tratado, acordo solene com Deus',
    academicRef: 'Genesis 15:18',
    morphology: {
      transliteration: 'berith',
      pronunciation: 'beh-REET',
      definitionEn: 'Covenant, alliance, treaty, agreement',
      partOfSpeech: 'Noun, Feminine',
      occurrences: 284,
      relatedWords: ['H1262'],
    },
  },
  {
    strongId: 'H3444',
    word: 'יְשׁוּעָה',
    language: 'HB',
    definition: 'Salvação, libertação, vitória; raiz do nome Jesus',
    academicRef: 'Exodus 14:13',
    morphology: {
      transliteration: 'yeshuah',
      pronunciation: 'yeh-shoo-AH',
      definitionEn: 'Salvation, deliverance, victory',
      partOfSpeech: 'Noun, Feminine',
      occurrences: 78,
      relatedWords: ['H3467', 'H3091'],
    },
  },
  {
    strongId: 'H6944',
    word: 'קֹדֶשׁ',
    language: 'HB',
    definition: 'Santidade, sacralidade, coisa sagrada, santuário',
    academicRef: 'Leviticus 19:2',
    morphology: {
      transliteration: 'qodesh',
      pronunciation: 'KOH-desh',
      definitionEn: 'Holiness, sacredness, holy thing, sanctuary',
      partOfSpeech: 'Noun, Masculine',
      occurrences: 470,
      relatedWords: ['H6942', 'H6918'],
    },
  },
  {
    strongId: 'H1',
    word: 'אָב',
    language: 'HB',
    definition: 'Pai, ancestral, originador; título de Deus como Pai',
    academicRef: 'Genesis 2:24',
    morphology: {
      transliteration: 'ab',
      pronunciation: 'ahv',
      definitionEn: 'Father, ancestor, originator',
      partOfSpeech: 'Noun, Masculine',
      occurrences: 1211,
      relatedWords: ['G3962'],
    },
  },
  {
    strongId: 'H4899',
    word: 'מָשִׁיחַ',
    language: 'HB',
    definition: 'Ungido, Messias; o prometido libertador de Israel',
    academicRef: 'Daniel 9:25-26',
    morphology: {
      transliteration: 'mashiach',
      pronunciation: 'mah-SHEE-akh',
      definitionEn: 'Anointed one, Messiah',
      partOfSpeech: 'Adjective/Noun',
      occurrences: 39,
      relatedWords: ['H4886', 'G5547'],
    },
  },
  {
    strongId: 'H7307',
    word: 'רוּחַ',
    language: 'HB',
    definition: 'Espírito, vento, sopro; o Espírito de Deus',
    academicRef: 'Genesis 1:2',
    morphology: {
      transliteration: 'ruach',
      pronunciation: 'ROO-akh',
      definitionEn: 'Spirit, wind, breath; the Spirit of God',
      partOfSpeech: 'Noun, Feminine',
      occurrences: 378,
      relatedWords: ['G4151'],
    },
  },
  {
    strongId: 'H3045',
    word: 'יָדַע',
    language: 'HB',
    definition:
      'Conhecer, perceber, discernir, experimentar; conhecimento íntimo',
    academicRef: 'Genesis 4:1',
    morphology: {
      transliteration: 'yada',
      pronunciation: 'yah-DAH',
      definitionEn: 'To know, perceive, discern, experience',
      partOfSpeech: 'Verb',
      occurrences: 947,
      relatedWords: ['H1847'],
    },
  },
  {
    strongId: 'H539',
    word: 'אָמַן',
    language: 'HB',
    definition: 'Crer, ser fiel, confiar; raiz da palavra Amém',
    academicRef: 'Genesis 15:6',
    morphology: {
      transliteration: 'aman',
      pronunciation: 'ah-MAN',
      definitionEn: 'To believe, be faithful, trust; Amen',
      partOfSpeech: 'Verb',
      occurrences: 108,
      relatedWords: ['H530', 'H543'],
    },
  },
  {
    strongId: 'H3474',
    word: 'כָּבוֹD',
    language: 'HB',
    definition: 'Glória, honra, splendor, peso; a glória manifesta de Deus',
    academicRef: 'Exodus 33:18',
    morphology: {
      transliteration: 'kabod',
      pronunciation: 'kah-BOHD',
      definitionEn: 'Glory, honor, splendor, weightiness',
      partOfSpeech: 'Noun, Masculine',
      occurrences: 200,
      relatedWords: ['H3513'],
    },
  },
];

async function main() {
  console.log('Seed Lexicon: Populando léxicos Strong...');

  const allLexicons = [...GREEK_LEXICON, ...HEBREW_LEXICON];

  for (const entry of allLexicons) {
    await prisma.lexicalEntry.upsert({
      where: { strongId: entry.strongId },
      update: entry,
      create: entry,
    });
    console.log(`  [OK] Strong ${entry.strongId} (${entry.word})`);
  }

  console.log('Seed Lexicon: Concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
