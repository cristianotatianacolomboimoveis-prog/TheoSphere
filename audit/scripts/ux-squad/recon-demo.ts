/**
 * Recon do modo demonstração: entra pelo botão de demonstração e navega
 * clicando no menu lateral (sem recarregar a página), listando o que aparece.
 */
import { chromium } from "playwright";

const BASE = process.env.UX_BASE_URL ?? "https://frontend-v2-lake.vercel.app";
const shots = process.env.SHOTS ?? ".";
const menu = (process.env.MENU ?? "Leitor Bíblico,Caderno de Notas,Biblioteca Clássica").split(",");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript("window.__name = (f) => f;");
page.on("response", (r) => r.status() >= 400 && console.log("NET", r.status(), r.request().method(), r.url().slice(0, 120)));

const dump = async (label: string) => {
  await page.waitForTimeout(2500);
  const info = await page.evaluate(() => {
    const vis = (e: Element) => {
      const b = (e as HTMLElement).getBoundingClientRect();
      return b.width > 0 && b.height > 0 && b.top < innerHeight && getComputedStyle(e).visibility !== "hidden";
    };
    const txt = (e: Element) =>
      ((e as HTMLElement).innerText || e.getAttribute("aria-label") || e.getAttribute("title") || "").trim().replace(/\s+/g, " ").slice(0, 50);
    return {
      h: [...document.querySelectorAll("h1,h2,h3")].filter(vis).map(txt).slice(0, 12),
      buttons: [...document.querySelectorAll("button,[role=button]")].filter(vis).map(txt),
      inputs: [...document.querySelectorAll("input,textarea,select")].filter(vis).map((i) => `${i.tagName}:${i.getAttribute("placeholder") ?? i.getAttribute("aria-label") ?? ""}`),
    };
  });
  console.log(`\n=== ${label} | ${page.url()}\n${JSON.stringify(info)}`);
  await page.screenshot({ path: `${shots}/demo_${label.replace(/\W+/g, "_")}.png` });
};

await page.goto(BASE + "/login", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(1500);
const t0 = Date.now();
await page.getByRole("button", { name: /Acesso de Demonstração/i }).click();
await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 }).catch(() => console.log("still on login after 20s"));
console.log("demo click ->", page.url(), Date.now() - t0, "ms");
// fecha o tour se aparecer
for (let i = 0; i < 2; i++) await page.keyboard.press("Escape");
await dump("after_demo");
for (const m of menu) {
  const l = page.getByText(m, { exact: false }).first();
  if (await l.isVisible().catch(() => false)) {
    await l.click();
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await dump(m);
  } else console.log("menu not visible:", m);
}
await browser.close();
