/**
 * ensure-public-guest.js — cria o usuário de sistema `public-guest`.
 *
 * Descoberto em 30/07/2026: a ingestão da biblioteca grava os trechos em
 * `userId = 'public-guest'` (acervo compartilhado, ver drive-rag.service.ts:87)
 * e a busca procura por esse mesmo id (user-context.service.ts:323). Só que
 * `UserEmbedding.userId` tem chave estrangeira para `User.id`, e essa linha
 * nunca existiu — então toda tentativa de indexar o acervo compartilhado
 * falhava com:
 *
 *   violates foreign key constraint "UserEmbedding_userId_fkey"
 *
 * Ou seja: a biblioteca compartilhada era impossível de popular por
 * construção. Este script cria a linha que o código já pressupõe.
 *
 * NÃO é uma conta de acesso: o hash de senha é derivado de bytes aleatórios
 * gerados aqui e descartados, então ninguém — nem eu — consegue autenticar
 * com ela.
 *
 *   node scratch/ensure-public-guest.js
 *
 * TODO: mover para o seed do Prisma, para não depender de execução manual.
 */
const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ quiet: true });

const ID = 'public-guest';

(async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '',
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const existe = await prisma.$queryRawUnsafe(
      `SELECT id, email, role FROM "User" WHERE id = $1`,
      ID,
    );

    if (existe.length) {
      console.log(`✓ já existe: ${existe[0].email} (role ${existe[0].role})`);
      return;
    }

    // Senha impossível de adivinhar e nunca persistida em lugar nenhum.
    const senhaDescartada = crypto.randomBytes(48).toString('hex');
    const hash = await bcrypt.hash(senhaDescartada, 12);

    await prisma.$executeRawUnsafe(
      `INSERT INTO "User" (id, email, "passwordHash", plan, role, xp)
       VALUES ($1, $2, $3, 'FREE', 'USER', 0)`,
      ID,
      'public-guest@theosphere.internal',
      hash,
    );

    console.log('✓ usuário de sistema `public-guest` criado');
    console.log('  (sem senha utilizável — serve só de dono do acervo compartilhado)');
  } catch (err) {
    console.error('Erro:', err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
})();
