import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
console.log('Connection string exists:', !!connectionString);

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function test() {
  try {
    await prisma.$connect();
    console.log('DB Connected Successfully');
    const users = await prisma.user.count();
    console.log(`Users in DB: ${users}`);
  } catch (err) {
    console.error('DB Connection Failed:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
test();
