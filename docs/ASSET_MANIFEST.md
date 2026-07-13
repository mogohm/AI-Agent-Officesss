# ASSET_MANIFEST.md
Complete list of every generated file, its exact path and asset group. Sizes,
transparency, camera, and palette are governed by `ASSET_DIMENSIONS.md`.
Prompts are in `IMAGE_GENERATION_PROMPTS.md`. Nothing here is a placeholder —
these are the real deliverables. Files live under `apps/web/public/assets/…`.

## Folder tree (authoritative)
```
apps/web/public/assets/
  office/
    exterior/        # group 1 — building exteriors (company cards)
    floors/          # group 2 — department room modules + rooftop + b1
    furniture/       # group 3 — shared loose furniture
    equipment/       # group 4 — department-specific equipment/props
    lighting/        # group 10 — lighting overlays
    fx/              # group 10 — effect sprites (steam, zzz, glow…)
  characters/
    base/            # group 5 — base bodies (skin tones)
    hair/            # group 6 — hairstyles
    clothing/        # group 7 — outfits
    accessories/     # group 7b — glasses/headset/props
    animations/
      working/       # group 8 — working animation sheets (per layer/state)
      idle/          # group 9 — idle animation sheets (per layer/state)
```

---

## GROUP 1 — Building exteriors  `office/exterior/`  (480×560)
One per accent color; company picks by theme/id.
`building-blue.webp`, `building-purple.webp`, `building-teal.webp`,
`building-green.webp`, `building-orange.webp`, `building-pink.webp`  → **6 files**

## GROUP 2 — Department floor rooms  `office/floors/`  (1200×240, cutaway, EMPTY seats)
One module per department type + framing pieces. Furniture/equipment are **baked
into the room** (MVP) — the engine composites only characters + FX on top.
| File | Department |
|---|---|
| `lobby-room.webp` | Lobby / Support |
| `marketing-room.webp` | Marketing |
| `sales-room.webp` | Sales |
| `hr-room.webp` | HR |
| `dev-room.webp` | IT / Development |
| `design-room.webp` | Design |
| `game-room.webp` | Game Studio |
| `qa-room.webp` | QA / Testing |
| `data-room.webp` | Data / Research |
| `finance-room.webp` | Finance |
| `legal-room.webp` | Legal |
| `content-room.webp` | Content |
| `devops-room.webp` | DevOps |
| `product-room.webp` | Product Management |
| `service-room.webp` | Customer Service |
| `generic-room.webp` | fallback |
| `rooftop.webp` (1200×160) | building roof |
| `b1-server-room.webp` (1200×260) | VPS / server basement |
→ **18 files**

> Alternate "loose furniture" mode (post-MVP): rooms shipped as empty shells
> (`*-shell.webp`) + individual furniture/equipment placed by the engine using
> `DEPARTMENT_VISUAL_SPEC.md` coordinates. Groups 3 & 4 below support this mode.

## GROUP 3 — Shared furniture  `office/furniture/`  (≤256×256, loose, anchored bottom-center)
`desk.webp`, `desk-corner.webp`, `standing-desk.webp`, `office-chair.webp`,
`chair-lounge.webp`, `sofa.webp`, `coffee-table.webp`, `bookshelf.webp`,
`filing-cabinet.webp`, `reception-desk.webp`, `meeting-table.webp`,
`whiteboard.webp`, `monitor-single.webp`, `monitor-dual.webp`, `laptop.webp`,
`printer.webp`, `water-cooler.webp`, `coffee-machine.webp`, `plant-small.webp`,
`plant-tall.webp`, `rug.webp`, `wall-clock.webp`, `trash-bin.webp`,
`ceiling-lamp.webp`  → **24 files**

## GROUP 4 — Department equipment  `office/equipment/`  (≤320×320, loose)
Signature props that make each department unique.
| File | Used by |
|---|---|
| `charts-board.webp`, `analytics-screen.webp`, `campaign-wall.webp` | Marketing |
| `world-map.webp`, `crm-screen.webp`, `deal-board.webp` | Sales |
| `interview-set.webp`, `resume-stack.webp`, `wellbeing-plant.webp` | HR |
| `multi-monitor.webp`, `server-tower.webp`, `code-screen.webp` | IT/Dev |
| `design-tablet.webp`, `color-boards.webp`, `ui-monitor.webp` | Design |
| `concept-wall.webp`, `game-screen.webp`, `character-board.webp` | Game Studio |
| `device-rack.webp`, `bug-dashboard.webp`, `checklist-board.webp` | QA |
| `data-dashboard.webp`, `research-books.webp`, `data-globe.webp` | Data/Research |
| `safe.webp`, `ledger-stack.webp`, `money-chart.webp` | Finance |
| `law-bookwall.webp`, `scales-justice.webp`, `document-stack.webp` | Legal |
| `camera-tripod.webp`, `mic-boom.webp`, `script-desk.webp` | Content |
| `monitoring-wall.webp`, `server-rack.webp`, `pipeline-screen.webp` | DevOps |
| `kanban-board.webp`, `roadmap-wall.webp`, `product-meeting-table.webp` | Product |
| `reception-sign.webp`, `lobby-sofa.webp`, `welcome-plant.webp` | Lobby |
| `headset-desk.webp`, `ticket-board.webp`, `queue-screen.webp` | Customer Service |
→ **~45 files** (3 per department; see `DEPARTMENT_VISUAL_SPEC.md`)

