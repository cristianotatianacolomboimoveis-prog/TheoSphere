/**
 * Cria (ou reaproveita) uma conta de teste pelo formulário "Cadastre-se" da tela,
 * como um usuário faria. Salva screenshots de cada etapa.
 * Uso: UX_EMAIL=... UX_PASSWORD=... UX_NAME=... SHOTS=dir npx tsx signup.ts
 */
import { chromium } from "playwright";

const BASE = process.env.UX_BASE_URL ?? "https://frontend-v2-lake.vercel.app";
const email = process.env.UX_EMAIL!;
const password = process.env.UX_PASSWORD!;
const name = process.env.UX_NAME ?? "Teste UX";
const shots = process.env.SHOTS ?? ".";
if (!email || !password) throw new Error("UX_EMAIL/UX_PASSWORD obrigatórios");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript("window.__name = (f) => f;");
page.on("response", (r) => {
  if (r.url().includes("/auth/")) console.log("NET", r.status(), r.request().method(), r.url());
});
page.on("console", (m) => m.type() === "error" && console.log("CONSOLE", m.text().slice(0, 200)));

await page.goto(BASE + "/login", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.getByRole("button", { name: /Cadastre-se/i }).first().click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${shots}/signup_form.png` });
const inputs = await page.evaluate(() =>
  [...document.querySelectorAll("input")]
    .filter((i) => i.getBoundingClientRect().width > 0)
    .map((i) => `${i.type}|${i.placeholder}|${i.name}|${i.getAttribute("aria-label") ?? ""}`),
);
console.log("INPUTS", inputs);

for (const sel of ['input[type="text"]', 'input[name*="name" i]']) {
  const l = page.locator(sel).first();
  if (await l.isVisible().catch(() => false)) {
    await l.fill(name);
    break;
  }
}
await page.locator('input[type="email"]').first().fill(email);
const pw = page.locator('input[type="password"]');
const n = await pw.count();
for (let i = 0; i < n; i++) if (await pw.nth(i).isVisible()) await pw.nth(i).fill(password);
const cb = page.locator('input[type="checkbox"]');
for (let i = 0; i < (await cb.count()); i++) if (await cb.nth(i).isVisible()) await cb.nth(i).check().catch(() => {});
await page.screenshot({ path: `${shots}/signup_filled.png` });
const submit = page.getByRole("button", { name: /Criar Conta/i }).first();
console.log("SUBMIT label:", await submit.innerText().catch(() => "?"));
await submit.click();
await page.waitForTimeout(6000);
console.log("URL after signup:", page.url());
await page.screenshot({ path: `${shots}/signup_after.png` });
const body = (await page.locator("body").innerText()).slice(0, 1500).replace(/\s+/g, " ");
console.log("BODY", body);
await browser.close();
