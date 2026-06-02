import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
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
  }
}
test();
