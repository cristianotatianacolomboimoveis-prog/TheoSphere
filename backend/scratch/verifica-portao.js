/**
 * verifica-portao.js — confere a coerência entre Drive, relatório e banco.
 * Só lê. Temporário (01/08/2026).
 */
require('dotenv').config({ quiet: true });

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { google } = require('googleapis');
const fs = require('node:fs');
const path = require('node:path');
const { elegivel, excluir } = require('./curadoria');

const NOTA_MINIMA = Number(process.env.INGEST_NOTA_MINIMA ?? 70);

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const rel = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'quality-report.json'), 'utf8'),
    );
    const porId = new Map(rel.map((o) => [o.id, o]));

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    await auth.authorize();
    const drive = google.drive({ version: 'v3', auth });
    const res = await drive.files.list({
      q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, size)',
      pageSize: 1000,
    });
    const todos = res.data.files ?? [];
    const porIdDrive = new Map(todos.map((f) => [f.id, f]));

    // 1. Integridade do relatório
    const ids = rel.map((o) => o.id);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    console.log(`1. relatório: ${rel.length} entradas · ${dup.length} id duplicado`);

    // 2. O que está INDEXADO, e a nota atual de cada obra
    const linhas = await prisma.$queryRawUnsafe(
      `SELECT metadata->>'fileId' AS id, COUNT(*)::int AS n
         FROM "UserEmbedding" WHERE type = 'library_book'
        GROUP BY 1 ORDER BY 2 DESC`,
    );
    console.log(`\n2. indexadas: ${linhas.length} obras`);
    let suspeitas = 0;
    for (const l of linhas) {
      const q = porId.get(l.id);
      const f = porIdDrive.get(l.id);
      const nota = q ? q.nota : null;
      const alerta =
        nota === null ? 'SEM ENTRADA NO RELATÓRIO' : nota < NOTA_MINIMA ? 'REPROVADA' : '';
      if (alerta) suspeitas++;
      console.log(
        `   ${String(l.n).padStart(5)} trechos · nota ${String(nota).padStart(4)} · ` +
          `pag ${String(q?.paginas ?? '?').padStart(4)} · ${(f?.name ?? '(fora do Drive)').slice(0, 46)}` +
          (alerta ? `  ⚠️ ${alerta}` : ''),
      );
    }
    console.log(`   → ${suspeitas} obra(s) indexada(s) que hoje não passariam`);

    // 3. Efeito do teto novo: quem entrou na faixa 60–120 MB
    const faixa = todos.filter((f) => {
      const mb = Number(f.size ?? 0) / 1024 / 1024;
      return mb >= 60 && mb < 120 && !excluir(f.name);
    });
    console.log(`\n3. arquivos entre 60 e 120 MB (antes fora da análise): ${faixa.length}`);
    for (const f of faixa) {
      const q = porId.get(f.id);
      console.log(
        `   ${(Number(f.size) / 1024 / 1024).toFixed(1)} MB · nota ${q ? q.nota : '—'} · ${f.name.slice(0, 46)}`,
      );
    }

    // 4. Piso de 20 mil caracteres: só se aplica a quem não tem contagem de
    //    páginas (todo EPUB e DOCX). Alguma obra aprovada cairia nele?
    const semPagina = rel.filter((o) => o.paginas === undefined && o.nota >= NOTA_MINIMA);
    console.log(
      `\n4. aprovadas sem contagem de páginas: ${semPagina.length}` +
        ' (não foram reavaliadas com o guarda novo)',
    );
    for (const o of semPagina
      .slice()
      .sort((a, b) => (a.caracteres ?? 0) - (b.caracteres ?? 0))
      .slice(0, 6)) {
      const f = porIdDrive.get(o.id);
      console.log(
        `   ${String(o.caracteres ?? '?').padStart(8)} car · ${(f?.mimeType ?? '?').slice(-22)} · ${(o.nome ?? '').slice(0, 40)}`,
      );
    }

    // 5. A fila de hoje ainda bate com o relatório?
    const jaTem = new Set(linhas.map((l) => l.id));
    const elegiveis = todos.filter((f) => elegivel(f).ok && !jaTem.has(f.id));
    const aprovadas = elegiveis.filter(
      (f) => porId.has(f.id) && porId.get(f.id).nota >= NOTA_MINIMA,
    );
    console.log(
      `\n5. fila: ${elegiveis.length} elegíveis não indexadas · ${aprovadas.length} aprovadas`,
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
})();
