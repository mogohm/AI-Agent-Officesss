# Deploying to Vercel

The web app deploys to Vercel and gives you a live, browsable UI. Two caveats
that are **inherent to Vercel** (serverless):

1. **A database is required.** Vercel has no Postgres of its own — use a free
   cloud Postgres (Neon / Vercel Postgres / Supabase).
2. **The background worker does not run on Vercel.** Vercel runs serverless
   functions, not long-lived processes. The whole UI, auth, and CRUD work; but
   *queued tasks will not execute* until a worker runs somewhere that supports a
   long-running process (Railway / Render / Fly.io / a VPS running
   `npm run worker:start`). This is a platform limitation, not a bug.

## Steps

1. **Create a Postgres** (e.g. https://neon.tech, free). Copy the connection
   string (looks like `postgresql://user:pass@host/db?sslmode=require`).

   > Neon gives you **two** connection strings — grab both:
   > - **Pooled** (`...-pooler...`) → use for the app at runtime (`DATABASE_URL`).
   > - **Direct** (no `-pooler`) → use for migrations. **Prisma migrations do NOT
   >   work over the pooled URL** (PgBouncer has no advisory locks — the build
   >   hangs at "1 migration found"). This is why migrations run from your
   >   machine, not in the Vercel build.

2. **Apply the schema + seed once from your machine** using the **DIRECT** URL:
   ```bash
   cd apps/web
   DATABASE_URL="<neon-DIRECT-url>" npx prisma migrate deploy
   DATABASE_URL="<neon-DIRECT-url>" npm run db:seed
   ```
   Login later with `owner@demo.local` / `demo1234` (change it).

3. **Import the repo in Vercel** → https://vercel.com/new → pick
   `mogohm/AI-Agent-Officesss`.
   - **Root Directory:** `apps/web`  ← important (monorepo)
   - Framework preset: **Next.js** (auto-detected)

4. **Set Environment Variables** (Project → Settings → Environment Variables).
   All of these must be set **before** the build — `next build` fails fast if
   `AUTH_SECRET` / `CREDENTIAL_ENCRYPTION_KEY` / `DATABASE_URL` are missing:

   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | your Neon **pooled** connection string |
   | `AUTH_SECRET` | generate: `openssl rand -base64 32` |
   | `CREDENTIAL_ENCRYPTION_KEY` | generate: `openssl rand -base64 32` |
   | `AUTH_TRUST_HOST` | `true` |
   | `APP_URL` | your Vercel URL, e.g. `https://your-app.vercel.app` |

   (Do **not** reuse the local `.env` secrets — generate fresh ones.)

5. **Deploy.** The build runs `prisma generate && next build` (no migrations —
   you already applied them in step 2).

6. *(Optional) Enable real task execution* — run the worker on a process host:
   - Railway/Render: new service from this repo, root `apps/web`,
     start command `npm run worker:start`, same `DATABASE_URL` +
     `CREDENTIAL_ENCRYPTION_KEY`. Add a provider key in **Settings › Providers**.

For a single-box deployment where the worker *does* run, use the Docker Compose
stack in `docker-compose.yml` instead (see `DEPLOY.md`).
