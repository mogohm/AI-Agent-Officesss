# Current-State Audit — Autonomous Delivery Center (PHASE 0)

Date: 2026-07-31 · Repo: `mogohm/AI-Agent-Officesss` · Commits audited: `dfb27ef`, `daf00d8`, `2641077` (796 tracked files)

This audit was produced by **reading the code**, not the README. Several existing
docs (`docs/architecture.md`, `api-spec.md`, `deployment.md`, `requirement.md`)
describe a FastAPI system that is no longer wired to anything — they are stale
and actively misleading.

---

## 1. Verdict summary

| Area | Classification | Conflicts with `apps/web`? |
|---|---|---|
| `apps/web` — Next.js + Prisma + Auth.js + BullMQ worker | **production-ready** | — |
| `apps/web` AI provider adapters (OpenAI/Anthropic/Google/local) | **production-ready** | — |
| `apps/web` task execution worker (`worker/index.ts`, `lib/execution/runTask.ts`) | **production-ready** | — |
| `apps/web` credential encryption (AES-256-GCM, `lib/crypto.ts`) | **production-ready** | — |
| `apps/web` Playwright suites (`tests/e2e/*`) | **partially implemented** (no CI runs them) | — |
| `tools/creative_worker` — OpenAI `images.edit` pipeline (1,569 LOC) | **production-ready** (130 completed tasks) | no — orthogonal |
| `server/` — FastAPI service (~2,136 LOC, 41 files) | **obsolete + mock by design** | **yes** — duplicate domain model/ORM/seed/REST |
| `server/worker/command_executor.py` | **mock** (`DRY_RUN = True`, `_execute_real()` raises) | — |
| `server/worker/workspace_manager.py` | **mock** (never touches disk) | — |
| `server/worker/safety.py` — command allowlist/blocklist | **production-ready, salvageable** | — |
| `database/` — standalone Postgres DDL + seed | **obsolete** | **yes** — same table names as Prisma |
| `workspaces/` | **missing** (empty `.gitkeep` only) | — |
| root `docker-compose.yml` | **obsolete** | **yes** — port 5432 clash, missing all current env vars |
| `.github/` | **missing** — *no CI/CD of any kind* | — |
| GitHub API integration | **missing** — zero matches repo-wide | — |
| Vercel API integration | **missing** — deploys are manual | — |
| Shell/command execution (working) | **missing** — only the mock exists | — |
| Git operations (clone/worktree/commit) | **missing** — zero `subprocess`/`child_process` anywhere | — |
| Mission / AgentRun / WorkPackage concepts | **missing** — no "mission" exists anywhere in the repo | — |
| Artifact storage adapter | **missing** | — |
| Visual comparison (pixel/perceptual) | **partially implemented** — `tools/reference_diff.py` (deterministic Pillow diff) exists, not wired to the app | — |

**Committed secrets: none.** Verified across all 796 tracked files and full history.
One live `sk-proj-` OpenAI key exists in gitignored `.env.local` (local disk only,
never committed). Placeholder secrets in `apps/web/.env.example` are labelled.
`apps/web/docker-compose.yml` defaults `POSTGRES_PASSWORD` to `aio_password` —
**unsafe if deployed without the env var set** (tracked as a finding below).

---

## 2. What this means for the Autonomous Delivery Center

The delivery system must be built **essentially from scratch**. The four
capabilities it depends on most — git operations, shell execution, GitHub API,
and mission state — do not exist in any working form.

### Salvageable (reuse, do not rewrite)
1. **`server/worker/safety.py`** → port to TypeScript as the command allowlist for §14 Shell Safety.
2. **`tools/creative_worker/openai_image_worker.py`** → the Asset Agent's image provider path already works (reference-guided `images.edit`, transparent background, exact-dimension post-processing).
3. **`tools/creative_worker/reference_diff.py` + `measure_*.py`** → deterministic pixel comparison for §11 Visual Comparison (satisfies "do not use AI judgment as the only score").
4. **`apps/web`**: Prisma + migrations, Auth.js RBAC, BullMQ/Redis queue with DB-polling fallback, worker heartbeat + graceful shutdown, `lib/crypto.ts`, `AIProviderAdapter` abstraction, `ApiResult` envelope, domain error hierarchy, `lib/task-state.ts` (a working state-machine pattern to copy).

### Must be deleted or quarantined (they will mislead agents reading the repo)
- `server/` (after porting `safety.py`), `database/`, root `docker-compose.yml`,
  `apps/web/lib/api.ts` (128 LOC dead client), `apps/web/.env.local.example`.
- Stale docs must be marked superseded, not silently left in place.

**Deferred:** deletion is *not* performed in PHASE 0. It is a destructive change
to files the owner may still want, and it is unrelated to shipping PHASE 1.
Tracked in the migration plan (§4) for explicit approval.

---

## 3. Detailed findings

### 3.1 `server/` — obsolete FastAPI service
- 41 Python files, ~2,136 LOC. FastAPI 0.115 + SQLModel + uvicorn.
- `server/api/main.py:43` — `/health` returns `"engine": "mock"`.
- `server/worker/command_executor.py:11` — `DRY_RUN = True  # MVP: never execute real shell commands`; `_mock_result()` returns canned stdout; `_execute_real()` raises `NotImplementedError`.
- `server/worker/workspace_manager.py:1-5` — docstring states it returns a standard tree and mock metrics "without touching disk".
- `server/worker/job_runner.py:30` — `loop()` sleeps forever, prints `worker started (mock)`; there is no queue.
- `server/api/routers/meta.py:44` — `/api/server/status` returns `random.uniform()` metrics and `"sgp1 (mock)"`.
- `server/api/config.py:29-33` declares OpenAI/Anthropic/Gemini keys; **no code reads them** — there is no AI call in `server/` at all.
- 12 SQLModel tables duplicate the Prisma domain (companies, departments, agents, projects, tasks, activities, ai_models…).
- **Unwired:** its only remaining consumer, `apps/web/lib/api.ts`, has zero imports.

