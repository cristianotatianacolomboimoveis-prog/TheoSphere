/**
 * curadoria.js — o que NÃO entra na biblioteca RAG, e por quê.
 *
 * Fonte única compartilhada por ingest-next.js e analyze-quality.js, para as
 * duas listas não divergirem.
 *
 * ── Por que a comparação é sem acento ──────────────────────────────────────
 * Os nomes vindos do Google Drive chegam em NFD: "Preguiça" é gravado como
 * `c` + cedilha combinante, não como o `ç` composto que digitamos aqui. Um
 * /preguiça/i escrito à mão simplesmente não casa, e o arquivo passa batido —
 * foi assim que "Farsa da Boa Preguiça" (Suassuna) entrou na fila de uma
 * biblioteca teológica. Normalizar os dois lados resolve de uma vez e evita
 * ter de escrever cada padrão em duas grafias.
 */

/** Remove acentos e caixa, para o padrão casar independente da composição. */
const normaliza = (s) =>
  (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * Padrões escritos SEM acento — são aplicados ao nome já normalizado.
 *
 * Bíblias, interlineares, léxicos e gramáticas ficam de fora porque a
 * plataforma já tem texto bíblico, Strong e interlinear em banco estruturado.
 * Indexá-los como fragmentos de 250 caracteres é caro E pior: a busca
 * devolveria pedaços avulsos em vez da referência estruturada que já existe.
 * Só o "Novo Testamento Interlinear" (216 MB) seria 28% do custo do acervo.
 */
const PADROES = [
  // ── Texto bíblico — já servido nativamente ──────────────────────────────
  /biblia sagrada/,
  /biblia de jerusalem/,
  /interlinear/,
  /^bhs\./,
  /nestle aland/,
  /\bna2[78]\b/,

  // ── Léxicos e gramáticas — já servidos por Strong e morfologia ──────────
  /lexico do novo testamento/,
  /chave linguistica/,
  /gramatica/,
  /nocoes (do grego|de hebraico)/,
  /palavras chaves do novo testamento/,
  /fundamentos do grego/,
  /tabela (grego|hebraica)/,
  /qual o texto original/,

  // ── Fora do escopo teológico ────────────────────────────────────────────
  // Literatura brasileira: excelente, mas não é fonte de pesquisa bíblica.
  /farsa da boa preguica/,
  /ariano suassuna/,
  // Joseph Murphy é Novo Pensamento — "a mente cria a realidade". Citá-lo
  // como fonte teológica numa plataforma de pesquisa bíblica seria um erro
  // de categoria: não é uma corrente cristã minoritária, é outra religião.
  /joseph murphy/,
  /poder da oracao para transformar sua vida/,

  // ── Material solto e formatos sem texto corrido ─────────────────────────
  /\(apontamento\)/,
  /panorama do antigo testamento\.pptx/,
  /\.(m4a|mp3|jpg|png)$/,
];

/** true se o arquivo deve ficar fora da biblioteca. */
function excluir(nome) {
  const n = normaliza(nome);
  return PADROES.some((re) => re.test(n));
}

/** Qual padrão barrou o arquivo — para explicar a decisão no relatório. */
function motivoExclusao(nome) {
  const n = normaliza(nome);
  const re = PADROES.find((r) => r.test(n));
  return re ? String(re) : null;
}

module.exports = { excluir, motivoExclusao, normaliza, PADROES };
