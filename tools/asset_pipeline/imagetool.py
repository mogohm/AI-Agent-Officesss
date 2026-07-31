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

    d = sub.add_parser("distinct"); d.add_argument("--a", required=True); d.add_argument("--b", required=True)

    ct = sub.add_parser("contain"); ct.add_argument("--src", required=True); ct.add_argument("--out", required=True)
    ct.add_argument("--width", type=int, required=True); ct.add_argument("--height", type=int, required=True)
    ct.add_argument("--bottom-pct", type=float, default=2.0); ct.add_argument("--side-pct", type=float, default=2.5)
    ct.add_argument("--top-pct", type=float, default=1.5); ct.add_argument("--alpha", action="store_true")

    c = sub.add_parser("contact"); c.add_argument("--out", required=True)
    c.add_argument("--tile-w", type=int, default=320); c.add_argument("--tile-h", type=int, default=240)
    c.add_argument("--cols", type=int, default=4); c.add_argument("--paths", nargs="+", required=True)

    a = ap.parse_args()
    try:
        result = {"normalize": op_normalize, "validate": op_validate, "bbox": op_bbox,
                  "phash": op_phash, "contact": op_contact, "distinct": op_distinct,
                  "contain": op_contain}[a.cmd](a)
    except Exception as e:
        result = {"ok": False, "error": f"{type(e).__name__}: {e}"}
    print(json.dumps(result))
    return 0 if result.get("ok") else 1




# --------------------------------------------------------------------------
# Composite distinctness (correction cycle 1, §6). A single greyscale 8x8
# average hash cannot separate four differently-coloured night buildings, so
# distinctness combines luminance structure, colour distribution and silhouette.
# --------------------------------------------------------------------------

THRESHOLD_VERSION = "1.1.0"


def _dhash_bits(im: Image.Image, size: int = 8) -> str:
    g = im.convert("L").resize((size + 1, size), Image.LANCZOS)
    px = list(g.getdata())
    bits = []
    for r in range(size):
        row = px[r * (size + 1):(r + 1) * (size + 1)]
        bits += ["1" if row[c] > row[c + 1] else "0" for c in range(size)]
    return "".join(bits)


def _ahash_bits(im: Image.Image, size: int = 8) -> str:
    g = im.convert("L").resize((size, size), Image.LANCZOS)
    px = list(g.getdata())
    avg = sum(px) / len(px)
    return "".join("1" if v > avg else "0" for v in px)


def _hamming(a: str, b: str) -> int:
    return sum(1 for x, y in zip(a, b) if x != y) + abs(len(a) - len(b))


