#!/usr/bin/env node
/**
 * static-checks.mjs — verificações de comportamento que lint/test/build não pegam.
 *
 * Por que existe: em 29/07/2026 a suíte diária estava verde há duas semanas
 * enquanto 21 botões não tinham handler e duas chamadas de API apontavam para
 * URLs inexistentes. Nada disso quebra compilação, lint ou teste unitário —
 * `<button className="hover:...">` sem onClick é TSX perfeitamente válido, e um
 * fetch que devolve 404 dentro de um catch que só loga passa em tudo.
 *
 * Quatro checagens:
 *   1. HANDLERS  — elementos interativos sem handler (botão decorativo)
 *   2. ROTAS     — chamadas do frontend sem rota correspondente no backend
 *   3. SILÊNCIO  — componentes que capturam erro sem nada mostrar ao usuário
 *   4. PRISMA    — `new PrismaClient()` sem driver adapter (quebra em runtime)
 *
 * A checagem 4 nasceu em 03/08/2026: oito seeds e scripts ficaram quebrados
 * desde a migração para o Prisma 7, que passou a exigir um driver adapter no
 * constructor. `new PrismaClient()` continua sendo TypeScript válido — o erro
 * só aparece em runtime, como PrismaClientInitializationError. Nenhum lint,
 * teste ou build pegaria: `prisma/seed-*.ts` e `scripts/**` estão fora do
 * escopo do eslint e do tsconfig.build. O efeito prático foi o `db:seed:tsk`
 * nunca ter rodado, deixando `/api/v1/cross-refs` respondendo 200 com
 * `count: 0` na Bíblia inteira por três semanas.
 *
 * Uso:
 *   node audit/scripts/static-checks.mjs            # relatório humano
 *   node audit/scripts/static-checks.mjs --json     # saída para automação
 *
 * Código de saída: 0 = limpo · 1 = achados novos (fora da allowlist)
 *
 * A allowlist (audit/scripts/static-checks.allowlist.json) guarda os falsos
 * positivos já investigados. Um item só entra lá com a justificativa escrita —
 * o objetivo é que o relatório continue significando alguma coisa.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const FRONTEND = path.join(ROOT, "frontend-v2/src");
const BACKEND = path.join(ROOT, "backend/src");
const ALLOWLIST_PATH = path.join(HERE, "static-checks.allowlist.json");

const asJson = process.argv.includes("--json");

const allowlist = fs.existsSync(ALLOWLIST_PATH)
  ? JSON.parse(fs.readFileSync(ALLOWLIST_PATH, "utf8"))
  : { handlers: [], routes: [], silence: [], prisma: [] };

/* ───────────────────────── utilidades ───────────────────────── */

function walk(dir, filter, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (!/node_modules|\.next|dist|coverage/.test(full)) walk(full, filter, out);
    } else if (filter.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const rel = (file) => path.relative(ROOT, file);
const lineOf = (src, index) => src.slice(0, index).split("\n").length;

/**
 * Extrai a tag de abertura a partir de um índice, respeitando chaves aninhadas
 * (`onClick={() => f({a: 1})}` não pode terminar no primeiro `>`).
 */
function readOpeningTag(src, start) {
  let depth = 0;
  let tag = "";
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    tag += c;
    if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === ">" && depth === 0) break;
  }
  return tag;
}

/* ─────────────────── 1. handlers ausentes ─────────────────── */

