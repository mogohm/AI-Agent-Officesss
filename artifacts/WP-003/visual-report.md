# WP-003 — Company Building Experience: completion report

| Package | Status |
|---|---|
| WP-003A Canonical Asset Registry | **PASSED** |
| WP-003B Dashboard Building Cards | **PASSED** |
| WP-003C Companies Page Cards | **PASSED** |
| WP-003D Visual & Functional Verification | **PASSED** |
| **WP-003 (parent)** | **PASSED** |

## Assets

Baseline **v1.1.0**, digest `27f54147b0e8c8c0309a218e54c61c970c8edb4fc272319fbbdb58184df878af`.
17/17 present, git-tracked, HTTP 200, `image/webp`. Canonical mutations: 0.

v1.0.0 is retained as history and marked `SOURCE_BYTES_UNRECOVERABLE`; its digest
is untouched everywhere it records the original attestation.

## Verification (real session, real database, no fixtures)

8/8 Playwright tests against a live authenticated session:

- every building image is a canonical registry path AND decoded (`naturalWidth > 0`,
  so a 404 cannot pass)
- `object-fit: contain` enforced — switching to `cover` fails the suite
- zero legacy `building-N.webp` references remain
- no horizontal overflow at 1920x1080, 1600x900, 1440x900, 390x844
- zero failed canonical asset requests, zero console errors
- variant assignment stable across reloads
- accessibility smoke: alt text on every content image, accessible name on every
  link/button, no duplicate ids, at most one h1, Tab reaches an interactive element
- test records hidden by default; the explicit filter never reduces the set

## Defects found and fixed

| Sev | Defect | Resolution |
|---|---|---|
| P1 | Art 1:1 in a 2.4:1 frame — building drew at 40% of preview width with hard seams | preview is `aspect-square`, matching the source |
| P1 | `$0.00` truncated to `$...` at 1440/1600 | removed `truncate` from the value; 8-up grid moved to `2xl` |
| P1 | /companies showed projects where /dashboard shows active tasks — same company read 4 and 0 | both pages now use one `ACTIVE_TASK` definition |
| P1 | /companies used 76px thumbnails, a second design, 74% empty | reuses `CompanyBuildingCard` with `showSettings` |
| P2 | Permanent fake selection ring on card index 0 | removed |
| P2 | Image overflowed its frame, pushing all card content off screen | `relative` no longer hardcoded in the preview base class |
| P3 | `loading="lazy"` on above-the-fold hero art; inert `sizes` without `srcSet` | `loading="eager"`, intrinsic 1024x1024, `sizes` removed |

The overflow defect was caused by Tailwind emitting `.relative` after `.absolute`,
so the caller's `absolute inset-0` lost to the component's own `relative`.

## Resolver guarantees (test-pinned)

Explicit theme first, then a stable FNV-1a hash of the company id. Never array
index, query order, display name, description, randomness or hard-coded database
ids. The four seeded companies resolve to four distinct buildings.

## Carried forward to WP-004 / WP-005

**P1 — the seven floor assets do not meet FloorAnchorSpec.** Four hit the slab
anchor (409-467 against a 430 target); three do not, and the camera is not
consistently 2:1 dimetric. Text-to-image cannot hold a pixel-precise structural
contract. The correct fix is a deterministic shared-shell template with only the
furniture layer generated — which is what the anchor spec's `shared-shell`
detection method already anticipates. Floors are unused by WP-003B/C.

## Deferred, non-blocking

F7 thumbnail generation (`thumbs/` exists but is empty) · F8 mobile section header
wrapping · F11 asset filenames do not match the company they resolve for.

## QA

lint 0 · typecheck 0 · build compiled · unit 265 passed / 3 skipped ·
missions:verify 78 · delivery-integration 26 · e2e 8 · P0 0 · P1 0
