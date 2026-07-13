# SPRITE_PROMPTS.md

Prompts to generate every asset in `ASSET_MANIFEST.md` with a **consistent**
cute isometric pixel-art style. Use the STYLE PREFIX on every generation, then
append the per-asset line. Generate on a transparent background; export WebP/PNG
at the sizes in the manifest.

> Tip: lock a seed / reference the first successful image as a style anchor so all
> rooms and characters share the same palette, scale, and lighting.

## STYLE PREFIX (prepend to every prompt)
```
cute isometric pixel art, 2:1 isometric angle, high detail, cozy modern office,
warm interior lighting from top-left, soft baked shadows, dark navy walls
(#101A30) with warm window light (#FFCF7A) and soft neon accents
(blue #5B8CFF, cyan #3BE8E0, purple #A98BFF, pink #FF7AC6), clean readable
shapes, game-asset quality, transparent background, no text, no watermark,
consistent scale and palette across the set
```

## NEGATIVE (if supported)
```
photorealistic, 3d render, blurry, low-res, jpeg artifacts, extra limbs,
text, ui, watermark, drop-shadow on transparent edges, cropped, cut off
```

## 1. Department rooms (640×420, empty chairs)
Append to STYLE PREFIX. All: "furnished isometric office room, cutaway with two
back walls and floor, empty office chairs (no people), several plants, computer
monitors glowing, 640x420".

- **marketing-room**: `…marketing department, big campaign charts and analytics dashboards on the wall, planning whiteboard with sticky notes, creative desks`
- **sales-room**: `…sales department, large world map on the wall with location pins, CRM dashboards on monitors, phones on desks`
- **hr-room**: `…HR department, warm cozy room, interview table with two chairs, comfy sofa, bookshelf, resume papers on a desk`
- **dev-room**: `…software development room, darker technical vibe, desks with multiple monitors showing code, a small server tower, cables, blue screen glow`
- **design-room**: `…UI/UX design studio, drawing tablet and stylus, large design monitor with colorful UI, mood/color boards, art supplies`
- **qa-room**: `…QA testing lab, several test devices and phones on stands, bug dashboard on screen, printed checklist board`
- **game-room**: `…game studio, concept art wall, monitors showing a cute game, character design boards, gameplay diagrams`
- **data-room**: `…data research room, big graphs and data dashboards, stacks of research books, world data map`
- **finance-room**: `…finance department, money charts, ledgers, a small safe, calculator, green accounting screens`
- **legal-room**: `…legal office, tall bookshelves of law books, documents, a brass scales-of-justice on the desk`
- **content-room**: `…content team, writing desks, a camera on a tripod, a microphone, script pages`
- **devops-room**: `…devops room, wall of monitoring dashboards, a tall server rack with blinking lights, pipeline diagrams`
- **product-room**: `…product management room, big kanban board with cards, roadmap on the wall, meeting table`
- **support-room**: `…reception and support lobby, reception desk, waiting sofa, plants, welcome sign`
- **service-room**: `…customer service room, rows of headset desks, a ticket queue board on the wall`
- **generic-room**: `…plain modern office room with a few desks, monitors and plants`

## 2. Infrastructure & framing
- **server-room** (640×360): STYLE PREFIX + `basement server room, rows of tall server racks with blinking cyan LED lights, cable trays, cyan ambient glow, cool tech vibe`
- **rooftop** (640×200): STYLE PREFIX + `building rooftop, small green garden, air-conditioning units, a satellite antenna, a neon company sign, night sky`
- **thumbs/thumb-COLOR** (240×260): STYLE PREFIX + `a whole cute isometric office building exterior, glass windows lit warm, small rooftop garden and antenna, dominant accent color COLOR, sitting on a small base` (make one per color: blue, purple, teal, green, orange, pink)

## 3. Worker characters (96×140, feet centered, transparent)
Append to STYLE PREFIX + `small cute chibi office worker, full body, front-3/4
isometric view, feet at bottom center, single character, clean silhouette`.
Keep the SAME body proportions across all looks/states.

**Looks (outfit/hair):**
- `pm`: `smart casual blazer, tidy hair, holding a small clipboard`
- `dev-a`: `hoodie, headphones around neck, glasses`
- `dev-b`: `t-shirt with lanyard, short hair`
- `designer`: `stylish colorful outfit, beanie, holding a stylus`
- `qa`: `casual shirt, holding a phone/test device`
- `marketer`: `trendy outfit, holding a tablet`
- `sales`: `business shirt, headset`
- `hr`: `friendly cardigan, warm smile`

**States (pose) — generate each look in each pose:**
- `idle`: `standing relaxed, breathing`
- `working`: `sitting and typing at a desk, focused` *(hands forward as if at keyboard)*
- `thinking`: `hand on chin, thought bubble`
- `coffee`: `holding a coffee mug, sipping`
- `reading`: `reading a book`
- `chatting`: `waving/talking, friendly gesture`
- `walking`: `mid-step walking pose`

> Batch tip: generate one look's 7 states together (or as a labeled sheet) to
> keep the character identical across states, then slice to the 7 files.

## 4. Optional overlays
- `lighting/warm-glow` (640×420): `soft radial warm light gradient, transparent, for screen-blend overlay` (mostly transparent, warm center)
- `lighting/floor-shadow`: `soft dark elliptical contact shadow strip, transparent`

## 5. After generating
1. Export at the manifest sizes, transparent WebP.
2. Drop into `apps/web/public/assets/…` at the exact paths.
3. Refresh — placeholders are replaced automatically.
4. Fine-tune seat coordinates in `lib/assets/departmentScenes.ts` so workers sit
   on the chairs.
