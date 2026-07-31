"""Deterministic image operations for the Autonomous Delivery Center.

Invoked by the delivery worker through the jailed command runner. Every
operation is deterministic (no AI, no network) so its results are facts, not
judgements.

Usage:
  python imagetool.py normalize --src IN --out OUT --width W --height H [--fit contain|cover] [--alpha]
  python imagetool.py validate  --path P --width W --height H [--alpha] [--json]
  python imagetool.py bbox      --path P
  python imagetool.py phash     --path P
  python imagetool.py contact   --out OUT --tile-w W --tile-h H --cols N --paths A B C
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image

Image.MAX_IMAGE_PIXELS = 200_000_000


def _open(p: Path) -> Image.Image:
    im = Image.open(p)
    im.load()
    return im


def _sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def op_normalize(a) -> dict:
    src, out = Path(a.src), Path(a.out)
    im = _open(src)
    im = im.convert("RGBA" if a.alpha else "RGB")
    tw, th = a.width, a.height

    if a.fit == "contain":
        canvas = Image.new("RGBA" if a.alpha else "RGB", (tw, th), (0, 0, 0, 0) if a.alpha else (10, 17, 32))
        ratio = min(tw / im.width, th / im.height)
        new = im.resize((max(1, int(im.width * ratio)), max(1, int(im.height * ratio))), Image.LANCZOS)
        canvas.paste(new, ((tw - new.width) // 2, (th - new.height) // 2), new if a.alpha else None)
        im = canvas
    else:  # cover: scale to fill then centre-crop
        ratio = max(tw / im.width, th / im.height)
        new = im.resize((max(1, int(im.width * ratio)), max(1, int(im.height * ratio))), Image.LANCZOS)
        left, top = (new.width - tw) // 2, (new.height - th) // 2
        im = new.crop((left, top, left + tw, top + th))

    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(out.suffix + ".tmp")
    im.save(tmp, "WEBP", quality=92, lossless=bool(a.alpha), method=6)
    tmp.replace(out)  # atomic replacement
    v = _open(out)
    return {
        "ok": True, "path": str(out), "width": v.width, "height": v.height,
        "format": (v.format or "").lower(), "hasAlpha": v.mode in ("RGBA", "LA"),
        "bytes": out.stat().st_size, "sha256": _sha256(out),
    }


def _content_bbox(im: Image.Image) -> tuple[int, int, int, int] | None:
    """Bounding box of non-background content: alpha when present, else
    difference from the median border colour."""
    if im.mode in ("RGBA", "LA"):
        alpha = im.getchannel("A")
        return alpha.getbbox()
    rgb = im.convert("RGB")
    w, h = rgb.size
    border = [rgb.getpixel((x, 0)) for x in range(0, w, max(1, w // 40))]
    border += [rgb.getpixel((x, h - 1)) for x in range(0, w, max(1, w // 40))]
    bg = tuple(sorted(c)[len(c) // 2] for c in zip(*border))
    from PIL import ImageChops
    diff = ImageChops.difference(rgb, Image.new("RGB", rgb.size, bg)).convert("L").point(lambda v: 255 if v > 26 else 0)
    return diff.getbbox()


def op_bbox(a) -> dict:
    p = Path(a.path)
    im = _open(p)
    bb = _content_bbox(im)
    if not bb:
        return {"ok": False, "reason": "no content detected"}
    l, t, r, b = bb
    return {
        "ok": True, "width": im.width, "height": im.height,
        "left": l, "top": t, "right": r, "bottom": b,
        "bottomGapPx": im.height - b, "bottomGapPct": round((im.height - b) / im.height * 100, 3),
        "leftGapPx": l, "rightGapPx": im.width - r,
        "coverage": round(((r - l) * (b - t)) / (im.width * im.height), 4),
    }


def op_phash(a) -> dict:
    """64-bit average hash — deterministic perceptual fingerprint."""
    im = _open(Path(a.path)).convert("L").resize((8, 8), Image.LANCZOS)
    px = list(im.getdata())
    avg = sum(px) / len(px)
    bits = "".join("1" if v > avg else "0" for v in px)
    return {"ok": True, "phash": f"{int(bits, 2):016x}", "sha256": _sha256(Path(a.path))}


def op_validate(a) -> dict:
    p = Path(a.path)
    issues: list[str] = []
    if not p.exists():
        return {"ok": False, "path": str(p), "issues": ["file does not exist"]}
    try:
        im = _open(p)
    except Exception as e:
        return {"ok": False, "path": str(p), "issues": [f"undecodable image: {type(e).__name__}"]}

    fmt = (im.format or "").lower()
    if fmt != "webp":
        issues.append(f"format is {fmt or 'unknown'}, expected webp")
    if a.width and im.width != a.width:
        issues.append(f"width {im.width} != required {a.width}")
    if a.height and im.height != a.height:
        issues.append(f"height {im.height} != required {a.height}")
    has_alpha = im.mode in ("RGBA", "LA")
    if a.alpha and not has_alpha:
        issues.append("alpha channel required but absent")
    size = p.stat().st_size
    if size < 1024:
        issues.append(f"file suspiciously small ({size} bytes)")

    bb = _content_bbox(im)
    ar = round(im.width / im.height, 4) if im.height else 0
    return {
        "ok": not issues, "path": str(p), "width": im.width, "height": im.height,
        "aspectRatio": ar, "format": fmt, "hasAlpha": has_alpha, "bytes": size,
        "sha256": _sha256(p),
        "bbox": ({"left": bb[0], "top": bb[1], "right": bb[2], "bottom": bb[3],
                  "bottomGapPct": round((im.height - bb[3]) / im.height * 100, 3)} if bb else None),
        "issues": issues,
    }


def op_contact(a) -> dict:
    paths = [Path(x) for x in a.paths]
    cols = max(1, a.cols)
    rows = (len(paths) + cols - 1) // cols
    tw, th = a.tile_w, a.tile_h
    sheet = Image.new("RGB", (cols * tw, rows * th), (12, 22, 38))
    for i, p in enumerate(paths):
        if not p.exists():
            continue
        im = _open(p).convert("RGBA")
        r = min(tw / im.width, th / im.height)
        im = im.resize((max(1, int(im.width * r)), max(1, int(im.height * r))), Image.LANCZOS)
        x, y = (i % cols) * tw + (tw - im.width) // 2, (i // cols) * th + (th - im.height) // 2
        sheet.paste(im, (x, y), im)
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out, "WEBP", quality=88, method=6)
    return {"ok": True, "path": str(out), "tiles": len(paths), "width": sheet.width, "height": sheet.height}


def main() -> int:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)

    n = sub.add_parser("normalize"); n.add_argument("--src", required=True); n.add_argument("--out", required=True)
    n.add_argument("--width", type=int, required=True); n.add_argument("--height", type=int, required=True)
    n.add_argument("--fit", default="cover", choices=["cover", "contain"]); n.add_argument("--alpha", action="store_true")

    v = sub.add_parser("validate"); v.add_argument("--path", required=True)
    v.add_argument("--width", type=int, default=0); v.add_argument("--height", type=int, default=0)
    v.add_argument("--alpha", action="store_true")

    b = sub.add_parser("bbox"); b.add_argument("--path", required=True)
    h = sub.add_parser("phash"); h.add_argument("--path", required=True)

    c = sub.add_parser("contact"); c.add_argument("--out", required=True)
    c.add_argument("--tile-w", type=int, default=320); c.add_argument("--tile-h", type=int, default=240)
    c.add_argument("--cols", type=int, default=4); c.add_argument("--paths", nargs="+", required=True)

    a = ap.parse_args()
    try:
        result = {"normalize": op_normalize, "validate": op_validate, "bbox": op_bbox,
                  "phash": op_phash, "contact": op_contact}[a.cmd](a)
    except Exception as e:
        result = {"ok": False, "error": f"{type(e).__name__}: {e}"}
    print(json.dumps(result))
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main())
