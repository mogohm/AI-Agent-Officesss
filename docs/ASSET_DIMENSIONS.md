# ASSET_DIMENSIONS.md
Canonical technical contract for ALL generated art. Every asset in
`ASSET_MANIFEST.md` and every prompt in `IMAGE_GENERATION_PROMPTS.md` must obey
this file. If a value conflicts elsewhere, **this file wins.**

## 1. Camera & projection
- **Projection:** true **2:1 isometric (dimetric)**, tile ratio width:height = 2:1
  (≈26.57° rows). This is the "3/4 top-down isometric" look of the reference.
- **View direction:** camera looks toward the **front-bottom corner**; the two
  visible interior walls are the **back-left** and **back-right** walls (cutaway,
  front walls removed so the room interior is fully visible).
- **Consistency:** every room, furniture piece, and character MUST be drawn at the
  same isometric angle and the same world scale so they compose without clashing.
- **Vanishing:** none (orthographic isometric — no perspective foreshortening).

## 2. Art style
- **Cute detailed pixel art**, chunky-but-clean pixels, consistent pixel size
  across the whole set (do not mix 1px and 2px pixel grids).
- **Chibi worker proportions:** head ≈ 1/3 of body height, friendly faces.
- **Outline:** thin selective dark outline (1 authored px), NOT heavy black
  cartoon outline; interior detail via shading not outlines.
- **Shading:** 3-tone minimum (base / shadow / highlight) + soft ambient
  occlusion where objects meet the floor.
- **Mood:** dark-blue city-office at night, warm interior pools of light,
  professional management-game quality (think SimTower × Habbo × cozy pixel).

## 3. Lighting model (bake into every asset)
- **Key light:** warm, from **top-left**, ~45°. Warm window light `#FFCF7A`.
- **Fill:** cool ambient blue `#1E2C48` from the room.
- **Accent glow:** monitors/screens emit local cyan/blue glow; neon signage per
  department accent color.
- **Contact shadow:** soft dark-navy ellipse under every object and character.
- Light direction must be **identical** in all assets (top-left) so composited
  scenes read as one space.

## 4. Master color palette (use ONLY these families)
| Group | Names → hex |
|---|---|
| Atmosphere | page `#070C18`, base `#0A0F1F`, panel `#101A30` |
| Walls/floor | wall-dark `#16223A`, wall-mid `#1E2C48`, glass `#12203C`, wood `#6B4B2F`, wood-dark `#3C2C1C`, tile `#223052` |
| Warm light | window `#FFCF7A`, window-core `#FFE1A6`, lamp `#FFB65C` |
| Neon accents | blue `#5B8CFF`, cyan `#3BE8E0`, purple `#A98BFF`, pink `#FF7AC6`, lime `#5BE49B`, amber `#FFD166`, orange `#FF9F6B`, red `#FF6B7A` |
| Skin | `#F7D3B0` `#F2C9A0` `#E8B48C` `#D99A6C` `#B87A4E` |
| Hair | black `#2B2B3A`, brown `#3A2B22`, l-brown `#5A4A3A`, blonde `#C9A227`, auburn `#7A3B3B`, gray `#6A6F7E`, dyed-blue `#4C6FB0`, dyed-purple `#A65AA6` |
| Cloth neutral | `#2E3A57` `#3B4A6B` `#556080` `#8A93AB` `#D7DCEA` |

Department accent colors (drive signage/props/floor tab):
Lobby `#3BE8E0` · Marketing `#FF9F6B` · Sales `#5B8CFF` · HR `#FF7AC6` ·
IT/Dev `#5BE49B` · Design `#A98BFF` · Game `#FFD166` · QA `#FFD166` ·
Data `#3BE8E0` · Finance `#5BE49B` · Legal `#9AA7C7` · Content `#FF7AC6` ·
DevOps `#3BE8E0` · Product `#5B8CFF` · Customer Service `#5B8CFF`.

## 5. File format & transparency
- **Source:** RGBA PNG, lossless. **Delivered:** WebP with alpha (PNG fallback ok).
- **Background:** fully **transparent** (no baked page background, no checkerboard).
- **Trim:** tight transparent padding; keep the defined anchor (see §7).
- **Naming:** lowercase-kebab, exact paths from `ASSET_MANIFEST.md`.
- **Compression:** WebP quality ≥ 90; keep hard pixel edges (no blur).
- **Color profile:** sRGB.

## 6. Canvas dimensions (authored at 2× for crispness)
| Asset group | Display size | Source (2×) | Aspect | Notes |
|---|---|---|---|---|
| Floor room module | 600 × 120 | **1200 × 240** | 5:1 | one department floor slice (cutaway) |
| Rooftop cap | 600 × 80 | **1200 × 160** | 7.5:1 | roof garden/AC/antenna/sign |
| B1 server room | 600 × 130 | **1200 × 260** | ~4.6:1 | racks + cables + cyan glow |
| Building exterior (card) | 240 × 280 | **480 × 560** | 6:7 | whole building for company cards |
| Furniture (loose) | ≤ 128 × 128 | **≤ 256 × 256** | free | desks, chairs, sofas, shelves… |
| Dept equipment (loose) | ≤ 160 × 160 | **≤ 320 × 320** | free | world map, charts, server rack… |
| Character frame | 64 × 96 | **128 × 192** | 2:3 | one pose/frame, feet anchored |
| Character part layer | 64 × 96 | **128 × 192** | 2:3 | base/hair/clothes aligned to skeleton |
| Lighting overlay | 600 × 120 | **1200 × 240** | 5:1 | matches floor module |
| FX sprite | ≤ 64 × 64 | **≤ 128 × 128** | free | glow, sparkle, zzz, coffee steam |

Room modules are **5:1** so the engine renders each floor at container width and
derives height = width ÷ 5 (no distortion). See `SCENE_LAYER_ARCHITECTURE.md`.

## 7. Anchor points (critical for compositing)
- **Characters & character parts:** anchor = **bottom-center** of the 128×192
  canvas (the character's feet sit on that point). All part layers (base, hair,
  clothes, accessory) share the SAME skeleton/anchor so they stack pixel-perfect.
- **Furniture / equipment:** anchor = **bottom-center** of the object footprint.
- **Room modules / rooftop / B1:** anchor = whole-canvas; content fills edge-to-edge
  horizontally, floor line at a consistent Y (see §8).
- **Building exterior:** anchor = bottom-center (building base).

## 8. Room module internal layout (must be consistent)
Within the 1200×240 floor module:
- **Back walls** occupy the top ~55% (0–132px), **floor** the bottom ~45%.
- **Floor line** (where walls meet floor) at **y ≈ 132px** (of 240) — furniture
  and characters stand on/near this line so seats align across all rooms.
- **Left colored tab area:** leave the leftmost **~90px** lower-contrast / simple;
  the app overlays a floor-number tab there (do not put key art in that strip).
- Keep 24px transparent safety margin top/right/bottom.

## 9. Animation timing
- Frame rate: **8 fps** (≈125ms/frame) for working/idle loops.
- Loop length: idle 4 frames, working 4–6 frames, walk 4 frames (see
  `CHARACTER_SPRITE_SPEC.md`). Sprite-sheet frames laid **left→right**, one row.

## 10. Do / Don't
- DO keep one light direction, one pixel size, one palette, one iso angle.
- DO leave transparent backgrounds and correct anchors.
- DON'T add text, UI, watermarks, page backgrounds, or drop-shadows on the alpha
  edge. DON'T mix realistic + pixel styles. DON'T change proportions between poses.
