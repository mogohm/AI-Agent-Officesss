# Bright Office — Final Gap List (source of truth: current screenshot)

Compared: `outputs/final-acceptance-real/00-current-state.png` (current) vs
`references/ai-agent-office-reference.png` (approved reference).
Earlier "approved" wording is void; this list drives FINAL COMPLETION MODE.

## P0 — blocks usage

(none observed — page loads, data real, 0 console errors)

## P1 — blocks user approval

### Graphics

1. **Center tower frame dominates rooms.** The dark shell (side walls, front
   corner column, thick slabs) visually outweighs the interiors; reference
   rooms are wall-to-wall and read first. → Phase 2 deterministic variants
   (lighter frame, column de-emphasis, larger room content in openings).
2. **Rooms partly hidden / recessed.** Openings crop the floor art tightly;
   worker sprites are small and inconsistent between floors. → room-content
   scale pass inside openings.
3. **Floor labels overlap the building.** Tabs sit on the tower edge, covering
   room content; reference tabs are stacked fully OUTSIDE the left edge, small
   and consistent. → shift tabs left, shrink, attach outside the shell edge.
4. **Company thumbnails not premium.** Mini towers float small in empty blue;
   reference cards are large colorful buildings filling the card with night-city
   atmosphere. → bigger thumbnail, fill card, richer city, stronger selected
   ring, tuned Add Company card.
5. **Bottom strip reads as cropped cards, not one storyboard.** Hard panel
   borders, repetitive framing, pasted-looking state chips; reference flows as
   one continuous scene band with speech-bubble labels. → soften separators,
   unify height/crop, bubble-style labels near workers, richer Idle Time crop.

### Functions (Bright UI parity with reference UI)

6. **Department CRUD missing in Bright UI.** Reference panel has
   เพิ่มแผนก/แก้ไขแผนก/ลบแผนก + per-row edit/delete; current panel is
   select-only. Backend endpoints exist (proven by API tests).
7. **Job Description not editable in Bright UI.** Reference shows editable JD +
   "บันทึกการเปลี่ยนแปลง". Backend PUT works.
8. **Project create/edit/delete missing in Bright UI.** Reference has
   สร้างโปรเจกต์ + per-project edit/delete. Backend CRUD works.
9. **Add Company card not wired** (visual only) — must create a company or
   clearly route to the create flow.
10. **AI activity presented without simulation label.** Worker states are a
    simulation of agent.status; V1 must label simulation/preview honestly
    (VPS already labeled mock/demo).

## P2 — minor polish / V2 backlog

- Exact reference palette/proportion match of the tower shell (art-level).
- Worker density per floor lower than reference (needs more sprites — art).
- Animation timing uniformity; walk cycles.
- Mobile dedicated layout (usable stacked fallback exists).
- Thumbnail micro-detail (window lighting variety).
- Minor spacing/text imbalance at some widths.

P2 items are logged in `docs/BRIGHT_OFFICE_V2_BACKLOG.md` — not worked now.
