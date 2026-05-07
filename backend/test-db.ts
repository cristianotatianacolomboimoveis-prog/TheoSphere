import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
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
