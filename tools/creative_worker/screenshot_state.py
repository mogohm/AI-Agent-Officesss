"""Reusable Visual Lab screenshot with explicit agent states set via the UI.

Usage:
  python tools/creative_worker/screenshot_state.py <url> <out.png> <fe> <be> <sa> [mode] [rotate]

<fe>/<be>/<sa> are state keys (idle, coding, reviewing, coffee, debugging,
monitoring, reading, analysing, relaxing). mode = showcase|band. rotate = 1 to
enable idle rotation. Never fails hard — prints SKIP on error.
"""
from __future__ import annotations

import sys
from pathlib import Path


def main() -> int:
    url, out, fe, be, sa = sys.argv[1:6]
    mode = sys.argv[6] if len(sys.argv) > 6 else "showcase"
    rotate = len(sys.argv) > 7 and sys.argv[7] == "1"
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("SKIP playwright_not_installed")
        return 0
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            pg = b.new_page(viewport={"width": 1600, "height": 1040})
            pg.goto(url, wait_until="networkidle", timeout=20000)
            pg.wait_for_timeout(1200)
            selects = pg.locator("select")
            for i, st in enumerate((fe, be, sa)):
                try:
                    selects.nth(i).select_option(st)
                except Exception:
                    pass
            if mode == "band":
                try:
                    pg.get_by_role("button", name="Band 5:1").click()
                except Exception:
                    pass
            if rotate:
                try:
                    pg.get_by_text("Play idle rotation").click()
                except Exception:
                    pass
            pg.wait_for_timeout(1600)
            Path(out).parent.mkdir(parents=True, exist_ok=True)
            pg.screenshot(path=out, full_page=True)
            b.close()
        print("SHOT", out)
        return 0
    except Exception as e:
        print("SKIP", str(e)[:160])
        return 0


if __name__ == "__main__":
    sys.exit(main())
