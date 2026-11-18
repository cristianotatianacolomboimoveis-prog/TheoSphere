import 'dotenv/config';
import { Client } from 'pg';
import { BOOK_ID_TO_NAME_PT } from '../src/common/book-map';

/**
 * Script de Medição da Busca Textual sem Acentos / Diacríticos (Etapa 9.0).
 *
 * Operação 100% READ ONLY:
 * - 1 única conexão ao banco sob statement_timeout = 15s.
 * - Transação explícita: BEGIN READ ONLY; SET LOCAL statement_timeout = '15s';
 * - Verificação prévia de pg_stat_progress_vacuum (aborta se houver vacuum na BibleVerse).
 * - Nenhuma alteração em search.service.ts, nenhuma criação de índice, função ou migração.
 * - Nenhuma chamada ao Gemini.
 */

function sqlNormalize(colOrParam: string): string {
  return `regexp_replace(regexp_replace(normalize(${colOrParam}, NFD), '[\\u05BE\\u05C0\\u05C3\\u05C6]', ' ', 'g'), '[\\u0300-\\u036F\\u0591-\\u05BD\\u05BF\\u05C1\\u05C2\\u05C4\\u05C5\\u05C7]', '', 'g')`;
}

interface QueryResultItem {
  query: string;
  atual: number;
  nova: number;
  perdidos: number;
  exemplosPerdidos?: string[];
}

interface TranslationMeasurement {
  translation: string;
  latencyMs: number;
  totalVerses: number;
  results: QueryResultItem[];
}

const TRANSLATION_QUERIES: Record<string, string[]> = {
  BLIVRE: [
    'graca e paz',
    'graça e paz',
    'coracao',
    'coração',
    'salvacao',
    'salvação',
    'fe',
    'fé',
    'pais',
    'Jesus Cristo',
  ],
  NVA: [
    'graca e paz',
    'graça e paz',
    'coracao',
    'coração',
    'salvacao',
    'salvação',
    'fe',
    'fé',
    'pais',
    'Jesus Cristo',
  ],
  KJV: ['grace and peace', 'faith'],
  WEB: ['grace and peace', 'faith'],
  TR: ['χαρις', 'χάρις', 'λογος', 'λόγος', 'θεος', 'θεός'],
  LXX: ['χαρις', 'χάρις', 'λογος', 'λόγος', 'θεος', 'θεός'],
  WLC: ['בראשית', 'בְּרֵאשִׁית', 'אלהים', 'אֱלֹהִים'],
};

const EXECUTION_ORDER = [
  'BLIVRE',
  'NVA',
  'KJV',
  'WEB',
  'TR',
  'LXX',
  'WLC',
] as const;

async function assertNoVacuumOnBibleVerse(client: Client): Promise<void> {
  const res = await client.query<{ relname: string }>(`
    SELECT relid::regclass::text AS relname
    FROM pg_stat_progress_vacuum;
  `);
  const activeVacuums = res.rows.map((r) => r.relname);
  const isBibleVerse = activeVacuums.some(
    (name) =>
      name === 'BibleVerse' ||
      name === '"BibleVerse"' ||
      name.includes('BibleVerse'),
  );
  if (isBibleVerse) {
    throw new Error(
      `[TRAVA DE SEGURANÇA] Autovacuum em andamento na BibleVerse (${activeVacuums.join(', ')}). Abortando imediatamente.`,
    );
  }
}

function formatRef(bookId: number, chapter: number, verse: number): string {
  const bookName = BOOK_ID_TO_NAME_PT[bookId] ?? `Livro ${bookId}`;
  return `${bookName} ${chapter}:${verse}`;
}