### 3.2 `database/` — competing source of truth
- `database/schema.sql` (182 lines) declares itself "the source of truth for production DBs" and creates the same tables Prisma manages. `database/migrations/` is empty.
- Encodes two rules Prisma should be checked against: `uq_department_floor UNIQUE (company_id, floor_number)` and `ck_department_floor CHECK (floor_number BETWEEN 1 AND 15)`. Prisma has the unique constraint (`@@unique([companyId, floorOrder])`); the 1–15 range is enforced in application code (`createDepartment` caps at 15), **not** at DB level.

### 3.3 Deployment reality
- Root `docker-compose.yml` builds the legacy `./server` api+worker and passes `NEXT_PUBLIC_API_URL` to `web`; it supplies **none** of `DATABASE_URL`, `AUTH_SECRET`, `CREDENTIAL_ENCRYPTION_KEY`, `REDIS_URL`, which `lib/env.ts` validates at boot → **the current app cannot start under it**.
- `apps/web/docker-compose.yml` is the real stack (postgres, redis, migrate, web, worker, caddy).
- Vercel: `apps/web/vercel.json` build is `prisma generate && next build`; `prisma migrate deploy` was removed in `2641077` because the Neon **pooled** endpoint has no advisory locks. **Migrations are therefore applied out-of-band today** — a real operational gap the delivery system must own.

### 3.4 No CI, no automation gate
`.github/` does not exist. Nothing runs lint/typecheck/tests/build automatically.
Every quality claim in this repo to date has been produced by a human or agent
running commands locally. The Autonomous Delivery Center's QA_GATE cannot rely on
existing CI because there is none.

### 3.5 Existing task/run concepts (why a new model layer is required)
- `server/api/models/__init__.py:117` `Task` (backlog|in_progress|review|done) — legacy, unwired.
- `tools/creative_worker/task_schema.py:12` `CreativeTask` — a *working* filesystem queue (`creative_tasks/pending → running → completed|failed`) with per-run JSON reports. Good prior art; image-generation only.
- `apps/web` has `AgentTask` + `TaskRun` — but these model *AI worker tasks inside a customer's office*, a different domain from *software delivery work packages*. They must not be overloaded.

**Conclusion:** the delivery domain (Mission, WorkPackage, AgentRun, Defect,
QualityGate, ReleaseCandidate…) is genuinely new. Building it as a separate model
namespace is correct, not duplication.

---

## 4. Security findings (input to `security.md`)

| # | Finding | Severity | Status |
|---|---|---|---|
| S1 | `apps/web/docker-compose.yml:42,54,81` defaults `POSTGRES_PASSWORD` to `aio_password` — silent weak credential if env unset | **high** | open |
| S2 | Migrations applied out-of-band on Vercel/Neon; no verified migration gate | **high** | open |
| S3 | No CI ⇒ no automated secret scanning, dependency audit, or build gate | **high** | open |
| S4 | Live OpenAI key on local disk in gitignored `.env.local` | medium | accepted (never committed; verified absent from history) |
| S5 | `server/` ships a command executor that is only disabled by a module constant (`DRY_RUN = True`) — a one-line change away from arbitrary execution | medium | mitigate by deleting `server/` |
| S6 | `next@14.2.15` flagged with a published security advisory during Vercel install; 13 npm vulnerabilities (3 moderate, 6 high, 4 critical) reported at install time | **high** | open |
| S7 | No RBAC roles exist for delivery operations (OWNER/DELIVERY_MANAGER/…); current `CompanyRole` is office-domain only | medium | addressed in PHASE 1 |

S6 is newly surfaced by this audit and is **not** caused by the delivery work; it
should be triaged independently.

---

## 5. Migration plan (PHASE 0 → PHASE 1)

1. **Additive only.** The delivery domain is added as new Prisma models in the existing schema. No existing model is renamed or dropped. Existing office CRUD, auth, and task execution are untouched.
2. **Separate namespace.** Delivery models are prefixed conceptually (Mission*, WorkPackage*, AgentRun*, Defect*, QualityGate*, Release*) and live in a new migration `2_autonomous_delivery`.
3. **Reuse `User`** for actors and approvals; add a delivery-scoped role enum rather than overloading `CompanyRole`.
4. **`WorkerHeartbeat` already exists** and is production-ready — extend it with a worker-kind discriminator instead of creating a second heartbeat table.
5. **No destructive cleanup in this phase.** Deleting `server/`, `database/`, and root `docker-compose.yml` is proposed but requires owner approval (§2).
6. **Migration application** is by `prisma migrate deploy` against a **direct** (non-pooled) connection — never the Neon pooler (proven failure mode, `2641077`).

---

## 6. Honest scope statement

The instruction set (§0–§32) describes a system comparable in size to a
commercial CI/CD + agent-orchestration product. It cannot be completed in a
single working session, and any claim otherwise would be false.

Delivery approach: implement in the specified phase order, verify each phase with
real tests, and report per-phase what is **done**, **partial**, or **blocked**.
Phases requiring credentials I do not hold (GitHub App private key, VPS host,
S3 bucket) will have their **full integration path implemented plus a settings
screen and env documentation**, then be marked `BLOCKED_CREDENTIALS` for the exact
missing value — per §32 — rather than being faked.
