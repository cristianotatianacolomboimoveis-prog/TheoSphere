// Sobrescreve (files.update) os docx corrompidos no Drive com os arquivos locais BONS.
// A conta de servico NAO cria arquivo (sem cota), mas PODE atualizar conteudo de
// arquivo existente (nao gera cota). Verifica com sha256 apos o update.
require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const crypto = require('crypto');

function getPrivateKey() {
  let k = process.env.GOOGLE_PRIVATE_KEY || '';
  if (k.startsWith('"') && k.endsWith('"')) k = k.slice(1, -1);
  return k.replace(/\\n/g, '\n');
}

const DIR = '/Users/cristianocolombo/Downloads/TheoSphere/acervo-traduzido';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// fileId corrompido no Drive  ->  arquivo local integro
const JOBS = [
  {
    fileId: '1ry2DGkQEzNETCQGfhVgk9RWVumlxV1Q2',
    local: `${DIR}/Confissoes de Agostinho - Livro I parte 1 - dominio publico.docx`,
    nome: 'Confissoes de Agostinho - Livro I parte 1',
  },
  {
    fileId: '1Hlp2piM5TGxfUBiuPm-SIWoxf71Gaiwl',
    local: `${DIR}/Catecismo Menor de Westminster (completo) - dominio publico.docx`,
    nome: 'Catecismo Menor de Westminster (completo)',
  },
];

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

async function main() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: getPrivateKey(),
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  const drive = google.drive({ version: 'v3', auth });

  for (const job of JOBS) {
    console.log(`\n=== ${job.nome} ===`);
    const localBuf = fs.readFileSync(job.local);
    const localSha = sha(localBuf);
    console.log(`local: ${localBuf.length} bytes  sha256 ${localSha.slice(0, 16)}…`);

    // 1) sobrescrever conteudo
    try {
      await drive.files.update({
        fileId: job.fileId,
        media: { mimeType: DOCX, body: fs.createReadStream(job.local) },
        supportsAllDrives: true,
      });
      console.log('update: OK');
    } catch (e) {
      console.log('update FALHOU:', e.errors ? JSON.stringify(e.errors) : e.message);
      continue;
    }

    // 2) baixar de volta e comparar sha256 (verificacao ponta a ponta)
    const res = await drive.files.get(
      { fileId: job.fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' },
    );
    const remoteBuf = Buffer.from(res.data);
    const remoteSha = sha(remoteBuf);
    const ok = remoteSha === localSha;
    console.log(`drive: ${remoteBuf.length} bytes  sha256 ${remoteSha.slice(0, 16)}…`);
    console.log(ok ? '✅ INTEGRO (hash bate)' : '❌ DIVERGENTE (ainda corrompido)');
  }
  console.log('\nfim.');
}
main().catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
