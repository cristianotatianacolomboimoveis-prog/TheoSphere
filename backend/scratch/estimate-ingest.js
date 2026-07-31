/**
 * estimate-ingest.js — estima o custo da ingestão ANTES de rodá-la.
 *
 * Os trechos gerados têm ~250 caracteres. Um acervo teológico de 20 livros
 * pode virar dezenas de milhares de embeddings — e foi estourar a cota do
 * Gemini que derrubou a plataforma em 29/07/2026. Melhor saber antes.
 *
 *   node scratch/estimate-ingest.js
 */
require('dotenv').config({ quiet: true });
const { google } = require('googleapis');

const CHUNK_CHARS = 250;
// PDF: bytes ≈ 3-10x o texto extraído (imagens, fontes, estrutura).
// 5x é um meio-termo conservador para livros com pouca imagem.
const RAZAO_BYTES_TEXTO = 5;

(async () => {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  await auth.authorize();

  const drive = google.drive({ version: 'v3', auth });
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, size)',
    pageSize: 1000,
  });

  const suportados = (res.data.files ?? []).filter((f) =>
    /pdf|document|epub/i.test(f.mimeType ?? ''),
  );
  const ignorados = (res.data.files ?? []).length - suportados.length;

  let bytesTotal = 0;
  console.log('ARQUIVOS SUPORTADOS\n');
  for (const f of suportados) {
    const mb = Number(f.size ?? 0) / 1024 / 1024;
    bytesTotal += Number(f.size ?? 0);
    const chunks = Math.round(
      (Number(f.size ?? 0) / RAZAO_BYTES_TEXTO) / CHUNK_CHARS,
    );
    console.log(
      `  ${mb.toFixed(1).padStart(6)} MB  ~${String(chunks).padStart(6)} trechos  ${f.name.slice(0, 58)}`,
    );
  }

  const textoEstimado = bytesTotal / RAZAO_BYTES_TEXTO;
  const chunksTotal = Math.round(textoEstimado / CHUNK_CHARS);
  // ~4 caracteres por token
  const tokensTotal = Math.round(textoEstimado / 4);

  console.log('\n' + '─'.repeat(60));
  console.log(`arquivos suportados : ${suportados.length}${ignorados ? ` (${ignorados} ignorados — áudio/outros)` : ''}`);
  console.log(`tamanho total       : ${(bytesTotal / 1024 / 1024).toFixed(1)} MB`);
  console.log(`texto estimado      : ~${(textoEstimado / 1e6).toFixed(1)} milhões de caracteres`);
  console.log(`TRECHOS a indexar   : ~${chunksTotal.toLocaleString('pt-BR')}`);
  console.log(`TOKENS de embedding : ~${tokensTotal.toLocaleString('pt-BR')}`);
  console.log('─'.repeat(60));
  console.log('\nA estimativa é grosseira: a razão bytes→texto do PDF varia muito');
  console.log('com imagens e fontes embutidas. Serve para ordem de grandeza.');
})();
