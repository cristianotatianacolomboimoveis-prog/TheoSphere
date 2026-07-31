/**
 * ingest-next.js — indexa os PRÓXIMOS N livros ainda não indexados.
 *
 * Feito para rodar todo dia sem supervisão. O acervo do Drive tem 110
 * arquivos / ~651 mil trechos; indexar tudo de uma vez custaria ~40 milhões
 * de tokens de embedding e estouraria o teto de gastos (foi o que derrubou a
 * plataforma em 29/07/2026). Em lotes diários, o custo se dilui e o acervo
 * cresce sem sobressalto.
 *
 *   node scratch/ingest-next.js          # 3 livros (padrão)
 *   node scratch/ingest-next.js 5        # 5 livros
 *   node scratch/ingest-next.js --plano  # mostra a fila, sem indexar
 *
 * CURADORIA — o que fica de fora, e por quê:
 *
 *  • Bíblias, interlineares, léxicos e gramáticas. A plataforma já tem texto
 *    bíblico, Strong e interlinear em banco estruturado. Indexá-los como
 *    fragmentos soltos de 250 caracteres é caro E pior: a busca devolveria
 *    pedaços avulsos em vez da referência estruturada que já existe.
 *    Só o "Novo Testamento Interlinear" (216 MB) seria 28% do custo total.
 *
 *  • Material não-teológico (literatura, apontamentos soltos, tabelas).
 *
 * A ordem prioriza sistemática e comentários — o que a plataforma não tem e
 * o que os testadores mais perguntam.
 */
require('dotenv').config({ quiet: true });

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { google } = require('googleapis');

const path = require('node:path');
const fs = require('node:fs');

/** Curadoria por nome de arquivo — lista única em curadoria.js. */
const { excluir, normaliza } = require('./curadoria');

/**
 * Nota mínima no relatório de qualidade para uma obra ser indexada.
 *
 * Existe porque a primeira leva de indexação entrou sem conferência e trouxe
 * duas traduções automáticas — o Grudem com "Peter" no lugar de "Pedro", o
 * Sproul com "a bondade ea doçura". Servir isso citando o autor é pior que
 * não ter biblioteca: a plataforma atribui a um teólogo frases que ele não
 * escreveu, e o testador não tem como saber.
 *
 * 70 é o corte porque, na calibração, tradução humana ficou em 97 e tradução
 * automática em 40 — não há nada legítimo na faixa intermediária.
 */
const NOTA_MINIMA = Number(process.env.INGEST_NOTA_MINIMA ?? 70);

/** Lê o veredito de qualidade produzido por analyze-quality.js. */
function carregarQualidade() {
  const arquivo = path.join(__dirname, 'quality-report.json');
  if (!fs.existsSync(arquivo)) return null;
  const mapa = new Map();
  for (const obra of JSON.parse(fs.readFileSync(arquivo, 'utf8'))) {
    mapa.set(obra.id, obra);
  }
  return mapa;
}

/** Ordem de prioridade: quanto mais cedo o padrão casa, antes o livro entra. */
const PRIORIDADE = [
  /institutas/i,
  /hoekema/i,
  /carson/i,
  /packer/i,
  /owen/i,
  /schaeffer/i,
  /lloyd-jones|lloyd jones/i,
  /sproul/i,
  /stott/i,
  /piper/i,
  /spurgeon|licoes aos meus alunos|lições aos meus alunos/i,
  /westminster/i,
  /teologia sistematica|teologia sistemática/i,
  /teologia do novo testamento/i,
  /historia da teologia|história da teologia/i,
  /comentario|comentário/i,
];

function prioridadeDe(nome) {
  const i = PRIORIDADE.findIndex((re) => re.test(normaliza(nome)));
  return i === -1 ? PRIORIDADE.length : i;
}

