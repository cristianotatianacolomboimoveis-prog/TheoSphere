const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const start = Date.now();
  try {
    const one = await prisma.$queryRaw`SELECT 1 as result`;
    const count = await prisma.bibleVerse.count();
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      status: 'SUCCESS',
      one: one[0].result,
      verseCount: count,
      latencyMs: duration
    }));
  } catch (e) {
    console.log(JSON.stringify({
      status: 'ERROR',
      message: e.message
    }));
  } finally {
    await prisma.$disconnect();
  }
}

main();
