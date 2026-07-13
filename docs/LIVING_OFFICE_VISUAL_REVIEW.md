# LIVING_OFFICE_VISUAL_REVIEW.md
Reference concept vs the polished production `/companies/1`.
Screenshots: `outputs/screenshots/living-office-polish/`. Scored 0–10 honestly
(pre-polish baseline ≈ 6/10). Target: overall ≥ 8, none below 7.

| # | Category | Before | Now | Notes |
|---|---|---|---|---|
| 1 | Floor visibility | 6 | 8 | Floors taller (slotHeight 168, ~+30%), per-department focal (y≈0.6) shows desks/room depth, not just a middle strip. |
| 2 | Worker visibility | 5 | 8 | Production agent scale +~20% (agentScaleMul 1.2) on taller slots — workers read clearly without zoom. |
| 3 | Building continuity | 8 | 8 | Shell still frames one tower; separators thinned so rooms read first, frame second. |
| 4 | Building richness | 7 | 8 | Six detailed real rooms visible; internal scroll reveals all floors + B1. |
| 5 | Multi-agent feeling | 4 | 7 | Engineering now shows **3 distinct real workers** (Byte/Vera/Ada). Single-identity departments show 1 real worker (honest — bounded by one character each). |
| 6 | Activity readability | 5 | 7 | Each agent shows a department-specific state (coding/analysing/testing/designing…), staggered by agent-id offset. |
| 7 | Bottom-strip quality | 3 | 8 | Rebuilt as mini activity SCENES: cropped darkened floor art background + the real workers on top — little windows into each room. |
| 8 | Overall similarity | 6 | 8 | Left cards · center living tower · right panels · bottom scenes; reads as a living company. |
| 9 | First-impression impact | 6 | 8 | Immediately reads "AI workers running a company." |
| 10 | Living-office feeling | 6 | 8 | Occupied rooms, varied activities, mini scenes. |

**Overall ≈ 7.8** (was ≈ 6). Not inflated to 9 — see gaps.

## What changed (presentation only — no new floor art, no schema/CRUD/shell rebuild)
- `departmentConfig`: added `slotHeight`, `focalX/Y`, `agentScaleMul`, and a **seat map** per department (`{x,y,s,z,facing}`) with depth (back seats smaller, no straight line).
- `FloorSlot`: taller floors, department focal crop, seat-map placement with z-order, larger agents, **thin** separators.
- `WorkerActivityStrip`: rebuilt as mini activity scenes over cropped floor art.
- Demo data: added 2 real agents (Vera=Frontend, Ada=Analyst) to AI Game Studio → Engineering via the real API, so Engineering has 3 distinct workers. No cloned sprites, no schema change.

## Honest remaining gaps
1. **Multi-agent is real only on Engineering** (3 IT/Dev identities exist). The 5 single-identity departments show one worker each; showing 2–3 distinct workers there needs **additional character identities** (deliberately not generated in this no-new-art polish phase — rendering the same sprite twice would be cloning, which is disallowed).
2. **Building needs internal scroll** to see all 6 floors at once (readability was prioritized over fitting every floor in one viewport, per instruction).
3. Floors are still `object-cover` (focal-tuned) rather than a full contain — a dedicated per-floor band re-export would remove all cropping.
4. Activity mix is status-driven from seed data, not yet tied to live project run-state.
