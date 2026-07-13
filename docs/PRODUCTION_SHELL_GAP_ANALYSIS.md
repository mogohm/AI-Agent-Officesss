# PRODUCTION_SHELL_GAP_ANALYSIS.md
Reference concept vs the reconstructed production `/companies/[id]` shell.
Screenshot: `outputs/screenshots/production-shell/company-page-1920x1080.png`.
Scored 0–10, honestly (prior "stacked dashboard cards" baseline ≈ 4/10).

| # | Category | Before | Now | Notes |
|---|---|---|---|---|
| 1 | Layout composition | 4 | 8 | Left company overview · center building · right panels · bottom strip, immersive full-viewport (no app sidebar). |
| 2 | Company-card similarity | 3 | 8 | Real CSS building thumbnails (lit windows, roof, antenna) — no emoji; selected card neon-highlighted; 2-col grid. |
| 3 | Building continuity | 2 | 8 | One framed tower: rooftop + left/right structural columns + right **elevator shaft with per-floor doors** + connected floor slabs + B1 basement + foundation. |
| 4 | Building dominance | 3 | 8 | Building fills the center column height and is the clear visual hero. |
| 5 | Floor visual richness | 4 | 6 | IT/Dev floor uses the approved detailed room (+ live agent). Other floors are honest room-shaped "ART PENDING" fallbacks (walls/windows/floor/desks/tint/icon) — same shape, but intentionally plain. |
| 6 | Right-panel similarity | 5 | 8 | Dept Mgmt (top) · Job Description + AI Model (two-column row) · Projects · VPS — denser, numbered, fits the viewport. |
| 7 | Activity-strip visibility | 3 | 8 | Full-width bottom strip visible in the first viewport; real IT/Dev sprites + Idle Time trio; labeled placeholders elsewhere. |
| 8 | Color / lighting | 7 | 8 | Consistent dark-navy + neon + warm windows; building frame adds depth. |
| 9 | Visual density | 3 | 8 | Primary composition fits one 1920×1080 viewport with little dead space. |
| 10 | First-impression similarity | 4 | 7.5 | Reads as a "living AI company building," not a SaaS dashboard; still less painterly than the raster reference. |

**Overall ≈ 7.5** (was ≈ 4). Large jump; not inflated to 9 — real gaps remain (below).

## Pass-condition checklist
- [x] No permanent left app sidebar on the Company page
- [x] Company cards show buildings, not emojis
- [x] Center reads as one continuous building
- [x] Floors no longer look like isolated stacked cards
- [x] IT/Dev floor framed inside the building
- [x] Building is the dominant center visual
- [x] Right panels resemble the reference hierarchy
- [x] Bottom worker strip visible
- [x] Primary desktop composition fits one viewport
- [x] No giant empty central dark space
- [x] First impression clearly closer to the reference than before

## Honest remaining gaps
1. **Fallback floors are plain.** Room-shaped and honest ("ART PENDING"), but not richly painted like the reference — resolved only when each department gets approved floor art.
2. **IT/Dev floor is cover-cropped** to the slot height (shows the desk/worker band; loses some ceiling/floor detail). A dedicated 5:1 building-band re-export would frame it better.
3. **Mobile** for this immersive page still needs a tabbed/stacked pass (desktop was prioritized per instruction).
4. **Building-band richness**: the elevator shaft/columns are CSS framing; a future painted building frame asset would lift fidelity further.
5. Reference is AI-raster and slightly more detailed per-floor than any code shell will match without per-department art.
