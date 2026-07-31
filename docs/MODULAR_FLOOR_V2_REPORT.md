# Modular Floor Modules V2 — reference-correct rebuild

**Date:** 2026-07-15
**Scope:** regenerate ONLY the six department floor modules with a wide / low /
dense / small-worker spec. Composition system, roof, B1, shaft, hotspots,
panels, CRUD/AI untouched.
**Deployment:** BLOCKED — user approval required.

---

## Final status

> **MODULAR FLOOR MODULES V2: READY FOR USER REVIEW**
> **DEPLOYMENT: BLOCKED**
> **USER APPROVAL REQUIRED**

V2 is set as the active floor art (`MOD_VER = "-v2"` in
`BrightCompanyOffice.tsx` and the lab). The v1 modules are kept on disk and can
be restored by setting `MOD_VER = ""`.

## 1. Modules regenerated (6)

`apps/web/public/assets/themes/reference-bright/tower-master/modules/`
- `growth-floor-module-v2.webp`
- `quality-floor-module-v2.webp`
- `game-studio-floor-module-v2.webp`
- `art-design-floor-module-v2.webp`
- `engineering-floor-module-v2.webp`
- `product-management-floor-module-v2.webp`

Roof and B1 modules were **kept** (acceptable for now, as allowed).

New spec (prompts in `docs/REFERENCE_BRIGHT_PROMPTS.md` → `## Modular tower v2 — *`):
wide shallow one-floor cutaway, camera pulled back, **workers TINY (~¼ room
height), 2–4 only, must not dominate**, HIGH furniture density, tall rear wall of
boards/monitors, warm light. **Primary reference = a WIDE single-floor crop of the
approved reference tower** (`references/style-lock/modules-v2/ref-floor-*.png`) —
the 4-floor master (which caused oversized workers) is no longer used.

## 2. API calls used

- **6 initial calls** (one per floor). **0 revisions.**
- **Total 6 / 10** — under the hard cap. No module failed the gate.

## 3. Rejected modules

None. All six passed on the first generation.

Minor caveat (not a rejection): `quality-v2` shows a short legible "BUG" board
label and `product-management-v2` a "ROADMAP" board label. These are **short,
correctly-spelled** signage (not broken/garbled text) and render tiny in the
composed tower. Flagged for your call — a 1-call revision each could remove them
if you prefer zero text (budget allows: 6/10 used).

## 4. Old vs V2 visual comparison

`outputs/reference-diff/modular-floor-v2/10-comparison-old-vs-v2.png` (V1 left,
V2 right, per department). In every case V2 has **smaller workers** and a
**denser, more detailed room** (packed chart/screen/board walls, more desks and
props). See also `01-current-modular.png` (V1 tower) vs `08-modular-v2-full.png`
(V2 tower) and `09-reference-vs-modular-v2.png` (reference vs V2 page).

## 5. Are workers smaller?

**Yes — clearly.** V1 workers were roughly half the room height and dominated the
scene; V2 workers are roughly a quarter of the room height, close to the approved
reference. Measured against a reference floor crop at equal width, V2 worker
scale ≈ reference (`_worker_scale_cmp.png`).

## 6. Did room density improve?

**Yes.** V2 rooms fill the rear walls with dashboards, charts, checklists, code,
roadmaps, mood boards and framed art, plus more desks, monitors and plants — a
much higher, more reference-like furniture/detail density than V1.

## 7. Final Modular V2 score

| # | Category | Proc V3 | 4-floor Master | Modular V1 | **Modular V2** |
|---|---|:---:|:---:|:---:|:---:|
| 1 | Reference similarity | 5 | 8.5 | 7.5 | **8.5** |
| 2 | Correct floor count | 10 | 4 | 10 | **10** |
| 3 | Worker scale | 7 | 7 | 5 | **8.5** |
| 4 | Room density | 6 | 8 | 7.5 | **9** |
| 5 | Tower proportion | 6.5 | 9 | 7 | **8** |
| 6 | First impression | 5.5 | 8.5 | 8 | **8.5** |
| 7 | Production usability | 7.5 | 6 | 9 | **9.5** |
| | **Total (/70)** | **47.5** | **51.0** | **54.0** | **62.0** |

Modular V2 is the clear best: correct six-floor count **and** the closest to the
reference on worker scale, density, and first impression. It beats the previous
Modular V1 chiefly on worker scale and density — the exact defects raised.

## 8. Composition retune (for V2 art)

`MODULAR_DEFAULT`: aspect **0.63** (wider), pitch 12.4, overlap 3.0, roofH 10.5,
b1H 12.2, floorFocal **0.52** (centres charts + workers), tileScale **1.0** (no
zoom → smaller workers), and a **strengthened continuous glass shaft**
(shaftW 9) that unifies the varied per-floor right walls into one clean building
edge. Result: wider, denser, less "vertical dollhouse".

## 9. Screenshot paths — `outputs/reference-diff/modular-floor-v2/`

`01-current-modular` · `02-growth-v2` · `03-quality-v2` · `04-game-studio-v2` ·
`05-art-design-v2` · `06-engineering-v2` · `07-product-v2` · `08-modular-v2-full` ·
`09-reference-vs-modular-v2` · `10-comparison-old-vs-v2`.

## 10. Route for review & build result

- **`/bright-office`** (modular V2 is default) · `/companies/1` · lab `/visual-lab/modular-tower`.
- `tsc --noEmit` pass · `next lint` pass (pre-existing warnings only) ·
  `next build` pass · route diagnosis **0 console errors / 0 failed assets** on
  `/bright-office?tower=modular`, `/visual-lab/modular-tower`, `/companies/1?tower=modular`.

## Remaining limitations

- Because each generated module is a ~1.5:1 room (not a native ~5:1 band), the
  six-floor stack still shows each floor as a fairly tall slice; density and
  small workers close most of the gap, but the reference's single-image 3-D
  massing is still marginally ahead on pure "one solid object" feel.
- Two modules carry short legible board labels (BUG / ROADMAP) — see §3.
- Roof and B1 are unchanged v1 art (acceptable now; can be tuned later).

## Non-actions (as instructed)

No full-tower generation · roof/B1 not regenerated · left/right/bottom panels,
CRUD, AI logic untouched · no procedural-tower work · old modules archived on
disk · not deployed.
