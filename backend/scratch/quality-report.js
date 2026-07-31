/**
 * quality-report.js — transforma quality-report.json num relatório legível.
 *
 *   node scratch/quality-report.js            # resumo no terminal
 *   node scratch/quality-report.js --md       # markdown, para arquivar
 *
 * O relatório reaplica a curadoria por nome (curadoria.js) na leitura, e não
 * na análise. Assim, ajustar a lista de exclusão não obriga a re-analisar as
 * 88 obras — que leva ~15 minutos e gasta tokens do revisor.
 */
const fs = require('node:fs');
const path = require('node:path');
const { excluir } = require('./curadoria');

const bruto = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'quality-report.json'), 'utf8'),
);
const md = process.argv.includes('--md');

const NOTA_MINIMA = 70;

const foraDeEscopo = bruto.filter((o) => excluir(o.nome));
const dados = bruto.filter((o) => !excluir(o.nome));

const porNota = [...dados].sort((a, b) => b.nota - a.nota);
const aprovadas = porNota.filter((o) => o.nota >= NOTA_MINIMA);
const reprovadas = porNota.filter((o) => o.nota < NOTA_MINIMA);

/**
 * A causa dominante da reprovação, porque a decisão sobre cada grupo é
 * diferente: tradução automática se descarta, PDF escaneado vai para OCR,
 * obra em inglês é decisão de produto e não defeito.
 */
const causa = (o) => {
  const p = (o.penalidades ?? []).join(' ');
  if (/tradução automática/.test(p)) return 'tradução automática';
  if (/sem texto extraível/.test(p)) return 'PDF escaneado, sem OCR';
  if (/ilegível/.test(p)) return 'texto ilegível';
  if (/pouco português/.test(p)) return 'obra em inglês';
  if (o.erro) return 'falha ao extrair';
  return 'outros defeitos';
};

const grupos = new Map();
for (const o of reprovadas) {
  const c = causa(o);
  if (!grupos.has(c)) grupos.set(c, []);
  grupos.get(c).push(o);
}

const L = [];
const w = (s = '') => L.push(s);
const nome = (o) => o.nome.replace(/\.pdf(\.pdf)?$/i, '').replace(/\s*\(Z-Library\)/i, '');

w(md ? '# Qualidade do acervo — TheoSphere' : 'QUALIDADE DO ACERVO');
w();
w(`${bruto.length} arquivos analisados`);
w(`${foraDeEscopo.length} fora de escopo (curadoria por nome)`);
w(`${aprovadas.length} aprovadas · ${reprovadas.length} reprovadas  (corte ${NOTA_MINIMA})`);
w();

w(md ? '## Aprovadas' : 'APROVADAS');
w();
for (const o of aprovadas) w(`${String(o.nota).padStart(3)}  ${nome(o)}`);
w();

w(md ? '## Reprovadas, por causa' : 'REPROVADAS, POR CAUSA');
for (const [c, obras] of [...grupos].sort((a, b) => b[1].length - a[1].length)) {
  w();
  w(md ? `### ${c} — ${obras.length}` : `${c.toUpperCase()} — ${obras.length}`);
  w();
  for (const o of obras) {
    w(`${String(o.nota).padStart(3)}  ${nome(o)}`);
    if (o.juiz?.evidencia && o.juiz.veredito !== 'humana') {
      w(`     "${o.juiz.evidencia}"`);
    }
  }
}

w();
w(md ? '## Fora de escopo' : 'FORA DE ESCOPO');
w();
w('Barradas pelo nome, sem relação com a qualidade do texto:');
for (const o of foraDeEscopo) w(`     ${nome(o)}`);

const piratas = dados.filter((o) => o.pirata).length;
if (piratas) {
  w();
  w(md ? '## Procedência' : 'PROCEDÊNCIA');
  w();
  w(
    `${piratas} arquivo(s) trazem "Z-Library" no nome. Independente da nota, ` +
      'publicar trechos deles numa plataforma comercial é uma exposição ' +
      'jurídica separada da questão de qualidade.',
  );
}

const texto = L.join('\n');
console.log(texto);

if (md) {
  const destino = path.join(__dirname, '..', '..', 'audit', 'qualidade-acervo.md');
  fs.writeFileSync(destino, texto);
  console.log(`\nsalvo em ${destino}`);
}
