# Bright Office → Production Swap Plan

Status: **READY FOR USER APPROVAL** — nothing below has been executed.
`/companies/[id]` (dark theme) remains untouched; `/bright-office` is the
approved final-review build.

## Principles

- The swap is a **visual-layer replacement only**: no schema, CRUD, API or
  store changes. All Bright components already consume the same `lib/api`
  endpoints the production page uses.
- Reversible at every step: the dark implementation stays in the tree until
  the Bright default has soaked.

## Step-by-step

1. **Preserve** the current `/companies/[id]` implementation (rename its body
   to `CompanyBuildingClassic`; keep file history).
2. **Feature flag**: `NEXT_PUBLIC_VISUAL_MODE=bright|classic` (env) plus a
   per-session override (`?visual=classic` query / localStorage) so both can
   be compared live in production.
3. **Extract** the Bright page body into `components/bright/BrightCompanyView.tsx`
   taking `companyId` as a prop (it already reads everything else from the
   API). `/bright-office` becomes a thin wrapper; `/companies/[id]` renders
   `BrightCompanyView` when the flag is `bright`, else the classic view.
4. **Dynamic company ID**: `BrightCompanyView` must use the route param, not
   its own selector default. The left company column stays, but selecting a
   company navigates to `/companies/<id>` (URL is the source of truth).
   Nothing may hardcode company 1, "AI Game Studio", or six departments.
5. **Validate with company 1** — all panels, tower, workers, storyboard.
6. **Validate company switching** — Neon Labs (3 depts: tower shows matching
   floors; unmatched floors render the shell's neutral openings), Neon Games
   (0 depts: tower is the empty shell; panels show empty states).
7. **Validate CRUD** — create/edit/delete department, assign model, create
   project, delete agent; confirm tower/tabs re-render from fresh data.
8. **Flip the default** to `bright`; keep `classic` reachable by flag for one
   review cycle, then remove the flag (classic code stays archived).

## Dynamic department-count behavior (already architected)

| Departments | Tower behavior |
|---|---|
| 1–6 | complete tower, all floors simultaneous (current) |
| 7–10 | controlled scale-down of floor pitch (UnifiedTower geometry accepts a per-floor pitch override; openings shrink, no scroll) |
| 11–15 | building camera: tower renders a 6-floor viewport with floor navigation via the tab column (wheel/press to shift the visible band) |

The scene config (`BRIGHT_DEPTS`) maps by `department.type`; unknown types
fall back to a neutral opening (shell interior) with the department's real
name on its tab — no crash, no fake content.

## Rollback

Flip `NEXT_PUBLIC_VISUAL_MODE=classic`. No data migration exists, so rollback
is instant.
