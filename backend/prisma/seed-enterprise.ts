import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🏛️ Starting Enterprise-Grade Theological Seeding...');

  // 1. Lexical Entries (PhD Level - BDAG/HALOT)
  const lexicalData = [
    {
      strongId: 'G26',
      word: 'ἀγάπη (agapē)',
      language: 'GK',
      definition: 'Sacrificial, unconditional love. Distinct from philia (friendship) or eros (romantic). In the NT, it describes God’s benevolent concern for mankind and the appropriate response of believers.',
      academicRef: 'BDAG p.6-7; TDNT 1:21-55',
      morphology: { case: 'nominative', gender: 'feminine', number: 'singular' }
    },
    {
      strongId: 'G3056',
      word: 'λόγος (logos)',
      language: 'GK',
      definition: 'Word, reason, discourse. In Johannine theology, the pre-existent and incarnate Second Person of the Trinity. Contextually signifies the ultimate self-revelation of God.',
      academicRef: 'BDAG p.600-603; TDNT 4:69-143',
      morphology: { case: 'nominative', gender: 'masculine', number: 'singular' }
    },
    {
      strongId: 'G1343',
      word: 'δικαιοσύνη (dikaiosynē)',
      language: 'GK',
      definition: 'Righteousness, justice, judicial standing. In Paul, often refers to "God’s righteousness" (dikaiosynē theou) as both His attribute and His gift of standing to the believer.',
      academicRef: 'BDAG p.247-249; Cranfield, Romans 1:17',
      morphology: { case: 'nominative', gender: 'feminine', number: 'singular' }
    },
    {
      strongId: 'G4151',
      word: 'πνεῦμα (pneuma)',
      language: 'GK',
      definition: 'Spirit, wind, breath. The Holy Spirit, the third person of the Trinity, or the human spirit/disposition. Fundamental for pneumatology.',
      academicRef: 'BDAG p.832-835',
      morphology: { case: 'nominative', gender: 'neuter', number: 'singular' }
    },
    {
      strongId: 'G5485',
      word: 'χάρις (charis)',
      language: 'GK',
      definition: 'Grace, favor, gift. God’s unmerited favor toward sinners. Central to the theology of salvation by grace through faith.',
      academicRef: 'BDAG p.1077-1081',
      morphology: { case: 'nominative', gender: 'feminine', number: 'singular' }
    },
    {
      strongId: 'H7225',
      word: 'רֵאשִׁית (reshith)',
      language: 'HB',
      definition: 'Beginning, firstfruits, chief part. In Gen 1:1, denotes the temporal and ontic starting point of the created order.',
      academicRef: 'HALOT p.1165-1166',
      morphology: { type: 'noun', state: 'construct' }
    },
    {
      strongId: 'H430',
      word: 'אֱלֹהִים (elohim)',
      language: 'HB',
      definition: 'God, gods, judges. Plural of majesty for the one true God of Israel. In Gen 1:1, the subject of creation.',
      academicRef: 'HALOT p.52-53',
      morphology: { type: 'noun', number: 'plural' }
    }
  ];

  console.log('  - Seeding Lexical Entries...');
  for (const entry of lexicalData) {
    await prisma.lexicalEntry.upsert({
      where: { strongId: entry.strongId },
      update: entry,
      create: entry,
    });
  }

  // 2. Technical Commentaries
  const commentaries = [
    {
      bookId: 43, // John
      chapter: 1,
      verse: 1,
      author: 'D.A. Carson',
      source: 'The Gospel According to John (PNTC)',
      content: 'The Word was with God (pros ton theon). The preposition pros indicates not just proximity but relationship and face-to-face communion. The Word is distinct from the Father yet in eternal fellowship with Him.',
      tags: ['Trinity', 'John 1:1', 'Logos']
    },
    {
      bookId: 43, // John
      chapter: 1,
      verse: 1,
      author: 'Leon Morris',
      source: 'The Gospel According to John (NICNT)',
      content: 'And the Word was God (theos ēn ho logos). The lack of the article before theos emphasizes the nature or essence of the Word. He was not "the" God (which would identify Him with the Father) but was in essence God.',
      tags: ['Deity of Christ', 'Greek Grammar']
    },
    {
      bookId: 45, // Romans
      chapter: 1,
      verse: 17,
      author: 'Douglas Moo',
      source: 'The Epistle to the Romans (NICNT)',
      content: 'The "righteousness of God" is God’s judicial verdict by which He declares the sinner righteous based on the work of Christ. It is an alien righteousness (iustitia aliena) imputed to the believer.',
      tags: ['Justification', 'Imputation']
    },
    {
      bookId: 45, // Romans
      chapter: 3,
      verse: 25,
      author: 'Thomas Schreiner',
      source: 'Romans (BECNT)',
      content: 'Propitiation (hilastērion) involves the satisfaction of God’s wrath. Christ’s sacrifice was necessary to uphold God’s justice while justifying the ungodly.',
      tags: ['Atonement', 'Propitiation']
    }
  ];

  console.log('  - Seeding Technical Commentaries...');
  for (const comm of commentaries) {
    await prisma.technicalCommentary.create({
      data: comm
    });
  }

  // 3. Theology Embeddings (Dummy Vectors for Demo)
  // We need a vector literal like '[0.1, 0.2, ...]'
  const dummyVector = `[${new Array(768).fill(0).map(() => Math.random().toFixed(4)).join(',')}]`;

  const theologyKnowledge = [
    {
      content: 'The doctrine of the Trinity states that God is one in essence and three in person: Father, Son, and Holy Spirit. This is not tritheism (three gods) nor modalism (one god in three roles).',
      tradition: 'Ecumenical'
    },
    {
      content: 'Sola Fide (Faith Alone) is the Reformational principle that justification is received by faith apart from any human works or merit.',
      tradition: 'Protestant'
    },
    {
      content: 'Prevenient Grace is the Arminian concept that God’s grace precedes human decision, enabling the fallen will to respond to the Gospel.',
      tradition: 'Arminian'
    }
  ];

  console.log('  - Seeding Theology Knowledge (Vectorized)...');
  for (const item of theologyKnowledge) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "TheologyEmbedding" (content, tradition, embedding)
      VALUES ($1, $2, $3::vector)
    `, item.content, item.tradition, dummyVector);
  }

  console.log('✅ Seeding Completed Successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
