"""Create a production 5:1 floor BAND from an approved 8:3 master floor asset.

The 8:3 (1600x600) masters are SHOWCASE assets (Visual Lab, room detail).
Production multi-floor towers need a short, wide 5:1 band (1600x320) so a full
building (6 floors + B1) fits in one viewport with far less vertical crop.

This does NOT call any image API and NEVER regenerates art. It deterministically
focal-crops the existing master to 5:1 and resizes to the band size (WebP q92).
The source master is preserved untouched.

Usage:
  python create_floor_band.py <source> <output> [--fx 0.5] [--fy 0.5] [-W 1600] [-H 320]

Batch (no args): recreates all six department bands from their approved masters
using the tuned per-department focal defaults below.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from postprocess import cover_crop_resize, PostProcessError

# repo root = two levels up from tools/creative_worker
ROOT = Path(__file__).resolve().parents[2]
FLOORS = ROOT / "apps" / "web" / "public" / "assets" / "office" / "floors"

BAND_W, BAND_H = 1600, 320  # 5:1

# Per-department focal defaults (tuned after screenshot review). focalY controls
# which horizontal band of the taller 8:3 master survives the 5:1 crop.
BANDS = {
    "growth":              {"src": "growth/growth-floor-base.webp",                         "out": "growth/growth-floor-band.webp",                         "fx": 0.50, "fy": 0.47},
    "quality":             {"src": "quality/quality-floor-base.webp",                       "out": "quality/quality-floor-band.webp",                       "fx": 0.50, "fy": 0.50},
    "game-studio":         {"src": "game-studio/game-studio-floor-base.webp",               "out": "game-studio/game-studio-floor-band.webp",               "fx": 0.50, "fy": 0.50},
    "art-design":          {"src": "art-design/art-design-floor-base.webp",                 "out": "art-design/art-design-floor-band.webp",                 "fx": 0.50, "fy": 0.52},
    "it-dev":              {"src": "it-dev/it-dev-floor-base.webp",                         "out": "it-dev/it-dev-floor-band.webp",                         "fx": 0.50, "fy": 0.54},
    "product-management":  {"src": "product-management/product-management-floor-base.webp", "out": "product-management/product-management-floor-band.webp", "fx": 0.50, "fy": 0.51},
}


def make_band(src: Path, out: Path, fx: float, fy: float, w: int = BAND_W, h: int = BAND_H) -> None:
    if not src.is_file():
        raise PostProcessError(f"master not found: {src}")
    res = cover_crop_resize(src, out, w, h, focal_x=fx, focal_y=fy, webp_quality=92)
    print(f"BAND {out.relative_to(ROOT)}  {res.width}x{res.height}  (focal {fx:.2f},{fy:.2f})")


def batch() -> None:
    for name, cfg in BANDS.items():
        make_band(FLOORS / cfg["src"], FLOORS / cfg["out"], cfg["fx"], cfg["fy"])
    print(f"\nDONE — {len(BANDS)} production bands ({BAND_W}x{BAND_H}, 5:1). Masters untouched.")


def main(argv: list[str]) -> int:
    if not argv:
        batch()
        return 0
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("output")
    ap.add_argument("--fx", type=float, default=0.5)
    ap.add_argument("--fy", type=float, default=0.5)
    ap.add_argument("-W", "--width", type=int, default=BAND_W)
    ap.add_argument("-H", "--height", type=int, default=BAND_H)
    a = ap.parse_args(argv)
    make_band(Path(a.source), Path(a.output), a.fx, a.fy, a.width, a.height)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main(sys.argv[1:]))
    except PostProcessError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        raise SystemExit(1)
