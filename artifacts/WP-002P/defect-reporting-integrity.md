# DEFECT — DLV-REPORT-001

| Field | Value |
|---|---|
| Category | `REPORTING_INTEGRITY` |
| Severity | **P2** |
| Status | OPEN — recorded, not yet fixed (fix is out of WP-002P write scope) |
| Mission | VISUAL-2026-001 |
| Raised by | WP-002P §15 |
| Commit | `c92e444fb7121206dfda9a2d5bf37344739ba13e` |
| Public branch | `master` |
| Blocks asset promotion | **No** |

## Expected

A delivery report — including a commit message trailer that asserts push state —
reflects the *actual* Git branch and push state, derived from Git after the
operation completes.

## Actual

The commit message of `c92e444` ends:

```
Not pushed. Master untouched.
```

`c92e444` is now publicly present on `master`, so the text contradicts the
repository's public state.

## Root cause — stale point-in-time assertion, not a false claim

The statement was **true when written** and became false later. Audit trail:

| When | Event | Evidence |
|---|---|---|
| authoring | commit created on `work/VISUAL-2026-001/WP-003A`; `master` = `ca28086`; nothing pushed | branch still points at `c92e444` |
| 2026-08-05 10:49:51 | `master` fast-forwarded to `c92e444` | reflog: `merge work/VISUAL-2026-001/WP-003A: Fast-forward` |
| 2026-08-05 11:45:28 | `master` advanced to `3330788` | reflog: `commit:` |

The defect is that a **mutable runtime fact (push state) was embedded as immutable
commit text**. A commit message cannot self-update; asserting push state inside one
guarantees eventual inconsistency. This matches the failure mode §15 describes:
the value came from a planned-state variable at authoring time rather than from
Git after the operation.

## Branch-policy check — no violation

- The commit was **not** authored on `master`. It was authored on
  `work/VISUAL-2026-001/WP-003A`.
- `master` advanced only by **fast-forward**: `ca28086` is an ancestor of
  `c92e444`, and `c92e444` is an ancestor of `3330788`. Verified with
  `git merge-base --is-ancestor`.
- No force push, no history rewrite, no orphaned commits.
- The master promotion was performed on explicit written instruction in a later
  work order, after the prior orders had forbidden it.

**No unauthorized direct master write occurred, so no separate security/process
defect is raised.** Severity stays P2.

## Required correction (pipeline, not history)

Do **not** rewrite Git history to fix wording — the commit is already public and
on `master`.

Reports must derive push state from Git *after* the operation:

| Field | Source |
|---|---|
| current branch | `git rev-parse --abbrev-ref HEAD` |
| local HEAD | `git rev-parse HEAD` |
| remote branch | `git rev-parse --abbrev-ref --symbolic-full-name @{u}` |
| remote HEAD | `git ls-remote origin refs/heads/<branch>` |
| ahead/behind | `git rev-list --left-right --count @{u}...HEAD` |
| push result | exit status of the push invocation |

Derived state must be one of `NOT_PUSHED`, `PUSHED`, `MASTER_UPDATED`.

**Commit messages must stop asserting push state entirely** — it is unknowable at
authoring time. Push state belongs in the run report, which is regenerated.

## Regression tests to add

1. A local-only commit reports `NOT_PUSHED`.
2. A pushed branch reports `PUSHED`.
3. `master` containing the commit reports `MASTER_UPDATED`.
4. A stale cached value cannot override live remote verification — assert the
   reporter re-queries `git ls-remote` and prefers it over any in-memory state.

## Why not fixed in this run

The reporting pipeline lives in `apps/web/lib/delivery/` and `apps/web/worker/`,
both forbidden write paths under WP-002P §9 and the WP-003A frontend policy.
Fixing it requires a properly scoped delivery-engine work package.
