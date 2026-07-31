/**
 * ingest-selected.js — indexa obras ESCOLHIDAS do Drive, uma a uma, medindo.
 *
 * Por que não usar o endpoint HTTP: ele processa a pasta inteira (110
 * arquivos, ~651 mil trechos, ~40 milhões de tokens de embedding). Isso
 * estouraria o teto de gastos do Gemini de novo — foi o que derrubou a
 * plataforma em 29/07/2026.
 *
 * Aqui a ingestão roda pelo próprio serviço do backend (mesmo código, mesmo
 * chunking, mesmos embeddings), mas filtrando os arquivos por nome e
 * reportando custo real de cada obra.
 *
 * Também dispensa login: chama o serviço direto, sem HTTP, sem JWT, sem senha.
 *
 *   node scratch/ingest-selected.js "Grudem" "Sproul" "Hoekema"
 *   node scratch/ingest-selected.js --listar          # só mostra o que casaria
 *
 * O acervo é gravado no usuário `public-guest` — o acervo compartilhado que
 * a busca da plataforma consulta para todos.
 */
require('dotenv').config({ quiet: true });

const { NestFactory } = require('@nestjs/core');

async function main() {
  const args = process.argv.slice(2);
  const apenasListar = args.includes('--listar');
  const filtros = args.filter((a) => !a.startsWith('--'));

  if (filtros.length === 0) {
    console.error('Informe ao menos um trecho do nome da obra.');
    console.error('  node scratch/ingest-selected.js "Grudem" "Sproul"');
    process.exit(1);
  }

  const { google } = require('googleapis');
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

  const normaliza = (s) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();

  const escolhidos = (res.data.files ?? []).filter((f) =>
    filtros.some((t) => normaliza(f.name ?? '').includes(normaliza(t))),
  );

  if (escolhidos.length === 0) {
    console.log('Nenhum arquivo casou com os filtros.');
    return;
  }

  console.log(`${escolhidos.length} arquivo(s) selecionado(s):\n`);
  for (const f of escolhidos) {
    console.log(
      `  ${(Number(f.size ?? 0) / 1024 / 1024).toFixed(1).padStart(6)} MB  ${f.name}`,
    );
  }

  if (apenasListar) {
    console.log('\n(--listar: nada foi indexado)');
    return;
  }

  // ── Sobe o contexto do Nest para usar o serviço real de ingestão ──────────
  console.log('\nIniciando o backend em modo standalone...');
  const { AppModule } = require('../dist/app.module');
  const { DriveRagService } = require('../dist/rag/drive-rag.service');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['warn', 'error'],
  });
  const driveRag = app.get(DriveRagService);

  const { PrismaClient } = require('@prisma/client');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const contar = async () =>
    Number(
      (
        await prisma.$queryRawUnsafe(
          `SELECT COUNT(*)::int AS n FROM "UserEmbedding" WHERE type = 'library_book'`,
        )
      )[0].n,
    );

  const antesTotal = await contar();
  console.log(`trechos já indexados: ${antesTotal}\n`);

  for (const file of escolhidos) {
    const antes = await contar();
    const t0 = Date.now();
    console.log(`→ ${file.name}`);

    try {
      // processFile é privado no serviço; acessível em runtime.
      await driveRag.processFile(drive, file, 'public-guest', 'Geral');
      const depois = await contar();
      const seg = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(`   +${depois - antes} trechos em ${seg}s\n`);
    } catch (err) {
      console.log(`   ✗ falhou: ${err.message.slice(0, 160)}\n`);
    }
  }

  const total = await contar();
  console.log('─'.repeat(56));
  console.log(`TOTAL na biblioteca: ${total} trechos (+${total - antesTotal})`);
  console.log('─'.repeat(56));

  await prisma.$disconnect();
  await pool.end();
  await app.close();
}

main().catch((e) => {
  console.error('Erro:', e.message);
  process.exit(1);
});
