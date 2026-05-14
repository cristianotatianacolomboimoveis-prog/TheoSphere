import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed Graph: Populando Grafo Bíblico Relacional...');

  // 1. Criar Nodes
  const jesus = await prisma.graphNode.create({
    data: { label: 'Jesus Cristo', type: 'person', metadata: { title: 'Messias', period: 'Século I' } }
  });
  const maria = await prisma.graphNode.create({
    data: { label: 'Maria', type: 'person', metadata: { title: 'Mãe de Jesus' } }
  });
  const nazare = await prisma.graphNode.create({
    data: { label: 'Nazaré', type: 'place', metadata: { region: 'Galileia' } }
  });
  const sermaoMonte = await prisma.graphNode.create({
    data: { label: 'Sermão do Monte', type: 'event', metadata: { location: 'Galileia' } }
  });

  // 2. Criar Edges (Relacionamentos)
  await prisma.graphEdge.createMany({
    data: [
      { sourceId: jesus.id, targetId: maria.id, relationType: 'son_of' },
      { sourceId: jesus.id, targetId: nazare.id, relationType: 'lived_at' },
      { sourceId: sermaoMonte.id, targetId: jesus.id, relationType: 'speaker' },
      { sourceId: sermaoMonte.id, targetId: nazare.id, relationType: 'near_to' },
    ]
  });

  console.log('Seed Graph: Concluído!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
