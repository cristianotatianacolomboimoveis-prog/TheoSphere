import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  const now = new Date();
  const brtHours = (now.getUTCHours() - 3 + 24) % 24;

  // Restrição da Seção 3.1 do AGENTS.md: execução pesada estritamente entre 00:00 e 06:00 BRT
  if (brtHours < 0 || brtHours >= 6) {
    console.error(
      `[BLOQUEIO SEÇÃO 3.1] Este script de paridade integral só pode ser executado na janela noturna (00:00 às 06:00 BRT). Horário atual: ${brtHours}h BRT.`,
    );
    process.exit(1);
  }

  const connectionString =
    process.env.DIRECT_DB_URL ||
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('Variável DIRECT_DB_URL ausente no .env.');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 15 * 60 * 1000, // 15 minutos
    connectionTimeoutMillis: 15000,
  });

  console.log(
    `[Paridade Biblioteca] Conectando ao banco... Horário BRT: ${brtHours}h. statement_timeout: 15min`,
  );
  await client.connect();

  try {
    // 1. Contagem exata por tipo em UserEmbedding
    console.log('\n=== 1. Contagem Exata por Tipo em UserEmbedding ===');
    const qTypes = await client.query(`
      SELECT type, count(*)::bigint AS total
      FROM "UserEmbedding"
      GROUP BY type
      ORDER BY type;
    `);
    console.table(qTypes.rows);

    // 2. Consulta única em UserEmbedding (sem coluna de embedding, somente metadados e hash MD5)
    console.log('\n=== 2. Exportando Chaves e Hashes de UserEmbedding ===');
    const t0Ue = Date.now();
    const qUe = await client.query(`
      SELECT metadata->>'gutenbergId' AS gid,
             metadata->>'title' AS title,
             row_number() OVER (
               PARTITION BY metadata->>'gutenbergId', metadata->>'title'
               ORDER BY (metadata->>'chunkIndex')::int NULLS LAST, "createdAt", id
             ) - 1 AS idx,
             md5(content) AS h
      FROM "UserEmbedding"
      WHERE type = 'book_chunk';
    `);
    console.log(
      `UserEmbedding lido em ${Date.now() - t0Ue}ms (${qUe.rows.length} trechos)`,
    );

    // 3. Consulta única em ResourceChunk + Resource (sem coluna de embedding, somente metadados e hash MD5)
    console.log(
      '\n=== 3. Exportando Chaves e Hashes de ResourceChunk + Resource ===',
    );
    const t0Rc = Date.now();
    const qRc = await client.query(`
      SELECT res.metadata->>'gid' AS gid,
             res.title AS title,
             rc."chunkIndex" AS idx,
             md5(rc.text) AS h
      FROM "ResourceChunk" rc
      JOIN "Resource" res ON res.id = rc."resourceId";
    `);
    console.log(
      `ResourceChunk lido em ${Date.now() - t0Rc}ms (${qRc.rows.length} trechos)`,
    );

    // 4. Comparação em memória no Mac
    console.log('\n=== 4. Comparando Todos os Trechos em Memória ===');
    const totalUe = qUe.rows.length;
    const totalRc = qRc.rows.length;

    const keyOf = (
      gid: string | null,
      title: string | null,
      idx: number | string,
    ) => `${gid ?? 'null'}::${title ?? 'null'}::${idx}`;

    const ueMap = new Map<string, string>();
    for (const r of qUe.rows) {
      const k = keyOf(r.gid, r.title, r.idx);
      ueMap.set(k, r.h);
    }

    const rcMap = new Map<string, string>();
    for (const r of qRc.rows) {
      const k = keyOf(r.gid, r.title, r.idx);
      rcMap.set(k, r.h);
    }

    let coincidentes = 0;
    let divergentes = 0;
    const exemplosDivergencias: Array<{
      chave: string;
      hashUe: string;
      hashRc: string;
    }> = [];

    // Checa todos de UserEmbedding contra ResourceChunk
    for (const [k, hashUe] of ueMap.entries()) {
      const hashRc = rcMap.get(k);
      if (hashRc !== undefined) {
        if (hashRc === hashUe) {
          coincidentes++;
        } else {
          divergentes++;
          if (exemplosDivergencias.length < 10) {
            exemplosDivergencias.push({ chave: k, hashUe, hashRc });
          }
        }
      }
    }

    // Trechos faltando em cada lado
    const faltandoNoRc: string[] = [];
    for (const k of ueMap.keys()) {
      if (!rcMap.has(k)) {
        if (faltandoNoRc.length < 10) faltandoNoRc.push(k);
      }
    }
    const totalFaltandoNoRc = Array.from(ueMap.keys()).filter(
      (k) => !rcMap.has(k),
    ).length;

    const faltandoNoUe: string[] = [];
    for (const k of rcMap.keys()) {
      if (!ueMap.has(k)) {
        if (faltandoNoUe.length < 10) faltandoNoUe.push(k);
      }
    }
    const totalFaltandoNoUe = Array.from(rcMap.keys()).filter(
      (k) => !ueMap.has(k),
    ).length;

    console.log(`\n=== 5. Resultado da Paridade ===`);
    console.log(`Total UserEmbedding (book_chunk): ${totalUe}`);
    console.log(`Total ResourceChunk:              ${totalRc}`);
    console.log(`Coincidentes (mesmo MD5):         ${coincidentes}`);
    console.log(`Divergentes (MD5 diferente):      ${divergentes}`);
    console.log(`Faltando no ResourceChunk:        ${totalFaltandoNoRc}`);
    console.log(`Faltando no UserEmbedding:        ${totalFaltandoNoUe}`);

    if (exemplosDivergencias.length > 0) {
      console.log('\nExemplos de Divergências (até 10):');
      console.table(exemplosDivergencias);
    }
    if (faltandoNoRc.length > 0) {
      console.log(
        '\nExemplos de Chaves Faltando no ResourceChunk (até 10):',
        faltandoNoRc,
      );
    }
    if (faltandoNoUe.length > 0) {
      console.log(
        '\nExemplos de Chaves Faltando no UserEmbedding (até 10):',
        faltandoNoUe,
      );
    }

    // Aprovação só com 0 divergências e 0 faltando
    if (
      divergentes === 0 &&
      totalFaltandoNoRc === 0 &&
      totalFaltandoNoUe === 0 &&
      coincidentes === totalUe
    ) {
      console.log(
        `\nSTATUS: APROVADO: ${coincidentes}/${totalUe} trechos idênticos (0 divergências, 0 faltando).`,
      );
    } else {
      console.error(
        `\nSTATUS: REPROVADO: paridade não atingiu 100% (${divergentes} divergências, ${totalFaltandoNoRc} faltando no RC, ${totalFaltandoNoUe} faltando no UE).`,
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
