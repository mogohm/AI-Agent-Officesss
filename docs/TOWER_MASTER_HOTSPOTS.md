# Tower Master — Hotspots & Integration

Asset: `apps/web/public/assets/themes/reference-bright/tower-master/ai-office-tower-master.webp`
(1024×1408, transparent background). Generated via the project image pipeline
(`docs/REFERENCE_BRIGHT_PROMPTS.md` → "Unified tower master" / "…revision").
Rendered in `/bright-office?tower=master` (mode `master` in BrightCompanyOffice).

## V1 interaction model

The tower master is a **single coherent illustration**. For V1 the visual is
**static art** and interaction is a **dynamic overlay** (the user's approved
model: "visual tower can be static, interaction can be dynamic overlay").

- **Department selection** — the left floor-tab column (dynamic, from real
  departments) selects a department and updates the right panel. Tabs are a
  control list; they do not need to sit exactly on a baked floor.
- **B1 / VPS** — a transparent hotspot over the baked basement (`left 16%,
  top 76%, 64%×16%`) plus the B1 tab both route to `/vps`.
- **Selected highlight** — shown on the active tab (ring + glow).

## Baked floor bands (image space, % of the 1024×1408 canvas)

The generated art has **4 visible furnished floors + B1** (see caveat below).
Approximate bands of the visible building for future per-floor overlays:

| Band | Top % | Bottom % |
|---|---|---|
| Rooftop garden | 8 | 18 |
| Floor A (top) | 18 | 33 |
| Floor B | 33 | 48 |
| Floor C | 48 | 62 |
| Floor D | 62 | 74 |
| B1 server room | 74 | 92 |

Building left edge ≈ 15%, right edge (glass shaft) ≈ 82%, front corner ≈ 47%.

## Known caveat — floor count (4 vs 6)

Both allowed pipeline generations (1 initial + 1 revision, the 2-call cap)
produced **4 furnished floors**, not the 6 requested. Consequences:

- The baked rooms/workers are **illustrative**, not a 1:1 map of the 6 real
  departments. Do not try to bind each baked room to a department.
- Accurate 1:1 per-department floors remain available in
  `?tower=procedural-v3` (the two-plane procedural tower), preserved as a
  fallback with correct 6-floor + window-nav behaviour.

## Resolution options (user decision)

1. **Accept the 4-floor master** as the hero visual for V1 (static art +
   dynamic tabs), keeping `procedural-v3` for accurate 6-department mapping.
2. **Authorize one more targeted generation** to obtain exactly 6 floors, then
   add precise per-floor hotspots from the bands above.

Default remains `procedural-v2` until the user approves a change. All tower
modes are preserved: `master`, `procedural-v3`, `procedural-v2`,
`procedural-v1`, `legacy-shell`.
