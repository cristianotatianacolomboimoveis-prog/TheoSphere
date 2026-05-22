import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { THEOLOGICAL_ROUTES } from '../src/geospatial/geospatial-routes.registry';

const connectionString = process.env.DATABASE_URL ?? '';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

function getPeriodForWaypoint(name: string): string {
  const periods: Record<string, string> = {
    'Ur dos Caldeus': '2090 a.C.',
    Harã: '2085 a.C.',
    Siquém: '2082 a.C.',
    Betel: '2081 a.C.',
    'Egito (Delta do Nilo)': '2080 a.C.',
    Hebrom: '2075 a.C.',
    Berseba: '2060 a.C.',
    'Ramessés (Egito)': '1446 a.C.',
    Sucote: '1446 a.C.',
    'Travessia do Mar Vermelho': '1446 a.C.',
    'Mara (Águas Amargas)': '1446 a.C.',
    Elim: '1446 a.C.',
    Refidim: '1446 a.C.',
    'Monte Sinai (Horebe)': '1445 a.C.',
    'Cades-Barneia': '1444 a.C.',
    'Monte Nebo': '1406 a.C.',
    'Rio Jordão (Batismo)': '27 d.C.',
    'Monte da Tentação': '27 d.C.',
    Nazaré: '28 d.C.',
    Caná: '28 d.C.',
    Cafarnaum: '29 d.C.',
    'Monte das Bem-Aventuranças': '29 d.C.',
    Betsaida: '29 d.C.',
    'Mar da Galileia': '29 d.C.',
    Corazim: '30 d.C.',
    'Antioquia da Síria': '46 d.C.',
    'Seleucia da Pieria': '46 d.C.',
    Salamina: '46 d.C.',
    Pafos: '47 d.C.',
    'Perge (Pamfília)': '47 d.C.',
    'Antioquia da Pisídia': '47 d.C.',
    Icônio: '47 d.C.',
    Listra: '48 d.C.',
    Derbe: '48 d.C.',
    'Jerusalém (Prisão)': '57 d.C.',
    'Cesareia Marítima': '58 d.C.',
    Sidom: '59 d.C.',
    'Mira (Lícia)': '59 d.C.',
    'Bons Portos (Creta)': '59 d.C.',
    'Malta (Naufrágio)': '60 d.C.',
    Siracusa: '60 d.C.',
    Régio: '60 d.C.',
    Pozzuoli: '60 d.C.',
    Roma: '60-62 d.C.',
    'Jericó (Travessia do Jordão)': '1400 a.C.',
    'Siló (Distribuição das Tribos)': '1390 a.C.',
    'Siquém (Renovação da Aliança)': '1380 a.C.',
    'Jerusalém (Reino Unificado)': '1000 a.C.',
    'Samaria (Reino do Norte)': '930 a.C.',
    'Hebrom (Reino do Sul - Judá)': '920 a.C.',
    'Samaria (Cerco Assírio)': '722 a.C.',
    'Nínive (Império Assírio)': '722 a.C.',
    'Habor (Rio de Gozã)': '722 a.C.',
    'Jerusalém (Templo Destruído)': '586 a.C.',
    'Ribla (Tribunal de Nabucodonosor)': '586 a.C.',
    'Rio Quebar (Visões de Ezequiel)': '593 a.C.',
    'Babilônia (Daniel na Corte)': '605 a.C.',
    'Susa (Império Persa)': '480 a.C.',
  };
  return periods[name] || 'Século I';
}

function getEraForRoute(routeId: string): string {
  switch (routeId) {
    case 'abraao':
      return 'Bronze Médio (2000 a.C.)';
    case 'exodo':
      return 'Bronze Tardio (1446 a.C.)';
    case 'terra_prometida':
      return 'Idade do Ferro (1400-930 a.C.)';
    case 'exilio_assirio':
      return 'Exílio Assírio (722 a.C.)';
    case 'exilio_babilonico':
      return 'Exílio Babilônico (586 a.C.)';
    case 'jesus_galileia':
      return 'Evangelhos (27-30 d.C.)';
    case 'paulo':
      return 'Expansão Apostólica (46-48 d.C.)';
    case 'paulo_roma':
      return 'Expansão Apostólica (57-60 d.C.)';
    default:
      return 'Antiguidade';
  }
}

