# Architecture

```
┌────────────────────────────┐        HTTPS / WSS        ┌───────────────────────────┐
│  Browser (mobile/desktop)  │  ───────────────────────▶ │  Nginx reverse proxy (VPS) │
│  Next.js web app           │                            └──────────┬────────────────┘
│  - App Router pages        │                                       │
│  - Zustand UI state        │                        ┌──────────────┴───────────────┐
│  - api client (fetch)      │                        │                              │
└────────────────────────────┘                 /api, /ws            /  (static/SSR)
                                                       │                              │
                                             ┌─────────▼─────────┐        ┌───────────▼──────────┐
                                             │  FastAPI (uvicorn) │        │  Next.js server       │
                                             │  routers→services  │        └───────────────────────┘
                                             │  SQLModel ORM      │
                                             │  WebSocket bus     │
                                             └───────┬─────┬──────┘
                                                     │     │
                                        ┌────────────▼─┐ ┌─▼──────────────┐
                                        │ PostgreSQL   │ │ Worker (python)│
                                        │              │ │ workspace mgr  │
                                        └──────────────┘ │ cmd executor   │
                                                         │ safety allowlist│
                                                         └───────┬────────┘
                                                                 │ (future: real)
                                                     ┌───────────▼───────────┐
                                                     │ /workspaces/companies │
                                                     │  <company>/<project>/ │
                                                     └───────────────────────┘
```

## Layers & responsibilities
- **Frontend (`apps/web`)** — presentation + interaction only. All server data
  flows through `lib/api.ts`. UI-only state (active company, toasts, command
  dock) lives in Zustand (`lib/store.ts`). No business rules in the client.
- **API (`server/api`)** — thin routers delegate to `services/*`, which hold all
  business logic (validation, the 15-floor rule, lifecycle, recommendations).
  Models are SQLModel tables; request bodies are pydantic schemas.
- **Realtime** — `services/activity_bus.py` is an in-process WebSocket pub/sub.
  `activity_service.record()` persists an activity **and** broadcasts it. Swap
  the bus internals for Redis pub/sub to scale horizontally.
- **Worker (`server/worker`)** — workspace lifecycle + command execution. Fully
  mock in MVP; `safety.py` already enforces the allow/block policy.
- **Database** — SQLite for dev (zero-config, auto-seed), PostgreSQL for prod.
  `database/schema.sql` is the canonical production schema.

## Extensibility seams (where real integrations land)
| Capability            | File / function |
| --------------------- | --------------- |
| AI model routing      | `api/utils/recommendations.py` |
| Command intent (LLM)  | `api/services/command_service.py` → `handle_command` |
| Project execution     | `api/services/project_service.py` (start/pause/resume) |
| Real shell execution  | `worker/command_executor.py` → `_execute_real` |
| Real workspace FS/git | `worker/workspace_manager.py` |
| Job queue             | `worker/job_runner.py` (+ `REDIS_URL`) |
| GitHub push           | project `github_repo_url` + a future `github_service.py` |

## Data model (summary)
`users → companies → departments (≤15, unique floor) → agents`;
`companies → projects → {tasks, project_files, vps_workspaces}`;
`ai_models` referenced by departments & agents; `activities` link company/
project/department/agent; `commands` store Command Center history; `settings`
holds key/value config.

## Scaling notes
- Stateless API → run N replicas behind Nginx; move the activity bus to Redis.
- Workers scale independently and pull from a queue (RQ/Celery) keyed by project.
- Each project workspace is isolated on disk; real execution should run inside a
  sandbox (docker exec / nsjail / firejail) with CPU/mem/time limits.
