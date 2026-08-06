/**
 * licencas.js — ponte dos scripts de curadoria para o portão de licença.
 *
 * A lógica e os dados vivem em `src/rag/license-manifest.ts` e
 * `src/rag/license-gate.ts`, compilados junto com o serviço. Este arquivo
 * apenas os expõe aos scripts em JavaScript puro (`ingest-next.js`,
 * `purge-nao-livres.js`), preservando a assinatura que eles já usam.
 *
 * ── Por que uma ponte, e não uma cópia ─────────────────────────────────────
 * Até 04/08/2026 existiam duas verdades: este manifesto em JSON, lido pelos
 * scripts, e nenhuma verificação na API de ingestão. O resultado foi uma obra
 * protegida entrando com milhares de trechos enquanto a curadoria a dava como
 * bloqueada. Manifesto duplicado é manifesto que diverge — e divergir aqui
 * significa servir obra protegida achando que está tudo certo. Uma fonte só.
 */
// Registro explícito. O `rootDir` fica no tsconfig.build, não no tsconfig
// base; carregando só dois arquivos de `src/rag`, o ts-node inferiria o
// `rootDir` como './src/rag' e falharia com TS5011. Fixá-lo na raiz do backend
// resolve. `transpileOnly` porque a checagem de tipos já roda no build e nos
// testes — aqui só precisamos executar.
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { rootDir: '.' },
});

const {
  licencaDe: licencaDeTs,
  APROVADOS,
  OBRAS,
} = require('../src/rag/license-gate');

/**
 * Mantida por compatibilidade com os scripts existentes. Nunca retorna null:
 * o manifesto é código compilado, não um arquivo que pode faltar.
 * @returns {{ obras: Record<string, object> }}
 */
function carregarLicencas() {
  return { obras: OBRAS };
}

/**
 * Decisão de licença para um arquivo `{ id, name }`.
 * @returns {{ ok: boolean, status: string, motivo: string|null }}
 */
function licencaDe(file, _manifesto) {
  return licencaDeTs(file);
}

module.exports = { carregarLicencas, licencaDe, APROVADOS };
