# BLOCKER RECORD — BLOCKED_CANONICAL_SOURCE

| Field | Value |
|---|---|
| Code | `BLOCKED_CANONICAL_SOURCE` |
| Mission | VISUAL-2026-001 |
| Raised by | WP-002P §1 (source discovery) |
| Repository state at close | `b234810`, clean, 21 commits |
| Status | **CLOSED — superseded by recovery decision VISUAL-2026-001-ASSET-RECOVERY-001** |

## Affected packages

- **WP-002P** — Canonical Asset Promotion (cannot execute)
- **WP-003A** — final gate (cannot reach PASSED)
- All downstream visual packages: WP-003B, WP-003C, WP-003D, WP-003 parent,
  WP-004, WP-005, WP-006, WP-007, and the QA / preview / UAT / reference chain

## Root cause

The WP-002 canonical bytes were written inside a mission worktree under
`workspaces/missions/`, which `.gitignore:50` excludes from version control. They
were never committed, archived, uploaded, or copied into durable artifact
storage. The execution environment that held them is no longer reachable.

The failure is one of **durability, not of correctness**: the assets were
generated, validated and reviewed properly — they were simply never persisted
anywhere that survives the loss of that worktree.

## Evidence (recorded; not to be re-run)

| Recovery channel | Result |
|---|---|
| Production canonical paths | 0 / 17 |
| Git-tracked canonical files | 0 / 17 |
| Git object store, all refs + unreachable/dangling blobs | 0 / 17 |
| Local filesystem (`D:\`, user profile) | 0 / 17 |
| Persisted evidence (`canonical-baseline-v1.0.0.json`, `generation-manifest.json`, `evidence-index-v2.json`) | absent |
| Database (`AssetCanonicalEntry` etc.) | unreachable — `DATABASE_URL` unavailable |
| HTTP against production build | 17 × 404 (legacy control returned 200) |
| Legacy substitution | forbidden by policy |
| Reconstruction | blocked — `OPENAI_API_KEY` unavailable |

## Lineage marking

**v1.0.0 asset-byte lineage → `SOURCE_BYTES_UNRECOVERABLE`**

This marks the *bytes*, not the judgement. Explicitly recorded:

- The v1.0.0 attestation **was valid at the time of review**.
- WP-002, WP-002H and their independent reviews remain **truthful and unaltered**.
- Only the recoverability of the source bytes has changed.
- Production promotion therefore cannot be completed from v1.0.0.

No prior review verdict, attestation, or evidence record has been rewritten.
