import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GEO_DATA = [
  {
    name: "Jerusalém",
    era: 0,
    category: "Cidade",
    description: "Centro espiritual e político de Israel.",
    lng: 35.2137,
    lat: 31.7683
  },
  {
    name: "Belém",
    era: 0,
    category: "Cidade",
    description: "Local de nascimento de Davi e Jesus.",
    lng: 35.2023,
    lat: 31.7054
  },
  {
    name: "Nazaré",
    era: 30,
    category: "Cidade",
    description: "Cidade onde Jesus cresceu.",
    lng: 35.2975,
    lat: 32.7019
  },
  {
    name: "Monte Sinai",
    era: -1400,
    category: "Montanha",
    description: "Local onde Moisés recebeu as Tábuas da Lei.",
    lng: 33.9733,
    lat: 28.5394
  },
  {
    name: "Mar da Galileia",
    era: 30,
    category: "Lago",
    description: "Cenário de muitos milagres de Jesus.",
    lng: 35.59,
    lat: 32.83
  }
];

async function main() {
  console.log('Seed Geo: Populando locais com PostGIS...');
  
  for (const loc of GEO_DATA) {
    // Para PostGIS, usamos queryRaw pois o Prisma não suporta o tipo geography nativamente para escrita direta
    await prisma.$executeRaw`
      INSERT INTO "Location" (name, era, category, description, geom)
      VALUES (
        ${loc.name}, 
        ${loc.era}, 
        ${loc.category}, 
        ${loc.description}, 
        ST_SetSRID(ST_MakePoint(${loc.lng}, ${loc.lat}), 4326)::geography
      )
      ON CONFLICT DO NOTHING;
    `;
  }
  
  console.log('Seed Geo: Concluído!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
