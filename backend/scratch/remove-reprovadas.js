/**
 * remove-reprovadas.js — tira da biblioteca as obras que reprovaram no portão
 * de qualidade.
 *
 * Motivo (30/07/2026): a primeira leva foi indexada sem conferência e trouxe
 * duas traduções automáticas — Grudem (20.819 trechos) e Sproul Romanos
 * (5.996). Juntas eram dois terços da biblioteca. Enquanto estivessem no ar, a
 * plataforma podia citar "Wayne Grudem" atribuindo-lhe frases que ele não
 * escreveu, e o testador não teria como perceber.
 *
 * A regra não é uma lista de nomes: é "toda obra indexada cuja nota em
 * quality-report.json ficou abaixo do corte sai". Assim, quando o analisador
 * melhorar e reprovar mais alguma, este script já sabe o que fazer.
 *
 *   node scratch/remove-reprovadas.js            # mostra o que sairia
 *   node scratch/remove-reprovadas.js --executar # apaga de fato
 */
require('dotenv').config({ quiet: true });

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('node:fs');
const path = require('node:path');

const NOTA_MINIMA = Number(process.env.INGEST_NOTA_MINIMA ?? 70);

(async () => {
  const executar = process.argv.includes('--executar');

  const relatorio = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'quality-report.json'), 'utf8'),
  );
  const nota = new Map(relatorio.map((o) => [o.id, o]));

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const indexadas = await prisma.$queryRawUnsafe(
      `SELECT metadata->>'fileId'   AS id,
              metadata->>'fileName' AS nome,
              COUNT(*)::int         AS n
       FROM "UserEmbedding" WHERE type = 'library_book'
       GROUP BY 1, 2 ORDER BY 3 DESC`,
    );

    const remover = indexadas.filter((o) => {
      const q = nota.get(o.id);
      return q && q.nota < NOTA_MINIMA;
    });
    const semAnalise = indexadas.filter((o) => !nota.has(o.id));

    if (semAnalise.length) {
      console.log('⚠️  indexadas mas ausentes do relatório (não serão tocadas):');
      for (const o of semAnalise) console.log(`     ${o.nome?.slice(0, 60)}`);
      console.log('');
    }

    if (remover.length === 0) {
      console.log('✅ nenhuma obra indexada está reprovada.');
      return;
    }

    let total = 0;
    console.log(`REPROVADAS E INDEXADAS (corte ${NOTA_MINIMA}):\n`);
    for (const o of remover) {
      const q = nota.get(o.id);
      total += o.n;
      console.log(`  nota ${String(q.nota).padStart(3)} · ${String(o.n).padStart(6)} trechos  ${o.nome?.slice(0, 50)}`);
      console.log(`             ${(q.penalidades ?? []).join(' · ')}`);
    }

    const antes = Number(
      (
        await prisma.$queryRawUnsafe(
          `SELECT COUNT(*)::int AS n FROM "UserEmbedding" WHERE type = 'library_book'`,
        )
      )[0].n,
    );

    console.log(`\ntotal a remover: ${total} de ${antes} trechos`);
    console.log(`biblioteca depois: ${antes - total} trechos\n`);

    if (!executar) {
      console.log('(simulação — nada foi apagado; use --executar)');
      return;
    }

    for (const o of remover) {
      const apagados = await prisma.$executeRawUnsafe(
        `DELETE FROM "UserEmbedding"
         WHERE type = 'library_book' AND metadata->>'fileId' = $1`,
        o.id,
      );
      console.log(`✓ ${apagados} trechos removidos — ${o.nome?.slice(0, 50)}`);
    }

    const depois = Number(
      (
        await prisma.$queryRawUnsafe(
          `SELECT COUNT(*)::int AS n FROM "UserEmbedding" WHERE type = 'library_book'`,
        )
      )[0].n,
    );
    console.log(`\nbiblioteca: ${depois} trechos (-${antes - depois})`);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
})();
