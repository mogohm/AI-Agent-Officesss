"""Post-process the source image into the exact final WebP asset (Pillow).

Preserves the source untouched. Two modes:
  - cover : cover-crop to the target aspect, focal-aware (used for room floors)
  - contain : fit the (alpha-trimmed) subject inside the canvas, feet-anchored to
              bottom-center, with transparent padding (used for character sprites)
Never fakes transparency.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image


class PostProcessError(RuntimeError):
    pass


@dataclass
class PostProcessResult:
    final_path: str
    width: int
    height: int
    fmt: str
    has_alpha: bool


def _open(source_path: Path) -> Image.Image:
    if not source_path.is_file():
        raise PostProcessError(f"Source image not found: {source_path}")
    try:
        img = Image.open(source_path)
        img.load()
        return img
    except Exception as e:
        raise PostProcessError(f"Pillow could not open source image: {e}") from e


def _verify(output_path: Path, width: int, height: int) -> PostProcessResult:
    with Image.open(output_path) as check:
        cw, ch = check.size
        fmt = (check.format or "").upper()
        has_alpha = check.mode in ("RGBA", "LA") or "transparency" in check.info
        if has_alpha:
            alpha = check.convert("RGBA").split()[-1]
            has_alpha = alpha.getextrema()[0] < 255  # real transparent pixels present
    if cw != width or ch != height or fmt != "WEBP":
        raise PostProcessError(
            f"Final asset verification failed: got {cw}x{ch} {fmt}, expected {width}x{height} WEBP"
        )
    return PostProcessResult(str(output_path), cw, ch, fmt, has_alpha)


def cover_crop_resize(
    source_path: Path, output_path: Path, width: int, height: int,
    focal_x: float = 0.5, focal_y: float = 0.5,
    webp_quality: int = 92, webp_method: int = 6,
) -> PostProcessResult:
    src = _open(source_path)
    sw, sh = src.size
    target_ratio = width / height
    if (sw / sh) > target_ratio:
        new_w = int(round(sh * target_ratio))
        left = int(round(max(0, min(sw - new_w, focal_x * sw - new_w / 2))))
        box = (left, 0, left + new_w, sh)
    else:
        new_h = int(round(sw / target_ratio))
        top = int(round(max(0, min(sh - new_h, focal_y * sh - new_h / 2))))
        box = (0, top, sw, top + new_h)
    final = src.crop(box).resize((width, height), Image.LANCZOS)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    final.save(output_path, format="WEBP", quality=webp_quality, method=webp_method)
    return _verify(output_path, width, height)


def contain_fit(
    source_path: Path, output_path: Path, width: int, height: int,
    side_padding: float = 0.06, top_padding: float = 0.06, bottom_padding: float = 0.04,
    webp_quality: int = 92, webp_method: int = 6,
) -> PostProcessResult:
    """Fit the subject inside width×height (no crop, no stretch), feet at bottom-center."""
    src = _open(source_path).convert("RGBA")

    # Trim to the visible subject via the alpha bounding box (falls back to full).
    alpha = src.split()[-1]
    bbox = alpha.getbbox()
    content = src.crop(bbox) if bbox else src
    cw, ch = content.size

    avail_w = width * (1 - 2 * side_padding)
    avail_h = height * (1 - top_padding - bottom_padding)
    scale = min(avail_w / cw, avail_h / ch)  # contain: never exceed available area
    new_w, new_h = max(1, int(round(cw * scale))), max(1, int(round(ch * scale)))
    resized = content.resize((new_w, new_h), Image.LANCZOS)

    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    x = (width - new_w) // 2                                   # centered horizontally
    y = height - new_h - int(round(height * bottom_padding))   # feet near the bottom
    canvas.alpha_composite(resized, (x, max(0, y)))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output_path, format="WEBP", quality=webp_quality, method=webp_method)
    return _verify(output_path, width, height)
