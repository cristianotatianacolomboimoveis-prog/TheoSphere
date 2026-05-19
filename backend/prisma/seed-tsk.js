"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const tsk_seed_1 = require("../src/bible/tsk-seed");
const prisma = new client_1.PrismaClient();
async function main() {
    const totalSources = tsk_seed_1.TSK_SEED.length;
    const totalRefs = tsk_seed_1.TSK_SEED.reduce((acc, e) => acc + e.targets.length, 0);
    console.log(`🌱 Seeding TSK: ${totalSources} fontes → ${totalRefs} cross-refs…`);
    let inserted = 0;
    let skipped = 0;
    for (const entry of tsk_seed_1.TSK_SEED) {
        for (let i = 0; i < entry.targets.length; i++) {
            const target = entry.targets[i];
            try {
                await prisma.crossReference.upsert({
                    where: {
                        sourceRef_targetRef: {
                            sourceRef: entry.source,
                            targetRef: target,
                        },
                    },
                    create: {
                        sourceRef: entry.source,
                        targetRef: target,
                        rank: i + 1,
                    },
                    update: {},
                });
                inserted++;
            }
            catch (err) {
                skipped++;
                console.warn(`  ⚠️  ${entry.source} → ${target}: ${err instanceof Error ? err.message : 'unknown'}`);
            }
        }
    }
    console.log(`✅ TSK seed completo. inserted=${inserted} skipped=${skipped}`);
}
main()
    .catch((err) => {
    console.error('❌ Seed TSK falhou:', err);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-tsk.js.map