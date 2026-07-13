"""Measure the reference CENTER TOWER geometry precisely (no eyeballing).

Finds floor slab lines (dark horizontal-ish structures) at two probe columns
to derive floor pitch + slab slope angle, plus rooftop, B1, elevator and
side-depth extents via luma/saturation profiling.
"""
from __future__ import annotations

import json
from pathlib import Path
from PIL import Image
from measure_reference import luma

ROOT = Path(__file__).resolve().parents[2]
img = Image.open(ROOT / "references" / "ai-agent-office-reference.png").convert("RGB")
px = img.load()


def dark_rows_at(x: int, y0: int, y1: int, thresh: float = 60, min_run: int = 3):
    """Dark structural lines at column x (floor slabs are dark navy bands)."""
    runs, start = [], None
    for y in range(y0, y1):
        v = sum(luma(px[x + dx, y]) for dx in (-2, 0, 2)) / 3
        if v <= thresh and start is None:
            start = y
        elif v > thresh and start is not None:
            if y - start >= min_run:
                runs.append((start, y))
            start = None
    if start is not None:
        runs.append((start, y1))
    return runs


out = {
    "tower_bbox_from_prior_pass": {"x": 424, "y": 20, "w": 532, "h": 748},
    "slabs_at_x530": dark_rows_at(530, 60, 720),
    "slabs_at_x930": dark_rows_at(930, 60, 720),
    "slabs_at_x730": dark_rows_at(730, 60, 720),
}

# rooftop: rows above first slab where content is building (non-sky) — sample luma column at center
top_col = [(y, round(luma(px[720, y]), 0)) for y in range(15, 130, 5)]
out["center_col_top_luma"] = top_col

# elevator/side shaft: the right edge strip x 900..955 — mean saturation per column
def sat(p):
    mx, mn = max(p), min(p)
    return (mx - mn) / max(1, mx)
side = []
for x in range(880, 958, 4):
    vals = [luma(px[x, y]) for y in range(150, 650, 10)]
    side.append((x, round(sum(vals) / len(vals), 0)))
out["right_side_luma_cols"] = side

print(json.dumps(out, indent=2))
