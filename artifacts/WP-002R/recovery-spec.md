# WP-002R — Canonical Asset Recovery Specification

Reconstructed from repository source, not from memory: `lib/delivery/prompts/asset-prompts.ts`
(identities, furniture, accents, state treatments), `lib/delivery/agents/asset-standardize.ts`
(canvas sizes, alpha, no-people rules) and `lib/delivery/anchor-spec.ts` (structural frame).

| Field | Value |
|---|---|
| Target baseline | **v1.1.0** |
| Parent historical baseline | v1.0.0 (`SOURCE_BYTES_UNRECOVERABLE`) |
| Decision | `VISUAL-2026-001-ASSET-RECOVERY-001` |
| Style lock | 1.0.0 · prompts 1.0.0 · anchors 1.1.0 |
| Reference | `references/ai-agent-office-reference.png` |
| Assets | 17 — 4 buildings, 7 floors, 6 worker states |
| Max candidates per asset | 5 |


## Buildings — 4

### `company-a-building`

- **Purpose** — Company building preview for variant company-a, rendered in CompanyBuildingCard on Dashboard and Companies pages
- **Path** — `apps/web/public/assets/office/buildings/company-a-building.webp`
- **Public URL** — `/assets/office/buildings/company-a-building.webp`
- **Canvas** — 1024×768 (4:3), webp, alpha: none
- **Identity** — modern blue-glass corporate AI headquarters
- **Detail** — 6 visible storeys, blue-tinted glass curtain walls, a rooftop garden with trees and planters, a lit ground-floor entrance canopy
- **Prompt template** — `company-building` (square)
- **Constraints**
  - full roof visible
  - full facade visible
  - full base visible
  - clean silhouette
  - readable at dashboard card scale
  - object-fit: contain â€” must not rely on cropping
  - visually distinct from the other three variants; not a recolour

### `company-b-building`

- **Purpose** — Company building preview for variant company-b, rendered in CompanyBuildingCard on Dashboard and Companies pages
- **Path** — `apps/web/public/assets/office/buildings/company-b-building.webp`
- **Public URL** — `/assets/office/buildings/company-b-building.webp`
- **Canvas** — 1024×768 (4:3), webp, alpha: none
- **Identity** — warm beige and gold stone business tower
- **Detail** — 5 visible storeys, sandstone and brass facade, arched windows, a modern rooftop terrace garden, a stepped entrance
- **Prompt template** — `company-building` (square)
- **Constraints**
  - full roof visible
  - full facade visible
  - full base visible
  - clean silhouette
  - readable at dashboard card scale
  - object-fit: contain â€” must not rely on cropping
  - visually distinct from the other three variants; not a recolour

### `company-c-building`

- **Purpose** — Company building preview for variant company-c, rendered in CompanyBuildingCard on Dashboard and Companies pages
- **Path** — `apps/web/public/assets/office/buildings/company-c-building.webp`
- **Public URL** — `/assets/office/buildings/company-c-building.webp`
- **Canvas** — 1024×768 (4:3), webp, alpha: none
- **Identity** — purple creative studio loft
- **Detail** — 4 visible storeys, violet brick and industrial steel-framed windows, colourful rooftop studio pods and string lights, a bold artistic entrance
- **Prompt template** — `company-building` (square)
- **Constraints**
  - full roof visible
  - full facade visible
  - full base visible
  - clean silhouette
  - readable at dashboard card scale
  - object-fit: contain â€” must not rely on cropping
  - visually distinct from the other three variants; not a recolour

### `company-d-building`

- **Purpose** — Company building preview for variant company-d, rendered in CompanyBuildingCard on Dashboard and Companies pages
- **Path** — `apps/web/public/assets/office/buildings/company-d-building.webp`
- **Public URL** — `/assets/office/buildings/company-d-building.webp`
- **Canvas** — 1024×768 (4:3), webp, alpha: none
- **Identity** — dark high-tech infrastructure tower
- **Detail** — 6 visible storeys, near-black metal panels with cyan light strips along the edges, satellite dishes and cooling units on the roof, a minimal secure entrance
- **Prompt template** — `company-building` (square)
- **Constraints**
  - full roof visible
  - full facade visible
  - full base visible
  - clean silhouette
  - readable at dashboard card scale
  - object-fit: contain â€” must not rely on cropping
  - visually distinct from the other three variants; not a recolour


