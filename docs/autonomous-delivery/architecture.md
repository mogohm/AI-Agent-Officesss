# Autonomous Delivery Center — Architecture

## 1. Deployment boundaries (non-negotiable)

```
┌────────────────────────┐     ┌──────────────────────────────────────────┐
│  Vercel (control plane)│     │  VPS (execution plane)                   │
│  Next.js App Router    │     │  Docker: delivery-worker                 │
│  - mission UI          │     │  - git clone / worktree per work package │
│  - server actions      │     │  - safe command runner (allowlist)       │
│  - SSE activity stream │     │  - agent runs (provider adapters)        │
│  - approvals           │     │  - Playwright UAT + screenshots          │
│  NO long-running work  │     │  - artifact upload                       │
└───────────┬────────────┘     └───────────────┬──────────────────────────┘
            │                                  │
            └──────────► PostgreSQL ◄──────────┘   durable source of truth
                         Redis/BullMQ                durable queue
                         Object storage              artifacts
```

**Rule:** a Vercel request may only *enqueue* and *read*. Every operation that
clones a repo, edits files, runs a shell command, drives a browser, or calls a
model in a loop happens on the VPS worker. This is enforced structurally: the
worker is a separate process (`worker/delivery/index.ts`) and the web app never
imports the command runner.

Rationale: Vercel serverless functions have execution time limits and no
persistent filesystem — the audit confirmed the existing office worker already
follows this split successfully.

## 2. Durability model

The database is the **only** source of truth. Redis is an accelerator.

- Every mission, work package, agent run, defect, gate result and artifact is a
  DB row before any side effect is attempted.
- The queue carries **IDs only**, never payloads.
- Work is claimed with a conditional update (`status: QUEUED → RUNNING` guarded
  by `updateMany({where:{status:'QUEUED'}})`) so two workers can never double-run
  a package. This is the pattern already proven in `lib/execution/runTask.ts`.
- SSE events are derived from DB state and are **replayable**; a reconnecting UI
  reloads from the DB rather than trusting event delivery (§24).
- Worker restart mid-mission is safe: `RUNNING` rows older than a lease timeout
  are reclaimed to `QUEUED` by a sweeper (existing `reclaimStuck()` pattern).

## 3. Layering

| Layer | Location | Rule |
|---|---|---|
| Domain (pure) | `lib/delivery/*.ts` | no I/O, no `server-only`, fully unit-testable — state machines, gate evaluation, loop safety, budget math |
| Data access | `lib/data/delivery/*.ts` | Prisma + RBAC scoping, `server-only` |
| Server actions | `app/(app)/missions/**/actions.ts` | Zod validate → authorize → mutate → audit-log → revalidate |
| Orchestrator | `lib/delivery/orchestrator/*` | scheduling, dependency resolution, gate evaluation; callable from worker |
| Worker | `worker/delivery/*` | the only place with filesystem/shell/browser access |
| Adapters | `lib/delivery/adapters/*` | GitHub, provider, storage, preview — interface-first, each independently mockable in tests but never mocked in production paths |

The pure-domain split is deliberate: §20 requires unit tests for state machines,
permissions, gates, scheduling, loop protection and cost limits. Those must run
without a database or network.

## 4. Mission execution loop (durable, resumable)

```
schedule():
  for each mission in EXECUTING:
    if budget exceeded or deadline passed  -> BLOCKED (record reason + evidence)
    packages = workPackages(mission, status=READY, deps all PASSED)
    slots    = MAX_PARALLEL_WRITERS - inFlightWriters(mission)
    enqueue(packages[0:slots])
```

Every loop turn is a pure function of DB state, so a crash between turns loses
nothing. `MAX_PARALLEL_WRITERS = 2` and `MAX_PARALLEL_READERS = 4` per §9.

## 5. Isolation

```
workspaces/missions/<missionKey>/
  base/                 # single clone, fetched + rebased
  worktrees/<WP-key>/   # one git worktree per work package
  artifacts/            # screenshots, traces, reports
  logs/
```

Never edits the production checkout; never commits to `master`; never force-pushes.
Failed worktrees are retained for evidence until retention expires.

## 6. Agent provider routing

Task-kind → model class, recorded per run (provider, model, prompt template id +
version, rendered-prompt hash, tokens, cost, latency, status):

| Task kind | Model class |
|---|---|
| requirement, architecture, root-cause | reasoning |
| frontend/backend development, review | coding |
| visual analysis, UAT comparison | visual |
| asset production | image |
| classification, triage | lightweight |

Fallback is allowed but must be **recorded with a reason** — never silent (§17).

## 7. Quality gates

Gates are pure predicates over persisted evidence (`lib/delivery/gates.ts`):
`RQ_GATE`, `ARCHITECTURE_GATE`, `REVIEW_GATE`, `QA_GATE`, `PREVIEW_GATE`,
`UAT_GATE`, `VISUAL_GATE`, `RELEASE_GATE`. Each returns
`{status, checks[], blockingReasons[]}` and is stored as a `QualityGateResult`
row, so a gate decision is always auditable after the fact.

## 8. What is intentionally NOT built

- **No Kubernetes** (§3).
- **No fully unattended production deploy** — LEVEL 4 is the maximum autonomy in
  the initial release; merge/deploy requires owner approval (§16, §31.22).
- **No AI-only visual scoring** — deterministic pixel/perceptual metrics are
  primary; model judgment is supplementary evidence only (§11).

## 9. Phase status

| Phase | Scope | Status |
|---|---|---|
| 0 | Audit, architecture, threat model, migration plan | **done** |
| 1 | Models, state machines, gates, loop safety, audit log | **in progress** |
| 2 | Mission web UI + live activity | pending |
| 3 | Queue, persistent worker, worktrees, safe command runner | pending |
| 4 | Provider adapters, prompt versioning, agent runs | pending |
| 5 | GitHub App (branch/commit/PR/checks) | pending — needs App credentials |
| 6 | Automated QA, defect generation, correction loop | pending |
| 7 | Preview deploy, Playwright UAT, visual comparison | pending |
| 8 | Release candidate, approval, deployment, rollback | pending |
| 9 | Run the built-in reference-fidelity mission on this repo | pending |
