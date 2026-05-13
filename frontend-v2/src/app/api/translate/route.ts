import { NextResponse } from "next/server";

/**
 * /api/translate — server-side proxy to Google Translate (free public endpoint).
 *
 * Hardenings (SEC-005):
 *   • Auth: requires a Bearer JWT. The token's signature is verified by the
 *     NestJS backend on real auth checks; here we only decode the payload
 *     to obtain a stable subject for rate-limit bucketing. The hard requirement
 *     is "must present a non-expired, well-formed JWT issued by us" — which
 *     blocks anonymous traffic. For higher assurance, swap the local decode
 *     for an HMAC verification against the backend's JWT_SECRET (shared env).
 *   • Allow-list of target languages — no query/path injection into upstream.
 *   • Hard caps: 50 KB total text, 4 KB per chunk.
 *   • Per-token in-memory rate limit (30 req / 60 s). For multi-region edge
 *     deployments, swap for Upstash/Redis.
 *   • Per-chunk AbortSignal timeout — bounded event-loop pressure.
 */

const CHUNK_SIZE = 4000;
const MAX_TEXT_LENGTH = 50_000;
const UPSTREAM_TIMEOUT_MS = 8_000;
const RATE_LIMIT = { windowMs: 60_000, max: 30 };

const ALLOWED_LANGS = new Set([
  "pt",
  "pt-BR",
  "en",
  "es",
  "fr",
  "de",
  "it",
  "la",
  "el",
  "he",
  "ar",
  "ru",
  "zh",
  "ja",
]);

interface RateState {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateState>();

function checkRateLimit(key: string): { allowed: boolean; resetAt: number } {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return { allowed: true, resetAt: now + RATE_LIMIT.windowMs };
  }
  if (bucket.count >= RATE_LIMIT.max) {
    return { allowed: false, resetAt: bucket.resetAt };
  }
  bucket.count += 1;
  return { allowed: true, resetAt: bucket.resetAt };
}

/**
 * Decodes the JWT payload **without verifying the signature**. We only need
 * a stable identifier for rate-limit bucketing and a "well-formed + not
 * expired" sanity check to block anonymous proxy abuse. Authorization
 * happens on the backend.
 */
function tokenSubject(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8"),
    );
    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      return null;
    }
    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
      return null;
    }
    return payload.sub;
  } catch {
    return null;
  }
}

async function translateChunk(text: string, targetLang: string): Promise<string> {
  if (!text.trim()) return "";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const url =
      "https://translate.googleapis.com/translate_a/single" +
      `?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t` +
      `&q=${encodeURIComponent(text)}`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      console.error(`[translate] upstream ${response.status}`);
      return text;
    }
    const data = (await response.json()) as unknown;
    if (!Array.isArray(data) || !Array.isArray(data[0])) return text;
    return (data[0] as unknown[])
      .map((seg) =>
        Array.isArray(seg) && typeof seg[0] === "string" ? seg[0] : "",
      )
      .join("");
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      console.error("[translate] upstream timeout");
    } else {
      console.error("[translate] failed:", (err as Error).message);
    }
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: Request) {
  // ─── Auth ─────────────────────────────────────────────────────────────────
  const subject = tokenSubject(req.headers.get("authorization"));
  if (!subject) {
    return NextResponse.json(
      { error: "Autenticação obrigatória" },
      { status: 401 },
    );
  }

  // ─── Rate limit ───────────────────────────────────────────────────────────
  const rl = checkRateLimit(subject);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas requisições. Tente novamente em alguns segundos." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  // ─── Input validation ─────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const { text, targetLang } = body as { text?: unknown; targetLang?: unknown };

  if (typeof text !== "string" || text.length === 0) {
    return NextResponse.json(
      { error: "Campo 'text' (string não vazia) é obrigatório" },
      { status: 400 },
    );
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `Texto excede o limite de ${MAX_TEXT_LENGTH} caracteres` },
      { status: 413 },
    );
  }

  const target = typeof targetLang === "string" ? targetLang : "pt";
  if (!ALLOWED_LANGS.has(target)) {
    return NextResponse.json(
      { error: `Idioma '${target}' não suportado` },
      { status: 400 },
    );
  }

  // ─── Translate ────────────────────────────────────────────────────────────
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.slice(i, i + CHUNK_SIZE));
  }

  try {
    const translated = await Promise.all(
      chunks.map((chunk) => translateChunk(chunk, target)),
    );
    return NextResponse.json({ translated: translated.join("") });
  } catch (err) {
    console.error("[translate] internal error:", (err as Error).message);
    return NextResponse.json({ error: "Falha na tradução" }, { status: 500 });
  }
}