## Floors — 7

### `marketing-floor-empty`

- **Purpose** — Empty marketing department floor scene; workers are composited dynamically on top at runtime
- **Path** — `apps/web/public/assets/office/floors/marketing-floor-empty.webp`
- **Public URL** — `/assets/office/floors/marketing-floor-empty.webp`
- **Canvas** — 1600×600 (8:3), webp, alpha: none
- **Department** — marketing
- **Furniture** — campaign boards, presentation screens showing abstract charts, mood-board walls, leafy plants, lounge sofa
- **Accent** — purple and magenta
- **Prompt template** — `department-floor-empty` (landscape)
- **Constraints**
  - absolutely no baked-in people â€” WP-001 rejected prior art for suspectedBakedCharacters
  - consistent perspective across all 7 floors for tower alignment
  - compatible floor boundaries for vertical stacking
  - no baked text labels that would collide with UI overlays
  - must satisfy FloorAnchorSpec v1.1.0 structural frame

### `sales-floor-empty`

- **Purpose** — Empty sales department floor scene; workers are composited dynamically on top at runtime
- **Path** — `apps/web/public/assets/office/floors/sales-floor-empty.webp`
- **Public URL** — `/assets/office/floors/sales-floor-empty.webp`
- **Canvas** — 1600×600 (8:3), webp, alpha: none
- **Department** — sales
- **Furniture** — a large world-map wall display, call-station desks with headsets on stands, revenue dashboard screens, filing cabinets
- **Accent** — blue and cyan
- **Prompt template** — `department-floor-empty` (landscape)
- **Constraints**
  - absolutely no baked-in people â€” WP-001 rejected prior art for suspectedBakedCharacters
  - consistent perspective across all 7 floors for tower alignment
  - compatible floor boundaries for vertical stacking
  - no baked text labels that would collide with UI overlays
  - must satisfy FloorAnchorSpec v1.1.0 structural frame

### `hr-floor-empty`

- **Purpose** — Empty human resources department floor scene; workers are composited dynamically on top at runtime
- **Path** — `apps/web/public/assets/office/floors/hr-floor-empty.webp`
- **Public URL** — `/assets/office/floors/hr-floor-empty.webp`
- **Canvas** — 1600×600 (8:3), webp, alpha: none
- **Department** — human resources
- **Furniture** — a warm interview corner with armchairs, bookshelves, framed abstract art, a coffee table, potted plants
- **Accent** — soft pink and warm beige
- **Prompt template** — `department-floor-empty` (landscape)
- **Constraints**
  - absolutely no baked-in people â€” WP-001 rejected prior art for suspectedBakedCharacters
  - consistent perspective across all 7 floors for tower alignment
  - compatible floor boundaries for vertical stacking
  - no baked text labels that would collide with UI overlays
  - must satisfy FloorAnchorSpec v1.1.0 structural frame

### `it-dev-floor-empty`

- **Purpose** — Empty software engineering department floor scene; workers are composited dynamically on top at runtime
- **Path** — `apps/web/public/assets/office/floors/it-dev-floor-empty.webp`
- **Public URL** — `/assets/office/floors/it-dev-floor-empty.webp`
- **Canvas** — 1600×600 (8:3), webp, alpha: none
- **Department** — software engineering
- **Furniture** — long developer desks with multiple monitors showing abstract code, a small server rack, mechanical keyboards, desk plants
- **Accent** — teal and cyan
- **Prompt template** — `department-floor-empty` (landscape)
- **Constraints**
  - absolutely no baked-in people â€” WP-001 rejected prior art for suspectedBakedCharacters
  - consistent perspective across all 7 floors for tower alignment
  - compatible floor boundaries for vertical stacking
  - no baked text labels that would collide with UI overlays
  - must satisfy FloorAnchorSpec v1.1.0 structural frame

