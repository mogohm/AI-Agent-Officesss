"""Generic full-page screenshot. Usage:
  python tools/creative_worker/screenshot_page.py <url> <out.png> [width] [height] [wait_ms]
Never fails hard — prints SKIP on error."""
from __future__ import annotations

import sys
from pathlib import Path


def main() -> int:
    url, out = sys.argv[1], sys.argv[2]
    w = int(sys.argv[3]) if len(sys.argv) > 3 else 1600
    h = int(sys.argv[4]) if len(sys.argv) > 4 else 1000
    wait = int(sys.argv[5]) if len(sys.argv) > 5 else 3000
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("SKIP playwright_not_installed"); return 0
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            pg = b.new_page(viewport={"width": w, "height": h})
            pg.goto(url, wait_until="networkidle", timeout=25000)
            pg.wait_for_timeout(wait)
            Path(out).parent.mkdir(parents=True, exist_ok=True)
            pg.screenshot(path=out, full_page=True)
            b.close()
        print("SHOT", out); return 0
    except Exception as e:
        print("SKIP", str(e)[:160]); return 0


if __name__ == "__main__":
    sys.exit(main())
