"""Optional Visual Lab screenshot via Playwright.

Never fails the pipeline: if the lab is unreachable or Playwright is missing,
returns a 'skipped' result so image generation still counts as complete.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

DEFAULT_URL = "http://localhost:3000/visual-lab/it-dev-floor"


@dataclass
class ScreenshotResult:
    status: str            # "captured" | "skipped"
    path: str | None
    reason: str | None = None


def capture(url: str, output_path: Path) -> ScreenshotResult:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return ScreenshotResult("skipped", None, "playwright_not_installed")

    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={"width": 1600, "height": 1000})
            page.goto(url, wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(2500)  # allow asset-status probing to settle
            page.screenshot(path=str(output_path), full_page=True)
            browser.close()
        return ScreenshotResult("captured", str(output_path))
    except Exception as e:  # site down, chromium missing, etc.
        reason = "visual_lab_unavailable"
        if "executable doesn't exist" in str(e).lower() or "playwright install" in str(e).lower():
            reason = "chromium_not_installed"
        return ScreenshotResult("skipped", None, reason)
