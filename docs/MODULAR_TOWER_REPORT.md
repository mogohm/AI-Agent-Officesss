# Modular Illustrated Tower — Compositing Phase Report

**Phase:** MODULAR ILLUSTRATED TOWER COMPOSITING (long run)
**Date:** 2026-07-15
**Approach:** generate small controllable single-part modules, then compose the
six-floor tower deterministically in code. Floor count is fixed by composition,
never by the image model.

---

## FINAL STATUS: **A — PASSED**

> **MODULAR TOWER: PASSED**
> **SIX-FLOOR COUNT: CORRECT** (roof + 6 floors + B1, always exactly six)
> **REFERENCE SIMILARITY: BEST PRACTICAL RESULT** — beats Procedural V3 decisively and beats the 4-floor master on structure + production viability
> **READY FOR USER REVIEW**
> **DEPLOYMENT: BLOCKED** (default unchanged; awaiting your approval)

The full-tower floor-count failure is bypassed: every floor is a *separate*
generated module, so the composed tower is guaranteed to show six floors.

---

## 1. Modules generated (one module = one floor / one part)

`apps/web/public/assets/themes/reference-bright/tower-master/modules/`

| # | Module | Represents | Gate |
|---|--------|-----------|------|
| 1 | `tower-roof-module.webp` | Rooftop garden | PASS |
| 2 | `growth-floor-module.webp` | Floor 6 · Growth (orange · analytics) | PASS |
| 3 | `quality-floor-module.webp` | Floor 5 · Quality (teal · QA checklists) | PASS |
| 4 | `game-studio-floor-module.webp` | Floor 4 · Game Studio (yellow/blue · game screens) | PASS |
| 5 | `art-design-floor-module.webp` | Floor 3 · Art & Design (pink · mood boards) | PASS |
| 6 | `engineering-floor-module.webp` | Floor 2 · Engineering (blue/teal · code + server) | PASS |
| 7 | `product-management-floor-module.webp` | Floor 1 · Product Mgmt (blue/lavender · roadmap/kanban) | PASS |
| 8 | `b1-vps-module.webp` | B1 · VPS/server vault (racks + cloud) | PASS (v2) |
| — | right glass shaft | **procedural CSS/SVG** — no generation | n/a |

Every floor module passed all quality-gate checks: **exactly one floor**, same
style family as the reference and the 4-floor master, no cyberpunk darkness,
rich room detail, chibi worker density present, compatible chevron cutaway
camera, no broken text, no accidental extra floors.

## 2. API calls used

- **Initial generation: 8 calls** (roof + 6 floors + B1) — under the 9 cap.
- **Targeted revisions: 1 call** (B1 only).
- **Total: 9 / 14** — well under the hard cap. Right glass shaft was built
  procedurally, saving one planned call.

## 3. Revisions used / rejected modules

- **B1 (1 revision).** The first B1 was generated with a transparent background;
  gpt-image-1's transparent mode erased the *dark* server vault (only the glowing
  cloud survived) — the "transparency unreliable for dark scenes" case. Per the
  one-revision rule, B1 v2 was regenerated **opaque, filling the frame** (prompt
  section `## Modular tower — b1 vps module v2`, `transparency_requested:false`).
  v2 is a full, richly detailed dark vault — PASS.
- No other module failed; no module failed twice.

## 4. Final module paths & references

- Modules: `apps/web/public/assets/themes/reference-bright/tower-master/modules/*.webp`
- Prompts: `docs/REFERENCE_BRIGHT_PROMPTS.md` → `## Modular tower — *` sections.
- Generation references (single-part crops of the approved 4-floor master, which
  forced BOTH the exact style AND one-part-per-module):
  `references/style-lock/modules/master-floor-a|b.png`, `master-roof.png`, `master-b1.png`.
- Untouched sources: `outputs/source/modular/*.png`.

## 5. Composition strategy

`apps/web/components/bright/ModularReferenceTower.tsx` stacks the modules
deterministically (`MODULAR_DEFAULT` geometry). Each ~1.5:1 room module is shown
as a short horizontal band via `object-cover` + a per-part vertical focal (keeps
the rear-wall department signage visible while holding building proportions).
A **procedural frame** unifies the stack into one building: continuous left/right
structural edges, thin inter-floor seam lines that merge the modules' own beams,
a procedural glass shaft, a continuous side shadow across the two wall planes,
and an outer drop-shadow + ground shadow. Floor count is structural — six floor
tiles are always rendered. Geometry helpers (`modularFloorTop`, `modularB1Top`)
are shared with the parent so floor tabs and the B1 hotspot align exactly.
Details: `docs/MODULAR_TOWER_HOTSPOTS.md`.

