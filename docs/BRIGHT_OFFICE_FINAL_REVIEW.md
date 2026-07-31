# Bright Office — Final Review (Modular Tower default)

**Date:** 2026-07-15
**Scope:** final reference alignment; Modular Tower promoted to the default tower.
**Deployment:** **BLOCKED** until explicit user approval.

---

## Final status

> **MODULAR TOWER: DEFAULT**
> **SIX-FLOOR TOWER: CORRECT**
> **REFERENCE SIMILARITY: BEST PRACTICAL RESULT**
> **BRIGHT OFFICE: READY FOR USER FINAL REVIEW**
> **DEPLOYMENT: BLOCKED UNTIL USER APPROVAL**

## 1. Final tower mode

`BrightCompanyOffice` now defaults to `towerMode = "modular"`. This applies to
both `/bright-office` and `/companies/[id]` (the production route renders
`BrightCompanyOffice`). No image generation was done in this phase — only
deterministic composition tuning + one robustness fix.

## 2. Why modular was selected

- **Correct six-floor count** — the hard requirement. The modular tower is
  composed from six *separate* single-floor modules + roof + B1, so it always
  shows exactly six floors. The 4-floor master cannot (its baked art has four),
  which makes it structurally unusable for six departments.
- **Beats Procedural V3 decisively** — far richer, warmer, on-style rooms with
  real worker density vs V3's flat washed-out strips.
- **Robust for every company** — real departments with custom types (e.g.
  "Lobby / Support", "Data/Research") get a deterministic furnished module
  instead of a bare placeholder; vacant floors show a clear "add department"
  tile; empty companies render a valid empty building; >6 departments use the
  ▲/▼ floor-window navigation. No broken images anywhere.
- **Fully interactive** — floor select drives the right panels, B1 → /vps,
  company switching, direct route load, refresh, and all fallback modes work.

## 3. Composition / alignment values (`MODULAR_DEFAULT`)

`apps/web/components/bright/ModularReferenceTower.tsx`

| key | value | key | value |
|---|---|---|---|
| aspect | 0.60 | b1H | 12.8 |
| topPad | 0.5 | wallInset | 3 |
| roofH | 11 | shaftRight | 96.5 |
| pitch | 12.3 | shaftW | 6 |
| overlap | 2.8 | floorFocal | 0.48 |
| tileScale | 1.04 | roofFocal | 0.62 |
| slab | #2A2E3A | b1Focal | 0.42 |

Container: `height: 99%`, centered `translate(-50%, -50%)`; the tower fills the
center panel top-to-bottom with minimal empty blue. Floor tabs and the B1 hotspot
are positioned from the shared helpers (`modularFloorTop`, `modularB1Top`) so
labels stay locked to each floor opening. Unification: continuous side edges,
thin inter-floor seam lines, procedural glass shaft roof→B1, continuous side
shadow, outer drop-shadow + ground shadow.

## 4. Fallback modes (all preserved, none deleted)

| Query | Mode |
|---|---|
| *(default)* / `?tower=modular` | **Modular tower** |
| `?tower=procedural-v3` | Procedural V3 (two-plane) |
| `?tower=procedural-v2` | Procedural V2 (isometric chevron) |
| `?tower=procedural-v1` / `?tower=procedural` | Procedural V1 (DOM) |
| `?tower=legacy-shell` / `?tower=legacy` | Legacy image shell |
| `?tower=master` / `?tower=master-4floor` | 4-floor master (art reference only) |

## 5. Function test result

Playwright, **14/14 passed**:
default renders modular · floor click selects department (right panel updates to
floor 6) · no console errors on select · B1 click → `/vps` · company switch
changes selected company · `/companies/1` (8 module imgs) · `/companies/2`
(5 imgs — 3 custom depts furnished) · `/companies/3` (empty building, roof+B1) ·
`/companies/999999` safe not-found · all five fallback modes load with no crash /
no new console errors.

## 6. Route test result

`diagnose_page` (Playwright) — **0 console errors / 0 failed requests** on:
`/bright-office`, `/companies/1`, `/companies/2`, `/companies/3`,
`/bright-office?tower=procedural-v3`, `/bright-office?tower=master-4floor`.
`/companies/999999` renders the safe "ไม่พบบริษัท" screen (no crash, no bad fetch).

## 7. Build result

- `next lint` — pass (pre-existing `<img>`/exhaustive-deps warnings only)
- `tsc --noEmit` — pass
- `next build` — pass (18 routes)
- 0 console / 0 failed-request / 0 hydration errors across the production routes.

## 8. Final visual score (full page)

| # | Category | Procedural V3 | 4-floor Master | **Modular Final** |
|---|---|:---:|:---:|:---:|
| 1 | Tower similarity | 5 | 8.5 | **8** |
| 2 | Six-floor correctness | 10 | 4 | **10** |
| 3 | Room density | 7 | 8.5 | **9** |
| 4 | Worker density | 6 | 8 | **9** |
| 5 | Unified building feeling | 6.5 | 9.5 | **8** |
| 6 | Company card quality | 8.5 | 8.5 | **8.5** |
| 7 | Right panel quality | 9 | 9 | **9** |
| 8 | Bottom storyboard quality | 9 | 9 | **9** |
| 9 | First-impression similarity | 5.5 | 8.5 | **8.5** |
| 10 | Production usability | 7.5 | 6 | **9.5** |
| | **Total** | **74.0** | **79.5** | **88.5** |

Modular is the only option that is both correct (six floors) and clearly the
best-looking usable tower.

## 9. Remaining limitations

- **3-D massing** — modular reads slightly flatter than the reference / 4-floor
  master (full-width room bands vs a single-image isometric exterior). The
  procedural frame + shadows narrow the gap; this is the one axis the master
  still wins, and it does not affect correctness or function.
- **Baked workers are static** — worker sprites are painted into the floor
  modules (illustrative). Live agent state is surfaced in the bottom storyboard,
  the selected-floor highlight, and the right panels rather than by animating
  tower sprites (a deliberate V1 choice to keep the tower clean).
- **Vacant floors** show a neutral placeholder (correct "add department" cue).
- **Optional polish** (no image calls): angled exterior side-wall panels on the
  procedural frame would add the last bit of 3-D massing.

## 10. Exact URL for final review

- **`http://localhost:3000/bright-office`** (modular is now default)
- Per company: `http://localhost:3000/companies/1`
- Lab / comparison: `http://localhost:3000/visual-lab/modular-tower`

## Deployment checklist (DO NOT DEPLOY without approval)

- [x] Modular tower is the default tower mode
- [x] Six-floor count correct; robust for custom/empty/over-6 departments
- [x] All fallback modes preserved (`?tower=…`)
- [x] Function test 14/14; route diagnosis 0/0
- [x] lint / typecheck / build pass
- [x] CRUD, AI integration, left/right/bottom panels untouched
- [ ] **User final approval** ← required
- [ ] Deploy / tag release ← only on explicit "deploy"
