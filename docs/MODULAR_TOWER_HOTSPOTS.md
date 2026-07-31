# Modular Reference Tower — hotspots & composition

**Route:** `/visual-lab/modular-tower` (lab) · `/bright-office?tower=modular` (in context)
**Component:** `apps/web/components/bright/ModularReferenceTower.tsx`
**Wired in:** `apps/web/components/bright/BrightCompanyOffice.tsx` (`towerMode === "modular"` branch)

## Model: static baked art + dynamic overlay

Like the `master` mode, the modular tower is **static illustrated art** — the
rooms and chibi workers are baked into the module images (they are illustrative,
not live sprites). Interaction is a **dynamic overlay** owned by the parent:

- **Floor tabs** (left edge) — one per department slot, positioned with
  `modularFloorTop(MODULAR_DEFAULT, i)`. Click selects the department
  (`setSelectedDeptId`) which drives the right-hand management panels.
- **B1 tab + B1 tile** — both call `router.push("/vps")`.
- **▲/▼ floor navigation** — appears when a company has >6 departments
  (`canNav`); shifts the six-floor window via `floorOffset`.
- **Selected highlight** — the selected floor tile gets an inset ring in the
  department accent color.

Unlike `master` (whose baked art shows only 4 floors), the modular tower is
composed from **six separate single-floor modules**, so the visible floor count
is **always exactly six** and each floor's art matches its department type.

## Modules (one image = one floor / one part)

`apps/web/public/assets/themes/reference-bright/tower-master/modules/`

| Module file | Represents | Notes |
|---|---|---|
| `tower-roof-module.webp` | Rooftop garden | transparent bg |
| `growth-floor-module.webp` | Floor 6 · Growth | orange · analytics dashboards |
| `quality-floor-module.webp` | Floor 5 · Quality | teal · QA checklists |
| `game-studio-floor-module.webp` | Floor 4 · Game Studio | yellow/blue · game screens |
| `art-design-floor-module.webp` | Floor 3 · Art & Design | pink · mood boards |
| `engineering-floor-module.webp` | Floor 2 · Engineering | blue/teal · code + server |
| `product-management-floor-module.webp` | Floor 1 · Product Mgmt | blue/lavender · roadmap/kanban |
| `b1-vps-module.webp` | B1 · VPS/Server vault | opaque (v2) · racks + cloud |

Floor modules are mapped to real department slots by `cfg.key`
(`modFloorSrc(cfg.key)` in BrightCompanyOffice). A department type with no Bright
config renders the neutral placeholder tile.

## Composition geometry (percent of the tower box)

`ModularReferenceTower` stacks the modules deterministically using
`MODULAR_DEFAULT`. Helper functions expose the band tops so tabs align exactly:

- `modularRoofTop(p)` = `topPad`
- `modularFloorTop(p, i)` = `topPad + roofH + i * pitch`  (i = 0…5, top→bottom = floor 6…1)
- `modularB1Top(p)` = `topPad + roofH + 6 * pitch`
- `modularTotalH(p)` = `modularB1Top(p) + b1H`

Each module is a ~1.5:1 room shown as a short horizontal band via `object-cover`
+ a per-part vertical focal (`floorFocal` / `roofFocal` / `b1Focal`), so the
rear-wall department signage stays visible while the tower stays building-proportioned.

### Procedural frame (CSS/SVG — no image generation)

To read as ONE building rather than stacked cards:

- **Left/right structural edges** span roof→B1 (`wallInset`).
- **Thin inter-floor seam lines** at each `modularFloorTop` merge the modules'
  own dark beams into continuous slabs (kept deliberately thin).
- **Procedural glass shaft** (`shaftRight`, `shaftW`) overlays the right side.
- **Continuous side shadow** unifies the two wall planes into one volume.
- **Outer drop-shadow + ground shadow** lift the building off the sky.

## Fallback

`?tower=modular` is opt-in. The **default remains `procedural-v2`**; V3 and the
4-floor master remain available (`?tower=procedural-v3`, `?tower=master`). If any
module asset is missing, that floor renders the neutral placeholder tile rather
than a broken image — the page never crashes.
