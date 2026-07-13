# VERTICAL_SLICE_IT_DEV.md
Phase 1 — one complete department floor (IT / Development), three composited
agents, working + idle states, rendered in an isolated **/visual-lab** route.
Governed by `ASSET_DIMENSIONS.md` except where this file overrides for showcase
quality (noted in §2). **No other departments, no full 161-asset set, no changes
to the Company Building page.**

## 1. Goal & scope
Prove ONE floor visually and technically before scaling out:
- 1 detailed IT/Dev room background (pixel art, baked furniture + lighting)
- 3 finished **composited** character looks (complete appearance per file)
- working + idle states per agent
- layered scene rendering (room → shadows → characters → FX → lighting)
- responsive scaling + debug controls in a test-only page.

Character mode = **Composited Looks** (no runtime body/hair/clothing layers). The
engine keeps a `mode` seam for future layered characters but does not implement it.

## 2. Reduced asset list (13 files — the ONLY assets for Phase 1)
Format: WebP, RGBA transparent, sRGB, q≥90, pixel edges crisp. Camera/palette/
lighting per `ASSET_DIMENSIONS.md §1–4` (2:1 iso, top-left warm light).

**Override for the slice (showcase quality):** the room is authored at **8:3**
(taller than the 5:1 building band) and characters at **4×** so detail reads at
large size. Building-band reconciliation (crop/re-export to 5:1) is a later step,
out of scope now.

### Room (1 file)  — `public/assets/office/floors/it-dev/`
| File | Size (source) | Aspect | Anchor | Contents (all baked in) |
|---|---|---|---|---|
| `it-dev-floor-base.webp` | **1600 × 600** | 8:3 | full-canvas | cutaway iso IT room: 3 desks with dual code monitors, a server rack/tower, wall shelves, cables, 2+ plants, ceiling lamps (warm pools), big night-city windows, EMPTY chairs, cyan monitor glow. Leftmost ~110px kept simple for the floor tab. Floor line at y≈62%. |

### Characters (12 files) — `public/assets/characters/composited/it-dev/`
Each **256 × 384** (4× of 64×96), feet at **bottom-center**, transparent, complete
appearance (skin+hair+outfit+props all rendered in). Same 3 people across states.

| Agent | Files |
|---|---|
| Frontend Developer | `frontend-developer-idle.webp`, `frontend-developer-coding.webp`, `frontend-developer-reviewing.webp`, `frontend-developer-coffee.webp` |
| Backend Developer | `backend-developer-idle.webp`, `backend-developer-debugging.webp`, `backend-developer-monitoring.webp`, `backend-developer-reading.webp` |
| System Analyst | `system-analyst-idle.webp`, `system-analyst-reviewing.webp`, `system-analyst-analysing.webp`, `system-analyst-relaxing.webp` |

> "chatting" is not a separate asset — it reuses two `idle` characters placed
> together (per your note).

## 3. Character look definitions (keep identical across that agent's 4 states)
- **Frontend Developer** — young, hoodie (teal/lime accent), **headphones around
  neck**, glasses, messy hair, sticker laptop energy.
- **Backend Developer** — plain tee + **lanyard**, short hair + light stubble,
  slightly more serious, terminal person.
- **System Analyst** — smart-casual buttoned shirt, tidy hair, **glasses**, holds
  a small notepad/tablet, calm senior vibe.

## 4. Exact prompts
Prepend the STYLE PREFIX from `IMAGE_GENERATION_PROMPTS.md` and apply the NEGATIVE
to every generation. Lock the room's seed/style first, then match characters to it.

### 4.1 Room
```
STYLE PREFIX + isometric cutaway software-development office floor, wide detailed
room, dark blue technical atmosphere, three desks each with dual monitors showing
glowing blue code, a tall server rack with blinking lights and a small server
tower, wall shelves with books and gadgets, cable trays, two large potted plants,
warm ceiling lamp light pools, big night-city windows, cyan monitor glow, cozy but
technical, EMPTY office chairs (no people), furniture and equipment built in,
1600x600, floor line low, far-left ~110px kept simple, transparent background
```

### 4.2 Characters (256×384, feet centered, transparent)
Common suffix for all: `..., single cute chibi office worker, front 3/4 isometric
view, feet centered at bottom, complete character, consistent proportions and
lighting, transparent background`.

Frontend Developer (hoodie, headphones, glasses, messy hair):
- `idle` → STYLE PREFIX + `a frontend developer standing relaxed, hands in hoodie pocket` + suffix
- `coding` → `...seated and typing at a keyboard, looking at a monitor, focused` + suffix
- `reviewing` → `...seated, one hand pointing at a UI on the screen, reviewing a design` + suffix
- `coffee` → `...standing holding a coffee mug, sipping, looking toward a window` + suffix

Backend Developer (tee + lanyard, short hair, stubble):
- `idle` → `a backend developer standing, arms crossed` + suffix
- `debugging` → `...seated leaning toward a terminal, hand on chin, frowning slightly at code` + suffix
- `monitoring` → `...standing watching a terminal/dashboard, one hand on hip` + suffix
- `reading` → `...sitting and reading an open technical book` + suffix

System Analyst (smart-casual shirt, glasses, notepad):
- `idle` → `a system analyst standing calmly holding a small notepad` + suffix
- `reviewing` → `...standing pointing at an architecture diagram on a board` + suffix
- `analysing` → `...seated studying a requirements document, pen in hand` + suffix
- `relaxing` → `...leaning back relaxed in an office chair` + suffix

## 5. Exact positions (percent of the 1600×600 room box; floor line ≈62%)
Schema `{x%, y%, scale, z, facing}` (engine: `left:x% top:y%`,
`translate(-50%,-100%) scale(s)`, `zIndex:z`).

