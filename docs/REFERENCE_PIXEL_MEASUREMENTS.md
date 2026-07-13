# Reference Pixel Measurements

Measured **programmatically** from `references/ai-agent-office-reference.png`
via luma/edge/saturation profiling (`tools/creative_worker/measure_reference*.py`).
Not estimated by eye.

## Canvas

| Property | Value |
|---|---|
| Width × Height | **1672 × 941 px** |
| Aspect | 1.777 (≈16:9) |
| Page padding | ~10 px |

## Key structural finding

**The reference has NO full-width app header.** Panels start at y≈11. The
brand block ("AI AGENT OFFICE" + robot) lives *inside the top of the left
column*. The center panel has its own title row ("2 บริษัทที่เลือก…").

## Columns (measured seams)

| Zone | X range (px) | Width | % of canvas |
|---|---|---:|---:|
| Left column (company overview) | 10 → ~416 | 406 | **24.3%** |
| seam (edge spike) | 411–421 | — | — |
| Center column (building) | ~420 → ~960 | 540 | **32.3%** |
| gutter (dark run) | 960–978 | ~16 | 1.0% |
| Right column (management) | ~976 → 1662 | 686 | **41.0%** |

## Rows

| Zone | Y range (px) | Height | % of canvas |
|---|---|---:|---:|
| Main content | 11 → ~770 | 759 | **80.7%** |
| gutter (dark run) | 772–778 | ~6 | — |
| Bottom activity strip | ~775 → 931 | 156 | **16.6%** |

## Right-panel sections (bright-run detection, y px)

| Section | Y range | Height | % of column |
|---|---|---:|---:|
| 3 Department Management | 43 → 169 | 126 | 16.6% |
| 4 Job Description + 5 AI Model (two-col row) | ~200 → 358 | 158 | 20.8% |
| 6 Projects | ~381 → 632 | 251 | 33.1% |
| 7 VPS Workspace | ~640 → 765 | 125 | 16.5% |

## Center building

| Property | Value |
|---|---|
| Building bounding box | x 424→956, y 20→768 |
| Building size | **532 × 748 px** (fills ~99% of panel width, ~98% of panel height) |
| Floor tab pitch (colored badges at x≈468) | runs at y 165, 240, 333, 425, 515… → **~88–92 px per floor** |
| Floors visible | 6 department floors + rooftop + B1 — all simultaneous |

## Left-column company cards

| Property | Value |
|---|---|
| Grid | 2 columns |
| Card label bands (bright runs) | y 359–441 (row 1), y 614–696 (row 2) |
| Derived card box | ≈ **185 × 200 px** (image ≈120 px ≈ 60%, label band ≈ 80 px) |
| Card row 1 / row 2 | ≈ y 245–445 / y 500–700 |

## Sampled palette (actual pixels)

| Element | RGB | Hex |
|---|---|---|
| Page background (gutters) | (13, 56, 108) | `#0D386C` dark navy-blue |
| Center panel sky | (37, 97, 179) | `#2561B3` vivid day blue |
| Right zone gutter | (83, 105, 162) | `#5369A2` |
| White panel surface | (238, 243, 253) | `#EEF3FD` |
| Header-band blue (center title) | (26, 76, 167) | `#1A4CA7` |
| Bottom strip scene art | (19, 14, 11) | very dark (illustrated interiors) |

**Palette reality check:** the page field is *dark navy-blue*, the center panel
is *vivid daytime blue*, the right panels are *white*. The "bright airy" feel
comes from the daytime-blue + white panels + warm-lit cutaway floors — not from
a uniformly pale page.

## Clone targets (percent layout at any 16:9 viewport)

```
grid-template-columns: 24.3% 32.3% 41.0%  (+ ~1% gutters)
main content height:   ~81%
bottom strip height:   ~17%
floor pitch:           ~9.5% of canvas height (88/941)
building fills its panel edge-to-edge
```
