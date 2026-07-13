# DEPARTMENT_VISUAL_SPEC.md
Per-department art brief + placement data for all 15 departments. Coordinates are
% of the **1200×240** room module (floor line at y≈55%). The engine reads
`positions` into `lib/assets/departmentScenes.ts`. Camera/palette per
`ASSET_DIMENSIONS.md`.

## Position schema
`{ x%, y%, scale, z, kind, facing }`
- `kind`: `work` (a desk/station) or `idle` (lounge/relax/window spot).
- `facing`: `left` | `right` (desk orientation for the sprite).
- Assign agents to `work` first; extras go to `idle`.
- `scale` shrinks back-row workers for depth (0.8–1.05). `z` = paint order.

## Global room recipe (applies to every floor)
Baked into each `*-room.webp`: back-left + back-right walls with **windows**
showing the night city, a **floor**, **ceiling lamps** casting warm pools, at
least **2 plants**, a **relaxation corner** (sofa or window), and the
department's signature equipment (below). Left ~90px kept simple for the app tab.

---

### 1. Lobby / Support — `floors/lobby-room.webp` · accent `#3BE8E0`
- Furniture: reception desk, waiting sofa ×2, coffee table, magazine rack, rug.
- Decorations: big potted plants, welcome neon sign, wall clock, water feature.
- Equipment: `reception-sign`, `lobby-sofa`, `welcome-plant`.
- Positions: `[{28,60,1.0,3,work,right}, {70,56,0.9,2,idle,left}, {86,52,0.82,1,idle,left}]`
- Working: receptionist `calling`/`writing`. Idle: `read`, `coffee`, `chat` on sofa.

### 2. Marketing — `floors/marketing-room.webp` · accent `#FF9F6B`
- Furniture: creative desks ×3, standing desk, whiteboard, bookshelf, plants.
- Decorations: campaign posters, sticky-note wall, string lights.
- Equipment: `charts-board`, `analytics-screen`, `campaign-wall`.
- Positions: `[{24,60,0.95,2,work,right}, {45,64,1.0,3,work,left}, {66,60,0.95,2,work,right}, {84,54,0.82,1,idle,left}]`
- Working: `analysing` (charts), `writing` (campaign). Idle: `coffee`, `chat`.

### 3. Sales — `floors/sales-room.webp` · accent `#5B8CFF`
- Furniture: contact desks ×3 with phones, filing cabinet, meeting nook.
- Decorations: big world map with pins, deal leaderboard, trophies.
- Equipment: `world-map`, `crm-screen`, `deal-board`.
- Positions: `[{26,60,0.95,2,work,right}, {47,64,1.0,3,work,left}, {68,60,0.95,2,work,right}, {85,54,0.82,1,idle,left}]`
- Working: `calling` (headset), `analysing` (CRM). Idle: `coffee`, `phone`.

### 4. HR — `floors/hr-room.webp` · accent `#FF7AC6`
- Furniture: interview table + 2 chairs, resume desk, comfy sofa, bookshelf.
- Decorations: warm rug, plants, "we're hiring" board, framed photos.
- Equipment: `interview-set`, `resume-stack`, `wellbeing-plant`.
- Positions: `[{30,62,1.0,3,work,right}, {55,58,0.92,2,work,left}, {80,54,0.85,1,idle,left}]`
- Working: `meeting` (interview), `reading` (resume). Idle: `chat`, `relax`.

### 5. IT / Development — `floors/dev-room.webp` · accent `#5BE49B`
- Furniture: dev desks ×3 (dual monitors), server tower, cable trays, chairs.
- Decorations: blue screen glow, sticker-covered laptops, dark-tech vibe, plant.
- Equipment: `multi-monitor`, `server-tower`, `code-screen`.
- Positions: `[{24,60,0.95,2,work,right}, {44,64,1.0,3,work,left}, {64,60,0.95,2,work,right}, {83,54,0.82,1,idle,left}]`
- Working: `coding` (typing-dots FX). Idle: `coffee`, `stretch`.

### 6. Design — `floors/design-room.webp` · accent `#A98BFF`
- Furniture: drawing desks, standing desk, mood-board wall, shelf of supplies.
- Decorations: color swatches, framed art, plants, warm studio lamps.
- Equipment: `design-tablet`, `color-boards`, `ui-monitor`.
- Positions: `[{26,60,0.95,2,work,right}, {47,64,1.0,3,work,left}, {70,58,0.9,2,work,right}, {86,54,0.82,1,idle,left}]`
- Working: `designing` (sparkle FX). Idle: `coffee`, `phone`.

### 7. Game Studio — `floors/game-room.webp` · accent `#FFD166`
- Furniture: dev/art desks, big screens, beanbag, arcade cabinet, shelf of figures.
- Decorations: concept-art wall, character sheets, neon, plants.
- Equipment: `concept-wall`, `game-screen`, `character-board`.
- Positions: `[{24,60,0.95,2,work,right}, {45,64,1.0,3,work,left}, {66,60,0.95,2,work,right}, {84,54,0.82,1,idle,left}]`
- Working: `designing`/`coding`. Idle: `relax` (beanbag), `phone` (playing).