### `design-meeting-floor-empty`

- **Purpose** — Empty design and meeting department floor scene; workers are composited dynamically on top at runtime
- **Path** — `apps/web/public/assets/office/floors/design-meeting-floor-empty.webp`
- **Public URL** — `/assets/office/floors/design-meeting-floor-empty.webp`
- **Canvas** — 1600×600 (8:3), webp, alpha: none
- **Department** — design and meeting
- **Furniture** — drawing tablets, a large mood-board wall, colour swatch panels, a central meeting table with empty chairs, a projector screen
- **Accent** — orange and violet
- **Prompt template** — `department-floor-empty` (landscape)
- **Constraints**
  - absolutely no baked-in people â€” WP-001 rejected prior art for suspectedBakedCharacters
  - consistent perspective across all 7 floors for tower alignment
  - compatible floor boundaries for vertical stacking
  - no baked text labels that would collide with UI overlays
  - must satisfy FloorAnchorSpec v1.1.0 structural frame

### `lobby-support-floor-empty`

- **Purpose** — Empty lobby and support reception department floor scene; workers are composited dynamically on top at runtime
- **Path** — `apps/web/public/assets/office/floors/lobby-support-floor-empty.webp`
- **Public URL** — `/assets/office/floors/lobby-support-floor-empty.webp`
- **Canvas** — 1600×600 (8:3), webp, alpha: none
- **Department** — lobby and support reception
- **Furniture** — a curved reception desk, waiting sofas, a large plant, a blank feature panel on the wall, floor lamps
- **Accent** — warm amber and green
- **Prompt template** — `department-floor-empty` (landscape)
- **Constraints**
  - absolutely no baked-in people â€” WP-001 rejected prior art for suspectedBakedCharacters
  - consistent perspective across all 7 floors for tower alignment
  - compatible floor boundaries for vertical stacking
  - no baked text labels that would collide with UI overlays
  - must satisfy FloorAnchorSpec v1.1.0 structural frame

### `server-floor-empty`

- **Purpose** — Empty server / infrastructure floor scene; reachable only via explicit infrastructure department aliases
- **Path** — `apps/web/public/assets/office/floors/server-floor-empty.webp`
- **Public URL** — `/assets/office/floors/server-floor-empty.webp`
- **Canvas** — 1600×600 (8:3), webp, alpha: none
- **Department** — server / infrastructure
- **Furniture** — server racks, patch panels, cable trays, cooling units, status LEDs
- **Accent** — cyan and deep blue
- **Prompt template** — `server-floor-empty` (landscape)
- **Constraints**
  - no baked-in people
  - consistent perspective with the other 6 floors
  - must satisfy FloorAnchorSpec v1.1.0 structural frame


## Worker fallback states — 6

### `idle`

- **Purpose** — Default fallback worker sprite for runtime state "idle and waiting"
- **Path** — `apps/web/public/assets/office/workers/default/idle.webp`
- **Public URL** — `/assets/office/workers/default/idle.webp`
- **Canvas** — 512×768 (2:3), webp, alpha: required
- **State** — idle and waiting
- **Treatment** — relaxed neutral standing pose, calm soft green visor glow
- **Prompt template** — `worker-fallback-state` (portrait)
- **Constraints**
  - SAME character identity across all 6 states â€” not six different characters
  - consistent character scale and camera/perspective across all 6
  - transparent background required (alpha)
  - no transparent-edge contamination
  - state differentiated by pose/glow/prop only, never by identity change
  - feet anchored at a consistent baseline for floor-plane compositing

### `working`

- **Purpose** — Default fallback worker sprite for runtime state "actively working"
- **Path** — `apps/web/public/assets/office/workers/default/working.webp`
- **Public URL** — `/assets/office/workers/default/working.webp`
- **Canvas** — 512×768 (2:3), webp, alpha: required
- **State** — actively working
- **Treatment** — leaning forward slightly with arms raised as if typing, bright blue visor glow and small motion sparks
- **Prompt template** — `worker-fallback-state` (portrait)
- **Constraints**
  - SAME character identity across all 6 states â€” not six different characters
  - consistent character scale and camera/perspective across all 6
  - transparent background required (alpha)
  - no transparent-edge contamination
  - state differentiated by pose/glow/prop only, never by identity change
  - feet anchored at a consistent baseline for floor-plane compositing