// `{...props}` conta como handler: componentes de UI genéricos (ui/Button)
// repassam o onClick de quem os usa.
const HANDLER_RE =
  /\bonClick\b|\bonMouseDown\b|\bonPointerDown\b|\bonKeyDown\b|\bonSubmit\b|\btype=["']submit["']|\bhref\b|\bonChange\b|\{\.\.\.\w+\}/;

/**
 * `disabled` estático (sem expressão) descreve um botão honestamente inerte —
 * ele *parece* desabilitado. Já `disabled={cond}` sem onClick é armadilha: em
 * algum estado ele fica habilitado e continua não fazendo nada. Só o primeiro
 * caso é isento.
 */
// Precisa casar o ATRIBUTO JSX, não a classe: `disabled:opacity-40` do
// Tailwind aparece no className de quase todo botão desabilitável e fazia
// o check inteiro passar batido.
const ALWAYS_DISABLED = /\sdisabled(?=[\s>])|\sdisabled=\{true\}|\sdisabled=""/;

function checkHandlers() {
  const findings = [];
  for (const file of walk(FRONTEND, /\.tsx$/)) {
    const src = fs.readFileSync(file, "utf8");

    // <button> sem qualquer handler
    for (const match of src.matchAll(/<button\b/g)) {
      const tag = readOpeningTag(src, match.index);
      if (!HANDLER_RE.test(tag) && !ALWAYS_DISABLED.test(tag)) {
        findings.push({
          file: rel(file),
          line: lineOf(src, match.index),
          kind: "button",
          detail: "<button> sem handler — decorativo",
        });
      }
    }

    // <div>/<span> com cursor-pointer e sem handler: parece clicável, não é.
    // Ignora quando o pai imediato tem onClick — heurística: procura onClick
    // nas 3 linhas anteriores, padrão comum de wrapper clicável.
    for (const match of src.matchAll(/<(?:div|span|li|a)\b/g)) {
      const tag = readOpeningTag(src, match.index);
      if (!/cursor-pointer/.test(tag)) continue;
      if (HANDLER_RE.test(tag)) continue;
      const before = src.slice(Math.max(0, match.index - 400), match.index);
      if (/onClick/.test(before.split("\n").slice(-4).join("\n"))) continue;
      findings.push({
        file: rel(file),
        line: lineOf(src, match.index),
        kind: "cursor-pointer",
        detail: "cursor-pointer sem handler — aparenta ser clicável",
      });
    }
  }
  return findings;
}

/* ─────────────────── 2. rotas inexistentes ─────────────────── */

/** Lê as rotas registradas nos controllers do NestJS. */
function backendRoutes() {
  const routes = new Set();
  for (const file of walk(BACKEND, /\.controller\.ts$/)) {
    const src = fs.readFileSync(file, "utf8");
    const base = src.match(/@Controller\(\s*['"]([^'"]*)['"]/)?.[1] ?? "";
    for (const m of src.matchAll(
      /@(?:Get|Post|Put|Patch|Delete)\(\s*(?:['"]([^'"]*)['"])?\s*\)/g,
    )) {
      const sub = m[1] ?? "";
      const full = `${base}/${sub}`.replace(/\/+/g, "/").replace(/\/$/, "");
      routes.add(full.replace(/^api\/v1\//, ""));
    }
  }
  return routes;
}

/**
 * Uma rota do frontend casa com a do backend comparando segmento a segmento,
 * tratando `:param` do Nest e `${expr}` do template literal como coringas.
 */
function routeMatches(called, declared) {
  const a = called.split("/").filter(Boolean);
  const b = declared.split("/").filter(Boolean);
  if (a.length !== b.length) return false;
  return a.every((seg, i) => {
    const other = b[i];
    if (other.startsWith(":") || seg === "{}" || /^\$\{/.test(seg)) return true;
    return seg === other;
  });
}

function checkRoutes() {
  const declared = backendRoutes();
  const findings = [];

  for (const file of walk(FRONTEND, /\.(ts|tsx)$/)) {
    if (/\.test\.tsx?$/.test(file)) continue;
    const src = fs.readFileSync(file, "utf8");

    // api.get("bible/books") / api.post(`rag/${id}`, ...)
    for (const m of src.matchAll(
      /\bapi\.(?:get|post|put|patch|delete)\s*(?:<[^>]*>)?\s*\(\s*[`'"]([^`'"]+)[`'"]/g,
    )) {
      const raw = m[1];
      if (/^https?:/.test(raw)) continue;
      const cleaned = raw
        .replace(/\$\{[^}]*\}/g, "{}")
        .replace(/\?.*$/, "")
        .replace(/^\/?(api\/v1\/)?/, "")
        .replace(/\/$/, "");
      if (!cleaned) continue;
      const ok = [...declared].some((d) => routeMatches(cleaned, d));
      if (!ok) {
        findings.push({
          file: rel(file),
          line: lineOf(src, m.index),
          kind: "rota",
          detail: `"${raw}" não corresponde a nenhuma rota do backend`,
        });
      }
    }

    // Armadilha específica: montar URL absoluta a partir da base SEM /api/v1.
    // Foi exatamente assim que o syncDrive passou meses devolvendo 404.
    for (const m of src.matchAll(
      /\$\{(?:API_BASE|CONFIG\.BACKEND_URL)\}(\/[a-z0-9\-/]+)/gi,
    )) {
      if (!m[1].startsWith("/api/v1")) {
        findings.push({
          file: rel(file),
          line: lineOf(src, m.index),
          kind: "prefixo",
          detail: `URL absoluta "${m[1]}" sem /api/v1 — a base do backend não inclui o prefixo`,
        });
      }
    }
  }
  return findings;
}

/* ─────────────────── 3. falha silenciosa ─────────────────── */

// Deliberadamente não casa com "Alert" solto: `AlertTriangle` é só um ícone
// do lucide e daria falso negativo em componente que de fato não mostra erro.
const SHOWS_ERROR = [
  // estado de erro explícito
  /setError|setErro|errorMessage|errorMsg/,
  // toast / banner
  /useToast|\bshow\(\s*["'`]|role="alert"|<Alert\b/,
  // mensagem de erro passada como string para alguma função que a exibe:
  // setAiAnalysis("Erro ao gerar análise.") ou
  // createAssistantMessage("Não consegui responder agora — ...")
  /\(\s*["'`][^"'`]*(Erro ao|erro ao|Não foi possível|não foi possível|Não consegui|falhou|indisponível)/,
  // toast em objeto: setMessageToast({ type: "error", text: ... })
  /type:\s*["']error["']/,
];

const showsError = (src) => SHOWS_ERROR.some((re) => re.test(src));

function checkSilence() {
  const findings = [];
  for (const file of walk(path.join(FRONTEND, "components"), /\.tsx$/)) {
    if (/\.test\.tsx$/.test(file)) continue;
    const src = fs.readFileSync(file, "utf8");
    const catches = [...src.matchAll(/\bcatch\b/g)];
    if (catches.length && !showsError(src)) {
      findings.push({
        file: rel(file),
        line: lineOf(src, catches[0].index),
        kind: "silêncio",
        detail: `${catches.length} catch(es) sem nenhum estado de erro visível ao usuário`,
      });
    }
  }
  return findings;
}

/* ──────────────── 4. Prisma sem driver adapter ──────────────── */

/**
 * Varre TODO o backend (não só `src/`) atrás de `new PrismaClient()` sem
 * argumento. No Prisma 7 o driver adapter é obrigatório; sem ele o processo
 * morre na construção do client, antes de qualquer query.
 *
 * Só olha a construção direta. `class X extends PrismaClient` com `super({...})`
 * é o padrão do PrismaService e passa limpo.
 */
const PRISMA_NO_ADAPTER = /new\s+PrismaClient\s*\(\s*\)/g;

/**
 * Apaga o conteúdo de comentários preservando o comprimento do arquivo, para
 * que os índices de `matchAll` continuem apontando para a linha certa.
 *
 * Existe porque a primeira versão desta checagem se autodenunciou: o comentário
 * que explica o problema contém a própria expressão `new PrismaClient()`.
 */
function maskComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) =>
    m.replace(/[^\n]/g, " "),
  );
}

function checkPrismaAdapter() {
  const findings = [];
  const backendRoot = path.join(ROOT, "backend");
  for (const file of walk(backendRoot, /\.(ts|mts|cts|js|mjs)$/)) {
    if (/\.d\.ts$/.test(file)) continue;
    const src = maskComments(fs.readFileSync(file, "utf8"));
    for (const m of src.matchAll(PRISMA_NO_ADAPTER)) {
      findings.push({
        file: rel(file),
        line: lineOf(src, m.index),
        kind: "prisma",
        detail:
          "new PrismaClient() sem driver adapter — lança PrismaClientInitializationError em runtime (Prisma 7)",
      });
    }
  }
  return findings;
}

/* ───────────────────────── execução ───────────────────────── */

const isAllowed = (group, f) =>
  (allowlist[group] ?? []).some(
    (a) => a.file === f.file && (a.line === f.line || a.line === "*"),
  );

const groups = {
  handlers: checkHandlers(),
  routes: checkRoutes(),
  silence: checkSilence(),
  prisma: checkPrismaAdapter(),
};

const novel = {};
let total = 0;
for (const [name, items] of Object.entries(groups)) {
  novel[name] = items.filter((f) => !isAllowed(name, f));
  total += novel[name].length;
}

if (asJson) {
  console.log(JSON.stringify({ total, ...novel }, null, 2));
} else {
  const titles = {
    handlers: "Elementos interativos sem handler",
    routes: "Chamadas de API sem rota correspondente",
    silence: "Componentes que falham em silêncio",
    prisma: "PrismaClient sem driver adapter (quebra em runtime)",
  };
  for (const [name, items] of Object.entries(novel)) {
    const suppressed = groups[name].length - items.length;
    console.log(
      `\n── ${titles[name]}: ${items.length}${suppressed ? ` (+${suppressed} na allowlist)` : ""}`,
    );
    for (const f of items) console.log(`   ${f.file}:${f.line}  ${f.detail}`);
  }
  console.log(
    total === 0
      ? "\n✅ Nenhum achado novo.\n"
      : `\n❌ ${total} achado(s) novo(s).\n`,
  );
}

process.exit(total === 0 ? 0 : 1);
