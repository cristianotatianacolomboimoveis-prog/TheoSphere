const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.bibleVerse.count({
    where: {
      bookId: 1,
      chapter: 1
    }
  });
  console.log(`Versículos em Gênesis 1: ${count}`);
  
  const samples = await prisma.bibleVerse.findMany({
    where: { bookId: 1, chapter: 1 },
    take: 3,
    select: { translation: true, verse: true }
  });
  console.log('Amostras:', JSON.stringify(samples));
}

main().catch(console.error).finally(() => prisma.$disconnect());
