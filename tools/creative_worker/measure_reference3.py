"""Pass 3: vertical edge-strength profile to find panel border seams + header."""
from __future__ import annotations

import json
from pathlib import Path
from PIL import Image
from measure_reference import luma, row_profile

ROOT = Path(__file__).resolve().parents[2]
img = Image.open(ROOT / "references" / "ai-agent-office-reference.png").convert("RGB")
W, H = img.size
px = img.load()

# Edge strength per column: mean |luma(x+1)-luma(x)| over the mid band.
y0, y1 = int(H * 0.20), int(H * 0.70)
step = max(1, (y1 - y0) // 96)
edges = []
for x in range(W - 1):
    s = n = 0
    for y in range(y0, y1, step):
        s += abs(luma(px[x + 1, y]) - luma(px[x, y])); n += 1
    edges.append(s / n)

# Strongest seams in the plausible left/center boundary zone (x 20%..30%)
zone = [(x, round(edges[x], 1)) for x in range(int(W * 0.18), int(W * 0.32))]
zone.sort(key=lambda t: -t[1])

# Header: full-width row profile of the top 90 px.
rows = row_profile(img, 8, W - 8)
top = {y: round(rows[y], 1) for y in range(0, 90, 3)}

print(json.dumps({
    "strongest_edges_x_in_18-32pct": zone[:12],
    "top_rows_luma": top,
    "px_samples": {
        "left_col_bg(60,500)": img.getpixel((60, 500)),
        "left_col_bg(300,700)": img.getpixel((300, 700)),
        "center_bg(500,200)": img.getpixel((500, 200)),
        "bottom_strip(800,850)": img.getpixel((800, 850)),
        "right_bg(1030,400)": img.getpixel((1030, 400)),
    },
}, indent=2, default=str))
