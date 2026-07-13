"""Deterministically widen the six-opening slim tower shell (no AI generation).

3-slice horizontal composition per docs/TOWER_9SLICE_GEOMETRY.md:
  LEFT  fixed structure   src x [0, 261)     (frame, B1 corner)
  CENTER room span        src x [261, 650)   scaled horizontally (LANCZOS)
  RIGHT fixed structure   src x [650, 1024)  (corner→elevator shaft, verbatim)

Horizontal scaling keeps every diagonal STRAIGHT and both seams pixel-perfect
(edge columns unchanged), never touches vertical structure (slab thickness,
six openings, roof height, B1 height all preserved by construction), and
preserves transparency. Structural verticals inside the span (corner column)
widen proportionally; the elevator shaft and outer frames stay exact.
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "apps/web/public/assets/themes/reference-bright/buildings/reference-bright-tower-shell-v2-slim.webp"
OUT = ROOT / "apps/web/public/assets/themes/reference-bright/buildings/reference-bright-tower-shell-final-wide.webp"

CUT_L = 261     # opening inner-left edge
CUT_R = 650     # opening inner-right edge (elevator shaft starts)
INSERT = 283    # extra width → building 478+283=761, ratio 761/1119 ≈ 0.68


def main() -> None:
    src = Image.open(SRC).convert("RGBA")
    W, H = src.size
    left = src.crop((0, 0, CUT_L, H))
    center = src.crop((CUT_L, 0, CUT_R, H))
    right = src.crop((CUT_R, 0, W, H))

    new_center_w = (CUT_R - CUT_L) + INSERT
    center = center.resize((new_center_w, H), Image.LANCZOS)

    out = Image.new("RGBA", (W + INSERT, H), (0, 0, 0, 0))
    out.paste(left, (0, 0))
    out.paste(center, (CUT_L, 0))
    out.paste(right, (CUT_L + new_center_w, 0))
    out.save(OUT, format="WEBP", quality=95, method=6)

    px = out.load()
    xs, ys = [], []
    for yy in range(0, H, 4):
        for xx in range(0, W + INSERT, 4):
            if px[xx, yy][3] > 200:
                xs.append(xx); ys.append(yy)
    bw, bh = max(xs) - min(xs), max(ys) - min(ys)
    print(f"WIDE SHELL {OUT.name}: canvas {out.size}, building {bw}x{bh}, ratio {bw/bh:.3f}")


if __name__ == "__main__":
    main()