async function main() {
  console.log(
    '🌱 Seeding Enterprise Data (Routes, Waypoints, TheologicalContent, 3D Models, and Graphs)...',
  );

  // Limpar dados anteriores para evitar duplicatas
  await prisma.model3D.deleteMany();
  await prisma.theologicalContent.deleteMany();
  await prisma.waypoint.deleteMany();
  await prisma.route.deleteMany();
  await prisma.graphEdge.deleteMany();
  await prisma.graphNode.deleteMany();

  console.log('🗑️ Previous enterprise data wiped successfully.');

  let totalWaypoints = 0;
  let totalContents = 0;
  let totalModels = 0;

  for (const [routeId, route] of Object.entries(THEOLOGICAL_ROUTES)) {
    console.log(`🗺️ Seeding Route: "${route.title}" [${routeId}]...`);

    // Define a primeira imagem de waypoint como a imagem de capa da rota
    const coverImage =
      route.waypoints.length > 0 ? route.waypoints[0].img : null;

    const createdRoute = await prisma.route.upsert({
      where: { slug: routeId },
      update: {
        title: route.title,
        description: route.description,
        era: getEraForRoute(routeId),
        coverImage,
      },
      create: {
        slug: routeId,
        title: route.title,
        description: route.description,
        era: getEraForRoute(routeId),
        coverImage,
      },
    });

    for (let i = 0; i < route.waypoints.length; i++) {
      const w = route.waypoints[i];
      const stepOrder = i + 1;

      const createdWaypoint = await prisma.waypoint.create({
        data: {
          routeId: createdRoute.id,
          stepOrder,
          title: w.title,
          description: w.bible,
          latitude: w.coords[0],
          longitude: w.coords[1],
          period: getPeriodForWaypoint(w.title),
          imageUrl: w.img,
          contents: {
            create: [
              {
                type: 'bible',
                language: 'pt-BR',
                title: 'Texto Bíblico da Viagem',
                content: w.quote,
                references: [w.verse],
              },
              {
                type: 'geography',
                language: 'pt-BR',
                title: 'Contexto Geográfico',
                content: w.geo,
                references: [],
              },
              {
                type: 'history',
                language: 'pt-BR',
                title: 'Evidências Arqueológicas e Descobertas',
                content: w.arch,
                references: [],
              },
              {
                type: 'exegesis',
                language: 'pt-BR',
                title: 'Significado Teológico e Doutrina',
                content: w.bible,
                references: [],
              },
            ],
          },
          models3d: {
            create: {
              modelName: w.modelName,
              modelUrl: `internal://${w.modelType}`,
              metadata: { type: w.modelType },
            },
          },
        },
      });
      totalWaypoints++;
      totalContents += 4;
      totalModels++;
    }
    console.log(
      `  └─ Success: Seeded ${route.waypoints.length} waypoints under "${route.title}".`,
    );
  }

  console.log('\n🕸️ Seeding Theological Relationship Graph...');

  // 1. Create Nodes
  const nodesData = [
    {
      id: 'moises',
      type: 'person',
      label: 'Moisés',
      metadata: { importance: 'High' },
    },
    { id: 'exodo', type: 'event', label: 'Êxodo', metadata: { era: 'Bronze' } },
    {
      id: 'alianca',
      type: 'doctrine',
      label: 'Aliança',
      metadata: { theme: 'Covenant' },
    },
    {
      id: 'abraao',
      type: 'person',
      label: 'Abraão',
      metadata: { importance: 'High' },
    },
    {
      id: 'promessa',
      type: 'doctrine',
      label: 'Promessa',
      metadata: { theme: 'Faith' },
    },
    {
      id: 'jesus',
      type: 'person',
      label: 'Jesus Cristo',
      metadata: { importance: 'Ultimate' },
    },
    {
      id: 'evangelho',
      type: 'doctrine',
      label: 'Evangelho',
      metadata: { theme: 'Grace' },
    },
    {
      id: 'paulo',
      type: 'person',
      label: 'Apóstolo Paulo',
      metadata: { importance: 'High' },
    },
    {
      id: 'justificacao',
      type: 'doctrine',
      label: 'Justificação pela Fé',
      metadata: { theme: 'Soteriology' },
    },
  ];

  const nodeMap: Record<string, string> = {};

  for (const node of nodesData) {
    const createdNode = await prisma.graphNode.create({
      data: {
        type: node.type,
        label: node.label,
        metadata: node.metadata,
      },
    });
    nodeMap[node.id] = createdNode.id;
  }

  // 2. Create Edges
  const edgesData = [
    { source: 'abraao', target: 'promessa', relation: 'Recebeu', weight: 1.0 },
    { source: 'moises', target: 'exodo', relation: 'Líder de', weight: 1.0 },
    {
      source: 'moises',
      target: 'alianca',
      relation: 'Mediador da',
      weight: 0.9,
    },
    { source: 'exodo', target: 'alianca', relation: 'Resulta em', weight: 0.8 },
    {
      source: 'promessa',
      target: 'alianca',
      relation: 'Aponta para',
      weight: 0.8,
    },
    {
      source: 'alianca',
      target: 'jesus',
      relation: 'Cumprida em',
      weight: 1.0,
    },
    { source: 'jesus', target: 'evangelho', relation: 'Autor do', weight: 1.0 },
    { source: 'paulo', target: 'jesus', relation: 'Apóstolo de', weight: 1.0 },
    {
      source: 'paulo',
      target: 'justificacao',
      relation: 'Defensor da',
      weight: 0.9,
    },
    {
      source: 'justificacao',
      target: 'evangelho',
      relation: 'Núcleo do',
      weight: 0.9,
    },
    {
      source: 'abraao',
      target: 'justificacao',
      relation: 'Exemplo de',
      weight: 0.8,
    },
  ];

  await prisma.graphEdge.createMany({
    data: edgesData.map((edge) => ({
      sourceId: nodeMap[edge.source],
      targetId: nodeMap[edge.target],
      relationType: edge.relation,
      weight: edge.weight,
    })),
  });

  console.log(
    `  └─ Success: Seeded ${nodesData.length} graph nodes and ${edgesData.length} graph edges.`,
  );

  console.log('\n📊 Seeding Summary:');
  console.log(`   - Routes seeded: ${Object.keys(THEOLOGICAL_ROUTES).length}`);
  console.log(`   - Waypoints seeded: ${totalWaypoints}`);
  console.log(`   - Theological content items seeded: ${totalContents}`);
  console.log(`   - 3D models registered: ${totalModels}`);
  console.log(`   - Graph nodes seeded: ${nodesData.length}`);
  console.log(`   - Graph edges seeded: ${edgesData.length}`);
  console.log('\n✅ Enterprise Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during enterprise seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
