"""Measure the approved reference image programmatically (no eyeballing).

Finds the major layout boundaries by scanning brightness/color transitions:
 - column boundaries (left | center | right) via vertical dark/light seams
 - header height, bottom strip top via horizontal transitions
 - white-panel regions on the right via high-luminance runs

Prints a JSON report used to write docs/REFERENCE_PIXEL_MEASUREMENTS.md.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
REF = ROOT / "references" / "ai-agent-office-reference.png"


def luma(px) -> float:
    r, g, b = px[0], px[1], px[2]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def col_profile(img: Image.Image, y0: int, y1: int) -> list[float]:
    """Mean luma per column over rows [y0, y1)."""
    w = img.width
    px = img.load()
    out = []
    step = max(1, (y1 - y0) // 64)
    for x in range(w):
        s = n = 0
        for y in range(y0, y1, step):
            s += luma(px[x, y]); n += 1
        out.append(s / n)
    return out


def row_profile(img: Image.Image, x0: int, x1: int) -> list[float]:
    h = img.height
    px = img.load()
    out = []
    step = max(1, (x1 - x0) // 64)
    for y in range(h):
        s = n = 0
        for x in range(x0, x1, step):
            s += luma(px[x, y]); n += 1
        out.append(s / n)
    return out


def find_bright_runs(profile: list[float], thresh: float = 200.0, min_len: int = 24) -> list[tuple[int, int]]:
    runs, start = [], None
    for i, v in enumerate(profile):
        if v >= thresh and start is None:
            start = i
        elif v < thresh and start is not None:
            if i - start >= min_len:
                runs.append((start, i))
            start = None
    if start is not None and len(profile) - start >= min_len:
        runs.append((start, len(profile)))
    return runs


def main() -> None:
    img = Image.open(REF).convert("RGB")
    W, H = img.size

    # Vertical structure: profile across the middle band of the page.
    cols = col_profile(img, int(H * 0.15), int(H * 0.75))
    # The right side of the reference is white panels -> long bright run.
    bright_cols = find_bright_runs(cols, thresh=190, min_len=int(W * 0.05))

    # Horizontal structure: rows, over the full width and over the right zone.
    rows_full = row_profile(img, int(W * 0.02), int(W * 0.98))
    right_x0 = bright_cols[-1][0] if bright_cols else int(W * 0.62)
    rows_right = row_profile(img, right_x0, W - 8)
    bright_right_rows = find_bright_runs(rows_right, thresh=190, min_len=int(H * 0.03))

    report = {
        "canvas": {"width": W, "height": H, "aspect": round(W / H, 4)},
        "column_luma_bright_runs_px": bright_cols,
        "right_zone_x0_px": right_x0,
        "right_panel_row_runs_px": bright_right_rows,
        "row_luma_sample": {str(y): round(rows_full[y], 1) for y in range(0, H, max(1, H // 24))},
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    sys.exit(main())
