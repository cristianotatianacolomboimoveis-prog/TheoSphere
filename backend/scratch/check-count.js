"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function checkCount() {
    try {
        await prisma.$connect();
        const total = await prisma.userEmbedding.count({
            where: {
                type: 'library_book',
            },
        });
        const byFile = await prisma.$queryRaw `
      select metadata->>'fileName' as file, count(*)::int as chunks 
      from "UserEmbedding" 
      where type = 'library_book'
      group by metadata->>'fileName'
    `;
        console.log('--- 📊 GOOGLE DRIVE INGESTION STATUS ---');
        console.log(`Total Library Chunks Embedded: ${total}`);
        console.log('Processed Files and Chunks:');
        byFile.forEach((row, i) => {
            console.log(`[${i + 1}] ${row.file} (${row.chunks} chunks)`);
        });
    }
    catch (err) {
        console.error('Failed to query DB:', err);
    }
    finally {
        await prisma.$disconnect();
    }
}
checkCount();
//# sourceMappingURL=check-count.js.map