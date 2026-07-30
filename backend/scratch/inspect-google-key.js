/**
 * inspect-google-key.js — diagnostica a credencial do Google sem expor o segredo.
 *
 * Em 30/07/2026 o GOOGLE_PRIVATE_KEY do .env local apareceu com 27 caracteres.
 * Este script mostra a FORMA do valor (linhas, marcadores, escapes) para
 * distinguir "chave ausente" de "chave quebrada na leitura do .env" — e faz um
 * teste de autenticação real contra o Google, imprimindo só o resultado.
 *
 *   node scratch/inspect-google-key.js
 */
const fs = require('node:fs');
const path = require('node:path');

const envPath = path.join(__dirname, '../.env');

console.log('=== como a variável está escrita no arquivo ===');
if (!fs.existsSync(envPath)) {
  console.log('backend/.env não existe');
} else {
  const linhas = fs.readFileSync(envPath, 'utf8').split('\n');
  const i = linhas.findIndex((l) => l.trim().startsWith('GOOGLE_PRIVATE_KEY'));
  if (i === -1) {
    console.log('GOOGLE_PRIVATE_KEY não aparece no arquivo');
  } else {
    const linha = linhas[i];
    console.log(`linha ${i + 1}: ${linha.length} caracteres`);
    console.log(`  começa com aspas?     ${/=\s*"/.test(linha)}`);
    console.log(`  tem \\n escapado?      ${linha.includes('\\n')}`);
    console.log(`  tem END PRIVATE KEY?  ${linha.includes('END PRIVATE KEY')}`);
    // As linhas seguintes revelam se a chave "vazou" para fora da variável.
    for (let k = 1; k <= 3 && linhas[i + k] !== undefined; k++) {
      const prox = linhas[i + k].trim();
      const rotulo = /^[A-Z0-9_]+=/.test(prox)
        ? `outra variável (${prox.split('=')[0]})`
        : prox === ''
          ? '(linha vazia)'
          : `CONTINUAÇÃO ÓRFÃ: ${prox.slice(0, 30)}…`;
      console.log(`  linha ${i + 1 + k}: ${rotulo}`);
    }
  }
}

console.log('\n=== teste de autenticação real ===');
require('dotenv').config({ quiet: true });

(async () => {
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const raw = process.env.GOOGLE_PRIVATE_KEY ?? '';
  const key = raw.replace(/\\n/g, '\n');

  console.log(`client_email : ${email ? 'presente' : 'AUSENTE'}`);
  console.log(`private_key  : ${key.length} caracteres após tratar \\n`);

  if (!email || key.length < 100) {
    console.log('\n✗ credencial incompleta — a autenticação nem será tentada.');
    return;
  }

  try {
    const { google } = require('googleapis');
    const auth = new google.auth.JWT({
      email,
      key,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    await auth.authorize();
    console.log('\n✅ autenticou no Google');

    const drive = google.drive({ version: 'v3', auth });
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
      console.log('⚠️  GOOGLE_DRIVE_FOLDER_ID ausente — não dá para listar a pasta.');
      return;
    }
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType)',
      pageSize: 20,
    });
    const arquivos = res.data.files ?? [];
    console.log(`\n📁 pasta ${folderId}: ${arquivos.length} arquivo(s)`);
    for (const f of arquivos.slice(0, 15)) {
      console.log(`   ${f.name}`);
    }
    if (arquivos.length === 0) {
      console.log('   (a service account pode não ter acesso — compartilhe a pasta com o e-mail dela)');
    }
  } catch (err) {
    console.log(`\n✗ falha: ${err.message.slice(0, 200)}`);
  }
})();