### 8. QA / Testing — `floors/qa-room.webp` · accent `#FFD166`
- Furniture: test benches, device rack, desks, checklist board.
- Decorations: bug dashboard screen, red/green status lights, plant.
- Equipment: `device-rack`, `bug-dashboard`, `checklist-board`.
- Positions: `[{26,60,0.95,2,work,right}, {48,64,1.0,3,work,left}, {70,58,0.9,2,work,right}, {86,54,0.82,1,idle,left}]`
- Working: `testing` (exclaim FX on bug). Idle: `coffee`, `stretch`.

### 9. Data / Research — `floors/data-room.webp` · accent `#3BE8E0`
- Furniture: research desks, big data-wall, bookshelf, globe stand.
- Decorations: graphs, charts, sticky formulas, cool blue glow, plant.
- Equipment: `data-dashboard`, `research-books`, `data-globe`.
- Positions: `[{26,60,0.95,2,work,right}, {48,64,1.0,3,work,left}, {70,58,0.9,2,work,right}, {86,54,0.82,1,idle,left}]`
- Working: `analysing`. Idle: `read`, `coffee`.

### 10. Finance — `floors/finance-room.webp` · accent `#5BE49B`
- Furniture: accountant desks, safe, filing cabinets, meeting nook.
- Decorations: money charts, ledgers, green accounting screens, plant.
- Equipment: `safe`, `ledger-stack`, `money-chart`.
- Positions: `[{28,60,0.95,2,work,right}, {50,64,1.0,3,work,left}, {74,56,0.88,1,idle,left}]`
- Working: `writing`/`analysing`. Idle: `coffee`, `stretch`.

### 11. Legal — `floors/legal-room.webp` · accent `#9AA7C7`
- Furniture: heavy desks, tall law-book wall, document stacks, leather chairs.
- Decorations: scales of justice, framed certificates, warm lamp, plant.
- Equipment: `law-bookwall`, `scales-justice`, `document-stack`.
- Positions: `[{30,62,1.0,3,work,right}, {56,58,0.9,2,work,left}, {82,54,0.84,1,idle,left}]`
- Working: `reading`/`writing`. Idle: `coffee`, `read`.

### 12. Content — `floors/content-room.webp` · accent `#FF7AC6`
- Furniture: writing desks, recording corner, shelf, standing desk.
- Decorations: camera on tripod, mic boom, softbox lights, script pages, plant.
- Equipment: `camera-tripod`, `mic-boom`, `script-desk`.
- Positions: `[{26,60,0.95,2,work,right}, {48,64,1.0,3,work,left}, {72,56,0.9,1,idle,left}]`
- Working: `writing`/`presenting`. Idle: `coffee`, `phone`.

### 13. DevOps — `floors/devops-room.webp` · accent `#3BE8E0`
- Furniture: ops desks, big monitoring wall, server rack, chairs.
- Decorations: pipeline diagrams, status LEDs, cool glow, plant.
- Equipment: `monitoring-wall`, `server-rack`, `pipeline-screen`.
- Positions: `[{26,60,0.95,2,work,right}, {48,64,1.0,3,work,left}, {70,58,0.9,2,work,right}, {86,54,0.82,1,idle,left}]`
- Working: `coding`/`analysing`. Idle: `coffee`, `stretch`.

### 14. Product Management — `floors/product-room.webp` · accent `#5B8CFF`
- Furniture: kanban board, roadmap wall, meeting table + chairs, standing desk.
- Decorations: sticky notes, charts, plants, warm light.
- Equipment: `kanban-board`, `roadmap-wall`, `product-meeting-table`.
- Positions: `[{30,60,1.0,3,work,right}, {55,58,0.92,2,work,left}, {80,54,0.85,1,idle,left}]`
- Working: `meeting`/`presenting`. Idle: `coffee`, `chat`.

### 15. Customer Service — `floors/service-room.webp` · accent `#5B8CFF`
- Furniture: rows of headset desks, ticket board, water cooler, plants.
- Decorations: queue screen, smiley KPI board, warm light.
- Equipment: `headset-desk`, `ticket-board`, `queue-screen`.
- Positions: `[{25,60,0.95,2,work,right}, {46,64,1.0,3,work,left}, {67,60,0.95,2,work,right}, {85,54,0.82,1,idle,left}]`
- Working: `calling`. Idle: `coffee`, `stretch`.

---

## Rooftop — `floors/rooftop.webp`
Roof garden (grass, shrubs), AC units, satellite antenna with blinking light,
company neon sign, night sky. No workers (optional 1 idle "look out over city").

## B1 Server Room — `floors/b1-server-room.webp` · accent `#3BE8E0`
Rows of tall server racks with blinking cyan LEDs, cable trays overhead, a cool
cyan ambient glow, one small holographic cloud icon. Optional 1 devops worker
`analysing`. Reads as infrastructure, not a normal office.

## Cross-department consistency checklist
- Same iso angle, same floor-line Y, same light direction in every room.
- Every room: ≥2 plants, warm lamp pools, a relax corner, ≥3 work stations.
- Signature equipment must be instantly recognizable per department.
- Windows always show the same night-city style for a cohesive tower.
