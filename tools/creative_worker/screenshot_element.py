"""Screenshot a single element (CSS selector) at its natural pixel size.

Usage: python screenshot_element.py <url> <selector> <out.png> [viewport_w] [viewport_h]
"""
from __future__ import annotations

import sys
from playwright.sync_api import sync_playwright


def main() -> int:
    url, selector, out = sys.argv[1], sys.argv[2], sys.argv[3]
    vw = int(sys.argv[4]) if len(sys.argv) > 4 else 1800
    vh = int(sys.argv[5]) if len(sys.argv) > 5 else 1100
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(viewport={"width": vw, "height": vh}, device_scale_factor=1)
        page.goto(url, wait_until="networkidle")
        page.wait_for_timeout(1200)
        el = page.locator(selector)
        el.screenshot(path=out)
        b.close()
    print(f"SHOT {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
