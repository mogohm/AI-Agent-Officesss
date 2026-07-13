# Reference-Locked Final Composition Review

Scored from the **actual side-by-side** at `/visual-lab/reference-comparison`,
not from memory.

- **Reference:** `apps/web/public/assets/reference/reference.png`
- **Current:** `apps/web/public/assets/reference/current.png`
  = `outputs/screenshots/reference-composition/company-band-v2-1920x1080.png`
- **Baseline (previous phase):** `company-final-1920x1080.png` (~6/10)

## What changed this phase

- **Production 5:1 band pipeline** — `tools/creative_worker/create_floor_band.py`
  deterministically focal-crops each approved **8:3 master** to a **1600×320
  (5:1)** band. No image API, no regeneration, masters preserved.
- **Six derived bands** created under each department floor folder
  (`*-floor-band.webp`).
- **`productionFloorBandConfig` + `bandSeats`** added to
  `lib/production/departmentConfig.ts` — per-department focal + production-only
  seat map (separate from Visual-Lab showcase coords).
- **Full building in one view** — `FloorSlot` now renders the band and flexes;
  `LivingCompanyBuilding` fits 1–10 floors with no scroll; the current 6-floor
  company shows **6 → 1 + B1 simultaneously**.
- **Vertical company towers** — `BuildingThumbnail` rebuilt as a portrait tower
  (roof + greenery, receding side, lit windows, B1/foundation plinth).
- **Storyboard activity strip**, lighter surfaces throughout.

## Scores (0–10) — target ≥8 overall, none below 7

| # | Category | Baseline | Now | Notes |
|---|----------|:---:|:---:|-------|
| 1 | Overall composition | 6 | **8** | Left towers · center full cutaway · right light panels · bottom strip — same skeleton as the reference. |
| 2 | Page brightness | 5 | **9** | One coherent bright system; no dark SaaS surfaces remain. |
| 3 | Company overview similarity | 5 | **7** | Vertical towers in a 2-col grid. Reference uses richer illustrated buildings on a night field; ours are CSS towers on sky. |
| 4 | Building completeness | 3 | **9** | **All 6 floors + B1 visible at once, no scroll** — the headline requirement, met. |
| 5 | Floor readability | 6 | **8.5** | 5:1 bands crop far less than the masters did; rooms + bold floor badges read clearly. |
| 6 | Worker visibility | 5 | **7** | Workers placed per floor via band seat maps. Fewer chibis than the reference (no cloning / no new art). |
| 7 | Right-panel similarity | 4 | **8.5** | White cards, numbered badges, sections 3–7 present in the primary viewport. |
| 8 | Bottom-strip similarity | 5 | **7.5** | Continuous storyboard of real mini-scenes; interiors dimmer than the reference (night art). |
| 9 | Color harmony | 5 | **8** | Single navy/blue + department-badge palette. |
| 10 | First-impression similarity | 5 | **8** | Reads as the same bright management game rather than a dashboard. |

**Overall: ~6/10 → ~8/10. No category below 7.** Target met.

## Remaining gaps (art-locked — NOT touched, per "do not generate art")

- Reference interiors are **brighter/daytime**; our floor art is **night-lit** warm rooms.
- Reference floors are **densely populated with chibis**; we show 1–3 real workers per floor (never clone a sprite).
- Reference building is a single **isometric 3-D solid**; ours is readable stacked bands (same "all floors visible" outcome, different render).
- Reference **left column is dark night-city navy**; ours is bright by explicit instruction.

Closing any of these needs **new generated art**, which is out of scope.

## Pass conditions

| Condition | Status |
|-----------|:---:|
| All 6 floors + B1 visible simultaneously | ✅ |
| No building scroll for the 6-floor company | ✅ |
| Production uses 5:1 floor bands | ✅ |
| Floor master assets unchanged | ✅ (masters preserved; bands are new files) |
| Right side uses light reference-style panels | ✅ |
| Company cards show vertical buildings | ✅ |
| One coherent color system | ✅ |
| Bottom strip feels like illustrated scenes | ✅ |
| Side-by-side reference comparison exists | ✅ `/visual-lab/reference-comparison` (side + overlay) |
| First impression resembles the reference substantially more | ✅ (baseline ~6 → ~8) |

## Status

```
MASTER FLOOR ART:      LOCKED
PRODUCTION BAND MODE:  COMPLETE
FULL 6-FLOOR BUILDING: VISIBLE
GLOBAL THEME:          UNIFIED
RIGHT MANAGEMENT UI:   LIGHT / REFERENCE-STYLE
REFERENCE COMPARISON:  COMPLETE
REFERENCE FIDELITY:    PENDING USER REVIEW
```
