"""OpenAI image generation (reference-guided). Saves the untouched source PNG.

Supports one or more reference images (used as visual/style guidance) and an
optional transparent background for standalone character sprites.

SECURITY: the API key is read by the OpenAI client from the environment. We never
log request headers, the key, or raw credentialed responses.
"""
from __future__ import annotations

import base64
from dataclasses import dataclass, field
from pathlib import Path

# Explicit mimetypes are required when passing multiple images to images.edit;
# without them the SDK sends application/octet-stream and the API rejects it.
_MIME = {".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}


def _as_upload(path: Path) -> tuple[str, bytes, str]:
    return (path.name, path.read_bytes(), _MIME.get(path.suffix.lower(), "image/png"))

# Supported gpt-image sizes. We pick per target aspect and crop/fit in post.
LANDSCAPE_SIZE = "1536x1024"
PORTRAIT_SIZE = "1024x1536"
SQUARE_SIZE = "1024x1024"
SUPPORTED_FALLBACK_MODEL = "gpt-image-1"


class ImageWorkerError(RuntimeError):
    pass


@dataclass
class ImageResult:
    model_requested: str
    model_used: str
    size: str
    source_path: str
    reference_count: int
    transparent: bool
    notes: list[str] = field(default_factory=list)


def size_for_aspect(width: int, height: int) -> str:
    if width < height:
        return PORTRAIT_SIZE
    if width > height:
        return LANDSCAPE_SIZE
    return SQUARE_SIZE


def _looks_like_model_error(msg: str) -> bool:
    m = msg.lower()
    return any(k in m for k in ("model", "not found", "does not exist", "unsupported", "invalid value"))


def _call_openai(
    model: str, prompt: str, reference_paths: list[Path], quality: str, size: str, transparent: bool
) -> bytes:
    """Return raw image bytes from a reference-guided edit (1..N references)."""
    try:
        from openai import OpenAI
    except ImportError as e:  # pragma: no cover
        raise ImageWorkerError(
            "openai package not installed. Run: pip install -r tools/creative_worker/requirements.txt"
        ) from e

    client = OpenAI()  # reads OPENAI_API_KEY from env
    uploads = [_as_upload(p) for p in reference_paths]  # (name, bytes, mimetype)
    kwargs: dict = {
        "model": model,
        "image": uploads if len(uploads) > 1 else uploads[0],
        "prompt": prompt,
        "size": size,
        "quality": quality,
    }
    if transparent:
        kwargs["background"] = "transparent"  # gpt-image → PNG with alpha
    resp = client.images.edit(**kwargs)

    b64 = resp.data[0].b64_json
    if not b64:
        raise ImageWorkerError("OpenAI response contained no image data.")
    return base64.b64decode(b64)


def generate_image(
    prompt: str,
    reference_paths: list[Path],
    model: str,
    quality: str,
    source_output_path: Path,
    size: str,
    transparent: bool = False,
) -> ImageResult:
    """Generate an image guided by the reference(s), saving the untouched source."""
    if not reference_paths:
        raise ImageWorkerError("No reference images provided.")
    for rp in reference_paths:
        if not rp.is_file():
            raise ImageWorkerError(f"Reference image missing: {rp}")

    notes: list[str] = []
    model_used = model
    try:
        img = _call_openai(model, prompt, reference_paths, quality, size, transparent)
    except ImageWorkerError:
        raise
    except Exception as first_err:  # capture the exact API error
        msg = str(first_err)
        if model != SUPPORTED_FALLBACK_MODEL and _looks_like_model_error(msg):
            notes.append(
                f"Requested model '{model}' rejected by API ({msg[:200]}). "
                f"Retried with supported model '{SUPPORTED_FALLBACK_MODEL}'."
            )
            model_used = SUPPORTED_FALLBACK_MODEL
            img = _call_openai(SUPPORTED_FALLBACK_MODEL, prompt, reference_paths, quality, size, transparent)
        else:
            raise ImageWorkerError(f"OpenAI image call failed: {msg}") from first_err

    source_output_path.parent.mkdir(parents=True, exist_ok=True)
    source_output_path.write_bytes(img)  # untouched source, preserved before any edit

    return ImageResult(
        model_requested=model,
        model_used=model_used,
        size=size,
        source_path=str(source_output_path),
        reference_count=len(reference_paths),
        transparent=transparent,
        notes=notes,
    )
