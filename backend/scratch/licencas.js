/**
 * licencas.js — portão de LICENÇA da biblioteca RAG. Decide, por obra, se ela
 * pode ser indexada/servida do ponto de vista de direito autoral.
 *
 * Por que existe (decisão de 01/08/2026): a plataforma vai ser vendida, então
 * só pode servir obras em DOMÍNIO PÚBLICO ou LICENCIADAS. O portão de qualidade
 * (quality-report.json) mede se a tradução é boa — NÃO diz nada sobre direito
 * de uso. Uma tradução pirata excelente tem nota 97 e mesmo assim não pode ficar.
 *
 * ── Por que a decisão é por ARQUIVO, e não por autor/título ────────────────
 * Licença não se infere do nome. O original das Institutas (Calvino, séc. XVI)
 * é domínio público; a tradução moderna da Cultura Cristã/Fiel é obra nova e
 * protegida. Filtrar por "Calvino" aprovaria justamente a tradução protegida.
 * Por isso cada obra precisa de uma decisão humana explícita em licencas.json.
 *
 * ── Fail-closed ────────────────────────────────────────────────────────────
 * O que NÃO estiver aprovado no manifesto não entra. Ausência de sinal é
 * "não", nunca "pode". Foi ler ausência como aprovação que encheu a biblioteca
 * de tradução automática — o mesmo erro não se repete com licença.
 *
 * Fonte única, compartilhada por ingest-next.js e purge-nao-livres.js.
 */
const path = require('node:path');
const fs = require('node:fs');
const { normaliza } = require('./curadoria');

/** Status que autorizam uso. Qualquer outro (ou ausência) = bloqueado. */
const APROVADOS = new Set(['dominio-publico', 'licenciado']);

/**
 * Carrega o manifesto. Retorna { obras, porNormal } ou null se não existir.
 * `porNormal` indexa por nome normalizado (sem acento/caixa), porque os nomes
 * vindos do Drive chegam em NFD — a mesma armadilha tratada em curadoria.js.
 */
function carregarLicencas() {
  const arquivo = path.join(__dirname, 'licencas.json');
  if (!fs.existsSync(arquivo)) return null;
  const raw = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  const obras = raw.obras ?? {};
  const porNormal = new Map();
  for (const [chave, val] of Object.entries(obras)) {
    porNormal.set(normaliza(chave), val);
  }
  return { obras, porNormal };
}

/**
 * Decisão de licença para um arquivo `{ id, name }`.
 * Procura por fileId, depois nome exato, depois nome normalizado.
 * @returns {{ ok: boolean, status: string, motivo: string|null }}
 */
function licencaDe(file, manifesto) {
  const m = manifesto ?? carregarLicencas();
  if (!m) {
    return { ok: false, status: 'sem-manifesto', motivo: 'licencas.json ausente' };
  }
  const achado =
    m.obras[file.id] ||
    m.obras[file.name] ||
    m.porNormal.get(normaliza(file.name || ''));
  if (!achado) {
    return { ok: false, status: 'desconhecido', motivo: 'obra não consta em licencas.json' };
  }
  const status = achado.status ?? 'desconhecido';
  return { ok: APROVADOS.has(status), status, motivo: achado.motivo ?? null };
}

module.exports = { carregarLicencas, licencaDe, APROVADOS };
