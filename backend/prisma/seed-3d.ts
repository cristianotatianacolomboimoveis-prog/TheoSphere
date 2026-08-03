import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Prisma 7 exige um driver adapter explícito no constructor — `new PrismaClient()`
// sem opções lança PrismaClientInitializationError e o seed nunca roda.
const connectionString =
  process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seed 3D: Populando Catálogo de Maquetes e Artefatos...');

  const models = [
    {
      modelName: 'Arca da Aliança',
      modelUrl: 'ark', // ID interno usado pelo renderizador procedural
      metadata: {
        scale: 1.0,
        description: 'Reconstituição baseada em Êxodo 25.',
      },
    },
    {
      modelName: 'Templo de Salomão',
      modelUrl: 'temple',
      metadata: {
        scale: 5.0,
        description: 'Maquete volumétrica do Primeiro Templo.',
      },
    },
    {
      modelName: 'Tabernáculo',
      modelUrl: 'tabernacle',
      metadata: { scale: 2.0, description: 'Santuário móvel do deserto.' },
    },
    {
      modelName: 'Altar de Holocaustos',
      modelUrl: 'altar',
      metadata: {
        scale: 1.5,
        description: 'Altar de bronze conforme o Tabernáculo.',
      },
    },
  ];

  for (const m of models) {
    await prisma.model3D.create({
      data: m,
    });
  }

  console.log('Seed 3D: Concluído!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
