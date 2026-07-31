# Six-Floor Unified Tower Master — Repair Phase Report

**Phase:** SIX-FLOOR UNIFIED TOWER MASTER REPAIR
**Date:** 2026-07-14
**Acceptance gate:** "If floor count is not exactly 6: FAIL, regardless of style."

---

## FINAL STATUS: **B — FAILED**

> **TOWER MASTER 6-FLOOR: FAILED**
> Best visual master still has the wrong floor count (4 furnished floors, not 6).
> Procedural V3 remains the functional fallback and current default.
> **User decision required.**

The image pipeline can reproduce the reference *style* at 8+/10 (warm pixel-art,
isometric chevron, furnished cutaway rooms, B1 server vault, rooftop, right glass
shaft). It **cannot** be made to emit exactly six floors. Across **four total
generation attempts** (two in the earlier 4-floor phase, two in this repair
phase), `gpt-image-1` produced **four** furnished office floors + B1 every single
time — including when a deterministic 6-band structural guide was supplied as the
**primary** reference image. Per the acceptance gate, 4 ≠ 6 = FAIL, regardless of
how good the style is.

---

## What was attempted this phase (2 / 2 calls — limit respected)

The instruction was explicit: do not rely on prompt text alone; force the floor
count with a **structural guide image** used as a primary reference. Both allowed
API calls were spent; **no third call was made** (would require user approval).

| Call | Method | Guide | Result |
|------|--------|-------|--------|
| 1 | 6-floor task, guide v1 as primary reference | v1: 6 numbered bands with large floor labels + B1 + roof + shaft | **4 floors**; guide's large text leaked into the art ("GRD", "OUALITY", "ART G DESIGN") |
| 2 | Revision, guide v2 as primary reference, "ignore any text in the guide" | v2: 6 short numbered bands, **badges only, no large text** | **4 floors**; text leak fixed, but floor count unchanged |

**Guide v2 forced everything except floor count:** it successfully transferred
the isometric chevron composition, the warm palette, the dark separated B1, the
rooftop, and the right glass shaft. The one thing it could not impose was "render
exactly six distinct furnished storeys" — the model collapses the vertical stack
to ~4 tall, richly furnished cutaway rooms because that is what reads as a
believable detailed interior at this canvas size and style.

## Root cause

`gpt-image-1` treats floor count as a soft stylistic hint, not a hard constraint.
At this level of interior detail it consistently renders ~4 tall furnished
storeys regardless of:
- explicit prompt text ("EXACTLY SIX floors", numbered 6→1),
- a deterministic structural guide showing 6 clearly separated thin bands as the
  primary reference,
- badge-only guides that removed the competing text signal.

This is a hard limitation of the model for this composition, not a prompt bug.

---

## Deliverables produced (all retained)

**Assets** — `apps/web/public/assets/themes/reference-bright/tower-master/`
- `ai-office-tower-master.webp` — original 4-floor master (drives `?tower=master`)
- `ai-office-tower-master-4floor-rejected-style-pass.webp` — preserved 4-floor style pass
- `ai-office-tower-master-6floor.webp` — 6-floor candidate (**still 4 floors** — did not pass)
- `structure-guide.png` — deterministic 6-band guide v2 (public copy for the lab)

**Structural guide source** — `references/style-lock/six-floor-tower-structure-guide.png` (guide v2)

**Lab** — `apps/web/app/visual-lab/tower-master/page.tsx`
Modes: `side` (4-way: Reference / Procedural V3 / Master 4-floor / Master 6-floor
candidate), `overlay` (reference + candidate with alpha slider), `master6`,
`master4`, `guide`, `reference`, `v3`, plus a floor-line `guides` toggle.

**Captures** — `outputs/reference-diff/tower-master-6floor/`
- `01-structure-guide.png`, `02-reference.png`, `03-4floor-master.png`,
  `04-6floor-candidate.png`, `05-reference-vs-6floor.png`, `06-overlay-50.png`,
  `side-4way.png` (visual proof the candidate still shows 4 floors)

---

## Gate compliance & non-actions (as instructed)

- ✅ Structural guide image method used (guide as primary reference), not prompt-only.
- ✅ Maximum 2 API calls this phase — exactly 2 used, no overage.
- ✅ 4-floor master preserved under its rejected filename.
- ✅ **Did NOT** integrate `?tower=master-6floor` as a passing production mode (it failed the gate).
- ✅ **Did NOT** deploy, tag, or switch production default (stays `procedural-v2`).
- ✅ **Did NOT** touch left/right/bottom panels, CRUD, or AI integration.

## Build validation (post-phase)

- `next lint` — pass (pre-existing warnings only)
- `tsc --noEmit` — pass
- `next build` — pass (17 routes; `/visual-lab/tower-master` = 1.84 kB)
- Route diagnosis (Playwright): `/visual-lab/tower-master?mode=side` → **0 console errors, 0 failed requests**; `/bright-office` → **0 console errors, 0 failed requests**

---

## User decision required

The floor-count gate cannot be met by generation. Three paths forward, none of
which I will take without your go-ahead:

1. **Accept the current default** — Procedural V3 (true 6-floor, correct count,
   functional; ~4.5–6/10 on style match). Correct data, weaker art. *This is the
   current live state; no action needed.*
2. **Approve more image calls** with a different strategy (e.g. compositing two
   generated 3-floor halves into one 6-floor tower, or generating each floor
   separately and stacking) — higher effort, uncertain, needs a new call budget.
3. **Accept the 4-floor master as decorative** and drive the six real
   departments via the dynamic hotspot overlay on top of it (floor labels/tabs
   map to the 6 depts even though the art shows 4 rooms). Visually strongest,
   but art floor count ≠ data floor count.

My recommendation: **option 1** for correctness now, revisit option 2 only if the
unified-master look is a hard requirement and you're willing to spend more calls
on a compositing approach.
