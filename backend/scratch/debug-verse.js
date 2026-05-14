const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const v = await prisma.bibleVerse.findFirst({
      where: { bookId: 43, chapter: 3, verse: 1 }
    });
    console.log(JSON.stringify(v, null, 2));
  } catch (e) {
    console.log(e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
