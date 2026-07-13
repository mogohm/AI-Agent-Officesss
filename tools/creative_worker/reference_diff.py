"""Automated reference-vs-clone comparison (hard tool, not a semantic judge).

Inputs:
  references/ai-agent-office-reference.png   (blueprint)
  <clone screenshot>                          (default: outputs/reference-diff/clone.png)

Outputs (outputs/reference-diff/):
  reference.png, clone.png, overlay-50.png, difference-map.png, metrics.json

Metrics (0..1), pure-PIL (no numpy):
  layout_similarity    — edge-map cosine similarity on a 64×36 grid
  color_similarity     — 1 - normalized RMSE of 16×9 grid mean colors
  structure_similarity — Pearson correlation of 32×18 grayscale grids
  overall_similarity   — weighted mean (.4 layout, .3 color, .3 structure)
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
REF = ROOT / "references" / "ai-agent-office-reference.png"
OUT = ROOT / "outputs" / "reference-diff"


def grid_values(img: Image.Image, gw: int, gh: int, mode: str = "L") -> list[float]:
    g = img.convert(mode).resize((gw, gh), Image.BOX)
    data = list(g.getdata())
    if mode == "L":
        return [float(v) for v in data]
    return [float(c) for px in data for c in px]


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)); nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


def pearson(a: list[float], b: list[float]) -> float:
    n = len(a)
    ma = sum(a) / n; mb = sum(b) / n
    cov = sum((x - ma) * (y - mb) for x, y in zip(a, b))
    va = math.sqrt(sum((x - ma) ** 2 for x in a)); vb = math.sqrt(sum((y - mb) ** 2 for y in b))
    return max(0.0, cov / (va * vb)) if va and vb else 0.0


def main() -> int:
    clone_path = Path(sys.argv[1]) if len(sys.argv) > 1 else OUT / "clone.png"
    OUT.mkdir(parents=True, exist_ok=True)

    ref = Image.open(REF).convert("RGB")
    clone = Image.open(clone_path).convert("RGB").resize(ref.size, Image.LANCZOS)

    ref.save(OUT / "reference.png")
    clone.save(OUT / "clone.png")
    Image.blend(ref, clone, 0.5).save(OUT / "overlay-50.png")

    diff = ImageChops.difference(ref, clone)
    # amplify for visibility
    diff.point(lambda v: min(255, v * 3)).save(OUT / "difference-map.png")

    # layout: edges
    e_ref = grid_values(ref.filter(ImageFilter.FIND_EDGES), 64, 36)
    e_clone = grid_values(clone.filter(ImageFilter.FIND_EDGES), 64, 36)
    layout = cosine(e_ref, e_clone)

    # color: 16x9 mean RGB RMSE
    c_ref = grid_values(ref, 16, 9, "RGB"); c_clone = grid_values(clone, 16, 9, "RGB")
    rmse = math.sqrt(sum((x - y) ** 2 for x, y in zip(c_ref, c_clone)) / len(c_ref))
    color = max(0.0, 1.0 - rmse / 128.0)

    # structure: grayscale correlation
    structure = pearson(grid_values(ref, 32, 18), grid_values(clone, 32, 18))

    metrics = {
        "layout_similarity": round(layout, 4),
        "color_similarity": round(color, 4),
        "structure_similarity": round(structure, 4),
        "overall_similarity": round(0.4 * layout + 0.3 * color + 0.3 * structure, 4),
    }
    (OUT / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps(metrics, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
