import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Enterprise Data...');

  // Limpar dados anteriores para evitar duplicatas
  await prisma.model3D.deleteMany();
  await prisma.theologicalContent.deleteMany();
  await prisma.waypoint.deleteMany();
  await prisma.graphEdge.deleteMany();
  await prisma.graphNode.deleteMany();

  // 1. Criar Rota do Êxodo
  const exodo = await prisma.route.upsert({
    where: { slug: 'exodo' },
    update: {},
    create: {
      title: 'A Rota da Redenção (Êxodo)',
      slug: 'exodo',
      description: 'Uma jornada épica do cativeiro no Egito até a entrega da Lei no Monte Sinai.',
      era: 'Bronze Tardio',
      coverImage: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80',
    }
  });

  // 2. Criar Waypoints
  const w1 = await prisma.waypoint.create({
    data: {
      routeId: exodo.id,
      stepOrder: 1,
      title: 'Pi-Ramessés',
      description: 'A capital do Delta onde os israelitas foram escravizados.',
      latitude: 30.7963,
      longitude: 31.8347,
      period: '1446 a.C.',
      imageUrl: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a7447?auto=format&fit=crop&w=800&q=80',
      contents: {
        create: [
          {
            type: 'bible',
            language: 'pt-BR',
            title: 'O Clamor em Ramessés',
            content: 'E os filhos de Israel gemiam debaixo da servidão, e clamaram; e o seu clamor subiu a Deus.',
            references: ['Êxodo 2:23', 'Êxodo 12:37']
          },
          {
            type: 'history',
            language: 'pt-BR',
            title: 'Arqueologia de Qantir',
            content: 'Identificada como a antiga Pi-Ramessés, capital de Ramsés II.',
            references: ['Manfred Bietak Research']
          }
        ]
      },
      models3d: {
        create: {
          modelName: 'Altar de Tijolos',
          modelUrl: 'internal://altar',
          metadata: { type: 'altar' }
        }
      }
    }
  });

  const w2 = await prisma.waypoint.create({
    data: {
      routeId: exodo.id,
      stepOrder: 2,
      title: 'Travessia do Mar Vermelho',
      description: 'Onde as águas se abriram para o povo passar.',
      latitude: 28.8500,
      longitude: 32.8500,
      period: '1446 a.C.',
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
      contents: {
        create: [
          {
            type: 'bible',
            language: 'pt-BR',
            title: 'A Divisão das Águas',
            content: 'E Moisés estendeu a sua mão sobre o mar, e o Senhor fez retirar o mar por um forte vento oriental.',
            references: ['Êxodo 14:21']
          }
        ]
      },
      models3d: {
        create: {
          modelName: 'Coluna de Nuvem',
          modelUrl: 'internal://pillar',
          metadata: { type: 'pillar' }
        }
      }
    }
  });

  const w3 = await prisma.waypoint.create({
    data: {
      routeId: exodo.id,
      stepOrder: 3,
      title: 'Monte Sinai',
      description: 'O local da Aliança e da entrega dos Dez Mandamentos.',
      latitude: 28.5385,
      longitude: 33.9753,
      period: '1445 a.C.',
      imageUrl: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=800&q=80',
      contents: {
        create: [
          {
            type: 'bible',
            language: 'pt-BR',
            title: 'A Lei no Sinai',
            content: 'E todo o monte Sinai fumegava, porque o Senhor descera sobre ele em fogo.',
            references: ['Êxodo 19:18', 'Êxodo 20']
          }
        ]
      },
      models3d: {
        createMany: {
          data: [
            {
              modelName: 'A Arca da Aliança',
              modelUrl: 'internal://ark',
              metadata: { type: 'ark' }
            },
            {
              modelName: 'O Tabernáculo',
              modelUrl: 'internal://tabernacle',
              metadata: { type: 'tabernacle' }
            },
            {
              modelName: 'Tábuas da Lei',
              modelUrl: 'internal://scroll',
              metadata: { type: 'scroll' }
            }
          ]
        }
      }
    }
  });

  // 4. Criar Rota do Reino de Davi/Salomão
  const reino = await prisma.route.upsert({
    where: { slug: 'reino-unificado' },
    update: {},
    create: {
      title: 'O Reino Unificado (Davi e Salomão)',
      slug: 'reino-unificado',
      description: 'A era de ouro de Israel, da conquista de Jerusalém à construção do Templo.',
      era: 'Ferro II',
      coverImage: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80',
    }
  });

  await prisma.waypoint.create({
    data: {
      routeId: reino.id,
      stepOrder: 1,
      title: 'Jerusalém (Cidade de Davi)',
      description: 'O centro político e espiritual de Israel.',
      latitude: 31.7767,
      longitude: 35.2345,
      period: '1000 a.C.',
      contents: {
        create: [
          {
            type: 'history',
            language: 'pt-BR',
            title: 'A Conquista de Jebus',
            content: 'Davi conquistou a fortaleza de Sião, que agora é a Cidade de Davi.',
            references: ['2 Samuel 5:7']
          }
        ]
      },
      models3d: {
        create: {
          modelName: 'O Templo de Salomão',
          modelUrl: 'internal://temple',
          metadata: { type: 'temple' }
        }
      }
    }
  });

  // 5. Criar Nós do Grafo
  const n1 = await prisma.graphNode.create({
    data: {
      type: 'person',
      label: 'Moisés',
      metadata: { importance: 'High' }
    }
  });

  const n2 = await prisma.graphNode.create({
    data: {
      type: 'event',
      label: 'Êxodo',
      metadata: { era: 'Bronze' }
    }
  });

  const n3 = await prisma.graphNode.create({
    data: {
      type: 'doctrine',
      label: 'Aliança',
      metadata: { theme: 'Soteriology' }
    }
  });

  await prisma.graphEdge.createMany({
    data: [
      { sourceId: n1.id, targetId: n2.id, relationType: 'Líder de', weight: 1.0 },
      { sourceId: n2.id, targetId: n3.id, relationType: 'Resulta em', weight: 0.8 },
      { sourceId: n1.id, targetId: n3.id, relationType: 'Mediador da', weight: 0.9 }
    ]
  });

  console.log('✅ Enterprise Seeding Completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
