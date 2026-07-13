# Reference Composition Gaps

Honest scoring of the **current production Company Building page** against the
**approved reference** (`references/ai-agent-office-reference.png`). Scores are
read off the screenshot comparison at
`/visual-lab/reference-comparison`, not from memory.

- **Reference:** `apps/web/public/assets/reference/reference.png`
- **Current:** `apps/web/public/assets/reference/current.png`
  (= `outputs/screenshots/reference-composition/company-final-1920x1080.png`)

> Important nuance found while comparing: the reference is **not** uniformly
> bright. Its left company column and center building sit on a **dark navy
> night-city** field, while only the right-hand panels (3–7) are light. Per the
> explicit rebuild brief (page `#EAF3FF`, panels `#FFFFFF`, lighter header) the
> current build goes **fully bright everywhere** — a deliberate divergence from
> the reference's night-city left column, chosen because the brief overrides
> literal fidelity there.

## Scores (0–10)

| # | Dimension | Before (dark build) | Now | Notes |
|---|-----------|:---:|:---:|-------|
| 1 | Page brightness | 2 | **9** | Pale-blue page, white panels everywhere. Brighter than the reference by design. |
| 2 | Left-panel structure | 4 | **6** | Same content (company list, "1 ตึก = 1 บริษัท"). Reference nests the app title + a 2×2 building grid *inside* the left column; ours uses a full-width top header + a stacked list. |
| 3 | Company-card building | 3 | **7** | Was a flat CSS facade. Now a 2.5-D block (front + receding side + roof face, rooftop greenery, warm lit windows). Still CSS, not illustrated isometric art. |
| 4 | Floor height / visible room | 5 | **8** | 185px slots (in the 160–220 target), department-tuned focal crop, real room art reads clearly. |
| 5 | Worker size / visibility | 5 | **6** | Workers are placed on seat maps at readable size, but 1–3 per floor vs the reference's 4–8 chibis. Capped by "no new art / never clone a sprite." |
| 6 | Right-panel background | 3 | **9** | White cards, soft shadow, navy text — matches the reference's light panels. |
| 7 | Bottom-strip style | 4 | **7** | Mini-scenes with real room art + live workers; overlay lightened, Idle-Time card is now a light lounge. Interiors still dimmer than the reference (art is night-lit). |
| 8 | Visual density | 4 | **6** | Cohesive but calmer than the reference's dense, populated floors. |
| 9 | Overall first impression | 4 | **7.5** | Reads as a bright, cute management game rather than a dark cyberpunk dashboard. |

**Overall: ~4/10 → ~7/10.**

## Three largest gaps — and what was done

1. **Company cards looked like flat CSS boxes** → rebuilt `BuildingThumbnail`
   as a 2.5-D isometric building (front facade + darker receding side + roof
   top face with greenery, deterministic warm lit windows). ✅ done.
2. **Bottom-strip mini-scenes were too dark** (heavy `from-black/70` overlay hid
   the interiors) → overlay reduced to a light top-only gradient; the Idle-Time
   card converted from `#0d1730` to a light lounge with a chip label. ✅ done.
3. **Floor tabs were a thin, near-unreadable vertical strip** → reference-style
   bold floor badge: number in a white chip + a legible uppercase department
   label. ✅ done.

## Remaining gaps (art-locked — NOT changed, per "do not generate art")

- Floor interiors are warm **night** rooms; the reference is brighter/daytime.
- **Fewer characters** per floor than the reference (no cloning sprites).
- Buildings are CSS 2.5-D, not fully illustrated isometric art.
- Left column is bright, not the reference's night-city navy (deliberate, per brief).

Closing any of these requires **new generated art**, which is explicitly out of
scope for this rebuild.

## Pass conditions (from the brief)

| Condition | Status |
|-----------|:---:|
| Page is bright | ✅ |
| Buildings on cards (no emoji / tiny CSS) | ✅ 2.5-D buildings |
| Floors readable | ✅ |
| Workers visible | ✅ |
| Right panel light | ✅ |
| Scene strip present | ✅ |
| Management-game feel | ✅ |
| Screenshot comparison shows improvement | ✅ ~4 → ~7 |
