"""Open a page, print console errors + failed requests (for browser validation)."""
import sys
from playwright.sync_api import sync_playwright

url = sys.argv[1]
with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1672, "height": 941})
    errors, failed = [], []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("requestfailed", lambda r: failed.append(f"{r.url} :: {r.failure}"))
    page.on("response", lambda r: failed.append(f"{r.status} {r.url}") if r.status >= 400 else None)
    page.goto(url, wait_until="networkidle")
    page.wait_for_timeout(4000)
    print("CONSOLE ERRORS:", len(errors))
    for e in errors[:10]: print("  ", e[:300])
    print("FAILED REQUESTS:", len(failed))
    for f in failed[:20]: print("  ", f[:300])
    b.close()
