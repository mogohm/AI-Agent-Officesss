# WP-002P — HTTP Asset Verification

Measured against `next start` (production build) on port 3457.

**Result: HTTP 200 = 0/17, HTTP 404 = 17/17.** Gate §7 fails.

All 17 canonical URLs return `404` with a `text/html` error body — not an image,
not a redirect, not a placeholder.

Control: `/assets/office/floors/it-dev/it-dev-floor-band.webp` (an existing
pre-WP-002 legacy asset) returns **200**. Static file serving is therefore working
correctly; the 404s are genuinely missing files, not a server or routing fault.

Machine-readable results: `http-asset-check.json`.
