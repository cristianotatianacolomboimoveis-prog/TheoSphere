import { z } from "zod";
import type { Page, BrowserContext } from "playwright";

export const SEVERITIES = ["S1", "S2", "S3", "S4", "💡"] as const;
export const TYPES = [
  "Bug",
  "Navegação",
  "Usabilidade",
  "Acessibilidade",
  "Performance",
  "Conteúdo/Linguagem",
  "Melhoria",
] as const;

/** Formato de achado devolvido pelo Gemini (seção 4 da missão). */
export const FindingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(3),
  screen: z.string(),
  type: z.enum(TYPES),
  severity: z.enum(SEVERITIES),
  confidence: z.enum(["Alta", "Média", "Baixa"]),
  steps: z.array(z.string()).min(1),
  expected: z.string(),
  actual: z.string(),
  evidence: z.string().describe("qual screenshot (índice) mostra o problema"),
  userQuote: z.string(),
  suggestion: z.string(),
});
export type GeminiFinding = z.infer<typeof FindingSchema>;

export const TaskVerdictSchema = z.object({
  result: z.enum(["✅", "⚠️", "❌", "NÃO VERIFICADO"]),
  ease: z.number().int().min(1).max(7).nullable(),
  reaction: z.string(),
  narration: z.string().describe("narração em 1ª pessoa, no tom da persona"),
  findings: z.array(FindingSchema),
  jargon: z.array(z.object({ term: z.string(), where: z.string(), suggestion: z.string() })).default([]),
});
export type TaskVerdict = z.infer<typeof TaskVerdictSchema>;

/** Checagem objetiva feita pelo script (não pelo Gemini). */
export interface Check {
  name: string;
  ok: boolean;
  detail?: string;
}

export interface StepRecord {
  name: string;
  ms: number;
  url: string;
  screenshot?: string;
  error?: string;
}

export interface NetIssue {
  url: string;
  status: number;
  method: string;
}

export interface TaskRecord {
  persona: string;
  taskId: string;
  title: string;
  startedAt: string;
  ms: number;
  clicks: number;
  steps: StepRecord[];
  checks: Check[];
  consoleErrors: string[];
  netIssues: NetIssue[];
  vitals: { lcp?: number; cls?: number; inp?: number };
  verdict?: TaskVerdict;
  verdictNote?: string;
  reproduced?: boolean;
  thrown?: string;
}

export interface Finding extends GeminiFinding {
  persona: string;
  taskId: string;
  viewport: string;
  reproduction: "2/2" | "1/2 (intermitente)" | "não aplicável";
  screenshotPath?: string;
  console: string[];
  affects: string[];
}

export interface DeadButton {
  route: string;
  label: string;
  persona: string;
  screenshot?: string;
}

export interface PersonaCtx {
  page: Page;
  context: BrowserContext;
  base: string;
  creds: { a?: { email: string; password: string }; b?: { email: string; password: string } };
  /** Registra um passo: mede tempo, tira screenshot. */
  step: <T>(name: string, fn: () => Promise<T>) => Promise<T | undefined>;
  click: (target: import("playwright").Locator, opts?: { timeout?: number }) => Promise<boolean>;
  check: (name: string, ok: boolean, detail?: string) => void;
  shot: (label: string) => Promise<string>;
  /** Navegação guiada pelo Gemini quando não há seletor estável. */
  explore: (goal: string, maxSteps?: number) => Promise<boolean>;
  sweepDeadButtons: (route: string) => Promise<void>;
  waitStable: () => Promise<void>;
  log: (msg: string) => void;
}

export interface TaskDef {
  id: string;
  title: string;
  /** Critério de sucesso em linguagem natural (vai para o Gemini). */
  success: string;
  run: (ctx: PersonaCtx) => Promise<void>;
  /** Se o achado for Bug/Navegação, re-executar esta tarefa para confirmar. */
  reproducible?: boolean;
}

export interface Persona {
  key: string;
  name: string;
  emoji: string;
  profile: string;
  viewport: { width: number; height: number };
  zoom?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
  userAgent?: string;
  /** Throttling em kbps/latência (CDP) para tarefas marcadas. */
  slowNetwork?: boolean;
  account: "a" | "b" | "none";
  tasks: TaskDef[];
}
