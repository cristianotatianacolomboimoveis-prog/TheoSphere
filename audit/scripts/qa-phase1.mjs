#!/usr/bin/env node
/**
 * qa-phase1.mjs — Fase 1 do Agente Autônomo de QA da TheoSphere
 *
 * Objetivo: mapear automaticamente TODAS as funcionalidades da plataforma,
 * atribuir FUNC-IDs únicos e persistir o inventário em audit/qa-inventory.json
 * e audit/reports/YYYY-MM-DD_inventory.md
 *
 * Custo: zero LLM — análise estática + probes HTTP opcionais.
 *
 * Uso:
 *   node audit/scripts/qa-phase1.mjs              # inventário + probes HTTP
 *   node audit/scripts/qa-phase1.mjs --no-probes  # só análise estática
 *   node audit/scripts/qa-phase1.mjs --json       # saída JSON para automação
 *
 * Saída: 0 = sucesso · 1 = erro crítico
 */

import fs   from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE      = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(HERE, "../..");
const FRONTEND  = path.join(ROOT, "frontend-v2/src");
const BACKEND   = path.join(ROOT, "backend/src");
const OUT_JSON  = path.join(ROOT, "audit/qa-inventory.json");
const OUT_DIR   = path.join(ROOT, "audit/reports");

const asJson   = process.argv.includes("--json");
const noProbes = process.argv.includes("--no-probes");

const BACKEND_URL  = "https://theosphere.onrender.com";
const FRONTEND_URL = "https://cristianocolombo.vercel.app";

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────────────────────

