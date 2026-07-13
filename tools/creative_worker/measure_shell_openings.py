"""Measure the tower shell's six floor openings (warm interior pixels)."""
from __future__ import annotations
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
im = Image.open(ROOT / "apps/web/public/assets/themes/reference-bright/buildings/reference-bright-tower-shell.webp").convert("RGBA")
W, H = im.size
px = im.load()

def interior(p) -> bool:
    r, g, b, a = p
    if a < 200: return False
    # warm tan walls/wood floors: R > G > B with warm bias, reasonably bright
    return r > 120 and r > g > b and (r - b) > 40 and g > 90

# row profile of interior pixel counts
rows = []
for y in range(H):
    c = sum(1 for x in range(0, W, 4) if interior(px[x, y]))
    rows.append(c * 4)

# find bands of rows with substantial interior presence
bands, start = [], None
for y, c in enumerate(rows):
    if c > 60 and start is None: start = y
    elif c <= 60 and start is not None:
        if y - start > 25: bands.append((start, y))
        start = None
if start is not None: bands.append((start, H))

out = {"size": [W, H], "interior_row_bands": bands}
# x extent per band
for i, (y0, y1) in enumerate(bands):
    xs = [x for x in range(0, W, 2) for y in range(y0, y1, 6) if interior(px[x, y])]
    if xs:
        out[f"band{i}_x"] = [min(xs), max(xs)]
print(json.dumps(out, indent=2))