### `thinking`

- **Purpose** — Default fallback worker sprite for runtime state "thinking / reasoning"
- **Path** — `apps/web/public/assets/office/workers/default/thinking.webp`
- **Public URL** — `/assets/office/workers/default/thinking.webp`
- **Canvas** — 512×768 (2:3), webp, alpha: required
- **State** — thinking / reasoning
- **Treatment** — one hand raised near the head, amber visor glow, small floating thought dots above the head
- **Prompt template** — `worker-fallback-state` (portrait)
- **Constraints**
  - SAME character identity across all 6 states â€” not six different characters
  - consistent character scale and camera/perspective across all 6
  - transparent background required (alpha)
  - no transparent-edge contamination
  - state differentiated by pose/glow/prop only, never by identity change
  - feet anchored at a consistent baseline for floor-plane compositing

### `waiting-approval`

- **Purpose** — Default fallback worker sprite for runtime state "waiting for human approval"
- **Path** — `apps/web/public/assets/office/workers/default/waiting-approval.webp`
- **Public URL** — `/assets/office/workers/default/waiting-approval.webp`
- **Canvas** — 512×768 (2:3), webp, alpha: required
- **State** — waiting for human approval
- **Treatment** — standing patiently holding up a blank document panel, purple visor glow
- **Prompt template** — `worker-fallback-state` (portrait)
- **Constraints**
  - SAME character identity across all 6 states â€” not six different characters
  - consistent character scale and camera/perspective across all 6
  - transparent background required (alpha)
  - no transparent-edge contamination
  - state differentiated by pose/glow/prop only, never by identity change
  - feet anchored at a consistent baseline for floor-plane compositing

### `error`

- **Purpose** — Default fallback worker sprite for runtime state "error / failure"
- **Path** — `apps/web/public/assets/office/workers/default/error.webp`
- **Public URL** — `/assets/office/workers/default/error.webp`
- **Canvas** — 512×768 (2:3), webp, alpha: required
- **State** — error / failure
- **Treatment** — slumped posture with a red visor glow and a small warning triangle symbol floating above (no letters)
- **Prompt template** — `worker-fallback-state` (portrait)
- **Constraints**
  - SAME character identity across all 6 states â€” not six different characters
  - consistent character scale and camera/perspective across all 6
  - transparent background required (alpha)
  - no transparent-edge contamination
  - state differentiated by pose/glow/prop only, never by identity change
  - feet anchored at a consistent baseline for floor-plane compositing

### `offline`

- **Purpose** — Default fallback worker sprite for runtime state "offline / powered down"
- **Path** — `apps/web/public/assets/office/workers/default/offline.webp`
- **Public URL** — `/assets/office/workers/default/offline.webp`
- **Canvas** — 512×768 (2:3), webp, alpha: required
- **State** — offline / powered down
- **Treatment** — powered-down slouched posture, dark unlit visor, desaturated grey colouring
- **Prompt template** — `worker-fallback-state` (portrait)
- **Constraints**
  - SAME character identity across all 6 states â€” not six different characters
  - consistent character scale and camera/perspective across all 6
  - transparent background required (alpha)
  - no transparent-edge contamination
  - state differentiated by pose/glow/prop only, never by identity change
  - feet anchored at a consistent baseline for floor-plane compositing


## Known rejected defects carried forward

- WP-001 rejected prior floor art for `suspectedBakedCharacters` (confidence 0.7) — floors must be genuinely empty.
- A prior building candidate was rejected for a dark outfit variant (`archive/*-rejected.webp` in the legacy tree).
- Buildings must not be four recolours of one silhouette; independent review must confirm identity separation.
- Worker sprites must be one character in six states, never six characters.

## Review gate

Per §4, generation must not begin until this specification is reviewed.