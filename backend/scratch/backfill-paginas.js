/**
 * backfill-paginas.js — reavalia o guarda de PDF escaneado nas obras APROVADAS
 * antes de 01/08/2026.
 *
 * Por que existe: até 01/08/2026 o extrator lia `numpages` (pdf-parse v1) num
 * objeto que só tem `total` (v2). `meta.pages` vinha undefined em todas as
 * obras, e o guarda "menos de 400 caracteres por página → precisa de OCR"
 * nunca disparava. O guarda foi consertado, mas as notas JÁ GRAVADAS foram
 * produzidas sem ele: continuar confiando nelas é confiar numa conferência que
 * não aconteceu.
 *
 * Este script refaz só a parte que dependia da contagem de páginas. Não chama
 * o revisor de IA: o veredito de tradução já está no relatório e não muda com
 * a paginação. Custo em tokens: zero. O custo é tempo de download.
 *
 *   node scratch/backfill-paginas.js            # aplica
 *   node scratch/backfill-paginas.js --simular  # só mostra o que mudaria
 */
require('dotenv').config({ quiet: true });

const { google } = require('googleapis');
const fs = require('node:fs');
const path = require('node:path');
const { elegivel } = require('./curadoria');

const NOTA_MINIMA = Number(process.env.INGEST_NOTA_MINIMA ?? 70);
const CARACTERES_POR_PAGINA_MINIMO = 400;

/** Mesma limpeza do analyze-quality, para a contagem refletir o texto útil. */
function limparTexto(texto) {
  return texto
    .replace(/--\s*\d+\s*of\s*\d+\s*--/gi, ' ')
    .replace(/\bPage\s+\d+\s+of\s+\d+\b/gi, ' ')
    .replace(/(\w)-\s+(\w)/g, '$1$2')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

(async () => {
  const simular = process.argv.includes('--simular');
  const destino = path.join(__dirname, 'quality-report.json');
  const relatorio = JSON.parse(fs.readFileSync(destino, 'utf8'));

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
  const porId = new Map((res.data.files ?? []).map((f) => [f.id, f]));

  const { findExtractor } = require('../dist/rag/text-extractors');

  // Só o que está aprovado e nunca teve a contagem conferida. Reprovada não
  // precisa: já está fora, e a paginação não a traria de volta.
  const alvos = relatorio.filter((o) => {
    if (o.nota < NOTA_MINIMA) return false;
    if (typeof o.paginas === 'number') return false;
    const f = porId.get(o.id);
    return f && elegivel(f).ok;
  });

  console.log(
    `${alvos.length} obra(s) aprovadas sem contagem de páginas` +
      (simular ? ' (simulação)\n' : '\n'),
  );

  const mudancas = [];
  let i = 0;

  for (const obra of alvos) {
    const f = porId.get(obra.id);
    i++;
    try {
      const buf = await drive.files.get(
        { fileId: f.id, alt: 'media' },
        { responseType: 'arraybuffer' },
      );
      const { text: cru, meta } = await findExtractor(f.mimeType).extract(
        Buffer.from(buf.data),
      );
      const texto = limparTexto(cru);
      const paginas = meta?.pages;

      if (typeof paginas !== 'number' || paginas <= 0) {
        // EPUB e DOCX não têm paginação — não é falha, é ausência legítima.
        console.log(
          `  ${String(i).padStart(2)}/${alvos.length} — sem paginação (${f.mimeType.slice(-18)}) · ${obra.nome.slice(0, 40)}`,
        );
        continue;
      }

      const porPagina = texto.length / paginas;
      const reprova = porPagina < CARACTERES_POR_PAGINA_MINIMO;

      console.log(
        `  ${String(i).padStart(2)}/${alvos.length} ${reprova ? '🔴' : '✓ '} ` +
          `${String(paginas).padStart(4)} pág · ${String(Math.round(porPagina)).padStart(5)} car/pág · ` +
          obra.nome.slice(0, 42),
      );

      obra.paginas = paginas;
      obra.caracteres = texto.length;
      if (reprova) {
        mudancas.push({ nome: obra.nome, de: obra.nota, porPagina: Math.round(porPagina) });
        obra.nota = 0;
        obra.penalidades = [
          `PDF sem camada de texto (${Math.round(porPagina)} caracteres por página) — precisa de OCR`,
        ];
      }
    } catch (err) {
      console.log(
        `  ${String(i).padStart(2)}/${alvos.length} ⚫ falha: ${obra.nome.slice(0, 36)} — ${err.message.slice(0, 50)}`,
      );
    }
  }

  console.log(`\n${'─'.repeat(60)}`);
  if (mudancas.length === 0) {
    console.log('Nenhuma reprovação nova — as aprovações antigas se sustentam.');
  } else {
    console.log(`${mudancas.length} obra(s) reprovadas pelo guarda religado:`);
    for (const m of mudancas) {
      console.log(`  ${m.nome.slice(0, 50)} — era ${m.de}, ${m.porPagina} car/pág`);
    }
  }

  if (simular) {
    console.log('\n(--simular: relatório não foi alterado)');
    return;
  }

  const temporario = `${destino}.tmp`;
  fs.writeFileSync(temporario, JSON.stringify(relatorio, null, 2));
  fs.renameSync(temporario, destino);
  console.log(`\nrelatório atualizado: ${relatorio.length} obras → ${destino}`);
})();
