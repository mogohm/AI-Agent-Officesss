# SCENE_LAYER_ARCHITECTURE.md
How generated assets compose into the live scene. The layout code is fixed;
dropping assets in never requires changing it. Governed by `ASSET_DIMENSIONS.md`.

## 1. Scene hierarchy
```
CompanyBuildingPage (24% / 38% / 38% grid + bottom strip)
└─ BuildingScene            (center; adaptive; owns the agent behavior clock)
   ├─ RooftopLayer          (rooftop.webp)
   ├─ FloorStack            (top floor → bottom floor)
   │   └─ DepartmentFloorScene  ×N   (one per department)
   └─ B1ServerRoom          (b1-server-room.webp)
└─ WorkerActivityStrip      (bottom; mini scenes reuse the same layers)
```

## 2. Per-floor layer order (back → front, z ascending)
A `DepartmentFloorScene` stacks these z-layers inside one 5:1 slot:

| z | Layer | Asset(s) | Notes |
|---|---|---|---|
| 0 | Room background | `floors/<dept>-room.webp` | walls, windows, floor, **baked furniture** (MVP) |
| 1 | Loose furniture* | `furniture/*` | only in "loose" mode; skipped in MVP |
| 2 | Dept equipment* | `equipment/*` | only in "loose" mode; skipped in MVP |
| 3 | Back decorations | plants/wall art (baked or loose) | |
| 4 | Character shadows | `lighting/floor-shadow` per seat | soft contact ellipse |
| 5 | **Characters** | composited sprite / part layers | placed at seat coords |
| 6 | Foreground props | front desk edge / plant (optional) | occludes lower body for depth |
| 7 | Lighting overlay | `lighting/warm-glow` (screen blend) | warm pools of light |
| 8 | FX | `fx/*` (typing dots, coffee steam…) | tied to animation state |
| 9 | Floor tab (DOM) | — | number + dept name, app-drawn, not an asset |

`*` MVP bakes furniture/equipment into the room image, so layers 1–2 are inert
until you switch `SCENE_MODE = "loose"`.

## 3. Character composite order (within z=5)
When using layered characters (advanced mode), stack per character:
`base → clothing → hair → accessory → (held prop)` — all 128×192, same
bottom-center anchor, so they register pixel-perfect. Composited-look mode ships
a single finished sheet and skips this stack.

## 4. Sizing contract (no distortion)
- Room modules are **5:1**. Each floor renders at **container width `W`**, height
  `H = W / 5`. Building height = `Σ floors + rooftop + B1`.
- Character display height = `round(H × 0.66)`; width follows the 2:3 sheet ratio.
  Characters therefore scale with floor height automatically.
- **Adaptive height** (from `REFERENCE_LAYOUT_SPEC.md` §7):
  - 1–6 depts → full `H`, no scroll.
  - 7–10 → `H` reduced ~20% (still ≥ readable), no scroll.
  - 11–15 → fixed `H`, FloorStack becomes a **vertical scroll/pan** viewport
    (`max-height: 56vh`). Never shrink `H` below where a worker sprite < 28px.

## 5. Seat / position resolution
- `DEPARTMENT_VISUAL_SPEC.md` defines, per department, an array of
  `{ x%, y%, scale, z, facing, kind: "work"|"idle" }` positions relative to the
  1200×240 room box.
- The engine maps `left:x% top:y%`, `transform: translate(-50%,-100%) scale(s)`,
  `zIndex:z`. Assign agents to `work` seats first, extra agents to `idle` spots.
- `y%` sits characters on the room's floor line (§8 of ASSET_DIMENSIONS), so all
  rooms share worker footing.

## 6. Animation binding
- `useAgentBehavior` outputs a `state` per agent (working set vs idle rotation).
- `AgentSprite` selects the matching **animation sheet** and plays it via CSS
  `steps()` / a frame index (8fps). Frame count comes from the sheet metadata in
  `CHARACTER_SPRITE_SPEC.md`.
- Idle behaviors rotate every 20–60s, **staggered** so no two adjacent workers
  share a phase. Working agents show their department's working action.
- FX layer (z=8) turns on per state: `coding→typing-dots`, `coffee→coffee-steam`,
  `relax→zzz`, `thinking→thought-bubble`.

## 7. Asset resolution & fallback (engine contract — already built)
- `lib/assets/manifest.ts` resolves logical keys → file paths.
- `AssetImg` renders the file; on 404 it shows a **clearly-labeled dev
  placeholder** (NOT shipped as final art). When the real file exists, it renders
  with zero code change. This satisfies "drop-in assets."
- `SCENE_MODE` flag (`"baked" | "loose"`) selects between Group-2 baked rooms and
  Groups 3–4 loose composition, without touching page/layout code.

## 8. Performance budget
- Target ≤ ~180 DOM/img nodes for a 6-floor building (rooms + ~24 workers + FX).
- Prefer sprite-sheet CSS animation over many `<img>` swaps.
- If a 15-floor building + FX exceeds budget, `BuildingScene` can swap its
  renderer to a single `<canvas>`/PixiJS stage behind the same props — page code
  unaffected. (Not needed for MVP.)

## 9. Responsive
- ≥1280px: 3 columns + bottom strip as specified.
- <1280px: single column (company cards → building → panels → strip); building
  keeps full width and its adaptive height; FloorStack scrolls if tall.
