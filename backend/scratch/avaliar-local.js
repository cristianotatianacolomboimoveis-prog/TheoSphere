/**
 * avaliar-local.js — passa arquivos de uma pasta local pelo portão de
 * qualidade, ANTES de subirem para o Drive.
 *
 * Por que existe: material novo hoje só é julgado depois de já estar no Drive,
 * misturado ao acervo. Quando a fonte é a internet, isso é tarde demais — o
 * acervo já ganhou um PDF escaneado, uma tradução de máquina ou um arquivo de
 * origem duvidosa, e alguém precisa lembrar de removê-lo. Duas das seis
 * primeiras obras indexadas entraram assim.
 *
 * O julgamento aqui é o MESMO do analyze-quality.js — as funções vêm de lá,
 * não são reescritas. Se o corte mudar, muda nos dois.
 *
 *   node scratch/avaliar-local.js ~/Downloads/novos
 *   node scratch/avaliar-local.js ~/Downloads/novos --sem-ia   # só heurísticas
 *
 * Saída: um veredito por arquivo e, no fim, a lista do que vale subir.
 */
require('dotenv').config({ quiet: true });

const { GoogleGenAI } = require('@google/genai');
const fs = require('node:fs');
const path = require('node:path');

const { pontuar, limparTexto, julgarComIA } = require('./analyze-quality');
const { excluir, motivoExclusao } = require('./curadoria');

const NOTA_MINIMA = Number(process.env.INGEST_NOTA_MINIMA ?? 70);
const CARACTERES_POR_PAGINA_MINIMO = 400;

/** Mesma tabela do Drive, para escolher o extrator por extensão. */
const MIME_POR_EXTENSAO = {
  '.pdf': 'application/pdf',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.epub': 'application/epub+zip',
};

(async () => {
  const pasta = process.argv[2];
  const semIa = process.argv.includes('--sem-ia');

  if (!pasta || !fs.existsSync(pasta)) {
    console.log('Uso: node scratch/avaliar-local.js <pasta> [--sem-ia]');
    process.exitCode = 1;
    return;
  }

  const { findExtractor } = require('../dist/rag/text-extractors');

  const chave = process.env.GEMINI_API_KEY;
  const genAI = !semIa && chave ? new GoogleGenAI({ apiKey: chave }) : null;
  if (!genAI) {
    console.log('⚠️  sem revisor de IA — só heurísticas (fidelidade fica menos confiável)\n');
  }

  const arquivos = fs
    .readdirSync(pasta)
    .filter((n) => MIME_POR_EXTENSAO[path.extname(n).toLowerCase()])
    .map((n) => path.join(pasta, n));

  if (arquivos.length === 0) {
    console.log(`Nenhum .pdf, .docx ou .epub em ${pasta}`);
    return;
  }

  console.log(`Avaliando ${arquivos.length} arquivo(s) de ${pasta}\n`);

  const aprovados = [];
  const recusados = [];

  for (const caminho of arquivos) {
    const nome = path.basename(caminho);

    // A curadoria vale aqui também: não adianta aprovar uma gramática grega
    // que o ingest-next vai descartar depois.
    if (excluir(nome)) {
      console.log(`⚪  —   ${nome.slice(0, 58)}`);
      console.log(`        fora por curadoria: ${motivoExclusao(nome)}`);
      recusados.push({ nome, motivo: 'curadoria' });
      continue;
    }

    try {
      const mime = MIME_POR_EXTENSAO[path.extname(nome).toLowerCase()];
      const { text: cru, meta } = await findExtractor(mime).extract(
        fs.readFileSync(caminho),
      );
      const texto = limparTexto(cru);
      const r = pontuar(texto, nome);
      r.caracteres = texto.length;
      r.paginas = meta?.pages;

      // Guarda de PDF escaneado — o mesmo do acervo, incluindo o caso em que a
      // contagem de páginas não vem (ver text-extractors.pdfPageCount).
      if (typeof meta?.pages === 'number' && meta.pages > 0) {
        const porPagina = texto.length / meta.pages;
        if (porPagina < CARACTERES_POR_PAGINA_MINIMO) {
          r.nota = 0;
          r.penalidades = [
            `PDF sem camada de texto (${Math.round(porPagina)} caracteres por página) — precisa de OCR`,
          ];
        }
      } else if (mime === 'application/pdf' && texto.length < 20000) {
        // Só para PDF: docx e epub não têm paginação por natureza, e tratar
        // essa ausência como suspeita reprovava manuscritos legítimos.
        r.nota = 0;
        r.penalidades = [
          `só ${texto.length} caracteres e sem contagem de páginas — provável PDF escaneado`,
        ];
      }

      if (r.nota >= 60 && genAI) {
        try {
          const juiz = await julgarComIA(genAI, texto);
          r.juiz = juiz;
          if (juiz.veredito === 'automatica') {
            r.nota = Math.min(r.nota, 40);
            r.penalidades.push(`tradução automática (IA, ${juiz.confianca}%)`);
          } else if (juiz.veredito === 'ilegivel') {
            r.nota = Math.min(r.nota, 20);
            r.penalidades.push('texto ilegível (IA)');
          }
        } catch (e) {
          r.juiz = { veredito: 'erro', evidencia: e.message.slice(0, 60) };
        }
        await new Promise((s) => setTimeout(s, 1200));
      }

      const marca = r.nota >= 85 ? '🟢' : r.nota >= NOTA_MINIMA ? '🟡' : '🔴';
      console.log(
        `${marca} ${String(r.nota).padStart(3)}  ${nome.slice(0, 58)}` +
          `  (${r.paginas ?? '?'} pág · ${r.caracteres} car)`,
      );
      if (r.penalidades?.length) console.log(`        ${r.penalidades.join(' · ')}`);
      if (r.juiz?.evidencia && r.juiz.veredito !== 'humana') {
        console.log(`        ↳ "${r.juiz.evidencia}"`);
      }
      if (r.pirata) {
        console.log('        ⚠️  nome indica origem em repositório pirata — confira o direito de uso');
      }

      (r.nota >= NOTA_MINIMA ? aprovados : recusados).push({ nome, nota: r.nota });
    } catch (err) {
      console.log(`⚫  —   ${nome.slice(0, 58)}`);
      console.log(`        falha ao extrair: ${err.message.slice(0, 80)}`);
      recusados.push({ nome, motivo: err.message.slice(0, 60) });
    }
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`✅ ${aprovados.length} pode(m) subir para o Drive:`);
  for (const a of aprovados) console.log(`   ${String(a.nota).padStart(3)} · ${a.nome}`);
  console.log(`\n🚫 ${recusados.length} não deve(m) subir:`);
  for (const r of recusados) console.log(`   ${r.nome}`);
  console.log(
    '\nLembrete: nota alta não é licença de uso. Confira a permissão da fonte antes de publicar.',
  );
})();
