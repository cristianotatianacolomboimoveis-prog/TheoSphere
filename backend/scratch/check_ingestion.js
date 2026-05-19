"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function checkProgress() {
    const total = await prisma.bibleVerse.count();
    const translations = await prisma.bibleVerse.groupBy({
        by: ['translation'],
        _count: {
            _all: true
        }
    });
    console.log('--- TheoSphere Ingestion Progress ---');
    console.log(`Total verses: ${total}`);
    console.log('Breakdown by translation:');
    translations.forEach(t => {
        console.log(`- ${t.translation}: ${t._count._all} verses`);
    });
    console.log('------------------------------------');
}
checkProgress()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=check_ingestion.js.map