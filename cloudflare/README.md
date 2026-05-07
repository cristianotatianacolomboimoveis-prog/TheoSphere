# TheoSphere Edge

Cloudflare Worker that fronts the NestJS API and caches read-only Bible /
linguistics / geo endpoints at the edge.

## Routes & TTLs

| Path                        | TTL     | Why                       |
| --------------------------- | ------- | ------------------------- |
| `/api/v1/bible/chapter/*`   | 7 days  | Bible text is immutable   |
| `/api/v1/bible/versions`    | 1 day   | Adds rare; staleness fine |
| `/api/v1/bible/fallback`    | 1 hour  | 3rd-party data; defensive |
| `/api/v1/linguistics/*`     | 7 days  | Strong's / BDAG immutable |
| `/api/v1/geo/*`             | 1 day   | Locations rarely change   |
| `/api/v1/health/*`          | never   | Reflects live state       |
| anything with `Authorization` | never | Per-user data             |
| anything with `Cookie`      | never   | Per-user data             |
| non-GET                     | never   | Mutations always pass     |
| non-2xx response            | never   | Don't cache poison pills  |

## Deploy

```bash
cd cloudflare
npm install
npx wrangler login
npx wrangler deploy
```

For staging:

```bash
npx wrangler deploy --env staging
```

## Verify

After deploying, hit any cacheable URL twice:

```bash
curl -I https://api.theosphere.app/api/v1/bible/versions
# → cf-cache-status: MISS

curl -I https://api.theosphere.app/api/v1/bible/versions
# → cf-cache-status: HIT
```

`x-edge-colo` shows the PoP that served you (e.g. `GRU` from São Paulo).

## Purge

After publishing migrations or correcting a corrupted response, purge by URL:

```bash
npx wrangler cache purge --url https://api.theosphere.app/api/v1/bible/versions
```

Or use the dashboard for bulk / pattern purges.
