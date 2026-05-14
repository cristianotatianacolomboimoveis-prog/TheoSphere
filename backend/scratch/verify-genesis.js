const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const verses = await prisma.bibleVerse.findMany({
    where: { book: "Gênesis", chapter: 1 },
    take: 5,
    select: { translation: true, verse: true, text: true }
  });
  console.log('Versículos encontrados em Gênesis 1:', JSON.stringify(verses));
}

main().catch(console.error).finally(() => prisma.$disconnect());
