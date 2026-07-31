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

2. **Import the repo in Vercel** → https://vercel.com/new → pick
   `mogohm/AI-Agent-Officesss`.
   - **Root Directory:** `apps/web`  ← important (monorepo)
   - Framework preset: **Next.js** (auto-detected)

3. **Set Environment Variables** (Project → Settings → Environment Variables):

   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | your Neon connection string |
   | `AUTH_SECRET` | generate: `openssl rand -base64 32` |
   | `CREDENTIAL_ENCRYPTION_KEY` | generate: `openssl rand -base64 32` |
   | `AUTH_TRUST_HOST` | `true` |
   | `APP_URL` | your Vercel URL, e.g. `https://your-app.vercel.app` |

   (Do **not** reuse the local `.env` secrets — generate fresh ones.)

4. **Deploy.** The build runs `prisma generate && prisma migrate deploy &&
   next build`, so the schema is created automatically on first deploy.

5. **Seed demo data** (one time) from your machine, pointed at the cloud DB:
   ```bash
   cd apps/web
   DATABASE_URL="<your-neon-url>" npm run db:seed
   ```
   Login: `owner@demo.local` / `demo1234` (change it).

6. *(Optional) Enable real task execution* — run the worker on a process host:
   - Railway/Render: new service from this repo, root `apps/web`,
     start command `npm run worker:start`, same `DATABASE_URL` +
     `CREDENTIAL_ENCRYPTION_KEY`. Add a provider key in **Settings › Providers**.

For a single-box deployment where the worker *does* run, use the Docker Compose
stack in `docker-compose.yml` instead (see `DEPLOY.md`).
