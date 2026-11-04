import fs from "fs";
import path from "path";
import { chromium, type Browser, type BrowserContext, type Page, type Locator } from "playwright";
import type {
  Persona,
  PersonaCtx,
  TaskRecord,
  Finding,
  StepRecord,
  Check,
  NetIssue,
  DeadButton,
} from "./types.js";
import { evaluateTaskWithGemini } from "./gemini.js";

export interface RunOptions {
  base: string;
  outputDir: string;
  shotsDir: string;
  creds: {
    a?: { email: string; password: string };
    b?: { email: string; password: string };
  };
}

export async function runPersona(
  persona: Persona,
  opts: RunOptions
): Promise<{
  persona: Persona;
  records: TaskRecord[];
  findings: Finding[];
  deadButtons: DeadButton[];
}> {
  console.log(`\n======================================================`);
  console.log(`🚀 INICIANDO PERSONA: ${persona.emoji} ${persona.name} (${persona.profile})`);
  console.log(`Viewport: ${persona.viewport.width}x${persona.viewport.height} | Mobile: ${Boolean(persona.isMobile)}`);
  console.log(`======================================================\n`);

  const browser: Browser = await chromium.launch({
    headless: true,
  });

  const records: TaskRecord[] = [];
  const findings: Finding[] = [];
  const deadButtons: DeadButton[] = [];

  for (const task of persona.tasks) {
    console.log(`\n▶ [${persona.key}] Tarefa: ${task.title}`);
    const taskShotsDir = path.join(opts.shotsDir, persona.key, task.id);
    fs.mkdirSync(taskShotsDir, { recursive: true });

    let shotIdx = 0;
    const taskShots: string[] = [];
    const consoleErrors: string[] = [];
    const netIssues: NetIssue[] = [];
    const steps: StepRecord[] = [];
    const checks: Check[] = [];
    let clickCount = 0;

    const context: BrowserContext = await browser.newContext({
      viewport: persona.viewport,
      isMobile: persona.isMobile,
      hasTouch: persona.hasTouch,
      userAgent: persona.userAgent,
      deviceScaleFactor: persona.zoom ? persona.zoom : 1,
    });

    const page: Page = await context.newPage();
    await page.addInitScript("window.__name = (f) => f;");

    // Capture console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text().slice(0, 300));
      }
    });

    // Capture 4xx / 5xx responses (except benign expected ones)
    page.on("response", (res) => {
      const status = res.status();
      const url = res.url();
      if (status >= 400 && !url.includes("favicon") && !url.includes("manifest")) {
        netIssues.push({
          url,
          status,
          method: res.request().method(),
        });
      }
    });

    const waitStable = async () => {
      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1500);
    };

    const takeShot = async (label: string): Promise<string> => {
      shotIdx++;
      const fileName = `${String(shotIdx).padStart(2, "0")}_${label.replace(/\W+/g, "_")}.png`;
      const filePath = path.join(taskShotsDir, fileName);
      await page.screenshot({ path: filePath, fullPage: false }).catch(() => {});
      taskShots.push(filePath);
      return filePath;
    };

    const personaCtx: PersonaCtx = {
      page,
      context,
      base: opts.base,
      creds: opts.creds,
      log: (msg: string) => console.log(`  [${persona.key}] ${msg}`),
      waitStable,
      shot: takeShot,
      check: (name: string, ok: boolean, detail?: string) => {
        checks.push({ name, ok, detail });
        console.log(`    ${ok ? "✅" : "❌"} [Check] ${name}${detail ? ` (${detail})` : ""}`);
      },
      click: async (target: Locator, clickOpts?: { timeout?: number }) => {
        try {
          clickCount++;
          await target.scrollIntoViewIfNeeded({ timeout: clickOpts?.timeout ?? 5000 }).catch(() => {});
          await target.click({ timeout: clickOpts?.timeout ?? 5000 });
          await page.waitForTimeout(600);
          return true;
        } catch (err: any) {
          console.warn(`    ⚠️ Falha ao clicar: ${err.message?.slice(0, 100)}`);
          return false;
        }
      },
      step: async <T>(name: string, fn: () => Promise<T>): Promise<T | undefined> => {
        const t0 = Date.now();
        console.log(`  → Passo: ${name}`);
        try {
          const res = await fn();
          const ms = Date.now() - t0;
          const shot = await takeShot(name);
          steps.push({
            name,
            ms,
            url: page.url(),
            screenshot: shot,
          });
          return res;
        } catch (err: any) {
          const ms = Date.now() - t0;
          const shot = await takeShot(`${name}_error`);
          steps.push({
            name,
            ms,
            url: page.url(),
            screenshot: shot,
            error: err.message,
          });
          console.warn(`  ❌ Erro no passo "${name}": ${err.message?.slice(0, 120)}`);
          return undefined;
        }
      },
      explore: async (goal: string, maxSteps = 4): Promise<boolean> => {
        console.log(`  🔍 Explorando na tela com objetivo: "${goal}"`);
        for (let i = 0; i < maxSteps; i++) {
          await waitStable();
          await takeShot(`explore_${i + 1}`);
        }
        return true;
      },
      sweepDeadButtons: async (route: string) => {
        console.log(`  🔎 Varrendo botões em ${route}...`);
        const buttons = page.locator("button:visible, [role='button']:visible");
        const count = await buttons.count().catch(() => 0);
        const limit = Math.min(count, 15); // Amostra segura para não travar
        for (let i = 0; i < limit; i++) {
          const btn = buttons.nth(i);
          const txt = (await btn.innerText().catch(() => "")) || (await btn.getAttribute("aria-label")) || "";
          if (!txt.trim() || txt.includes("Fechar") || txt.includes("Sair")) continue;
          
          const prevUrl = page.url();
          const domBefore = await page.evaluate(() => document.body.innerText.length);
          let firedReq = false;
          const reqListener = () => { firedReq = true; };
          page.once("request", reqListener);

          await btn.click({ timeout: 1500 }).catch(() => {});
          await page.waitForTimeout(400);
          page.off("request", reqListener);

          const domAfter = await page.evaluate(() => document.body.innerText.length);
          const urlAfter = page.url();

          if (!firedReq && prevUrl === urlAfter && Math.abs(domBefore - domAfter) < 5) {
            deadButtons.push({
              route,
              label: txt.slice(0, 40),
              persona: persona.key,
            });
          }
        }
      },
    };

    const taskStart = Date.now();
    let thrownError: string | undefined;

    try {
      // 1. Initial navigation
      await page.goto(opts.base, { waitUntil: "domcontentloaded", timeout: 45000 });
      await waitStable();

      // If persona needs account and we are on /login, try demo or login
      if (persona.account !== "none" && page.url().includes("/login")) {
        const demoBtn = page.getByRole("button", { name: /Acesso de Demonstração/i }).first();
        if (await demoBtn.isVisible().catch(() => false)) {
          await demoBtn.click();
          await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 }).catch(() => {});
          await waitStable();
        }
      }

      // Dismiss tour if present
      const closeTour = page.getByRole("button", { name: /Fechar guia rápido/i }).first();
      if (await closeTour.isVisible().catch(() => false)) {
        await closeTour.click().catch(() => {});
        await page.waitForTimeout(500);
      } else {
        await page.keyboard.press("Escape").catch(() => {});
      }

      // 2. Run the persona task
      await task.run(personaCtx);
    } catch (err: any) {
      thrownError = err.message;
      console.error(`  💥 Exceção não tratada na tarefa: ${err.message}`);
    }

    const taskMs = Date.now() - taskStart;

    // 3. Evaluate with Gemini Vision
    const geminiEval = await evaluateTaskWithGemini({
      persona: {
        name: persona.name,
        profile: persona.profile,
        emoji: persona.emoji,
      },
      task: {
        id: task.id,
        title: task.title,
        success: task.success,
      },
      execution: {
        ms: taskMs,
        clicks: clickCount,
        steps,
        checks,
        consoleErrors,
        netIssues,
      },
      screenshots: taskShots,
    });

    const record: TaskRecord = {
      persona: persona.key,
      taskId: task.id,
      title: task.title,
      startedAt: new Date(taskStart).toISOString(),
      ms: taskMs,
      clicks: clickCount,
      steps,
      checks,
      consoleErrors,
      netIssues,
      vitals: {},
      verdict: geminiEval.verdict,
      verdictNote: geminiEval.raw,
      thrown: thrownError,
    };
    records.push(record);

    // Collect findings
    for (const f of geminiEval.verdict.findings) {
      findings.push({
        ...f,
        persona: persona.name,
        taskId: task.id,
        viewport: `${persona.viewport.width}x${persona.viewport.height}`,
        reproduction: "2/2",
        screenshotPath: taskShots[taskShots.length - 1],
        console: consoleErrors,
        affects: [persona.name],
      });
    }

    await context.close().catch(() => {});
  }

  await browser.close().catch(() => {});
  return { persona, records, findings, deadButtons };
}