(async () => {
  const args = process.argv.slice(2);
  const soPlano = args.includes('--plano');
  const quantos = Number(args.find((a) => /^\d+$/.test(a)) ?? 3);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    // ── 1. O que já está indexado (por fileId, não por nome) ────────────────
    const indexados = await prisma.$queryRawUnsafe(
      `SELECT DISTINCT metadata->>'fileId' AS id
       FROM "UserEmbedding" WHERE type = 'library_book'`,
    );
    const jaTem = new Set(indexados.map((r) => r.id).filter(Boolean));

    // ── 2. O que existe no Drive ────────────────────────────────────────────
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

    const todos = (res.data.files ?? []).filter((f) =>
      /pdf|document|epub|presentation/i.test(f.mimeType ?? ''),
    );

    const excluidos = todos.filter((f) => excluir(f.name));
    const candidatos = todos
      .filter((f) => !excluir(f.name))
      .filter((f) => !jaTem.has(f.id));

    // ── 2b. Portão de qualidade ─────────────────────────────────────────────
    // Sem relatório, não se indexa nada: passar direto foi exatamente o erro
    // que encheu a biblioteca de tradução automática.
    const qualidade = carregarQualidade();
    if (!qualidade) {
      console.log(
        'Nenhum relatório de qualidade encontrado.\n' +
          'Rode primeiro: node scratch/analyze-quality.js\n' +
          '(indexar sem conferir foi o que trouxe Grudem e Sproul traduzidos por máquina)',
      );
      return;
    }

    const semAnalise = candidatos.filter((f) => !qualidade.has(f.id));
    const reprovados = candidatos.filter(
      (f) => qualidade.has(f.id) && qualidade.get(f.id).nota < NOTA_MINIMA,
    );
    const elegiveis = candidatos.filter(
      (f) => qualidade.has(f.id) && qualidade.get(f.id).nota >= NOTA_MINIMA,
    );

    elegiveis.sort((a, b) => {
      const p = prioridadeDe(a.name) - prioridadeDe(b.name);
      if (p !== 0) return p;
      // Empate na prioridade: a de melhor nota primeiro; depois a menor, para
      // o acervo crescer em número de obras antes de encarar os calhamaços.
      const q = qualidade.get(b.id).nota - qualidade.get(a.id).nota;
      return q !== 0 ? q : Number(a.size ?? 0) - Number(b.size ?? 0);
    });

    console.log(
      `acervo: ${todos.length} arquivos · ${excluidos.length} fora por curadoria · ` +
        `${jaTem.size} já indexados\n` +
        `qualidade: ${elegiveis.length} aprovadas · ${reprovados.length} reprovadas` +
        (semAnalise.length ? ` · ${semAnalise.length} sem análise` : '') +
        `  (corte: ${NOTA_MINIMA})\n`,
    );

    if (semAnalise.length) {
      console.log(
        `⚠️  ${semAnalise.length} obra(s) novas no Drive ainda não analisadas — ` +
          'rode analyze-quality.js para incluí-las.\n',
      );
    }

    const lote = elegiveis.slice(0, quantos);
    if (lote.length === 0) {
      console.log('✅ fila vazia — todo o acervo elegível já está indexado.');
      return;
    }

    console.log(`PRÓXIMOS ${lote.length}:`);
    for (const f of lote) {
      const q = qualidade.get(f.id);
      console.log(
        `  nota ${String(q.nota).padStart(3)} · ` +
          `${(Number(f.size ?? 0) / 1024 / 1024).toFixed(1).padStart(6)} MB  ` +
          f.name.slice(0, 56),
      );
    }

    if (soPlano) {
      console.log('\n(--plano: nada foi indexado)');
      return;
    }

    // ── 3. Indexa, medindo cada obra ────────────────────────────────────────
    const { NestFactory } = require('@nestjs/core');
    const { AppModule } = require('../dist/app.module');
    const { DriveRagService } = require('../dist/rag/drive-rag.service');

    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error'],
    });
    const driveRag = app.get(DriveRagService);

    const contar = async () =>
      Number(
        (
          await prisma.$queryRawUnsafe(
            `SELECT COUNT(*)::int AS n FROM "UserEmbedding" WHERE type = 'library_book'`,
          )
        )[0].n,
      );

    const inicio = await contar();
    console.log('');

    for (const file of lote) {
      const antes = await contar();
      const t0 = Date.now();
      try {
        await driveRag.processFile(drive, file, 'public-guest', 'Geral');
        const depois = await contar();
        console.log(
          `✓ +${depois - antes} trechos em ${((Date.now() - t0) / 1000).toFixed(0)}s — ${file.name.slice(0, 50)}`,
        );
      } catch (err) {
        console.log(`✗ ${file.name.slice(0, 50)}: ${err.message.slice(0, 110)}`);
      }
    }

    const fim = await contar();
    console.log(
      `\nacervo: ${fim} trechos (+${fim - inicio}) · restam ${elegiveis.length - lote.length} obras na fila`,
    );

    await app.close();
  } catch (err) {
    console.error('Erro:', err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
})();
