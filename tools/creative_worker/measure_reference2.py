"""Pass 2: locate panel GUTTERS (dark navy page background between panels)."""
from __future__ import annotations

import json
from pathlib import Path
from PIL import Image
from measure_reference import col_profile, row_profile

ROOT = Path(__file__).resolve().parents[2]
img = Image.open(ROOT / "references" / "ai-agent-office-reference.png").convert("RGB")
W, H = img.size


def dark_runs(profile, thresh=40.0, min_len=3):
    runs, start = [], None
    for i, v in enumerate(profile):
        if v <= thresh and start is None:
            start = i
        elif v > thresh and start is not None:
            if i - start >= min_len:
                runs.append((start, i))
            start = None
    if start is not None:
        runs.append((start, len(profile)))
    return runs


# Column gutters measured across the mid band (avoids header/bottom).
cols = col_profile(img, int(H * 0.20), int(H * 0.70))
# Row gutters measured across left+center only (right is white panels).
rows_leftcenter = row_profile(img, 10, 1040)
rows_center = row_profile(img, 440, 1040)

out = {
    "canvas": [W, H],
    "col_gutters(dark<40)": dark_runs(cols, 40, 2),
    "col_gutters(dark<30)": dark_runs(cols, 30, 2),
    "row_gutters_leftcenter(dark<35)": dark_runs(rows_leftcenter, 35, 2),
    "row_gutters_center(dark<35)": dark_runs(rows_center, 35, 2),
    # corner samples for palette
    "px_page_bg": img.getpixel((5, int(H * 0.5))),
    "px_right_panel": img.getpixel((1400, 300)),
    "px_left_panel": img.getpixel((200, 300)),
    "px_header": img.getpixel((800, 20)),
}
print(json.dumps(out, indent=2, default=str))
