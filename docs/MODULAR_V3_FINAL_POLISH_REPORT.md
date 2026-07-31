# Modular V3 — Final Polish Report

**Date:** 2026-07-15
**Scope:** deterministic polish of the Modular V3 center tower + 2 authorised
warm-revision image calls (game, engineering). No architecture change, no full
tower, no procedural work, no panel/CRUD/AI changes.
**Deployment:** BLOCKED.

---

## Final status

> **MODULAR V3 FINAL POLISH: PASSED**
> **CENTER TOWER: READY FOR USER APPROVAL**
> **DEPLOYMENT: BLOCKED**

The polished tower clearly beats Modular V3 before polish (score **77 vs 63.5**,
below) and is kept as the default.

## 1. Roof — final values

`roofH 9 → 7` (−22%), `roofFocal 0.6 → 0.58`, `topPad 0.5 → 0.6`. The rooftop
garden now caps the building instead of dominating it; Floor 6 (Growth) reads as
a full floor.

## 2. Floor pitch / overlap / seam — final values

`pitch 12.6 → 13.2` (floors read as full rooms, not crushed), `overlap 3.8 →
4.6` (floors connect), seam lines thinned `0.5% → 0.34%` and re-tinted warm
brown (`rgba(30,22,10,…)`); structural frame `slab #2A2E3A → #3A3324`,
`edge #20242F → #241E12` (warm brown instead of cold charcoal). Less
card-stack, more single-building.

## 3. B1 — final values

`b1H 11 → 9` (−18%), `b1Focal 0.44 → 0.46`, new render-only `b1Filter =
brightness(1.2) saturate(1.06) sepia(0.08)`. B1 now reads as a lit server base
attached to Floor 1, no longer a heavy black banner.

## 4. Right shaft — final values

Lighter glass tint (base alpha ~0.42–0.58 vs old 0.62–0.86), two vertical
mullions (33% / 66%), a bright highlight strip, floor-aligned segment lines with
a soft glass sheen, and the shaft aligned roof→B1. Reads as glass/elevator
without overpowering the rooms.

## 5. Labels — final values

Floor tabs moved to `left 0.9%` and vertically centred on each band
(`modularFloorTop(i) + 3.9%`, was `+1.4%`); B1 tab `+2%`; selected glow softened
to a warm `0 0 8px rgba(255,236,180,.55)` (was a stronger white glow). Labels now
attach to their floors and read as tower UI, not pasted chips.

## 6. Color-grade decision

Two levers: (a) the 2 warm image revisions on the coolest floors, and (b) a
render-only floor grade. After the warm modules landed, the global grade was
dialled **down** (over-warming risk) to
`saturate(1.08) brightness(1.08) contrast(1.0) sepia(0.08)`. The tower now reads
as one warm reference-family world without washing out detail.

## 7. Optional image calls used

**2 / 2 (the maximum allowed).** Targets and stated failures:
- **Game Studio** — *too cool / too dark* (blue cave). Regenerated warm: honey
  wood, warm walls, warm lamps; game screens still glow, room is warm.
- **Engineering** — *too cool / too dark* (dark blue/black). Regenerated warm:
  honey wood, warm lamps, warm walls; code monitors still glow green, room is
  warm.
Both kept the wide-band + tiny-worker composition. The previous cool versions
are archived as `*-v3-cool-backup.webp`. Growth / Quality / Art / Product were
**not** touched; roof / B1 were **not** regenerated (deterministic fixes worked).

## 8. Before / after screenshots

`outputs/reference-diff/modular-v3-final-polish/`
- `01-before-polish.png` · `02-roof-test` · `03-overlap-test` · `04-b1-test` ·
  `05-shaft-test` · `06-label-test` · `07-color-grade-test`
- `08-final-tower.png` · `09-reference-vs-final.png` · `10-overlay-50.png` ·
  `11-full-page-final.png` · `best-v3-final.png`
- `comparison-grid.png` — Reference · Procedural V3 · Modular V2 · V3 before
  polish · V3 final polish
- `_warm_compare.png` — cool vs warm game/engineering modules

## 9. Final visual score

| # | Category | V3 before polish | **V3 final polish** |
|---|---|:---:|:---:|
| 1 | Roof similarity | 6.5 | **8.5** |
| 2 | Floor readability | 7.5 | **8.5** |
| 3 | Floor connection / one-building | 7 | **8** |
| 4 | B1 integration | 7 | **8.5** |
| 5 | Shaft quality | 6.5 | **8** |
| 6 | Label placement | 6.5 | **8.5** |
| 7 | Color warmth | 6 | **9** |
| 8 | First impression | 7.5 | **8.5** |
| 9 | Production usability | 9 | **9.5** |
| | **Total (/90)** | **63.5** | **77** |

Final polish improves every category — biggest gains in **color warmth**
(warm game/engineering), **labels**, **roof**, and **B1**. Kept as default.

## 10. Ready for user approval?

**Yes.** The center tower is now the closest the modular system has come to the
approved reference: six warm dense floors + roof + B1, tiny workers, wide bands,
compact mass, unified glass shaft, attached labels. Remaining honest gap: the
reference's single-image 3-D exterior massing is still marginally ahead of a
stacked-band composition; this is the ceiling of the modular approach and does
not affect correctness or function.

## 11. Build result

- `tsc --noEmit` pass · `next lint` pass (pre-existing warnings only) ·
  `next build` pass.
- Route diagnosis **0 console errors / 0 failed requests** on `/bright-office`,
  `/bright-office?tower=modular`, `/visual-lab/modular-tower`,
  `/companies/1?tower=modular`.

## Default & fallbacks

`MOD_VER = "-v3"` (default). Warm game/eng are the live `-v3` files; cool
versions archived. V2/V1 modules remain on disk; lab v1/v2/v3 toggle intact; all
`?tower=` fallback modes preserved. Nothing deployed.
