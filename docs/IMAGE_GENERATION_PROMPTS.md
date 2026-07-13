# IMAGE_GENERATION_PROMPTS.md
Exact prompts to generate every asset in `ASSET_MANIFEST.md` with ONE consistent
look. Always: prepend the **STYLE PREFIX**, append the per-asset line, apply the
**NEGATIVE**, export at the size/anchor in `ASSET_DIMENSIONS.md` on a
**transparent background**. Supersedes the earlier `SPRITE_PROMPTS.md`.

> Consistency workflow: generate ONE hero asset first (e.g. `dev-room`), lock its
> seed/style, and reference it as a style anchor for everything else so palette,
> pixel size, iso angle and lighting stay identical across all ~161 files.

## STYLE PREFIX (prepend to EVERY prompt)
```
cute detailed isometric pixel art, true 2:1 isometric dimetric camera (3/4
top-down), consistent pixel size, clean thin outlines, 3-tone shading with soft
ambient occlusion, warm key light from top-left, cozy modern office at night,
dark navy interior (#101A30, #16223A) with warm window light (#FFCF7A) and soft
neon accents (blue #5B8CFF, cyan #3BE8E0, purple #A98BFF, pink #FF7AC6, lime
#5BE49B, amber #FFD166, orange #FF9F6B), professional management-game quality,
cohesive palette and scale, transparent background, no text, no watermark
```

## NEGATIVE (apply if supported)
```
photorealistic, 3d render, realistic photo, blurry, soft focus, jpeg artifacts,
inconsistent perspective, wrong angle, heavy black outline, cartoon vector, flat
minimal, extra limbs, deformed hands, text, letters, ui, hud, watermark, signature,
opaque background, checkerboard background, drop shadow on transparent edge, cropped
```

---

## GROUP 1 — Building exteriors (480×560, transparent, anchor bottom-center)
Base: STYLE PREFIX + `a whole cute isometric office building exterior, several
floors of warm-lit glass windows, small rooftop garden and antenna, entrance
canopy, sitting on a small base, night city bokeh behind, dominant accent color
{COLOR}`.
Make one per COLOR: **blue, purple, teal, green, orange, pink**.

## GROUP 2 — Department rooms (1200×240, 5:1 cutaway, EMPTY chairs)
Base per room: STYLE PREFIX + `isometric cutaway office floor, wide shallow room
slice, two back walls with big night-city windows, wooden floor, ceiling lamps
casting warm light pools, at least two potted plants, a small relaxation corner,
empty office chairs (NO people), furniture and equipment built in, 1200x240 wide
banner composition, leave the far-left ~90px simple` + the department line:

- `lobby-room` → `reception lobby and support area: reception desk, waiting sofas, magazine rack, welcome neon sign, big plants`
- `marketing-room` → `marketing department: creative desks, big campaign charts and analytics dashboards on the wall, sticky-note planning board, string lights`
- `sales-room` → `sales floor: contact desks with phones, a large world map with location pins, CRM dashboards, a deal leaderboard`
- `hr-room` → `HR office: cozy warm room, interview table with two chairs, comfy sofa, resume desk, bookshelf, framed photos`
- `dev-room` → `software development room: darker technical vibe, desks with dual code monitors glowing blue, a small server tower, cable trays, sticker laptops`
- `design-room` → `UI/UX design studio: drawing desks with tablets, a big colorful design monitor, mood and color boards, art supplies, warm studio lamps`
- `game-room` → `game studio: art and dev desks, big game screens, a concept-art wall, character sheets, a beanbag and small arcade cabinet, neon`
- `qa-room` → `QA testing lab: test benches with phones and devices on stands, a bug dashboard screen, a printed checklist board, red/green status lights`
- `data-room` → `data research room: desks facing a big wall of graphs and data dashboards, stacks of research books, a globe, cool blue glow`
- `finance-room` → `finance department: accountant desks, a small safe, filing cabinets, money charts, green accounting screens, ledgers`
- `legal-room` → `legal office: tall wall of law books, heavy desks with document stacks, a brass scales-of-justice, leather chairs, warm lamp`
- `content-room` → `content team room: writing desks, a recording corner with camera on tripod and boom mic, softbox lights, script pages`
- `devops-room` → `devops room: a big wall of monitoring dashboards, a tall server rack with blinking lights, pipeline diagrams, cool glow`
- `product-room` → `product management room: a big kanban board with cards, a roadmap wall, a meeting table with chairs, sticky notes`
- `service-room` → `customer service room: rows of headset desks, a ticket queue board, a smiley KPI board, water cooler, plants`
- `generic-room` → `plain modern office room with a few desks, monitors, chairs and plants`

Framing:
- `rooftop` (1200×160) → STYLE PREFIX + `isometric building rooftop banner: small green garden, air-conditioning units, a satellite antenna with a blinking light, a glowing company sign, night sky`
- `b1-server-room` (1200×260) → STYLE PREFIX + `isometric basement server room banner: rows of tall server racks with blinking cyan LEDs, overhead cable trays, cool cyan ambient glow, a small holographic cloud`

