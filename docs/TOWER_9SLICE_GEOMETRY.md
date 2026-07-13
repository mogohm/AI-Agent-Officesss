# Tower 9-Slice Geometry (slim shell → deterministic wide)

Source: `assets/themes/reference-bright/buildings/reference-bright-tower-shell-v2-slim.webp`
(1024×1536). Measured programmatically with alpha>200 threshold (the raw
`getbbox` is polluted by semi-transparent noise pixels).

## Source structure (px, canvas 1024×1536)

| Element | X range | Width |
|---|---|---:|
| Building body | 245 → 723 | 478 |
| Left structural edge (frame → opening) | 245 → 261 | 16 |
| Front-face room span | 261 → 485 | 224 |
| Front corner column | 485 → 499 | 14 |
| Side-face room span | 499 → 650 | 151 |
| Right elevator / utility shaft | 650 → 723 | 73 |
| B1 cloud screen (must NOT tile) | ~320 → 420 | — |
| Roof foliage cluster | 406 → 474 | — |
| Roof antenna (fixed right) | 579 → 589 | — |

| Element | Y range | Height |
|---|---|---:|
| Building (foliage top → foundation) | 202 → 1321 | 1119 |
| Roof band | 202 → 440 | 238 |
| Body band (six openings) | 440 → 1140 | 700 |
| B1 / foundation band | 1140 → 1321 | 181 |
| Floor opening 1 top (left edge) | 458 (29.8%) | pitch 114.4 (7.45%), h ≈ 100 (6.5%) |

**Source ratio:** 478 / 1119 = **0.427**. Reference target: 0.71.

## Deterministic expansion plan (shear-aware column tiling)

- **Seam** at x = 461 (front-face room span, right of the B1 cloud screen,
  left of the corner column).
- **Insert width:** 283px → building 761 / 1119 = **0.68** (target 0.66–0.72).
- **Front-face slab slope:** −4.2%H across 38%W ⇒ **−0.166 px/px** (up to the
  right). Inserted columns sample the band strip with a vertical shear of
  `−0.166 × dx`, and the entire fixed RIGHT part shifts up by −0.166 × 283 ≈
  **−47px** — this preserves the isometric diagonals instead of flattening them.
- **Per-band strips** (each tiled with mirror repeat inside the insert):
  | Band | Y range | Strip X | Content |
  |---|---|---|---|
  | Roof | 202–440 | 389–479 | deck planks + bushes (bushes tile naturally) |
  | Body | 440–1140 | 389–479 | plain back wall + wood floor (no landmarks) |
  | B1 | 1140–1321 | 430–460 | plain façade (cloud screen stays in fixed left) |
- Band boundaries (440, 1140) sit inside dark structural slab lines, hiding
  any strip mismatch.
- Fixed left (x<461) and fixed right (x>461, shifted up 47px) are copied
  verbatim: elevator width, column width, slab thickness, rooftop furniture,
  antenna, cloud screen and B1 corners are untouched.
- **Six openings are preserved by construction** — the vertical structure is
  never resampled.

## Output

`reference-bright-tower-shell-final-wide.webp` — canvas 1307×1536, building
764×1136 (**ratio 0.673**, target 0.66–0.72), transparency preserved.

## FINAL METHOD NOTE (what actually shipped)

Two shear-tiling variants produced stair-step artifacts at tile wraps (the
front-face slope constant could not be measured reliably against the noisy
wood grain). The shipped method is the simpler sanctioned option:
**3-slice horizontal scaling** — LEFT fixed [0,261), CENTER room span
[261,650) scaled ×1.727 with LANCZOS, RIGHT fixed [650,1024). Both seams are
pixel-perfect (edge columns unchanged), diagonals stay straight (uniformly
flatter inside the span), vertical structure is untouched, and the six
openings + B1 are preserved by construction. Verified visually: no seams, no
duplicated landmarks, elevator/roof/B1 intact.

## Final viewport geometry (TOWER_FINAL, % of 1307×1536 canvas)

xL 20.0 · xR 71.4 · corner column 49.6–51.4 · topY 29.8 · pitch 7.45 ·
h 6.5 · skew −4.2 (linear across the span holds exactly under uniform
scaling) · aspect 0.851.
