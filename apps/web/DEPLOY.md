# AI Agent Office — Deployment Guide

A multi-tenant AI agent management platform. **The database is the single source
of truth** — every metric, floor, worker, and cost shown in the UI is read from
Postgres. AI execution happens in a background worker; API keys are AES-256-GCM
encrypted at rest and never returned to the browser.

## Stack
- **Web**: Next.js (App Router) + React + TypeScript + Tailwind + shadcn-style UI
- **Data**: PostgreSQL + Prisma
- **Queue/worker**: Redis + BullMQ when `REDIS_URL` is set; otherwise a reliable
  PostgreSQL polling fallback (no Redis required)
- **Auth**: Auth.js (session/JWT) with company-scoped RBAC
  (`owner > admin > manager > operator > reviewer > viewer`)
- **Proxy**: Caddy (automatic HTTPS when you set a domain)

---

## 1. Environment variables

Copy `.env.example` → `.env` and fill in. Generate the two secrets locally and
**never commit `.env`**:

```bash
# 32-byte base64 secrets
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # CREDENTIAL_ENCRYPTION_KEY
```

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | `postgresql://user:pass@host:5432/db` |
| `AUTH_SECRET` | ✅ | Session signing secret |
| `CREDENTIAL_ENCRYPTION_KEY` | ✅ | 32-byte base64 — encrypts provider API keys |
| `NEXTAUTH_URL` | prod | Public URL, e.g. `https://app.example.com` |
| `REDIS_URL` | optional | Enables BullMQ; omit to use the DB queue |
| `WORKER_CONCURRENCY` | optional | Parallel tasks per worker (default 3) |
| `HTTP_PORT` | optional | Host port the proxy listens on (default 8080) |

Provider API keys (OpenAI/Anthropic/Google/Local) are **not** set via env — add
them in the UI under **Settings › Providers**; they are encrypted before storage.

---

## 2. Local development

```bash
cd apps/web
npm install
npx prisma migrate dev        # apply schema to a local Postgres
npm run db:seed               # demo data + super-admin
npm run dev                   # web on http://localhost:3000
npm run worker:dev            # background worker (separate terminal)
```

Default login (dev seed): **owner@demo.local / demo1234**. Change it before any
real use.

---

## 3. Production (Docker Compose)

From `apps/web` (with `.env` present):

```bash
docker compose up --build -d
```

This starts: `postgres`, `redis`, a one-shot `migrate` (runs
`prisma migrate deploy` + seed), `web`, `worker`, and the `proxy`. The app is
reachable at `http://localhost:${HTTP_PORT:-8080}`.

Scale workers: `docker compose up -d --scale worker=3`
(the atomic `QUEUED → RUNNING` lock guarantees each task runs once).

For a real domain + HTTPS, set your hostname in `deploy/Caddyfile` (replace
`:80`) and point DNS at the host — Caddy provisions the certificate.

---

## 4. Health & observability
- `GET /api/live` — liveness (process up)
- `GET /api/ready` — readiness (database reachable), 503 if not
- `GET /api/health` — deep check: database + redis + worker heartbeat + queue depth
- **Infrastructure** screen — live worker heartbeats, queue depth, provider status
- **Usage** screen — real per-company / per-model cost + token totals with budget bars
- **Activity Logs** — full audit trail

---

## 5. Security posture
- API keys encrypted (AES-256-GCM); the browser only ever sees a masked value.
- All server actions re-validate input (Zod) and re-check authorization (RBAC).
- Sensitive task output requires human approval; **the task creator cannot
  approve their own task** (no self-approval).
- Rotate `AUTH_SECRET` / `CREDENTIAL_ENCRYPTION_KEY` on a schedule. Rotating the
  encryption key requires re-entering provider keys.

---

## 6. Verify the build

```bash
npm run verify        # lint + typecheck + unit tests + production build
```

Database-backed integration tests (schema + seed + state transitions):

```bash
RUN_DB_TESTS=1 npm run test:integration
```

End-to-end (needs a running app + seeded DB):

```bash
npx playwright install --with-deps
npm run test:e2e
```
