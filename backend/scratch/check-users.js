const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ quiet: true });

// Prisma 7 exige driver adapter explicito no constructor.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '',
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const users = await prisma.user.findMany();
  console.log('Users in DB:', users.length);
  users.forEach(u => console.log(`- ${u.email} (${u.id})`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
