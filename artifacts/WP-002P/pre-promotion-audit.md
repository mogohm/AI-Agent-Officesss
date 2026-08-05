# WP-002P — Pre-Promotion Audit

**Result: `BLOCKED_CANONICAL_SOURCE`** — no file was copied. Gate §7 was not satisfied.

| Field | Value |
|---|---|
| Mission | VISUAL-2026-001 |
| Work package | WP-002P — Promote Canonical Office Assets to Production Public Paths |
| Repository base commit | `3330788` |
| Master HEAD (local) | `3330788` |
| Master HEAD (remote) | `3330788` |
| WP-003A source commit | `c92e444` (registry), `3330788` (consolidation) |
| Baseline version | 1.0.0 |
| Baseline digest (expected) | `2c7a7093149616014708b3a5c24b7873b7f85aa3a9895f9feaf2d42c6505ce76` |
| Required asset count | 17 |

## §7 gate results

| Requirement | Required | Actual | Verdict |
|---|---|---|---|
| Source canonical assets found | 17/17 | **0/17** | ❌ |
| Source hashes match baseline | 17/17 | 0/17 (nothing to hash) | ❌ |
| Source validation PASSED | 17/17 | unknown — no record reachable | ❌ |
| Source review APPROVED | 17/17 | unknown — no record reachable | ❌ |
| Ambiguous sources | 0 | 0 | ✅ |

Copying was not attempted. Per §7 the package stops before any filesystem write.

## §2 source-of-truth resolution — every channel exhausted

The brief requires resolving each asset from a durable canonical record, never a
guessed worktree path. Every prescribed channel was queried:

| Evidence channel | Result |
|---|---|
| `AssetCanonicalBaseline` (PostgreSQL) | unreachable — ports 5432 and 5433 closed, no `.env` |
| `AssetCanonicalEntry` | unreachable (same) |
| `AssetBaselineAttestation` | unreachable (same) |
| `generation-manifest.json` | **absent** — full scan of `D:\` and `C:\Users\Abegi` |
| `canonical-baseline-v1.0.0.json` | **absent** (same scan) |
| `evidence-index-v2.json` | **absent** (same scan) |
| `asset-plan.json` / `asset-audit.json` | **absent** (same scan) |
| Mission workspace artifact storage | `workspaces/missions/` does not exist |

No canonical source path can be resolved for any of the 17 assets, so no asset
can be selected under the §2 acceptance rules. Selecting by filename, recency or
appearance is explicitly forbidden and was not done.

## Current destination state

All 17 destinations absent. No destination hashes exist to compare.

- `buildings/` — contains `.gitkeep`, `thumbs/` only
- `floors/` — contains legacy category folders (`art-design`, `game-studio`, `growth`, `it-dev`, `product-management`, `quality`) holding 12 `*-floor-band.webp` / `*-floor-base.webp` files from commit `dfb27ef` (2026-07-13, pre-WP-002)
- `workers/default/` — **does not exist**

These legacy files are NOT canonical baseline output and must not be substituted (§8, §3).

## §5 gitignore audit — 17/17 committable, no change required

`git check-ignore -v` run against every canonical destination:

| Path | Ignored | Pattern | File |
|---|---|---|---|
| all 17 canonical destinations | **false** | — | — |

Ignore sources inspected: `.gitignore` (50 lines), `apps/web/.gitignore` (18 lines),
`.git/info/exclude` (6 lines), global `core.excludesFile` (**not configured**).
No `webp`, `assets` or `public` pattern exists in the root ignore file.

**Finding — corrects a premise in the work order.** The brief supposes the assets
may be blocked by ignore rules. They are not. The rule that hid them is
`.gitignore:50 → workspaces/missions/`, which ignores the *mission worktree where
WP-002 generated the bytes*, not the production destinations. The canonical paths
are fully committable today.

**Consequence: `.gitignore` requires no modification.** When the bytes are
supplied, a plain `git add` tracks all 17. No negation rules, no `git add -f`.

## Expected change set once sources are supplied

- 17 binary `.webp` additions (the paths listed in §3)
- `.gitignore` changes: **0** (proven above)
- legacy files modified or deleted: **0**
- source-code changes: **0** — `office-assets.ts` already registers all 17 paths

## Tests currently failing (must go green by promotion, not by weakening)

| Test | File |
|---|---|
| `14. every registered file exists` | `apps/web/tests/unit/visual-assets/office-assets.test.ts` |
| `15. every registered file is a regular, non-empty file` | same |
| `5. audits all 17 canonical assets and finds zero byte changes` | `apps/web/tests/integration/wp003a.integration.test.ts` |

All three are genuine gates and were strengthened, not weakened, in the last
correction cycle (self-guards `expect(report).toHaveLength(17)` added).

## Required to unblock

The 17 approved WP-002 `.webp` files, from the environment where WP-002 executed.
Verify before promotion with:

```
npx tsx verify-wp002-assets.ts <dir>
```

which recomputes the baseline digest using the repository's own
`computeBaselineDigest` and reports MATCH only if the bytes are the attested set.
