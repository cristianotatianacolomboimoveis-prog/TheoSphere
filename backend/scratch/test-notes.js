const { PrismaClient } = require('@prisma/client');
const { UserContextService } = require('../dist/src/rag/user-context.service');
const { EmbeddingService } = require('../dist/src/rag/embedding.service');
const { ConfigService } = require('@nestjs/config');

// Mock ConfigService
const config = {
  get: (key) => process.env[key]
};

async function main() {
  const prisma = new PrismaClient();
  const embeddings = new EmbeddingService(config, prisma);
  const context = new UserContextService(prisma, embeddings, config);

  const userId = 'audit-test-user-' + Date.now();
  const note = {
    id: 'note-' + Date.now(),
    userId: userId,
    type: 'note',
    content: 'A soberania de Deus é o tema central de Romanos 9.',
    metadata: { reference: 'Romanos 9:1' },
    createdAt: Date.now()
  };

  try {
    console.log('Indexing note...');
    const result = await context.indexUserDocuments(userId, [note]);
    console.log('Index result:', JSON.stringify(result));

    console.log('Searching context...');
    const search = await context.searchUserContext(userId, 'soberania');
    console.log('Search result:', JSON.stringify(search));

    // Verify DB
    const dbNote = await prisma.userEmbedding.findFirst({
      where: { userId: userId, type: 'note' }
    });
    console.log('DB Note found:', !!dbNote);

    if (dbNote && search.length > 0) {
      console.log('PASSED');
    } else {
      console.log('FAILED');
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
