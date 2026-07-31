# Modular Tower V3 — reference-wide-band rebuild

**Date:** 2026-07-15
**Scope:** rebuild the six department floor modules as reference-correct WIDE
BANDS with TINY workers, then recompose the tower wider/compact. Roof, B1,
shaft system, hotspots, panels, CRUD/AI untouched.
**Deployment:** BLOCKED — user approval required.

---

## Final status

> **MODULAR V3: PASSED**
> **REFERENCE SIMILARITY: IMPROVED**
> **SIX-FLOOR COUNT: CORRECT**
> **MODULAR V3: DEFAULT**
> **DEPLOYMENT: BLOCKED UNTIL USER APPROVES**

## 1. Modules regenerated (6)

`apps/web/public/assets/themes/reference-bright/tower-master/modules/`
- `growth-floor-module-v3.webp`, `quality-floor-module-v3.webp`,
  `game-studio-floor-module-v3.webp`, `art-design-floor-module-v3.webp`,
  `engineering-floor-module-v3.webp`, `product-management-floor-module-v3.webp`

**Key method change:** each generation used a **structural GUIDE reference** —
a full 1536×1024 canvas whose office floor is a WIDE SHALLOW BAND across the
middle third with TINY workers and EMPTY transparent margins
(`references/style-lock/modules-v3/guide-*.png`, built from wide single-floor
crops of the approved reference). Prompts (`## Modular tower v3 — *`) told the
model to reproduce that band silhouette and keep workers 12–20% of band height.
The 4-floor master and V2 proportions were **not** used as proportion sources.

Roof and B1 were **kept** (v1 art) — after the floor swap they still read as
part of the tower, so no roof/B1 call was spent.

## 2. API calls used

- **6 initial floor calls. 0 roof/B1 calls.**
- **Total 6 / 16** — well under the cap.

## 3. Revisions used

**0.** No module needed a revision.

## 4. Failed modules

None. All six passed the gate: one floor, wide shallow band, tiny workers, high
density, clear department identity, no giant heads, no extra floors, transparent.
Caveat (not a failure): `product-management-v3` carries a small legible
"Roadmap" board label; it renders tiny in the tower.

## 5. V3 module paths

See §1. Untouched sources in `outputs/source/modular-v3/`. V2 and V1 modules
remain on disk as fallbacks (`MOD_VER` switch).

## 6. Composition iterations (`outputs/reference-diff/modular-v3/`)

- `iteration-01-modules-swapped.png` — V3 modules in the old V2 geometry
- `iteration-02-wide-compact.png` — wider aspect, warm grade, more overlap
- `iteration-03-roof-b1-retune.png` — warmer grade, smaller roof/B1, labels now fully readable
- `iteration-04-shaft-seam-unify.png` — isolated tower with unified glass shaft + thin seams
- `iteration-05-full-page-tune.png` — final full page
- `best-v3.png` — the locked isolated tower

## 7. Final geometry (`MODULAR_DEFAULT`)

| key | value | key | value |
|---|---|---|---|
| aspect | 0.68 | b1H | 11 |
| topPad | 0.5 | wallInset | 3 |
| roofH | 9 | shaftRight | 97 |
| pitch | 12.6 | shaftW | 8 |
| overlap | 3.8 | floorFocal | 0.58 |
| tileScale | 1.0 | roofFocal | 0.6 |
| b1Focal | 0.44 | floorFilter | `saturate(1.11) brightness(1.11) contrast(1.03) sepia(0.13)` |

`floorFilter` is a render-only warm/brightness grade applied to the floor art
(the V3 modules trend cooler than V2, matching the reference's cool-blue tower;
the grade recovers reference warmth without touching the assets).

## 8. Comparison grid

`comparison-grid.png` — Reference · Procedural V3 · 4-floor Master · Modular V2 ·
Modular V3, side by side. Also `reference-vs-modular-v3.png`, `overlay-50.png`,
`full-page-modular-v3.png`, `old-v2-vs-new-v3.png`.

## 9. V2 vs V3 score (and vs the other options)

| # | Category | Proc V3 | Master | Modular V2 | **Modular V3** |
|---|---|:---:|:---:|:---:|:---:|
| 1 | Correct six-floor count | 10 | 4 | 10 | **10** |
| 2 | Reference first impression | 5 | 8 | 7.5 | **8.5** |
| 3 | Tower proportion | 6 | 9 | 7 | **8.5** |
| 4 | Floor band proportion | 5 | 8.5 | 6.5 | **8.5** |
| 5 | Worker scale | 7 | 7.5 | 6 | **9** |
| 6 | Room density | 6 | 8 | 8 | **9** |
| 7 | Unified building feeling | 6.5 | 9.5 | 7.5 | **8** |
| 8 | Roof quality | 5 | 9 | 8.5 | **8.5** |
| 9 | B1 quality | 6 | 8.5 | 8.5 | **8.5** |
| 10 | Production usability | 7.5 | 6 | 9 | **9.5** |
| | **Total (/100)** | **64** | **78** | **78.5** | **88** |

**Modular V3 (88) beats Modular V2 (78.5) clearly** — decisively on worker scale,
floor-band proportion, density and first impression, which were the exact
reasons V2 was rejected (too narrow, floors too tall, workers too large,
dollhouse feel). It also beats the master (78, wrong floor count) and Procedural
V3 (64). Honest note: V2 is marginally warmer; the warm grade closes most of
that gap, and V3 wins everywhere that matters.

## 10. Final URL for review

- **`http://localhost:3000/bright-office`** (Modular V3 is default) · `/companies/1`
- Lab (V1/V2/V3 toggle + sliders): `http://localhost:3000/visual-lab/modular-tower`

## 11. Build result

- `tsc --noEmit` pass · `next lint` pass (pre-existing warnings only) ·
  `next build` pass.
- Route diagnosis **0 console errors / 0 failed requests** on
  `/bright-office`, `/bright-office?tower=modular`, `/visual-lab/modular-tower`,
  `/companies/1?tower=modular`.

## 12. Did V3 become default?

**Yes.** `MOD_VER = "-v3"` in `BrightCompanyOffice.tsx`. V2 (`"-v2"`) and V1
(`""`) remain selectable on disk; the lab exposes v1/v2/v3 buttons and `?ver=`.
All tower fallback modes (`?tower=procedural-v3|procedural-v2|legacy-shell|
master|master-4floor`) are preserved.

## Remaining limitations

- Each module is still generated as a ~1.5:1 room (the API's landscape size),
  so the wide-band look is achieved by the shallow-band guide + composition
  crop rather than a native 5:1 asset; the reference's single-image 3-D massing
  is still marginally ahead on pure "one solid object" feel.
- Two floors trend cool (game, engineering) despite the warm grade; `pm-v3` has
  a small "Roadmap" label. Optional 1–2 calls could rebalance these if desired
  (budget: 6/16 used).
- Roof and B1 are still v1 art (acceptable; can be tuned later).

## Non-actions (as instructed)

No full-tower generation · no procedural-tower work · roof/B1 not regenerated ·
left/right/bottom panels, CRUD, AI untouched · previous modes preserved · V1/V2
modules archived on disk · not deployed.
