/**
 * purge-nao-livres.js — remove da biblioteca RAG toda obra indexada que NÃO
 * tenha licença aprovada em licencas.json (domínio público ou licenciada).
 *
 * Decisão de 01/08/2026: a plataforma será vendida, então só pode servir obras
 * livres ou licenciadas. As 4 obras indexadas hoje (Institutas ×3 e Hoekema,
 * 12.699 trechos) são traduções modernas protegidas — saem.
 *
 * Fail-closed e amarrado ao MESMO manifesto do portão de ingestão: o que não
 * está explicitamente liberado é removido. Assim, remoção e ingestão nunca
 * divergem.
 *
 *   node scratch/purge-nao-livres.js            # DRY-RUN: só mostra o que sairia
 *   node scratch/purge-nao-livres.js --executar # apaga de fato
 */
require('dotenv').config({ quiet: true });

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { carregarLicencas, licencaDe } = require('./licencas');

(async () => {
  const executar = process.argv.includes('--executar');

  const licencas = carregarLicencas();
  if (!licencas) {
    console.log(
      'scratch/licencas.json ausente. Sem manifesto, fail-closed removeria TUDO —\n' +
        'crie o manifesto e libere as obras que puder antes de rodar.',
    );
    process.exitCode = 1;
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const obras = await prisma.$queryRawUnsafe(
      `SELECT metadata->>'fileId'   AS id,
              metadata->>'fileName' AS nome,
              COUNT(*)::int         AS n
       FROM "UserEmbedding" WHERE type = 'library_book'
       GROUP BY 1, 2 ORDER BY 3 DESC`,
    );

    if (obras.length === 0) {
      console.log('Biblioteca vazia — nada a fazer.');
      return;
    }

    const decidir = (o) => licencaDe({ id: o.id, name: o.nome }, licencas);
    const manter = obras.filter((o) => decidir(o).ok);
    const remover = obras.filter((o) => !decidir(o).ok);

    if (manter.length) {
      console.log('mantidas (licença aprovada):');
      for (const o of manter) {
        console.log(`  ✓ ${(o.nome ?? o.id ?? '?').slice(0, 60)} (${o.n})`);
      }
      console.log('');
    }

    if (remover.length === 0) {
      console.log('✅ nada a remover — todas as obras indexadas têm licença aprovada.');
      return;
    }

    const totalTrechos = remover.reduce((s, o) => s + o.n, 0);
    console.log(
      `${remover.length} obra(s) SEM licença de domínio público (${totalTrechos} trechos):`,
    );
    for (const o of remover) {
      console.log(
        `  ✗ ${(o.nome ?? o.id ?? '?').slice(0, 56)} (${o.n}) — ${decidir(o).status}`,
      );
    }

    if (!executar) {
      console.log('\n(DRY-RUN) nada removido. Rode com --executar para apagar.');
      return;
    }

    let apagados = 0;
    for (const o of remover) {
      // Apaga pela chave que identifica a obra: fileId quando existe, senão nome.
      const res = o.id
        ? await prisma.$executeRawUnsafe(
            `DELETE FROM "UserEmbedding" WHERE type = 'library_book' AND metadata->>'fileId' = $1`,
            o.id,
          )
        : await prisma.$executeRawUnsafe(
            `DELETE FROM "UserEmbedding" WHERE type = 'library_book' AND metadata->>'fileName' = $1`,
            o.nome,
          );
      apagados += Number(res) || 0;
    }
    console.log(`\n✅ removidas ${remover.length} obra(s) · ${apagados} trechos apagados.`);
  } catch (err) {
    console.error('Falhou:', err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
})();
