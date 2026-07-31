# Autonomous Delivery Center — Threat Model & Security Controls

An agent that can edit a repository, run shell commands, and push code is a
**remote code execution system by design**. The controls below are the reason it
is safe to operate, not optional hardening.

## 1. Trust boundaries

| Boundary | Untrusted input | Control |
|---|---|---|
| Owner → mission instruction | free text, becomes model prompts | never interpolated into shell; treated as data |
| Model → tool call | model may request any command/path | allowlist + path jail + argument validation (§4) |
| Model → file edit | model may target any file | writes confined to the mission worktree |
| Repo content → model | repo may contain prompt-injection text | tool results are labelled untrusted; agents may not escalate their own permissions |
| Worker → GitHub | push/PR | GitHub App with least privilege; no `administration`; no force-push; no direct `master` write |
| Worker → production | deploy | impossible without an owner `ReleaseApproval` row |

## 2. Primary threats

| # | Threat | Mitigation |
|---|---|---|
| T1 | Prompt injection in repo/issue text causes destructive command | commands are allowlisted by executable *and* validated by argument pattern; the model cannot add executables |
| T2 | Path traversal out of the workspace (`../../etc`) | every path resolved and asserted to be inside the mission worktree root before any read/write |
| T3 | Secret exfiltration via logs or model context | env filtering allowlist for child processes; redaction pass on all persisted logs; `.env*` files excluded from agent-readable file listings |
| T4 | Agent pushes to `master` / rewrites history | branch policy: mission branches only; `--force` blocked at the runner; merge requires approval |
| T5 | Runaway spend | per-mission budget with hard stop; per-run token cap; cost recorded per agent run in `Decimal` |
| T6 | Infinite correction loop | max attempts per defect (5), max identical failure repeats (2), no-progress detection, mission deadline |
| T7 | Worker compromised → host compromise | worker runs in Docker as non-root with a workspace volume; no host socket mount; no `sudo` |
| T8 | Production DB mutated by a test/migration | worker's `DATABASE_URL` points at an isolated test database; production DSN is never provided to the worker environment |
| T9 | Self-modification of the running control plane | §29 rule: missions target a branch + preview; the executing worker image is never overwritten by its own mission |
| T10 | Duplicate/replayed queue delivery | claim-by-conditional-update makes execution idempotent |

## 3. Secrets handling

- GitHub App private key, provider API keys, storage credentials: stored
  **encrypted at rest** with the existing AES-256-GCM helper (`lib/crypto.ts`,
  key from `CREDENTIAL_ENCRYPTION_KEY`) and decrypted server-side just-in-time.
- **Never** returned to the browser; settings screens show masked values and a
  `hasKey` boolean only (pattern already proven by `lib/data/providers.ts`).
- Child processes receive an **allowlisted** env subset, never `process.env`.
- Redaction applies to: API keys, tokens, passwords, private keys, DSNs, cookies —
  before any log/artifact is persisted.

## 4. Command execution policy

Allowed (default): dependency install from lockfile, lint, typecheck, test,
build, Playwright, migrations **against the isolated test DB**, `git`
status/diff/log/add/commit/checkout/worktree/fetch/rebase/push-to-mission-branch,
Docker build in an isolated context.

Blocked (default): anything outside the workspace, `rm -rf /`, `curl|sh`,
`sudo`, host config edits, production DB writes, direct production deploy,
`git push --force`, history rewriting, network scanning, reading host secrets.

Enforced by: executable allowlist → argument pattern validation → resolved-path
jail → timeout (20 min) → output size cap → filtered env → process-tree kill →
audit row per command.

`server/worker/safety.py` is the existing prior art being ported (audit §2).

## 5. Authorization

Delivery-scoped roles, independent of the office `CompanyRole`:

| Role | May do |
|---|---|
| `OWNER` | everything, including production release approval |
| `DELIVERY_MANAGER` | create/start/pause/cancel missions; approve release if policy allows |
| `DEVELOPER` | view all; retry work packages; comment |
| `QA` | view all; create/triage defects; rerun tests |
| `REVIEWER` | view all; submit review findings |
| `VIEWER` | read-only |

Production deployment approval is restricted to `OWNER` (and
`DELIVERY_MANAGER` only when the mission's approval policy explicitly allows it).
An approval records approver, timestamp, gate snapshot and reason — and an agent
can never write one.

## 6. Audit

Every one of the following produces an immutable `MissionAuditLog` row with
actor, action, target, before/after and evidence: mission config change, state
transition, agent invocation, tool call, shell command, repository write, commit,
push, PR action, test run, gate evaluation, approval, deployment.

## 7. Open findings inherited from the audit

S1 (defaulted Postgres password), S2 (out-of-band migrations), S3 (no CI),
S6 (npm advisories incl. `next@14.2.15`) are **open** and tracked in
`current-state-audit.md` §4. They predate this work; S3 is addressed when
PHASE 6 lands CI workflows.
