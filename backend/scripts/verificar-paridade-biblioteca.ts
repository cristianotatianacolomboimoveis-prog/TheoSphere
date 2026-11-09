import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * PRNG Mulberry32 determinístico para semente reprodutível
 */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function run() {
  const isNightArg = process.argv.includes('--night');
  const now = new Date();
  // Horário em Brasília (UTC-3)
  const brtHours = (now.getUTCHours() - 3 + 24) % 24;
  const isNightWindow = brtHours >= 0 && brtHours < 6;
  const timeoutMs = isNightArg || isNightWindow ? 60000 : 15000;

  console.log(
    `[Paridade Biblioteca] Iniciando verificação. Horário BRT: ${brtHours}h. statement_timeout: ${timeoutMs}ms`,
  );

  const directHost = 'db.chjywahtwktqqxqlthvc.supabase.co';
  const url = new URL(process.env.DATABASE_URL || '');
  if (!url.host) {
    console.error('DATABASE_URL ausente.');
    process.exit(1);
  }
  // Usar porta e host direto para evitar contenção de poolers
  url.host = directHost;
  url.port = '5432';
  url.username = 'postgres';
  url.searchParams.delete('pgbouncer');

  const client = new Client({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false },
    statement_timeout: timeoutMs,
    connectionTimeoutMillis: 10000,
  });

  await client.connect();

  try {
    console.log('\n=== 1. Contagem Exata por Tipo em UserEmbedding ===');
    const qUeTypes = await client.query(`
      SELECT type, count(*)::bigint AS total
      FROM "UserEmbedding"
      GROUP BY type
      ORDER BY type;
    `);
    console.table(qUeTypes.rows);

    console.log('\n=== 2. Contagem Exata em ResourceChunk ===');
    const qRcCount = await client.query(`
      SELECT count(*)::bigint AS total FROM "ResourceChunk";
    `);
    const totalRc = Number(qRcCount.rows[0].total);
    console.log(`Total ResourceChunk: ${totalRc}`);

    console.log(
      '\n=== 3. Comparação de MD5 em Amostra Sorteada de 200 Trechos ===',
    );
    const SEED = 20261109;
    const rng = mulberry32(SEED);
    console.log(`Semente determinística: ${SEED}`);

    // Obter todas as obras com gid para sortear trechos entre todas elas
    const qWorks = await client.query(`
      SELECT res.id, res.slug, res.title, res.metadata->>'gid' as gid, count(rc.id)::int as chunk_count
      FROM "Resource" res
      JOIN "ResourceChunk" rc ON rc."resourceId" = res.id
      WHERE res.metadata->>'gid' IS NOT NULL
      GROUP BY res.id, res.slug, res.title, res.metadata->>'gid'
      HAVING count(rc.id) > 0
      ORDER BY res.slug;
    `);

    const works = qWorks.rows;
    if (works.length === 0) {
      throw new Error('Nenhuma obra com gid encontrada em Resource.');
    }

    const TARGET_SAMPLES = 200;
    const samples: Array<{
      resourceId: string;
      slug: string;
      title: string;
      gid: string;
      chunkIndex: number;
    }> = [];

    // Sorteia 200 trechos de forma balanceada entre as obras
    for (let i = 0; i < TARGET_SAMPLES; i++) {
      const workIdx = Math.floor(rng() * works.length);
      const work = works[workIdx];
      const chunkIdx = Math.floor(rng() * work.chunk_count);
      samples.push({
        resourceId: work.resourceId,
        slug: work.slug,
        title: work.title,
        gid: work.gid,
        chunkIndex: chunkIdx,
      });
    }

    let matches = 0;
    let mismatches = 0;
    let missing = 0;
    const sampleResults: Array<{
      slug: string;
      chunk: number;
      rc_md5: string;
      ue_md5: string;
      match: boolean;
    }> = [];

    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      // 1. MD5 do ResourceChunk (usa índice ("resourceId", "chunkIndex"))
      const qRc = await client.query(
        `SELECT md5(text) as md5_rc FROM "ResourceChunk" WHERE "resourceId" = $1 AND "chunkIndex" = $2;`,
        [s.resourceId, s.chunkIndex],
      );

      // 2. MD5 do UserEmbedding correspondente pela ordem canônica de migração
      const qUe = await client.query(
        `SELECT md5(content) as md5_ue
         FROM "UserEmbedding"
         WHERE type = 'book_chunk'
           AND metadata->>'gutenbergId' = $1
           AND metadata->>'title' = $2
         ORDER BY (metadata->>'chunkIndex')::int NULLS LAST, "createdAt" ASC, id ASC
         OFFSET $3 LIMIT 1;`,
        [s.gid, s.title, s.chunkIndex],
      );

      const md5Rc = qRc.rows[0]?.md5_rc;
      const md5Ue = qUe.rows[0]?.md5_ue;

      if (!md5Rc || !md5Ue) {
        missing++;
        sampleResults.push({
          slug: s.slug,
          chunk: s.chunkIndex,
          rc_md5: md5Rc || 'MISSING',
          ue_md5: md5Ue || 'MISSING',
          match: false,
        });
      } else if (md5Rc === md5Ue) {
        matches++;
        if (i < 5 || i === samples.length - 1) {
          sampleResults.push({
            slug: s.slug,
            chunk: s.chunkIndex,
            rc_md5: md5Rc,
            ue_md5: md5Ue,
            match: true,
          });
        }
      } else {
        mismatches++;
        sampleResults.push({
          slug: s.slug,
          chunk: s.chunkIndex,
          rc_md5: md5Rc,
          ue_md5: md5Ue,
          match: false,
        });
      }
    }

    console.log('Exemplos de trechos auditados:');
    console.table(sampleResults.slice(0, 10));

    console.log(`\nResumo da Comparação:`);
    console.log(`Total comparados: ${samples.length}`);
    console.log(`Matches exatos: ${matches}`);
    console.log(`Mismatches: ${mismatches}`);
    console.log(`Ausentes em um dos lados: ${missing}`);

    if (matches === TARGET_SAMPLES && mismatches === 0 && missing === 0) {
      console.log(
        `\nSTATUS: APROVADO: ${matches}/${TARGET_SAMPLES} trechos com md5 idêntico.`,
      );
    } else {
      console.error(
        `\nSTATUS: REPROVADO: divergências encontradas (${mismatches} divergências, ${missing} ausentes).`,
      );
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('[ERRO FATAL]', err.message);
  process.exit(1);
});
