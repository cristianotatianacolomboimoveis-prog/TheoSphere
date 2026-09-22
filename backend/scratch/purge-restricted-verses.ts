import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function purge() {
  console.log('🏁 Iniciando purga de traduções restritas...');
  const permitidas = ['BLIVRE', 'NVA', 'KJV', 'TR', 'WLC', 'LXX', 'WEB'];
  
  // Contar registros antes da remoção
  const totalAntes = await prisma.bibleVerse.count();
  const restritos = await prisma.bibleVerse.count({
    where: {
      translation: {
        notIn: permitidas,
      },
    },
  });

  console.log(`Encontrados ${restritos} versículos restritos de um total de ${totalAntes}.`);

  if (restritos > 0) {
    const deletados = await prisma.bibleVerse.deleteMany({
      where: {
        translation: {
          notIn: permitidas,
        },
      },
    });
    console.log(`🔥 Sucesso! Removidos ${deletados.count} versículos do banco.`);
  } else {
    console.log('Nenhum versículo restrito encontrado.');
  }
}

purge().catch(console.error).finally(() => pool.end());
