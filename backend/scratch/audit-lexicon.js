const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.lexicalEntry.count();
    const entries = await prisma.lexicalEntry.findMany({ take: 5 });
    console.log(JSON.stringify({ count, entries }, null, 2));
  } catch (e) {
    console.log(e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