function walk(dir, filter, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, filter, out);
    } else if (filter(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function rel(p) { return path.relative(ROOT, p); }

function extractDecorators(content, decorator) {
  const re = new RegExp(`@${decorator}\\((['"\`]?)([^'"\`)]*)\\1\\)`, "g");
  const results = [];
  let m;
  while ((m = re.exec(content)) !== null) results.push(m[2]);
  return results;
}

function extractAllRoutes(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const controllerPaths = extractDecorators(content, "Controller");
  const base = controllerPaths[0] || "";
  const methods = ["Get","Post","Put","Patch","Delete","Head","Options"];
  const routes = [];
  for (const method of methods) {
    const paths = extractDecorators(content, method);
    for (const p of paths) {
      routes.push({ method: method.toUpperCase(), path: `/${base}/${p}`.replace(/\/+/g, "/") });
    }
    // Sem parâmetro — rota raiz do método
    const reNoArg = new RegExp(`@${method}\\(\\s*\\)`, "g");
    if (reNoArg.test(content)) {
      routes.push({ method: method.toUpperCase(), path: `/${base}`.replace(/\/+/g, "/") });
    }
  }
  return routes;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Páginas do Frontend (Next.js App Router)
// ─────────────────────────────────────────────────────────────────────────────

function mapFrontendPages() {
  const APP_DIR = path.join(FRONTEND, "app");
  const pages = [];

  function walkPages(dir, routePrefix = "") {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const hasPage = entries.some(e => e.name === "page.tsx" || e.name === "page.ts");
    if (hasPage) pages.push({ route: routePrefix || "/", dir: rel(dir) });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (e.name.startsWith("_") || e.name === "api") continue;
      const seg = e.name.startsWith("(") ? "" : `/${e.name}`;
      walkPages(path.join(dir, e.name), routePrefix + seg);
    }
  }

  walkPages(APP_DIR);
  return pages;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Componentes principais do Frontend
// ─────────────────────────────────────────────────────────────────────────────

function mapFrontendComponents() {
  const COMP_DIR = path.join(FRONTEND, "components");
  if (!fs.existsSync(COMP_DIR)) return [];
  return fs.readdirSync(COMP_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => ({ name: e.name, dir: rel(path.join(COMP_DIR, e.name)) }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Rotas do Backend (NestJS Controllers)
// ─────────────────────────────────────────────────────────────────────────────

function mapBackendRoutes() {
  const controllers = walk(BACKEND, f => f.endsWith(".controller.ts"));
  const modules = [];
  for (const c of controllers) {
    const routes = extractAllRoutes(c);
    if (routes.length) modules.push({ controller: rel(c), routes });
  }
  return modules;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Hooks de integração (chamadas de API no frontend)
// ─────────────────────────────────────────────────────────────────────────────

function mapFrontendHooks() {
  const HOOKS_DIR = path.join(FRONTEND, "hooks");
  if (!fs.existsSync(HOOKS_DIR)) return [];
  return fs.readdirSync(HOOKS_DIR)
    .filter(f => f.endsWith(".ts") || f.endsWith(".tsx"))
    .map(f => ({ hook: f, path: rel(path.join(HOOKS_DIR, f)) }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Montar inventário de FUNC-IDs
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_META = {
  "/":              { label: "Home / Redirect",            module: "navegação"     },
  "/study":         { label: "Leitor Bíblico (Estudo)",    module: "bíblia"        },
  "/exegesis":      { label: "Exegese",                    module: "bíblia"        },
  "/factbook":      { label: "Factbook (IA)",              module: "ia"            },
  "/encyclopedia":  { label: "Enciclopédia Teológica",     module: "acervo"        },
  "/library":       { label: "Biblioteca / Acervo",        module: "acervo"        },
  "/atlas":         { label: "Atlas 4D (Geo)",             module: "geoespacial"   },
  "/graph":         { label: "TheoSGraph (Grafo)",         module: "grafo"         },
  "/notes":         { label: "Anotações do Usuário",       module: "usuário"       },
  "/settings":      { label: "Configurações",              module: "usuário"       },
  "/login":         { label: "Login / Autenticação",       module: "auth"          },
  "/admin":         { label: "Painel Admin",               module: "admin"         },
  "/sobre":         { label: "Sobre",                      module: "institucional" },
  "/privacidade":   { label: "Privacidade",                module: "institucional" },
  "/termos":        { label: "Termos de Uso",              module: "institucional" },
};

const ENDPOINT_META = [
  // Auth
  { pattern: /auth\/register/,     label: "Registro de usuário",                 module: "auth",        criticidade: "🔴 Crítico" },
  { pattern: /auth\/login/,        label: "Login",                               module: "auth",        criticidade: "🔴 Crítico" },
  { pattern: /auth\/logout/,       label: "Logout",                              module: "auth",        criticidade: "🔴 Crítico" },
  { pattern: /auth\/refresh/,      label: "Refresh de token JWT",                module: "auth",        criticidade: "🔴 Crítico" },
  // Bíblia
  { pattern: /bible\/versions/,    label: "Listar traduções bíblicas",           module: "bíblia",      criticidade: "🔴 Crítico" },
  { pattern: /bible\/books/,       label: "Listar livros da Bíblia",             module: "bíblia",      criticidade: "🔴 Crítico" },
  { pattern: /bible\/chapter/,     label: "Carregar capítulo bíblico",           module: "bíblia",      criticidade: "🔴 Crítico" },
  { pattern: /bible\/lexicon/,     label: "Léxico Strong's (verbete)",           module: "léxico",      criticidade: "🟠 Alto"    },
  { pattern: /passage-guide/,      label: "Guia de passagem (IA)",               module: "ia",          criticidade: "🟠 Alto"    },
  // Busca
  { pattern: /search\/verses/,     label: "Busca full-text de versículos",       module: "busca",       criticidade: "🔴 Crítico" },
  // Cross-refs
  { pattern: /cross-refs/,         label: "Referências cruzadas",                module: "bíblia",      criticidade: "🟠 Alto"    },
  // RAG / IA
  { pattern: /rag\/chat$/,         label: "Chat IA (RAG, library-first)",        module: "ia",          criticidade: "🔴 Crítico" },
  { pattern: /rag\/chat\/stream/,  label: "Chat IA streaming",                   module: "ia",          criticidade: "🟠 Alto"    },
  { pattern: /rag\/feedback/,      label: "Feedback IA (👍👎)",                  module: "ia",          criticidade: "🟡 Médio"   },
  { pattern: /rag\/stats/,         label: "Estatísticas RAG",                    module: "ia",          criticidade: "🔵 Baixo"   },
  { pattern: /rag\/validated-qa/,  label: "QA validado (moderação)",             module: "admin",       criticidade: "🟡 Médio"   },
  // Biblioteca / Drive
  { pattern: /library\/lookup/,    label: "Busca na biblioteca teológica",       module: "acervo",      criticidade: "🟠 Alto"    },
  { pattern: /drive-library/,      label: "Sincronização Google Drive",          module: "acervo",      criticidade: "🟡 Médio"   },
  // Geo
  { pattern: /geo\/locations/,     label: "Locais bíblicos (Atlas)",             module: "geoespacial", criticidade: "🟡 Médio"   },
  { pattern: /geo\/nearby/,        label: "Locais próximos (Atlas)",             module: "geoespacial", criticidade: "🟡 Médio"   },
  { pattern: /geo\/routes/,        label: "Rotas históricas (Atlas)",            module: "geoespacial", criticidade: "🟡 Médio"   },
  // Linguística
  { pattern: /linguistics\/inter/, label: "Texto interlinear",                   module: "léxico",      criticidade: "🟠 Alto"    },
  // Arqueologia
  { pattern: /archaeology\/stats/, label: "Estatísticas de arqueologia",         module: "arqueologia", criticidade: "🔵 Baixo"   },
  // Health
  { pattern: /health/,             label: "Health check da API",                 module: "infra",       criticidade: "🔴 Crítico" },
];

function buildInventory(pages, components, backendModules, hooks) {
  const items = [];
  let idx = 1;
  const id = () => `FUNC-${String(idx++).padStart(3, "0")}`;

  // ── Páginas
  for (const p of pages) {
    const meta = PAGE_META[p.route] || { label: `Página ${p.route}`, module: "desconhecido" };
    items.push({
      id: id(), category: "página", module: meta.module,
      label: meta.label, route: p.route, source: p.dir,
      criticidade: ["auth","bíblia","ia"].includes(meta.module) ? "🔴 Crítico" : "🟡 Médio",
      status: "pending", notes: "",
    });
  }

  // ── Endpoints de API
  for (const mod of backendModules) {
    for (const route of mod.routes) {
      const fullPath = route.path;
      const match = ENDPOINT_META.find(m => m.pattern.test(fullPath));
      items.push({
        id: id(), category: "endpoint", module: match?.module || "backend",
        label: match?.label || `${route.method} ${fullPath}`,
        method: route.method, route: fullPath, source: mod.controller,
        criticidade: match?.criticidade || "🟡 Médio",
        status: "pending", notes: "",
      });
    }
  }

  // ── Componentes de UI críticos (sobreposição com páginas)
  const CRITICAL_COMPONENTS = [
    "AIAssistant", "BibleReader", "SearchBar", "LexiconPanel",
    "TheoSGraph", "AtlasMap", "Workspace", "Factbook",
    "SettingsPage", "LibraryPanel", "CollaborationPanel",
  ];
  for (const comp of components) {
    if (CRITICAL_COMPONENTS.some(c => comp.name.toLowerCase().includes(c.toLowerCase()))) {
      items.push({
        id: id(), category: "componente", module: "frontend",
        label: `Componente: ${comp.name}`, source: comp.dir,
        criticidade: "🟠 Alto",
        status: "pending", notes: "",
      });
    }
  }

  // ── Fluxos end-to-end (Fase 3)
  const E2E = [
    { label: "Jornada: Login → Ler capítulo → Buscar palavra → Logout",         module: "e2e", criticidade: "🔴 Crítico" },
    { label: "Jornada: Registro → Confirmar → Primeiro login",                  module: "e2e", criticidade: "🔴 Crítico" },
    { label: "Jornada: Chat IA → Feedback positivo → Rever QA validado",        module: "e2e", criticidade: "🟠 Alto"    },
    { label: "Jornada: Busca full-text → Abrir cross-refs → Ver léxico Strong's", module: "e2e", criticidade: "🟠 Alto"  },
    { label: "Jornada: Upload Drive → Sync biblioteca → Perguntar IA sobre obra", module: "e2e", criticidade: "🟠 Alto" },
    { label: "Jornada: Usuário A não acessa dados de Usuário B (isolamento)",   module: "e2e", criticidade: "🔴 Crítico" },
  ];
  for (const e of E2E) {
    items.push({ id: id(), category: "e2e", ...e, status: "fase3", notes: "Implementar na Fase 3" });
  }

  // ── Bugs conhecidos da varredura 2026-07-29 (rastrear como FUNC)
  const KNOWN_BUGS = [
    { label: "Botões sem onClick: SettingsPage 'Sair da Conta'",    module: "auth",    criticidade: "🔴 Crítico", notes: "Varredura 29/07 — logout morto" },
    { label: "Botões sem onClick: Factbook versículos e tags",       module: "ia",      criticidade: "🟠 Alto",    notes: "Varredura 29/07 — 8/11 botões decorativos" },
    { label: "Botões sem onClick: AIInsights Exegese/Perguntar",     module: "ia",      criticidade: "🟠 Alto",    notes: "Varredura 29/07" },
    { label: "URL syncDrive sem /api/v1 → 404",                      module: "acervo",  criticidade: "🔴 Crítico", notes: "useRAG.ts:539" },
    { label: "WebSocket colaboração namespace inexistente",           module: "collab",  criticidade: "🟠 Alto",    notes: "useCollaboration.ts:33" },
    { label: "16 componentes com catch silencioso (tela vazia)",     module: "frontend",criticidade: "🟠 Alto",    notes: "Varredura 29/07" },
    { label: "BibleVerse.embedding NULL em prod — busca híbrida off",module: "busca",   criticidade: "🟠 Alto",    notes: "Embeddings nulos 2026-08-06" },
    { label: "Login case-sensitive (401 com senha certa)",           module: "auth",    criticidade: "🔴 Crítico", notes: "Fix local, não commitado" },
  ];
  for (const b of KNOWN_BUGS) {
    items.push({ id: id(), category: "bug-conhecido", ...b, status: "aberto", source: "varredura-historica" });
  }

  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Probes HTTP contra produção
// ─────────────────────────────────────────────────────────────────────────────

async function runProbes(items) {
  const PROBES = [
    { funcPattern: /health/i,        url: `${BACKEND_URL}/api/v1/health`,                     accept: [200], warm: true },
    { funcPattern: /versões/i,       url: `${BACKEND_URL}/api/v1/bible/versions`,             accept: [200] },
    { funcPattern: /livros/i,        url: `${BACKEND_URL}/api/v1/bible/books`,               accept: [200] },
    { funcPattern: /capítulo/i,      url: `${BACKEND_URL}/api/v1/bible/chapter/BLIVRE/1/1`,  accept: [200] },
    { funcPattern: /passage-guide/i, url: `${BACKEND_URL}/api/v1/bible/passage-guide/BLIVRE/1/1`, accept: [200] },
    { funcPattern: /full-text/i,     url: `${BACKEND_URL}/api/v1/search/verses?q=luz&translation=BLIVRE`, accept: [200] },
    { funcPattern: /cruzadas/i,      url: `${BACKEND_URL}/api/v1/cross-refs?ref=John%203:16`, accept: [200] },
    { funcPattern: /locais/i,        url: `${BACKEND_URL}/api/v1/geo/locations`,              accept: [200] },
    { funcPattern: /interlinear/i,   url: `${BACKEND_URL}/api/v1/linguistics/interlinear/1/1`, accept: [200] },
    { funcPattern: /estatísticas rag/i, url: `${BACKEND_URL}/api/v1/rag/stats`,              accept: [200] },
    { funcPattern: /arqueologia/i,   url: `${BACKEND_URL}/api/v1/archaeology/stats`,          accept: [200] },
    { funcPattern: /biblioteca/i,    url: `${BACKEND_URL}/api/v1/library/lookup?term=logos&limit=1`, accept: [200, 401] },
    { funcPattern: /frontend/i,      url: `${FRONTEND_URL}`,                                  accept: [200] },
  ];

  log("🔌 Iniciando probes HTTP (aguarde — Render pode estar em cold start ~60s)...");
  const results = {};

  for (const probe of PROBES) {
    const timeout = probe.warm ? 90_000 : 20_000;
    const start = Date.now();
    let status, ok, error;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeout);
      const r = await fetch(probe.url, { signal: ctrl.signal });
      clearTimeout(timer);
      status = r.status;
      ok = probe.accept.includes(status);
    } catch (e) {
      error = e.message;
      ok = false;
    }
    const elapsed = Date.now() - start;
    const icon = ok ? "✅" : "❌";
    const label = probe.url.replace(BACKEND_URL, "").replace(FRONTEND_URL, "FRONTEND");
    log(`  ${icon} ${label} → ${status ?? "ERR"} (${elapsed}ms)${error ? " — " + error : ""}`);
    results[probe.url] = { ok, status, error, elapsed };
  }

  // Atualizar status dos items com resultados dos probes
  for (const item of items) {
    for (const probe of PROBES) {
      if (probe.funcPattern.test(item.label) && results[probe.url]) {
        const r = results[probe.url];
        item.lastProbe = { ok: r.ok, status: r.status, elapsed: r.elapsed, at: new Date().toISOString() };
        if (item.status === "pending") item.status = r.ok ? "passou" : "falhou";
      }
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Persistência e Relatório
// ─────────────────────────────────────────────────────────────────────────────

function saveInventory(inventory) {
  const now = new Date().toISOString();
  const data = {
    version: 1,
    generatedAt: now,
    counts: {
      total: inventory.length,
      pagina: inventory.filter(i => i.category === "página").length,
      endpoint: inventory.filter(i => i.category === "endpoint").length,
      componente: inventory.filter(i => i.category === "componente").length,
      e2e: inventory.filter(i => i.category === "e2e").length,
      bug_conhecido: inventory.filter(i => i.category === "bug-conhecido").length,
    },
    items: inventory,
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(data, null, 2), "utf8");
  return data;
}

function buildMarkdownReport(data) {
  const date = new Date().toISOString().slice(0, 10);
  const lines = [];

  lines.push(`# TheoSphere QA — Inventário de Funcionalidades`);
  lines.push(`**Gerado em:** ${data.generatedAt}  `);
  lines.push(`**Total de FUNC-IDs:** ${data.counts.total}`);
  lines.push(``);
  lines.push(`## Resumo`);
  lines.push(``);
  lines.push(`| Categoria         | Qtd |`);
  lines.push(`|-------------------|-----|`);
  lines.push(`| Páginas           | ${data.counts.pagina} |`);
  lines.push(`| Endpoints de API  | ${data.counts.endpoint} |`);
  lines.push(`| Componentes UI    | ${data.counts.componente} |`);
  lines.push(`| Jornadas E2E      | ${data.counts.e2e} |`);
  lines.push(`| Bugs conhecidos   | ${data.counts.bug_conhecido} |`);
  lines.push(``);

  const modules = [...new Set(data.items.map(i => i.module))].sort();
  for (const mod of modules) {
    const modItems = data.items.filter(i => i.module === mod);
    lines.push(`## Módulo: ${mod.toUpperCase()}`);
    lines.push(``);
    lines.push(`| ID | Categoria | Label | Criticidade | Status | Rota/Fonte |`);
    lines.push(`|----|-----------|-------|-------------|--------|------------|`);
    for (const item of modItems) {
      const probe = item.lastProbe ? `→ probe: ${item.lastProbe.ok ? "✅" : "❌"} ${item.lastProbe.status ?? "ERR"} (${item.lastProbe.elapsed}ms)` : "";
      lines.push(`| ${item.id} | ${item.category} | ${item.label} | ${item.criticidade} | ${item.status} | ${item.route || item.source || ""} ${probe} |`);
    }
    lines.push(``);
  }

  lines.push(`## Critério de Aceitação da Fase 1`);
  lines.push(``);
  lines.push(`- [ ] Cristiano revisou o inventário acima e confirmou que nada crítico ficou de fora`);
  lines.push(`- [ ] Usuário de teste \`qa-bot@theosphere.dev\` criado e isolado`);
  lines.push(`- [ ] Aprovação para avançar para a **Fase 2** (testes de fluxos críticos)`);
  lines.push(``);
  lines.push(`## Próximos Passos (Fase 2)`);
  lines.push(``);
  lines.push(`Fluxos prioritários a testar (por criticidade):`);
  lines.push(`1. Login / Logout / Sessão expirada`);
  lines.push(`2. Registro de usuário + validações`);
  lines.push(`3. Carregar capítulo bíblico + busca full-text`);
  lines.push(`4. Chat IA (RAG) — library-first + fallback`);
  lines.push(`5. Isolamento de dados entre usuários (segurança crítica)`);
  lines.push(``);
  lines.push(`> **Atenção:** Bugs conhecidos listados no módulo \`bug-conhecido\` devem ser confirmados`);
  lines.push(`> antes da Fase 2 — alguns podem já ter sido corrigidos em commits recentes.`);

  return { date, content: lines.join("\n") };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

function log(msg) { if (!asJson) console.log(msg); }

async function main() {
  log("╔══════════════════════════════════════════════════════════════╗");
  log("║  TheoSphere QA Agent — Fase 1: Mapeamento e Inventário      ║");
  log("╚══════════════════════════════════════════════════════════════╝");
  log("");

  log("📂 Mapeando páginas do frontend...");
  const pages = mapFrontendPages();
  log(`   ${pages.length} páginas encontradas`);

  log("🧩 Mapeando componentes UI críticos...");
  const components = mapFrontendComponents();
  log(`   ${components.length} diretórios de componentes`);

  log("🔌 Mapeando rotas do backend...");
  const backendModules = mapBackendRoutes();
  const totalRoutes = backendModules.reduce((s, m) => s + m.routes.length, 0);
  log(`   ${backendModules.length} controllers · ${totalRoutes} rotas extraídas`);

  log("🪝 Mapeando hooks de integração...");
  const hooks = mapFrontendHooks();
  log(`   ${hooks.length} hooks encontrados`);

  log("");
  log("🏗  Construindo inventário de FUNC-IDs...");
  const inventory = buildInventory(pages, components, backendModules, hooks);
  log(`   ${inventory.length} FUNC-IDs gerados`);

  if (!noProbes) {
    log("");
    await runProbes(inventory);
  }

  log("");
  log("💾 Persistindo inventário...");
  const data = saveInventory(inventory);

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const { date, content: mdContent } = buildMarkdownReport(data);
  const mdPath = path.join(OUT_DIR, `${date}_inventory.md`);
  fs.writeFileSync(mdPath, mdContent, "utf8");

  if (asJson) {
    process.stdout.write(JSON.stringify(data, null, 2));
  } else {
    log(`   ✅ JSON  → audit/qa-inventory.json`);
    log(`   ✅ MD    → audit/reports/${date}_inventory.md`);
    log("");

    // Sumário por criticidade
    const crits  = inventory.filter(i => i.criticidade?.includes("Crítico"));
    const altos  = inventory.filter(i => i.criticidade?.includes("Alto"));
    const medios = inventory.filter(i => i.criticidade?.includes("Médio"));
    const baixos = inventory.filter(i => i.criticidade?.includes("Baixo"));
    log("📊 Distribuição de criticidade:");
    log(`   🔴 Crítico: ${crits.length}`);
    log(`   🟠 Alto:    ${altos.length}`);
    log(`   🟡 Médio:   ${medios.length}`);
    log(`   🔵 Baixo:   ${baixos.length}`);
    log("");

    // Bugs conhecidos
    const bugs = inventory.filter(i => i.category === "bug-conhecido");
    log(`⚠️  Bugs conhecidos rastreados: ${bugs.length}`);
    for (const b of bugs) log(`   ${b.id} ${b.criticidade} ${b.label}`);
    log("");

    // Probes que falharam
    const falhos = inventory.filter(i => i.lastProbe && !i.lastProbe.ok);
    if (falhos.length) {
      log(`❌ Probes com falha (${falhos.length}):`);
      for (const f of falhos) log(`   ${f.id} ${f.label} → HTTP ${f.lastProbe.status ?? "ERR"}`);
    } else if (!noProbes) {
      log("✅ Todos os probes HTTP passaram.");
    }
    log("");
    log("══════════════════════════════════════════════════════════════");
    log("CRITÉRIO DE ACEITAÇÃO DA FASE 1:");
    log("  1. Revise audit/reports/" + date + "_inventory.md");
    log("  2. Confirme que nenhuma funcionalidade crítica foi omitida");
    log("  3. Crie o usuário qa-bot@theosphere.dev antes da Fase 2");
    log("  4. Dê o sinal para avançar para a Fase 2");
    log("══════════════════════════════════════════════════════════════");
  }
}

main().catch(e => { console.error(e); process.exit(1); });