## GROUP 5 — Character base bodies  `characters/base/`  (128×192, anchor bottom-center)
Neutral standing body (no hair/clothes) per skin tone; the compositing base layer.
`body-01.webp`…`body-05.webp` (skin tones from palette)  → **5 files**
Optional builds: `body-01-tall.webp`, `body-01-petite.webp` (post-MVP).

## GROUP 6 — Hairstyles  `characters/hair/`  (128×192, aligned to base skeleton)
`hair-01`…`hair-12` (short, bob, ponytail, bun, spiky, long, curly, buzz,
undercut, twin-tail, afro, bald-cap). Color is baked per file; provide the 12
shapes in 2–3 palette colors as needed → base set **12 files** (expand by color as desired).

## GROUP 7 — Clothing  `characters/clothing/`  (128×192, aligned)
Dept-coded outfits + neutrals:
`dev-hoodie`, `dev-tee`, `designer-outfit`, `marketer-outfit`, `sales-suit`,
`hr-cardigan`, `pm-blazer`, `qa-casual`, `exec-suit`, `intern-tee`,
`shirt-blue`, `shirt-green`, `shirt-purple`, `shirt-orange`, `shirt-pink`
→ **15 files**

### GROUP 7b — Accessories  `characters/accessories/`  (128×192, aligned)
`glasses`, `headset`, `coffee-mug`, `tablet`, `clipboard`, `lanyard`, `cap`,
`headphones`  → **8 files**

## GROUP 8 — Working animation sheets  `characters/animations/working/`
Sprite sheets, frames left→right, 8fps (see `CHARACTER_SPRITE_SPEC.md`).
States (one sheet each, per layer that moves): `coding`, `designing`,
`analysing`, `testing`, `writing`, `meeting`, `presenting`, `calling`.
- Base layer: `working/base/<state>.webp`
- Clothing layer: `working/clothing/<outfit>-<state>.webp` (only outfits that move)
- Hair layer: `working/hair/<hair>-<state>.webp` (if hair sways)
→ MVP target: **8 base sheets** (hair/clothing reuse idle frames when static).

## GROUP 9 — Idle animation sheets  `characters/animations/idle/`
States: `breathe`, `coffee`, `read`, `chat`, `walk`, `stretch`, `phone`, `relax`.
- Base layer: `idle/base/<state>.webp`  → **8 base sheets**
- Optional matching hair/clothing sheets as in Group 8.

> **PRODUCTION NOTE (read `CHARACTER_SPRITE_SPEC.md`).** Fully layered animation
> (base+hair+clothing aligned per frame) is the *target*. For AI-generated art the
> **recommended MVP** is *composited per-look sheets*: generate 8 finished
> "looks" (pm, dev-a, dev-b, designer, qa, marketer, sales, hr), each as one
> sprite sheet per state — no runtime layering, guaranteed alignment. Both are
> specified; pick per your generation workflow. The engine supports either via
> the manifest resolver.

## GROUP 10 — Lighting & effects
`office/lighting/` (1200×240 unless noted):
`warm-glow.webp`, `window-rays.webp`, `floor-shadow.webp` (strip),
`ambient-dust.webp`  → **4 files**
`office/fx/` (≤128×128, some animated sheets):
`monitor-glow.webp`, `coffee-steam.webp`(anim), `zzz.webp`(anim),
`sparkle.webp`(anim), `thought-bubble.webp`, `typing-dots.webp`(anim),
`exclaim.webp`, `heart.webp`  → **8 files**

---

## Totals (MVP composited route)
| Group | Files |
|---|---|
| 1 Building exteriors | 6 |
| 2 Floor rooms (+roof/B1) | 18 |
| 3 Furniture | 24 |
| 4 Equipment | ~45 |
| 5–7b Character parts | 40 |
| 8–9 Animation sheets (base) | 16 |
| 10 Lighting + FX | 12 |
| **Total** | **~161** |

**Minimum to light up one real floor** (dev): `floors/dev-room.webp`,
one composited look sheet `animations/idle/dev-a-breathe.webp` +
`animations/working/dev-a-coding.webp`, `exterior/building-blue.webp`.
