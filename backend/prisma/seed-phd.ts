import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seeding de léxicos e comentários (Modo PhD)...');

  // 1. Léxicos (Amostras Acadêmicas)
  const lexicalData = [
    {
      strongId: 'G26',
      word: 'ἀγάπη (agapē)',
      language: 'GK',
      definition: 'Amor sacrificial, incondicional e benevolente. No NT, descreve o amor de Deus pela humanidade.',
      academicRef: 'BDAG p.6',
      morphology: { case: 'nominative', gender: 'feminine', number: 'singular' }
    },
    {
      strongId: 'G3056',
      word: 'λόγος (logos)',
      language: 'GK',
      definition: 'Palavra, fala, razão, princípio ordenador do universo. No contexto joanino, refere-se à encarnação da Segunda Pessoa da Trindade.',
      academicRef: 'BDAG p.600',
      morphology: { case: 'nominative', gender: 'masculine', number: 'singular' }
    },
    {
      strongId: 'G1343',
      word: 'δικαιοσύνη (dikaiosynē)',
      language: 'GK',
      definition: 'Justiça, retidão, o estado de estar em conformidade com o padrão divino. Central na teologia paulina de Romanos.',
      academicRef: 'BDAG p.247',
      morphology: { case: 'nominative', gender: 'feminine', number: 'singular' }
    },
    {
      strongId: 'H7225',
      word: 'רֵאשִׁית (reshith)',
      language: 'HB',
      definition: 'Início, primícias, o melhor de algo. Usado em Gênesis 1:1 para marcar o ponto de partida temporal e ontológico.',
      academicRef: 'HALOT p.1165',
      morphology: { type: 'noun', state: 'construct' }
    }
  ];

  for (const entry of lexicalData) {
    await prisma.lexicalEntry.upsert({
      where: { strongId: entry.strongId },
      update: {},
      create: entry,
    });
  }

  // 2. Comentários Técnicos (Amostras)
  const commentaries = [
    {
      bookId: 43, // João
      chapter: 1,
      verse: 1,
      author: 'F.F. Bruce',
      source: 'The Gospel of John',
      content: 'A frase "No princípio era o Verbo" ecoa Gênesis 1:1, mas enquanto Moisés escreve sobre o início da criação, João escreve sobre o que já existia no início.',
      tags: ['Cristologia', 'Intertextualidade']
    },
    {
      bookId: 45, // Romanos
      chapter: 1,
      verse: 17,
      author: 'C.E.B. Cranfield',
      source: 'ICC: Romans',
      content: 'A "justiça de Deus" (dikaiosynē theou) deve ser entendida aqui primariamente como a atividade salvífica de Deus, Sua fidelidade à aliança.',
      tags: ['Soteriologia', 'Justificação']
    }
  ];

  for (const comm of commentaries) {
    await prisma.technicalCommentary.create({
      data: comm
    });
  }

  console.log('✅ Seeding concluído com sucesso.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