## GROUP 3 — Furniture (≤256×256, loose, anchor bottom-center)
Base: STYLE PREFIX + `a single isometric {ITEM}, game furniture asset, centered,
transparent background`. ITEMs: office desk; corner desk; standing desk; office
chair; lounge chair; two-seat sofa; coffee table; bookshelf; filing cabinet;
reception desk; meeting table; whiteboard; single monitor on desk; dual monitors
on desk; open laptop; office printer; water cooler; coffee machine; small potted
plant; tall potted plant; round rug; wall clock; trash bin; ceiling lamp.

## GROUP 4 — Department equipment (≤320×320, loose)
Base: STYLE PREFIX + `a single isometric {ITEM} prop, transparent background`.
ITEMs (grouped): charts board; analytics screen; campaign poster wall; world map
with pins; CRM screen; deal leaderboard; interview table set; resume paper stack;
wellbeing plant; dual code monitors; server tower; code screen; design tablet and
stylus; color mood boards; UI design monitor; concept-art wall; game screen;
character design board; device test rack; bug dashboard screen; checklist board;
data dashboard wall; research book stack; data globe; small safe; ledger stack;
money chart screen; law book wall; brass scales of justice; document stack; camera
on tripod; boom microphone; script desk; monitoring dashboard wall; server rack;
pipeline screen; kanban board; roadmap wall; product meeting table; reception neon
sign; lobby sofa; welcome plant; headset desk; ticket queue board; queue screen.

## GROUP 5 — Character base bodies (128×192, feet bottom-center)
Base: STYLE PREFIX + `a cute chibi office worker BASE BODY, front 3/4 view,
neutral standing pose, NO hair NO clothes (plain underlayer), consistent skeleton,
head about one third of body, friendly face, skin tone {SKIN}, full body, feet
centered at bottom`. Make 5 (one per skin tone in the palette).

## GROUP 6 — Hairstyles (128×192, aligned to base)
Base: STYLE PREFIX + `a single hairstyle layer for a chibi character, {STYLE},
color {HAIRCOLOR}, aligned to the standard head position, transparent, only the
hair`. STYLEs: short, bob, ponytail, bun, spiky, long straight, curly, buzz cut,
undercut, twin-tails, afro, bald cap. (Generate against the base head so it fits.)

## GROUP 7 — Clothing (128×192, aligned) + 7b Accessories
Clothing base: STYLE PREFIX + `a single clothing layer for a chibi office worker,
{OUTFIT}, aligned to the standard body, transparent, only the clothes`.
OUTFITs: dev hoodie; dev tee with lanyard; colorful designer outfit; trendy
marketer outfit; sales business shirt; HR cardigan; PM blazer; casual QA shirt;
executive suit; intern tee; plain shirt in blue / green / purple / orange / pink.
Accessories: STYLE PREFIX + `a single {ITEM} accessory layer, aligned, transparent`
— glasses; headset; coffee mug in hand; tablet in hand; clipboard; lanyard; cap; headphones.

## GROUP 8 — Working animation sheets (sprite sheet, one row, 8fps)
Base: STYLE PREFIX + `a horizontal pixel-art sprite sheet of a chibi office worker
{LOOK}, {N} frames left to right, looping {STATE} animation, identical character
and lighting every frame, feet aligned, transparent`. 
LOOK = pm | dev-a | dev-b | designer | qa | marketer | sales | hr (see
CHARACTER_SPRITE_SPEC). STATE/N:
`coding`/4 (seated typing at monitor), `designing`/4 (drawing on tablet),
`analysing`/4 (pointing at a chart), `testing`/4 (tapping a device),
`writing`/4 (writing a document), `meeting`/6 (gesturing at a board),
`presenting`/6 (arm out to a screen), `calling`/4 (hand to headset, talking).

## GROUP 9 — Idle animation sheets (sprite sheet, 8fps)
Base: same as Group 8 with STATE/N:
`breathe`/4 (subtle idle bob), `coffee`/4 (sipping a mug), `read`/4 (reading a
book), `chat`/4 (turned, talking to a neighbor), `walk`/4 (walk cycle),
`stretch`/4 (arms up stretch), `phone`/4 (looking at phone), `relax`/4 (sitting
on a sofa leaning back).

## GROUP 10 — Lighting & FX
Lighting (1200×240, mostly transparent, for screen/overlay blend):
- `warm-glow` → STYLE PREFIX + `soft warm light pools overlay for a room, mostly transparent, warm yellow radial glows where lamps are, for screen blend`
- `window-rays` → `soft blue window light rays overlay, mostly transparent`
- `floor-shadow` (strip) → `a soft dark elliptical contact shadow, transparent, for placing under characters`
- `ambient-dust` → `subtle floating dust motes overlay, mostly transparent`
FX (≤128×128, some animated sheets):
- `monitor-glow` (screen glow), `coffee-steam` (4-frame rising steam),
  `zzz` (4-frame sleep zzz), `sparkle` (4-frame sparkles), `thought-bubble`,
  `typing-dots` (4-frame), `exclaim` (! bubble), `heart` (small heart).

## Delivery checklist (per file)
1. Correct size + transparent + correct anchor (`ASSET_DIMENSIONS.md`).
2. Same iso angle, pixel size, palette, top-left light as the style anchor.
3. Export WebP (q≥90) to the exact path in `ASSET_MANIFEST.md`.
4. Refresh the app — the placeholder is replaced automatically.
5. Nudge positions in `lib/assets/departmentScenes.ts` from
   `DEPARTMENT_VISUAL_SPEC.md` so workers sit correctly.
```
