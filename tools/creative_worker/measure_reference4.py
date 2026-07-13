"""Pass 4: left-column card bands + center building bounding box + floor bands."""
from __future__ import annotations

import json
from pathlib import Path
from PIL import Image
from measure_reference import luma, row_profile

ROOT = Path(__file__).resolve().parents[2]
img = Image.open(ROOT / "references" / "ai-agent-office-reference.png").convert("RGB")
W, H = img.size
px = img.load()

# --- Left column (x 10..416): find bright card-image bands per row ---
rows_left = row_profile(img, 24, 400)
def runs(profile, lo, hi, thresh, min_len):
    out, start = [], None
    for i in range(lo, hi):
        v = profile[i]
        if v >= thresh and start is None: start = i
        elif v < thresh and start is not None:
            if i - start >= min_len: out.append((start, i))
            start = None
    if start is not None and hi - start >= min_len: out.append((start, hi))
    return out
left_card_bands = runs(rows_left, 0, 770, 95, 30)

# --- Center building bbox: sky color ~(37,97,179); find non-sky extent ---
def is_sky(p): return abs(p[0]-37) < 26 and abs(p[1]-97) < 30 and abs(p[2]-179) < 34
xs, ys = [], []
for y in range(20, 770, 4):
    for x in range(424, 958, 4):
        if not is_sky(px[x, y]):
            xs.append(x); ys.append(y)
bbox = [min(xs), min(ys), max(xs), max(ys)]

# --- Floor tab badges: colored tabs on left edge of building panel (~x 430-515)
# detect saturated rows in that strip
def sat(p):
    mx, mn = max(p), min(p)
    return (mx - mn) / max(1, mx)
tab_rows = []
for y in range(20, 770):
    p = px[468, y]
    if sat(p) > 0.45 and luma(p) > 70:
        tab_rows.append(y)
# compress to runs
tabs, start, prev = [], None, None
for y in tab_rows:
    if start is None: start = prev = y
    elif y - prev <= 3: prev = y
    else:
        if prev - start > 14: tabs.append((start, prev))
        start = prev = y
if start is not None and prev - start > 14: tabs.append((start, prev))

print(json.dumps({
    "left_card_bright_bands_y": left_card_bands,
    "building_bbox_xyxy": bbox,
    "building_size": [bbox[2]-bbox[0], bbox[3]-bbox[1]],
    "floor_tab_runs_y_at_x468": tabs,
}, indent=2))