## 6. Route for review

- **In context:** `/bright-office?tower=modular`  (also `/companies/[id]` accepts `?tower=modular`)
- **Lab:** `/visual-lab/modular-tower` (modes: side · overlay · modular · reference · v3 · master4, live geometry sliders, guides)
- Fallbacks intact: `?tower=procedural-v3`, `?tower=master`.

## 7–8. Screenshots

`outputs/reference-diff/modular-tower/`
- `04-modular-tower.png` — the composed tower
- `05-reference-vs-modular.png` — reference vs modular
- `06-overlay-50.png` — reference/modular overlay
- `07-bright-office-modular-mode.png` — the full living page with the modular tower
- `08-comparison-grid.png` — reference · V3 · 4-floor master · modular, side by side
- (`01-reference` · `02-procedural-v3` · `03-4floor-master` singles)

## 9–10. Scoring (manual, /10)

| # | Category | Procedural V3 | 4-floor Master | **Modular** |
|---|----------|:---:|:---:|:---:|
| 1 | Correct six-floor count | 10 | 4 | **10** |
| 2 | First-impression similarity | 5 | 8.5 | **8** |
| 3 | Unified building feeling | 6.5 | 9.5 | **7.5** |
| 4 | Room density | 7 | 8.5 | **9** |
| 5 | Worker density | 6 | 8 | **9** |
| 6 | Roof similarity | 5 | 9 | **8.5** |
| 7 | B1 similarity | 6 | 8.5 | **8.5** |
| 8 | Shaft similarity | 6.5 | 8 | **7** |
| 9 | Label / hotspot usability | 9 | 8 | **9** |
| 10 | Production viability | 7.5 | 6 | **9** |
| | **Total** | **68.5** | **78.0** | **85.5** |

**Modular beats Procedural V3 overall (85.5 vs 68.5) — decisively**, and beats
the 4-floor master overall (85.5 vs 78) on the axes that matter for a real
product: correct floor count, room/worker density, hotspot usability, and
production viability. The 4-floor master still edges modular on pure 3-D
massing/"one solid object" feel and roof rendering — but it is **structurally
unusable** (4 floors cannot represent 6 departments).

**Honest weakness:** the modular tower reads slightly flatter than the reference
/ 4-floor master — full-width room bands rather than a fully 3-D isometric
exterior. The procedural frame + shadows close most of the gap, but it is the
one place the master's single-image massing still wins. This does not affect
correctness or function.

## 11. Route for review

`/bright-office?tower=modular` (recommended) and `/visual-lab/modular-tower`.

## 12. Should modular become default?

**Recommended: yes, for production V1** — it is the first option that is BOTH
correct (six floors) AND clearly better than the current fallback. Per the
phase rules the switch is **not** made automatically: the default remains
`procedural-v2`; V3 stays as fallback; the 4-floor master stays as an art
reference (`?tower=master`). Flip the default only on your approval.

## 13. Lint / typecheck / build

- `next lint` — pass (pre-existing warnings only; none from new code)
- `tsc --noEmit` — pass
- `next build` — pass (18 routes; `/visual-lab/modular-tower` = 3.36 kB)
- Route diagnosis (Playwright), all **0 console errors / 0 failed requests**:
  `/visual-lab/modular-tower?mode=modular`, `/bright-office?tower=modular`,
  `/bright-office?tower=procedural-v3` (fallback verified).

---

## Non-actions (as instructed)

Not deployed · default unchanged (`procedural-v2`) · left/right/bottom panels,
CRUD, AI integration untouched · existing tower modes (`procedural-v1/2/3`,
`master`, `legacy-shell`) all preserved · API budget respected (9/14).

## If you approve

Set `towerMode` default to `"modular"` in
`apps/web/components/bright/BrightCompanyOffice.tsx` (one line), keep V3 as
fallback, keep the 4-floor master as `?tower=master` art reference. Optional
follow-up to chase the last bit of 3-D massing: add angled exterior side-wall
panels to the procedural frame (free, CSS-only — no image calls).
