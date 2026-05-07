/**
 * TheoSphere Edge Worker
 *
 * Sits in front of the origin (NestJS) on Cloudflare. Caches GETs for
 * read-only / immutable resources at the edge (Cloudflare's tiered cache,
 * served from the user's nearest PoP). Mutations and authenticated
 * requests pass through untouched.
 *
 * Why a Worker (and not just Cache Rules)?
 *   We can:
 *   - Set per-route TTLs (Bible chapters live longer than fallback API).
 *   - Strip caching for any request carrying an Authorization header.
 *   - Add `cf-cache-status` and `x-edge-region` debug headers.
 *   - Reject obviously bad inputs at the edge before hitting origin.
 */

interface Env {
  ORIGIN_URL: string;
  BIBLE_CHAPTER_TTL: string;
  BIBLE_VERSIONS_TTL: string;
  BIBLE_FALLBACK_TTL: string;
  LINGUISTICS_TTL: string;
  GEO_TTL: string;
}

interface Rule {
  match: (path: string) => boolean;
  ttl: (env: Env) => number;
}

// Path → TTL routing table. First match wins.
// Keep this list short and obvious; resist the urge to over-cache.
const RULES: Rule[] = [
  {
    match: (p) => /^\/api\/v1\/bible\/chapter(\/|\?|$)/.test(p),
    ttl: (e) => parseInt(e.BIBLE_CHAPTER_TTL, 10),
  },
  {
    match: (p) => p === '/api/v1/bible/versions',
    ttl: (e) => parseInt(e.BIBLE_VERSIONS_TTL, 10),
  },
  {
    match: (p) => p.startsWith('/api/v1/bible/fallback'),
    ttl: (e) => parseInt(e.BIBLE_FALLBACK_TTL, 10),
  },
  {
    match: (p) => p.startsWith('/api/v1/linguistics/'),
    ttl: (e) => parseInt(e.LINGUISTICS_TTL, 10),
  },
  {
    match: (p) => p.startsWith('/api/v1/geo/'),
    ttl: (e) => parseInt(e.GEO_TTL, 10),
  },
];

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);

    // Health & readiness must NEVER be cached — they reflect live state.
    if (url.pathname.startsWith('/api/v1/health')) {
      return forwardToOrigin(req, env);
    }

    // Only cache GETs / HEADs and only when there's no Authorization header.
    // Auth headers imply per-user context which we MUST NOT share at the edge.
    const isCacheable =
      (req.method === 'GET' || req.method === 'HEAD') &&
      !req.headers.has('authorization') &&
      !req.headers.has('cookie');

    if (!isCacheable) {
      return forwardToOrigin(req, env);
    }

    const rule = RULES.find((r) => r.match(url.pathname));
    if (!rule) {
      return forwardToOrigin(req, env);
    }

    const ttl = rule.ttl(env);
    const cacheKey = new Request(url.toString(), { method: 'GET' });
    const cache = caches.default;

    let response = await cache.match(cacheKey);
    if (response) {
      return tagged(response, 'HIT', req);
    }

    response = await forwardToOrigin(req, env);

    // Only cache successful, well-formed JSON responses. Errors must NOT be
    // cached — they create poison-pill incidents that survive backend fixes.
    if (response.ok) {
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', `public, max-age=${ttl}, s-maxage=${ttl}`);
      headers.delete('Set-Cookie'); // belt-and-suspenders

      const cached = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
      // ctx.waitUntil keeps the cache write alive after the response is sent.
      ctx.waitUntil(cache.put(cacheKey, cached.clone()));
      return tagged(cached, 'MISS', req);
    }

    return tagged(response, 'BYPASS', req);
  },
};

function forwardToOrigin(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const upstream = new URL(env.ORIGIN_URL);
  upstream.pathname = url.pathname;
  upstream.search = url.search;

  // Forward the original request, replacing only the host. Keep method,
  // body, headers — including X-Forwarded-For for accurate audit logs.
  return fetch(upstream.toString(), {
    method: req.method,
    headers: req.headers,
    body: req.body,
    redirect: 'manual',
  });
}

function tagged(res: Response, status: string, req: Request): Response {
  const out = new Response(res.body, res);
  out.headers.set('cf-cache-status', status);
  // CF-Ray is set by Cloudflare automatically; surfacing the colo name here
  // helps debug regional cache divergence.
  const cf: any = (req as any).cf;
  if (cf?.colo) out.headers.set('x-edge-colo', cf.colo);
  return out;
}
