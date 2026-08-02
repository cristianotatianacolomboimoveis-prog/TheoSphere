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

/**
 * ── Elegibilidade: uma regra só, usada pelos dois scripts ───────────────────
 *
 * Motivo (01/08/2026): ingest-next.js e analyze-quality.js decidiam cada um por
 * conta própria quais arquivos do Drive contavam, e as regras divergiam:
 *
 *   ingest-next    → /pdf|document|epub|presentation/ no mimeType, sem teto
 *   analyze-quality → findExtractor(mimeType) + teto de 60 MB
 *
 * O resultado era um aviso perpétuo e insolúvel. Três arquivos ficavam
 * eternamente "sem análise" no plano do ingest — um .odt (que casava com
 * "document"), um .pptx (que casava com "presentation") e um PDF de 78,6 MB —
 * porque o analisador, por regra própria, nunca os alcançava. Rodar
 * `analyze-quality.js --pendentes`, que era o que o aviso mandava fazer, não
 * mudava nada: os três não estavam no relatório, e `--pendentes` só revisitava
 * quem já estava.
 *
 * Pior que o incômodo: o .odt e o .pptx entrariam na fila de indexação do
 * ingest se algum dia ganhassem nota, e não há extrator para eles — quebrariam
 * no processFile.
 *
 * Agora a pergunta "este arquivo entra?" tem uma resposta só, aqui.
 */

/**
 * Teto de tamanho para download e extração.
 *
 * Não é um limite de custo — quem controla custo é o lote diário. É um limite
 * de memória: extrair um PDF grande carrega o arquivo inteiro em Buffer e o
 * texto em string. O acervo tem um interlinear de 216 MB (barrado pela
 * curadoria, mas serve de referência de escala).
 *
 * 60 MB deixava "a prática da Piedade" (78,6 MB) permanentemente fora da
 * análise E dentro da fila de indexação — o pior dos dois mundos. 120 MB cobre
 * tudo que a curadoria deixa passar hoje.
 */
const TAMANHO_MAXIMO = Number(process.env.INGEST_TAMANHO_MAXIMO_MB ?? 120) * 1024 * 1024;

/**
 * Este arquivo do Drive entra na biblioteca?
 *
 * @param {{id?: string, name?: string, mimeType?: string, size?: string|number}} file
 * @returns {{ok: boolean, motivo: string|null}} `motivo` é nulo quando ok.
 */
function elegivel(file) {
  // Carregado aqui dentro, e não no topo, para curadoria.js continuar
  // utilizável por scripts que rodam sem o build (`dist/`) presente.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { findExtractor } = require('../dist/rag/text-extractors');

  if (excluir(file.name)) {
    return { ok: false, motivo: `curadoria: ${motivoExclusao(file.name)}` };
  }
  if (!findExtractor(file.mimeType ?? '')) {
    return { ok: false, motivo: `sem extrator para ${file.mimeType || 'tipo desconhecido'}` };
  }
  const bytes = Number(file.size ?? 0);
  if (bytes >= TAMANHO_MAXIMO) {
    return {
      ok: false,
      motivo: `${(bytes / 1024 / 1024).toFixed(1)} MB — acima do teto de ${(TAMANHO_MAXIMO / 1024 / 1024).toFixed(0)} MB`,
    };
  }
  return { ok: true, motivo: null };
}

module.exports = {
  excluir,
  motivoExclusao,
  normaliza,
  elegivel,
  TAMANHO_MAXIMO,
  PADROES,
};