| Agent | State group | x% | y% | scale | z | facing |
|---|---|---|---|---|---|---|
| Frontend Dev | work (coding/reviewing) | 25 | 66 | 1.00 | 3 | right |
| Frontend Dev | coffee | 90 | 60 | 0.92 | 5 | left (by window) |
| Frontend Dev | idle | 25 | 66 | 1.00 | 3 | right |
| Backend Dev | work (debugging/monitoring) | 50 | 70 | 1.05 | 4 | left |
| Backend Dev | reading | 62 | 66 | 0.98 | 4 | left |
| Backend Dev | idle | 50 | 70 | 1.05 | 4 | left |
| System Analyst | work (reviewing/analysing) | 76 | 63 | 0.95 | 2 | right |
| System Analyst | relaxing | 82 | 66 | 0.95 | 2 | left (chair) |
| System Analyst | idle | 76 | 63 | 0.95 | 2 | right |

"Chatting" demo: place Frontend `idle` at {30,66} and System Analyst `idle` at
{40,66} facing each other.

## 6. Exact layer order (lab scene, back→front)
| z | Layer | Source |
|---|---|---|
| 0 | Room background | `it-dev-floor-base.webp` (furniture+equipment+lighting baked) |
| 4 | Character contact shadows | CSS soft ellipse per seat (no asset) |
| 5 | Composited characters | `characters/composited/it-dev/<role>-<state>.webp` |
| 6 | Per-state micro-FX | CSS/DOM only (coffee steam, typing dots, zzz, thought) |
| 7 | Lighting overlay (toggle) | CSS: warm radial pools + cyan monitor glow, `screen` blend |
| 9 | Debug overlays (toggle) | labels, layer/asset bounds, seat markers |

No CSS **geometry** builds the room — z0 is the pixel-art image. CSS is used only
for shadows, micro-FX, lighting sheen, and debug — never to fake furniture/walls.

## 7. Exact character scale
- Character display height `Hc = floorDisplayHeight × 0.46 × seat.scale`.
- Width follows the 2:3 source ratio (`Wc = Hc × 2/3`).
- Example: lab shows the room at 1080px wide → floor height = 1080 × 600/1600 =
  405px → Frontend (scale 1.0) `Hc ≈ 186px`. Crisp because source is 256×384 and
  images use `image-rendering: pixelated`.

## 8. Animation strategy (subtle; no complex multi-frame generation)
Static composited WebP per state + engine motion. State swap changes the image;
motion is added in code:
| State | Motion (Framer/CSS) | Micro-FX |
|---|---|---|
| idle | breathe: y 0→−2→0, 3.2s ease | occasional (future) blink |
| coding | quicker micro-bob 1.0s | `typing-dots` near hands (CSS) + monitor glow pulse |
| reviewing | slow bob | monitor glow pulse |
| coffee | slight head tilt (rotate ±2°) | `coffee-steam` rising from cup (CSS) |
| debugging | micro-bob 1.1s | `typing-dots` + subtle red "!" occasionally |
| monitoring | slow bob | monitor glow pulse (cyan) |
| reading | gentle sway 2.6s | — |
| analysing | slow bob | monitor/diagram glow |
| relaxing | slow bob 3.6s | optional `zzz` (CSS) |
Lighting overlay (z7) breathes softly (opacity 0.85↔1, 4s) to feel alive.
All micro-FX are CSS/DOM elements (Tailwind keyframes already exist:
`float/bob/pulseSoft/flicker/blink/twinkle`) — **no extra asset files**.

## 9. Visual-lab implementation plan (STEP 4–7; to build AFTER you approve this doc)
**Isolated, test-only. Does not touch the Company Building page or global nav.**

New files:
- `app/visual-lab/it-dev-floor/page.tsx` — the lab page (client).
- `lib/assets/verticalSlice.ts` — IT/Dev asset paths, the 3 agents, per-state
  positions from §5, state lists from §3.
- `components/scene/CompositedAgent.tsx` — loads `composited/it-dev/<role>-<state>.webp`
  via `AssetImg`, applies §8 motion + per-state FX; silhouette fallback only while
  the file is absent (dev-time), never in the approved final.
- `components/scene/ItDevFloorScene.tsx` — composes §6 layers at large size,
  responsive (`aspect-[8/3]`, `max-width` capped, scales down on mobile).

Lab UI:
- Large scene (centered, ~min(1080px, 100%) wide, aspect 8:3).
- **Debug control panel** (STEP 6):
  - per-agent **state switch** (dropdown of that agent's 4 states + "chatting")
  - **toggle lighting** overlay (z7)
  - **toggle labels** (name/role/state above each agent)
  - **zoom** in/out slider (scale the whole scene 0.6×–1.6×, pannable)
  - **show asset bounds** (outline z0 box, each seat marker + character bbox)
  - "play idle rotation" toggle (auto-cycle idle states, staggered)
- A small note shows which asset files are missing (so you know what to drop in).

STEP 7: screenshot the lab vs the reference; iterate on positions/scale/lighting
in `verticalSlice.ts` (data only) until the acceptance criteria pass.

## 10. Acceptance criteria (from your brief)
PASS only if: room reads as detailed isometric pixel art (not CSS/slab/diagram);
characters match the room style, are immediately visible and correctly scaled;
work activities are understandable without labels; idle feels natural; overall it
feels like a management-sim, close to the reference.
FAIL if: CSS-geometry room, empty floor, icon-like/too-small characters, invisible
furniture, flat lighting, or "developer prototype" feel.

## 11. Out of scope (do NOT do in Phase 1)
Other 14 departments · full 161 assets · layered character rendering · Company
Building page changes · building-band 5:1 re-export · WorkerActivityStrip changes.
