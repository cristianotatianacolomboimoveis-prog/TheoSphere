/**
 * Reconhecimento visual: abre rotas e lista o que um usuário VÊ
 * (título, headings, botões e links visíveis). Não lê código-fonte.
 * Uso: npx tsx recon.ts [--demo] [rota1 rota2 ...]
 *   --demo  entra pelo botão "Entrar Direto (Acesso de Demonstração)" antes.
 */
import { chromium } from "playwright";

const BASE = process.env.UX_BASE_URL ?? "https://frontend-v2-lake.vercel.app";
const args = process.argv.slice(2);
const demo = args.includes("--demo");
const shots = process.env.RECON_SHOTS;
const routes = args.filter((a) => !a.startsWith("--"));
if (!routes.length) routes.push("/", "/login");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript("window.__name = (f) => f;");

if (demo) {
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.getByRole("button", { name: /Acesso de Demonstração/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 }).catch(() => {});
  console.log("demo login ->", page.url());
}

for (const r of routes) {
  const t0 = Date.now();
  const resp = await page.goto(BASE + r, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const info = await page.evaluate(() => {
    const vis = (e: Element) => {
      const b = (e as HTMLElement).getBoundingClientRect();
      return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== "hidden";
    };
    const txt = (e: Element) =>
      ((e as HTMLElement).innerText || e.getAttribute("aria-label") || e.getAttribute("title") || "").trim().replace(/\s+/g, " ").slice(0, 60);
    return {
      title: document.title,
      h: [...document.querySelectorAll("h1,h2,h3")].filter(vis).map(txt).slice(0, 15),
      buttons: [...document.querySelectorAll("button,[role=button]")].filter(vis).map(txt).slice(0, 80),
      links: [...document.querySelectorAll("a[href]")].filter(vis).map((a) => `${txt(a)} -> ${a.getAttribute("href")}`).slice(0, 60),
      inputs: [...document.querySelectorAll("input,textarea,select")].filter(vis).map((i) => `${i.tagName}:${i.getAttribute("type") ?? ""}:${i.getAttribute("placeholder") ?? i.getAttribute("aria-label") ?? i.getAttribute("name") ?? ""}`),
    };
  });
  console.log(`\n=== ${r} | HTTP ${resp?.status()} | ${Date.now() - t0}ms | final ${page.url()}`);
  console.log(JSON.stringify(info));
  if (shots) await page.screenshot({ path: `${shots}/recon${r.replace(/\//g, "_") || "_root"}.png` });
}
await browser.close();
