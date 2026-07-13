# 🏙️ AI Agent Office Web Platform

A **browser-based** AI office management platform — usable from mobile, tablet,
or desktop. Each **AI company is a building**, each **department is a floor**
(max **15** floors/company), and every company runs multiple **projects** whose
workspaces and execution live on a **VPS**.

The UI is a cute **isometric, pixel-art-inspired** office that feels like a
management game — but stays professional and usable.

> **MVP v0.1** — ships with **mock AI agents** and **mock AI model selection**.
> No real OpenAI/Claude/Gemini calls, no real shell execution, no GitHub push
> yet. Every one of those is stubbed behind a clean interface for later.

---

## ✨ What's inside

**Pages:** Company Overview · Company Building · Department Management · Job
Description Editor · AI Model Selection · Agent Directory · Project List ·
Project Detail · Command Center · Activity Feed · VPS Workspace · Server Monitor.

**Highlights**
- Companies as isometric building cards (create / edit / delete).
- Building view with dynamic floors (1 department = 1 floor, hard cap 15) + a
  **B1 VPS/Server** floor that is *not* counted as a department.
- Department CRUD with **unique floor** + **max-15** validation, job description
  editor, example responsibilities, theme color & room style.
- Mock **AI models** (OpenAI / Anthropic / Google / Local LLM / Image AI) with
  **rule-based recommendations** per department type.
- Agents (AI office workers) with roles, skills, status, and **animated
  life-simulation sprites** (work + idle activities via Framer Motion).
- Projects with lifecycle (start / pause / resume), task board, activity
  timeline, generated file tree, and mock **VPS workspace + logs**.
- **Command Center** — in-app Thai/English natural-language commands with mock
  intent parsing (no external chat apps).
- **Realtime Activity Feed** over WebSocket (polling fallback).

---

## 🧱 Tech stack

| Layer     | Tech |
| --------- | ---- |
| Frontend  | Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, Zustand, TanStack Query, lucide-react |
| Backend   | FastAPI, Python 3.12, SQLModel/SQLAlchemy, WebSocket |
| Database  | PostgreSQL (SQLite for zero-config dev) |
| Worker    | Python worker (workspace manager, command executor, safety allowlist) |
| Infra     | Docker Compose, Nginx reverse proxy, VPS-ready |

---

## 📁 Structure

```
ai-agent-office/
  apps/web/            # Next.js frontend (App Router)
    app/               # pages: /, /companies/[id], /ai-models, /agents,
                       #        /projects/[id], /command, /activity, /vps
    components/        # Building, Floor, AgentSprite, CompanyCard, ui, ...
    lib/               # api client, types, store, theme, constants
  server/
    api/               # FastAPI app
      routers/         # companies, departments, ai_models, agents, projects,
                       # tasks, activities, commands, vps, meta, ws
      services/        # business logic (one module per resource)
      models/          # SQLModel tables
      schemas/         # pydantic request schemas
      db/              # engine + auto-seed
      utils/           # enums + recommendation rules
    worker/            # workspace_manager, command_executor, safety, job_runner
  database/            # schema.sql, seed.sql, migrations/
  workspaces/          # project workspaces created at runtime
  docs/                # requirement, architecture, api-spec, deployment, prompts
  docker-compose.yml
  .env.example
```

---

## 🚀 Quick start (local dev)

### 1. Backend (FastAPI)

Requires **Python 3.11+**. From `ai-agent-office/server`:

```bash
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt

# Zero-config: uses SQLite and auto-seeds demo data on first run.
uvicorn api.main:app --reload --port 8000
```

- API docs (Swagger): http://localhost:8000/docs
- Health: http://localhost:8000/health

To use PostgreSQL instead, set `DATABASE_URL` (see `.env.example`) and
optionally run `database/schema.sql` + `database/seed.sql`.

### 2. Frontend (Next.js)

Requires **Node 18+**. From `ai-agent-office/apps/web`:

```bash
npm install
cp .env.local.example .env.local     # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open http://localhost:3000 on desktop **or your phone's browser** (same
network — point `NEXT_PUBLIC_API_URL` at your machine's LAN IP).

### 3. (Optional) worker

```bash
cd server && python -m worker.main   # mock loop; prints and waits for jobs
```

### 4. (Optional) everything via Docker

```bash
docker compose up --build            # db + api + worker + web
```

---

## 🔌 Prepared for the future (not wired yet)

Clearly-marked seams (`# FUTURE:` / comments) exist for:
- **Real AI providers** — `server/api/utils/recommendations.py` (routing) and
  `command_service.py` (intent) are where OpenAI/Claude/Gemini/Local/Image AI
  plug in.
- **Real VPS execution** — `server/worker/command_executor.py`
  (`_execute_real`) and `workspace_manager.py` (real filesystem/git).
- **Command safety** — `server/worker/safety.py` already enforces an
  allowlist/blocklist for the day commands actually run.
- **GitHub push** — project has `github_repo_url`; the Project Detail page shows
  a placeholder.

See [`docs/architecture.md`](docs/architecture.md) and
[`docs/deployment.md`](docs/deployment.md) for details.

---

## 📚 Docs
- [requirement.md](docs/requirement.md) — scope & functional requirements
- [architecture.md](docs/architecture.md) — how the pieces fit + future plan
- [api-spec.md](docs/api-spec.md) — REST + WebSocket reference
- [deployment.md](docs/deployment.md) — VPS + Nginx + Docker guide
- [prompt-library.md](docs/prompt-library.md) — prompts for future AI wiring
