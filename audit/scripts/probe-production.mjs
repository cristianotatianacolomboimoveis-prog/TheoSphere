#!/usr/bin/env node
/**
 * probe-production.mjs — bate nos endpoints críticos em produção.
 *
 * Por que existe: lint, teste e build medem o repositório. Com gente testando
 * a plataforma, o que importa é se o servidor responde AGORA. Um endpoint que
 * existe no código mas não foi deployado devolve 404 em produção e passa
 * despercebido em toda a suíte local — foi o caso do passage-guide.
 *
 * Uso:
 *   node audit/scripts/probe-production.mjs
 *   node audit/scripts/probe-production.mjs --json
 *   BASE_URL=http://localhost:3002 node audit/scripts/probe-production.mjs
 *
 * Saída: 0 = todos os obrigatórios OK · 1 = algum obrigatório falhou
 *
 * Nota sobre o Render free tier: o serviço dorme após 15 min ociosos e o
 * primeiro request paga ~60s de cold start. O primeiro probe aquece e usa
 * timeout generoso; os demais herdam o servidor acordado.
 *
 * ONDE RODA: na sua máquina (`node audit/scripts/probe-production.mjs`) ou em
 * CI. O sandbox onde a verificação diária executa bloqueia HTTP de saída do
 * Node — lá o agente sonda os mesmos endpoints pela ferramenta de fetch dele,
 * usando a lista de URLs escrita na própria task. Mantenha as duas listas em
 * sincronia ao adicionar endpoint novo.
 */

const BASE = (process.env.BASE_URL || "https://theosphere.onrender.com")
  .trim()
  .replace(/\/$/, "");
const asJson = process.argv.includes("--json");

/**
 * `required: false` marca endpoint que legitimamente responde 401 sem sessão —
 * o que se verifica é que ele existe e responde, não que devolve dados.
 */
const PROBES = [
  { name: "health", path: "/api/v1/health", accept: [200] },
  { name: "bíblia · versões", path: "/api/v1/bible/versions", accept: [200] },
  { name: "bíblia · livros", path: "/api/v1/bible/books", accept: [200] },
  {
    name: "bíblia · capítulo",
    path: "/api/v1/bible/chapter/BLIVRE/1/1",
    accept: [200],
  },
  {
    name: "passage guide",
    path: "/api/v1/bible/passage-guide/BLIVRE/1/1",
    accept: [200],
    nota: "só existe após o deploy do backend de 29/07",
  },
  {
    name: "busca · versículos",
    path: "/api/v1/search/verses?q=luz&translation=BLIVRE",
    accept: [200],
  },
  { name: "cross-refs", path: "/api/v1/cross-refs?ref=John%203:16", accept: [200] },
  { name: "geo · locais", path: "/api/v1/geo/locations", accept: [200] },
  {
    name: "arqueologia · stats",
    path: "/api/v1/archaeology/stats",
    accept: [200],
  },
  {
    name: "interlinear",
    path: "/api/v1/linguistics/interlinear/1/1",
    accept: [200],
  },
  { name: "rag · stats", path: "/api/v1/rag/stats", accept: [200] },
  {
    name: "biblioteca · lookup",
    path: "/api/v1/library/lookup?term=logos&limit=1",
    accept: [200, 401],
    required: false,
  },
];

const COLD_START_MS = 90_000;
const NORMAL_MS = 20_000;

async function probe(p, timeoutMs) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${p.path}`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    const ms = Date.now() - started;
    return {
      ...p,
      status: res.status,
      ms,
      ok: p.accept.includes(res.status),
    };
  } catch (e) {
    return {
      ...p,
      status: null,
      ms: Date.now() - started,
      ok: false,
      erro: e.name === "AbortError" ? `timeout ${timeoutMs}ms` : e.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

const results = [];
for (const [i, p] of PROBES.entries()) {
  // O primeiro probe absorve o cold start do Render.
  results.push(await probe(p, i === 0 ? COLD_START_MS : NORMAL_MS));
}

const failures = results.filter((r) => !r.ok && r.required !== false);
const degraded = results.filter((r) => !r.ok && r.required === false);

if (asJson) {
  console.log(JSON.stringify({ base: BASE, results, failures }, null, 2));
} else {
  console.log(`\nProdução: ${BASE}\n`);
  for (const r of results) {
    const mark = r.ok ? "✅" : r.required === false ? "⚠️ " : "❌";
    const detail = r.erro ? r.erro : `HTTP ${r.status}`;
    console.log(
      `${mark} ${r.name.padEnd(24)} ${detail.padEnd(12)} ${String(r.ms).padStart(6)}ms${r.nota && !r.ok ? `  (${r.nota})` : ""}`,
    );
  }
  const slow = results.filter((r) => r.ok && r.ms > 3000 && r !== results[0]);
  if (slow.length) {
    console.log(
      `\n⏱  Lentos (>3s, fora do cold start): ${slow.map((s) => s.name).join(", ")}`,
    );
  }
  console.log(
    failures.length === 0
      ? `\n✅ ${results.length - degraded.length} endpoint(s) obrigatório(s) OK.\n`
      : `\n❌ ${failures.length} endpoint(s) obrigatório(s) com falha.\n`,
  );
}

process.exit(failures.length === 0 ? 0 : 1);