async function main() {
  const startTime = Date.now();
  console.log(
    '═══════════════════════════════════════════════════════════════════════════════',
  );
  console.log(
    '  ETAPA 9.0: MEDIÇÃO DE BUSCA TEXTUAL SEM ACENTOS / DIACRÍTICOS (READ ONLY)',
  );
  console.log(
    '═══════════════════════════════════════════════════════════════════════════════\n',
  );

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERRO: DATABASE_URL ausente em .env.');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 15000,
  });

  await client.connect();
  console.log('✓ Conectado ao PostgreSQL (1 única conexão).');

  // Trava de segurança inicial
  await assertNoVacuumOnBibleVerse(client);
  console.log(
    '✓ pg_stat_progress_vacuum verificado: nenhum vacuum ativo na BibleVerse.',
  );

  // Iniciar transação READ ONLY com timeout de 15s local
  await client.query('BEGIN READ ONLY;');
  await client.query("SET LOCAL statement_timeout = '15s';");
  console.log(
    '✓ Transação BEGIN READ ONLY iniciada com SET LOCAL statement_timeout = 15s.\n',
  );

  try {
    // ── 1. Pré-requisitos ──────────────────────────────────────────────────
    console.log(
      '-------------------------------------------------------------------------------',
    );
    console.log('1. PRÉ-REQUISITOS DO BANCO');
    console.log(
      '-------------------------------------------------------------------------------',
    );

    const prereqRes = await client.query<{
      server_encoding: string;
      server_version: string;
      provolatile: string;
      bv_bytes: string;
      bv_pretty: string;
      idx_bytes: string;
      idx_pretty: string;
    }>(`
      SELECT
        current_setting('server_encoding') AS server_encoding,
        version() AS server_version,
        (SELECT provolatile FROM pg_proc WHERE proname = 'normalize' LIMIT 1) AS provolatile,
        pg_relation_size('"BibleVerse"') AS bv_bytes,
        pg_size_pretty(pg_relation_size('"BibleVerse"')) AS bv_pretty,
        pg_relation_size('"BibleVerse_text_fts_idx"') AS idx_bytes,
        pg_size_pretty(pg_relation_size('"BibleVerse_text_fts_idx"')) AS idx_pretty;
    `);

    const prereq = prereqRes.rows[0];
    console.log(
      `- server_encoding:                  ${prereq.server_encoding}`,
    );
    if (prereq.server_encoding !== 'UTF8') {
      console.warn(
        `  ⚠️ ALERTA: server_encoding (${prereq.server_encoding}) difere de UTF8!`,
      );
    }
    console.log(`- server_version:                   ${prereq.server_version}`);
    console.log(
      `- provolatile de normalize():        ${prereq.provolatile} (${prereq.provolatile === 'i' ? 'IMMUTABLE - apto para índice' : 'NÃO IMMUTABLE'})`,
    );
    console.log(
      `- pg_relation_size('BibleVerse'):   ${prereq.bv_pretty} (${prereq.bv_bytes} bytes)`,
    );
    console.log(
      `- pg_relation_size('text_fts_idx'): ${prereq.idx_pretty} (${prereq.idx_bytes} bytes) [estimativa p/ índice novo]`,
    );
    console.log('');

    // ── 2. Função de Normalização ──────────────────────────────────────────
    console.log(
      '-------------------------------------------------------------------------------',
    );
    console.log('2. EXPRESSÃO DE NORMALIZAÇÃO');
    console.log(
      '-------------------------------------------------------------------------------',
    );
    console.log('Expressão aplicada tanto ao texto quanto à consulta:');
    console.log('  normalize(x, NFD)');
    console.log(
      "  -> regexp_replace(..., '[\\u05BE\\u05C0\\u05C3\\u05C6]', ' ', 'g')",
    );
    console.log(
      "  -> regexp_replace(..., '[\\u0300-\\u036F\\u0591-\\u05BD\\u05BF\\u05C1\\u05C2\\u05C4\\u05C5\\u05C7]', '', 'g')",
    );
    console.log(
      "Configuração FTS: 'simple' | Operador de consulta: plainto_tsquery('simple', ...)\n",
    );

    // ── 3 & 4. Leitura por tradução (1 único SELECT por tradução) ──────────
    console.log(
      '-------------------------------------------------------------------------------',
    );
    console.log('3 & 4. MEDIÇÃO POR TRADUÇÃO (SELECT único sequencial)');
    console.log(
      '-------------------------------------------------------------------------------',
    );

    const measurements: TranslationMeasurement[] = [];

    for (const translation of EXECUTION_ORDER) {
      const queries = TRANSLATION_QUERIES[translation];
      if (!queries || queries.length === 0) continue;

      // Montar campos agregados count(*) FILTER (...)
      const filterClauses: string[] = ['count(*) AS total_verses'];
      queries.forEach((_, idx) => {
        const pIdx = idx + 2; // $1 é translation, $2..$(N+1) são as queries
        filterClauses.push(
          `count(*) FILTER (WHERE vec_atual @@ plainto_tsquery('simple', $${pIdx})) AS atual_${idx}`,
        );
        filterClauses.push(
          `count(*) FILTER (WHERE vec_norm @@ plainto_tsquery('simple', ${sqlNormalize(`$${pIdx}`)})) AS nova_${idx}`,
        );
        filterClauses.push(
          `count(*) FILTER (WHERE (vec_atual @@ plainto_tsquery('simple', $${pIdx})) AND NOT (vec_norm @@ plainto_tsquery('simple', ${sqlNormalize(`$${pIdx}`)}))) AS perdidos_${idx}`,
        );
      });

      const sql = `
        SELECT
          ${filterClauses.join(',\n          ')}
        FROM (
          SELECT
            text,
            to_tsvector('simple', text) AS vec_atual,
            to_tsvector('simple', ${sqlNormalize('text')}) AS vec_norm
          FROM "BibleVerse"
          WHERE translation = $1
        ) sub;
      `;

      const t0 = Date.now();
      const res = await client.query(sql, [translation, ...queries]);
      const latencyMs = Date.now() - t0;
      const row = res.rows[0];
      const totalVerses = Number(row.total_verses);

      const items: QueryResultItem[] = [];

      for (let i = 0; i < queries.length; i++) {
        const qText = queries[i];
        const atual = Number(row[`atual_${i}`] ?? 0);
        const nova = Number(row[`nova_${i}`] ?? 0);
        const perdidos = Number(row[`perdidos_${i}`] ?? 0);

        let exemplosPerdidos: string[] | undefined;
        if (perdidos > 0) {
          const diagRes = await client.query<{
            bookId: number;
            chapter: number;
            verse: number;
            text: string;
          }>(
            `
            SELECT "bookId", chapter, verse, text
            FROM "BibleVerse"
            WHERE translation = $1
              AND to_tsvector('simple', text) @@ plainto_tsquery('simple', $2)
              AND NOT (to_tsvector('simple', ${sqlNormalize('text')}) @@ plainto_tsquery('simple', ${sqlNormalize('$2')}))
            ORDER BY "bookId", chapter, verse
            LIMIT 5;
          `,
            [translation, qText],
          );
          exemplosPerdidos = diagRes.rows.map(
            (r) => `[${formatRef(r.bookId, r.chapter, r.verse)}] ${r.text}`,
          );
        }

        items.push({
          query: qText,
          atual,
          nova,
          perdidos,
          exemplosPerdidos,
        });
      }

      measurements.push({
        translation,
        latencyMs,
        totalVerses,
        results: items,
      });

      // Imprimir resultados da tradução
      console.log(
        `▶ Tradução: ${translation} (${totalVerses.toLocaleString('pt-BR')} versículos) — Tempo do SELECT: ${latencyMs} ms`,
      );
      console.log(
        '  ┌────────────────────────────────────┬──────────┬──────────┬──────────┐',
      );
      console.log(
        '  │ Consulta                           │ Atual    │ Nova     │ Perdidos │',
      );
      console.log(
        '  ├────────────────────────────────────┼──────────┼──────────┼──────────┤',
      );
      for (const it of items) {
        const qPadded = it.query.padEnd(34, ' ');
        const aPadded = String(it.atual).padStart(8, ' ');
        const nPadded = String(it.nova).padStart(8, ' ');
        const pPadded = String(it.perdidos).padStart(8, ' ');
        console.log(`  │ ${qPadded} │ ${aPadded} │ ${nPadded} │ ${pPadded} │`);
        if (it.perdidos > 0 && it.exemplosPerdidos) {
          console.log(
            '  │ ⚠️ Exemplos de versículos perdidos:                                │',
          );
          for (const ex of it.exemplosPerdidos) {
            console.log(`  │    * ${ex.slice(0, 68)}`);
          }
        }
      }
      console.log(
        '  └────────────────────────────────────┴──────────┴──────────┴──────────┘\n',
      );
    }

    // ── 5. Colisões na NVA ("pais" e "fe") ──────────────────────────────────
    console.log(
      '-------------------------------------------------------------------------------',
    );
    console.log('5. COLISÕES NA NVA (versículos que só a busca nova encontra)');
    console.log(
      '-------------------------------------------------------------------------------',
    );

    for (const termo of ['pais', 'fe']) {
      const colRes = await client.query<{
        bookId: number;
        chapter: number;
        verse: number;
        text: string;
      }>(
        `
        SELECT "bookId", chapter, verse, text
        FROM "BibleVerse"
        WHERE translation = 'NVA'
          AND to_tsvector('simple', ${sqlNormalize('text')}) @@ plainto_tsquery('simple', ${sqlNormalize('$1')})
          AND NOT (to_tsvector('simple', text) @@ plainto_tsquery('simple', $1))
        ORDER BY "bookId", chapter, verse
        LIMIT 5;
      `,
        [termo],
      );

      console.log(
        `▶ Termo "${termo}": 5 primeiros versículos encontrados exclusivamente pela busca nova:`,
      );
      colRes.rows.forEach((r, idx) => {
        const ref = formatRef(r.bookId, r.chapter, r.verse);
        console.log(`  ${idx + 1}. [${ref}] "${r.text}"`);
      });
      console.log('');
    }

    // ── 6. EXPLAIN (ANALYZE, BUFFERS) na NVA ────────────────────────────────
    console.log(
      '-------------------------------------------------------------------------------',
    );
    console.log('6. EXPLAIN (ANALYZE, BUFFERS) NA NVA (consulta normalizada)');
    console.log(
      '-------------------------------------------------------------------------------',
    );

    const explainQuery = `
      EXPLAIN (ANALYZE, BUFFERS)
      SELECT id, "bookId", chapter, verse, text
      FROM "BibleVerse"
      WHERE translation = 'NVA'
        AND to_tsvector('simple', ${sqlNormalize('text')}) @@ plainto_tsquery('simple', ${sqlNormalize("'graça e paz'")});
    `;

    const explainRes = await client.query<{ 'QUERY PLAN': string }>(
      explainQuery,
    );
    const planLines = explainRes.rows.map((r) => r['QUERY PLAN']);
    console.log(planLines.join('\n'));

    // Extrair hit e read para facilitar a leitura no sumário
    let sharedHit = 0;
    let sharedRead = 0;
    for (const line of planLines) {
      const hitMatch = line.match(/shared hit=(\d+)/);
      if (hitMatch) sharedHit += Number(hitMatch[1]);
      const readMatch = line.match(/read=(\d+)/);
      if (readMatch) sharedRead += Number(readMatch[1]);
    }
    console.log(`\nSoma de buffers: hit=${sharedHit}, read=${sharedRead}`);

    // Commit da transação (READ ONLY, liberação limpa)
    await client.query('COMMIT;');
    console.log('\n✓ Transação finalizada com sucesso (COMMIT em READ ONLY).');
  } catch (err) {
    await client.query('ROLLBACK;').catch(() => {});
    throw err;
  } finally {
    await client.end();
    console.log('✓ Conexão fechada.');
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nTempo total de execução: ${durationSec} s.`);
}

main().catch((err) => {
  console.error('\n❌ ERRO NA EXECUÇÃO DO SCRIPT:', err);
  process.exit(1);
});