def _colour_hist(im: Image.Image, bins: int = 4) -> list[float]:
    """Normalised coarse RGB histogram — captures art-direction/colour family."""
    rgb = im.convert("RGB").resize((64, 64), Image.LANCZOS)
    hist = [0.0] * (bins ** 3)
    step = 256 // bins
    for r, g, b in rgb.getdata():
        hist[(r // step) * bins * bins + (g // step) * bins + (b // step)] += 1
    total = sum(hist) or 1
    return [h / total for h in hist]


def _hist_distance(a: list[float], b: list[float]) -> float:
    """Total-variation distance in [0,1]."""
    return sum(abs(x - y) for x, y in zip(a, b)) / 2


def _silhouette(im: Image.Image, size: int = 16) -> list[int]:
    bb = _content_bbox(im)
    src = im.crop(bb) if bb else im
    if src.mode in ("RGBA", "LA"):
        mask = src.getchannel("A").resize((size, size), Image.LANCZOS)
    else:
        from PIL import ImageChops
        rgb = src.convert("RGB")
        w, h = rgb.size
        border = [rgb.getpixel((x, 0)) for x in range(0, w, max(1, w // 20))]
        bg = tuple(sorted(c)[len(c) // 2] for c in zip(*border))
        mask = ImageChops.difference(rgb, Image.new("RGB", rgb.size, bg)).convert("L").resize((size, size), Image.LANCZOS)
    return [1 if v > 40 else 0 for v in mask.getdata()]


def _silhouette_distance(a: list[int], b: list[int]) -> float:
    if not a or not b:
        return 1.0
    diff = sum(1 for x, y in zip(a, b) if x != y)
    return diff / len(a)


def op_distinct(a) -> dict:
    """Compare two images with a composite, colour-aware metric."""
    pa, pb = Path(a.a), Path(a.b)
    sa, sb = _sha256(pa), _sha256(pb)
    ia, ib = _open(pa), _open(pb)

    structure = _hamming(_dhash_bits(ia), _dhash_bits(ib)) / 64.0
    ahash_d = _hamming(_ahash_bits(ia), _ahash_bits(ib)) / 64.0
    colour = _hist_distance(_colour_hist(ia), _colour_hist(ib))
    silhouette = _silhouette_distance(_silhouette(ia), _silhouette(ib))

    composite = round(0.4 * structure + 0.35 * colour + 0.25 * silhouette, 4)
    binary_identical = sa == sb

    if binary_identical:
        cls = "DUPLICATE"
    elif composite < 0.08:
        cls = "TOO_SIMILAR"
    elif composite < 0.18:
        cls = "ACCEPTABLE"
    else:
        cls = "DISTINCT"

    return {
        "ok": True, "assetA": str(pa), "assetB": str(pb),
        "binaryIdentical": binary_identical,
        "structureDifference": round(structure, 4),
        "averageHashDifference": round(ahash_d, 4),
        "colourDifference": round(colour, 4),
        "silhouetteDifference": round(silhouette, 4),
        "compositeDistinctness": composite,
        "classification": cls,
        "thresholdVersion": THRESHOLD_VERSION,
        "evidence": [
            f"dhash structure {structure:.3f}", f"ahash {ahash_d:.3f}",
            f"colour TV {colour:.3f}", f"silhouette {silhouette:.3f}",
        ],
    }


def op_contain(a) -> dict:
    """Contain-fit with enforced padding so the subject is never cropped (§7)."""
    src, out = Path(a.src), Path(a.out)
    im = _open(src).convert("RGBA")
    bb = _content_bbox(im)
    if not bb:
        return {"ok": False, "error": "no foreground detected — cannot assert crop status", "needsReview": True}
    subject = im.crop(bb)

    tw, th = a.width, a.height
    pad_b, pad_x, pad_t = th * a.bottom_pct / 100, tw * a.side_pct / 100, th * a.top_pct / 100
    avail_w, avail_h = tw - 2 * pad_x, th - pad_t - pad_b
    ratio = min(avail_w / subject.width, avail_h / subject.height)
    new = subject.resize((max(1, int(subject.width * ratio)), max(1, int(subject.height * ratio))), Image.LANCZOS)

    canvas = Image.new("RGBA", (tw, th), (0, 0, 0, 0) if a.alpha else (11, 20, 36, 255))
    if not a.alpha:
        # keep the generated night sky as the backdrop rather than a flat fill
        bg = _open(src).convert("RGBA").resize((tw, th), Image.LANCZOS)
        canvas.paste(bg, (0, 0))
    x = (tw - new.width) // 2
    y = int(th - pad_b - new.height)
    canvas.paste(new, (x, y), new)

    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(out.suffix + ".tmp")
    canvas.convert("RGBA" if a.alpha else "RGB").save(tmp, "WEBP", quality=92, lossless=bool(a.alpha), method=6)
    tmp.replace(out)

    v = _open(out)
    vb = _content_bbox(v)
    return {
        "ok": True, "path": str(out), "width": v.width, "height": v.height,
        "sha256": _sha256(out),
        "bottomGapPct": round((v.height - vb[3]) / v.height * 100, 3) if vb else None,
        "placedBottomPaddingPx": int(pad_b),
    }


if __name__ == "__main__":
    sys.exit(main())
