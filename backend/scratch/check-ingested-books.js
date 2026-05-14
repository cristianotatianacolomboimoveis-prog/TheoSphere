const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = 'e850cb80-d129-4810-957b-bc94d1fe2aee';
  const embeddings = await prisma.userEmbedding.findMany({
    where: {
      userId: userId,
      type: 'library_book'
    },
    select: {
      metadata: true
    }
  });

  console.log(`Total library book chunks for user ${userId}:`, embeddings.length);
  
  const files = new Set();
  embeddings.forEach(e => {
    if (e.metadata && e.metadata.fileName) {
      files.add(e.metadata.fileName);
    }
  });

  console.log('Unique files processed:');
  files.forEach(f => console.log(`- ${f}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
