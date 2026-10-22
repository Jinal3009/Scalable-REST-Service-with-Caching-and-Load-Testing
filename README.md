# Scalable Store API

Express + MongoDB + Redis behind Nginx, with k6 load tests.

```
k6 -> Nginx (least_conn) -> N x Node/Express (stateless, JWT)
                                 |-- Redis (cache, rate limits)
                                 '-- MongoDB (indexed, pooled)
```

## Run
```bash
docker compose up -d --build
docker compose run --rm api node src/seed.js     # 100k products (SEED_COUNT to change)
curl -i "localhost:8080/api/products?category=shoes&limit=5"   # watch X-Cache and X-Instance
```

## Benchmark stages (same k6 script each time)
Install k6 (https://k6.io), then for each stage restart, reseed, run `k6 run k6/read-heavy.js`:

| Stage | Command prefix |
|---|---|
| 1. Baseline | `REPLICAS=1 CACHE_ENABLED=false INDEXES=false` |
| 2. + Indexes | `REPLICAS=1 CACHE_ENABLED=false INDEXES=true` |
| 3. + Redis cache | `REPLICAS=1 CACHE_ENABLED=true INDEXES=true` |
| 4. + 3 instances | `REPLICAS=3 CACHE_ENABLED=true INDEXES=true` |

Example for stage 1:
```bash
REPLICAS=1 CACHE_ENABLED=false INDEXES=false docker compose up -d --build --force-recreate
REPLICAS=1 CACHE_ENABLED=false INDEXES=false docker compose run --rm api node src/seed.js
k6 run k6/read-heavy.js
```
Also run `k6/mixed.js` (90/10 read/write, shows invalidation cost) and `k6/spike.js` at stage 4.
Record RPS, p95, error rate and the `cache_hit` rate in the table below.

| Stage | RPS | p95 | Error % | Cache hit % |
|---|---|---|---|---|
| Baseline | | | | - |
| + Indexes | | | | - |
| + Redis | | | | |
| + 3 instances | | | | |

## Design notes
- **Cache-aside** in `src/middleware/cache.js`, TTL 60s (list) / 120s (detail).
- **Invalidation**: writes `INCR products:ver`; keys embed the version so all stale entries are orphaned instantly (no key scans). TTL + `allkeys-lru` reclaim memory.
- **Stampede protection**: `SET lock NX EX 5`; non-leaders poll briefly for the leader's result.
- **HTTP caching**: ETag (Express default) + `Cache-Control: public, max-age=30`.
- **Pagination**: cursor on `_id`, max 100 per page. **Reads** use `.lean()`.
- **Stateless**: JWT auth, Redis-backed rate limiting, so any replica serves any request.
- **Trade-off**: reads may be stale for up to 30s client-side (max-age); server cache is fresh after writes.
- Redis outage degrades to direct DB reads instead of failing.

## Endpoints
`POST /api/auth/login` (admin/admin123 by default), `GET /api/products`, `GET /api/products/:id`,
`POST|PUT|DELETE /api/products` (Bearer token), `GET /health`.

## Plugging in your MERN store
Replace `models/Product.js` with your schema, `routes/auth.js` with your User model, and keep the cache middleware and compose/nginx/k6 files as-is.
