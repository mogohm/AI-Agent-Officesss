# Reference-Bright Theme Prompts

## Unified tower shell

```
One complete cute premium isometric pixel-art OFFICE TOWER BUILDING on a
fully TRANSPARENT background - a standalone architectural game asset. Copy
the building architecture of the tall cutaway tower in reference image #1
(the approved management-game mockup) as closely as possible:

- a tall 6-floor cutaway tower seen in the same 3/4 isometric perspective,
  floor slabs running on the same ~15 degree diagonal
- a ROOFTOP GARDEN on top: plants, a small sign plate, a tiny antenna,
  slight roof overhang
- SIX large open floor openings stacked with even ~12%-of-height pitch;
  each opening is a parallelogram following the diagonal perspective
- CRITICAL: the six floor openings are EMPTY NEUTRAL interiors - plain
  light warm walls and bare wood floors only, NO furniture, NO desks, NO
  screens, NO people (dynamic room content will be composited into these
  openings by the game engine)
- dark structural FLOOR SLABS between openings (6-10px bands with thin
  balcony rails)
- a LEFT structural column edge and a RIGHT-SIDE vertical glass ELEVATOR /
  utility shaft (about 10% of width) running the full height with visible
  cab and cables, welding all floors into one silhouette
- glass exterior edges catching daylight
- a B1 BASEMENT level at the bottom: dark server-room architecture with a
  glowing cloud icon and small green server lights, part of the same
  structure, plus a simple foundation/street base

Bright daytime lighting matching reference image #1, fine pixel density,
thin dark outlines, cheerful management-game feel. The building fills the
frame vertically. TRANSPARENT everywhere outside the building silhouette.
NO text except a tiny blank sign plate, NO watermark, NO city background
(transparent), NO night, NO cyberpunk.
```

Reference #1 = `references/ai-agent-office-reference.png` (PRIMARY:
architecture, silhouette, perspective, roof, elevator, floor spacing).
Reference #2 = `references/style-lock/reference-floor-isometric-sample.png`
(floor-opening perspective sample).

## Unified tower shell wide

```
Recreate the cute premium isometric pixel-art office tower of reference
image #2 on a fully transparent background - same architecture language:
rooftop garden with sign and antenna, dark structural frame, left column
edge, right-side elevator/utility shaft with windows, dark floor slabs,
EXACTLY SIX empty neutral floor openings (light walls, bare wood floors,
NO furniture, NO people), and the B1 basement with the glowing cloud
server room and foundation.

WITH ONE CRITICAL CORRECTION - THE PROPORTION: reference image #2 is far
too slim (about 0.45 width-to-height). The new building must match the
WIDE tower of reference image #1: approximately 0.71 width-to-height,
like the original mockup building. Make the building broad and
room-dominant: each of the six floor openings is a WIDE room strip
spanning most of the building width, so the ROOM INTERIORS dominate and
the architectural frame only borders them. Wide floor plates, generous
open rooms, slimmer relative columns. NOT a narrow skyscraper.

Count check: exactly 6 (six) wide floor openings between the rooftop and
B1. Bright daytime lighting, fine pixel density, thin dark outlines,
cheerful management-game feel, TRANSPARENT outside the silhouette, NO
text, NO watermark, NO background.
```

Reference #1 = `references/ai-agent-office-reference.png` (PRIMARY: tower
width, silhouette, room-to-frame ratio, side depth).
Reference #2 = the approved slim shell (SECONDARY: six-opening
architecture, elevator, B1, dynamic-ready openings).

## Unified tower shell revision

```
Recreate reference image #2 EXACTLY - the same cute premium isometric
pixel-art office tower on a fully transparent background, same
architecture, same rooftop garden with sign and antenna, same dark
structural frame and columns, same right-side elevator/utility shaft with
windows, same empty neutral floor openings with light walls and bare wood
floors (NO furniture, NO people), same B1 basement with the glowing cloud
server room, same foundation.

WITH EXACTLY ONE CORRECTION: the tower must have EXACTLY SIX stacked floor
openings between the rooftop and the B1 basement - reference image #2 has
only five. Make each opening slightly shorter so six identical openings
fit in the same overall building height. Count them: 6 (six) floor
openings, then the B1 basement below.

Same bright daytime lighting, same pixel density, same outlines,
TRANSPARENT outside the silhouette, NO text, NO watermark, NO background.
```

Reference #1 = `references/ai-agent-office-reference.png` (architecture
authority). Reference #2 = the v1 shell (everything else stays identical).

Prompts for the **reference-bright** asset namespace
(`apps/web/public/assets/themes/reference-bright/`). This is a NEW art
direction cloned from `references/ai-agent-office-reference.png` — bright,
daytime, pastel, cute. It must NOT inherit the dark/night palette of the
existing floor assets (those are now the DARK THEME and stay untouched).

Style anchors (from the reference image):
- cute isometric pixel art, fine pixel density, thin dark outlines
- **bright daytime lighting**, soft warm sunlight from the upper left
- white / light-gray walls, lighter wood furniture
- pastel blue sky visible through large windows
- colorful department accent colors, plants everywhere
- soft shadows, no harsh contrast, NO night, NO neon-cyberpunk

## Engineering bright floor

```
Cute isometric pixel-art office floor interior for an Engineering / IT
department, in EXACTLY the visual style of reference image #1 (the approved
game mockup): bright cheerful daytime office, soft warm sunlight from the
upper left, white and light-gray walls, large windows along the back wall
showing a pastel-blue daytime city sky, light wood desks and floors, soft
shadows.

Wide 8:3 cutaway room composition (one full building floor seen straight-on
in 3/4 isometric view). Three readable zones:
LEFT - frontend development: a workstation with a large monitor showing a
colorful UI/browser preview and a pinboard of small interface component
cards. CENTER - backend development: two desks with monitors showing code
and terminal text, a small server rack with soft green status lights.
RIGHT - system analysis: a review workstation beside a whiteboard with a
simple architecture / flow diagram. Additional set dressing: bookshelves,
potted plants, a small sofa break corner with a coffee table, blue
department accent color on chairs, rugs and wall trim.

Fine pixel density with thin dark outlines, clean readable furniture,
colorful but soft palette. NO people, NO characters, empty chairs only.
NO text, NO logos, NO watermark. NO dark/night lighting, NO neon cyberpunk,
NO brown-navy gloom — this must feel bright, airy and cute like reference #1.
Room fills the entire 1600x600 frame edge-to-edge with no large empty areas.
```

Reference #1 = `references/ai-agent-office-reference.png` (style source).
Reference #2 = `apps/web/public/assets/office/floors/it-dev/it-dev-floor-base.webp`
(SEMANTIC content only — desk/server layout inspiration; its dark palette must
be completely discarded).

## Engineering bright floor v2 isometric

```
Cute detailed isometric pixel-art office floor cutaway for an Engineering
department, in EXACTLY the visual style and CAMERA of reference image #1
(the approved management-game mockup): a 3/4 TOP-DOWN dimetric/isometric
cutaway view, as if the viewer is looking DOWN INTO one open floor of the
building tower. The viewer must clearly see the TOP SURFACES of desks,
chairs and cabinets, a large readable diagonal floor plane between work
zones, a visible rear wall with windows, and receding side-wall depth.
Furniture sits along consistent isometric diagonal axes with a clear
foreground, midground and background. NOT a straight-on frontal elevation,
NOT a side-scroller wall view, NOT a flat row of furniture.

Bright cheerful daytime office exactly like reference image #2 (the approved
bright Engineering v1): soft warm sunlight, white / light-gray walls, large
windows showing a pastel-blue daytime city sky, light wood desks and floor,
soft shadows, colorful screens, plants, cheerful professional mood.

Wide 8:3 composition of one full floor. Three work zones arranged IN DEPTH,
not in a flat row: front-left = frontend development (workstation with a
colorful UI/browser screen and a small component pinboard), center and
slightly deeper = backend development (two desks with code/terminal
monitors and a small server rack with soft green lights), mid-right =
system analysis (review workstation beside a whiteboard with a simple
architecture flow diagram). Set dressing: bookshelves, potted plants, a
small sofa break corner, blue department accent on chairs/rugs/trim.

Fine pixel density with thin dark outlines, cute management-simulation
game quality. NO people, empty chairs only. NO text, NO logos, NO
watermark. NO night lighting, NO cyberpunk, NO dark brown gloom, NO
realistic 3D render. The room fills the entire 1600x600 frame.
```

Reference #1 = `references/ai-agent-office-reference.png` (PRIMARY: camera,
perspective, cutaway geometry, pixel language).
Reference #2 = `assets/themes/reference-bright/floors/archive/engineering-floor-v1-frontal.webp`
(SECONDARY: bright palette, daylight mood, Engineering identity).
Reference #3 = `apps/web/public/assets/office/floors/it-dev/it-dev-floor-base.webp`
(semantic equipment list ONLY — its palette and mood are forbidden).

## Engineering bright floor v3 reference crop

```
Recreate reference image #1 as a NEW room: image #1 is a cropped single
office floor from an approved isometric pixel-art management game. Copy its
CAMERA GEOMETRY EXACTLY - the same 3/4 top-down dimetric cutaway where the
viewer looks DOWN INTO the room: the same large diagonal wood floor plane,
the same visible TOP surfaces of desks and tables, the same rear wall
carrying boards and screens, the same receding side depth and front cutaway
rail, the same chibi-scale furniture proportions, the same fine pixel
density and thin outlines, the same bright warm daylight.

Change ONLY the room's purpose: it is now an ENGINEERING floor instead of a
design/meeting floor. Same camera, same style, same lighting, new
equipment. Three zones arranged along the room's diagonal depth:
front-left = frontend development (workstation whose monitor shows a
colorful UI/browser layout, small component pinboard), center-deeper =
backend development (two desks with dark code/terminal screens readable as
green-on-dark text, one small server cabinet with soft green lights),
mid-right = system analysis (desk beside a whiteboard showing a simple
boxes-and-arrows architecture diagram). Keep bookshelves, potted plants and
a small break sofa like the source room. Blue accent color on chairs and
rugs instead of the source room's neutral seats.

NO people, empty chairs only. NO text, NO logos, NO watermark, NO room
signs. NOT a frontal elevation view - the diagonal floor plane and desk
tops MUST stay visible exactly like image #1. Bright daytime only: no
night, no cyberpunk, no neon, no dark brown gloom. One single room filling
the whole 1600x600 frame.
```

Reference #1 = `references/style-lock/reference-floor-isometric-sample.png`
(PRIMARY: camera, perspective, floor plane, wall geometry, furniture
direction, pixel scale).
Reference #2 = `references/ai-agent-office-reference.png` (SECONDARY: global
color language, building-world consistency).
Reference #3 = `apps/web/public/assets/office/floors/it-dev/it-dev-floor-base.webp`
(SEMANTIC equipment list ONLY). Bright Engineering V1 is deliberately NOT an
image reference — its frontal camera must not be reinforced.

## Bright Frontend Developer idle

```
One single cute isometric pixel-art office worker character on a fully
TRANSPARENT background - a standalone game sprite, NOT a scene, NO room,
NO floor, NO shadow blob, NO background of any kind.

STYLE AUTHORITY: match the tiny chibi workers visible in reference image
#1 and #2 (an approved bright pixel-art management game): the same cute
small-body proportions (roughly 1:2.5 head-to-body), the same fine pixel
density with thin soft outlines, the same bright daylight color treatment
with soft shading and gentle highlights, a subtle cool blue screen-light
bounce on one side. The character must look like he was lifted directly
out of the bright office floor in image #3.

CAMERA: 3/4 top-down isometric-inspired view exactly like the workers in
image #1 - camera slightly above, body turned about 35-40 degrees to the
viewer's right. NOT front-facing, NOT a side profile, NOT a portrait.

IDENTITY (a Frontend Developer): young male-presenting, short tousled
near-black hair with a side-swept fringe, light-medium skin, no facial
hair, slim medium build, friendly focused expression. Modern casual
developer outfit in LIGHT values: light heather-gray tee under an open
soft blue overshirt, dark slim jeans, clean sneakers with a blue accent.
Small over-ear headphones resting AROUND HIS NECK (clearly visible), a
subtle blue lanyard or wristband accent.

POSE (idle): relaxed natural standing, ready to work - shoulders relaxed,
one foot slightly offset, one hand loosely at his side and the other
lightly touching the headphones at his neck, natural asymmetry. Full body
visible head to feet.

AVOID: dark cyberpunk styling, chunky retro RPG pixels, heavy black
outlines, neon rim light, anime proportions, oversized head, realistic
human, any text or watermark.
```

Reference #1 = `references/style-lock/reference-floor-isometric-sample.png`
(camera, pixel scale, body orientation).
Reference #2 = `references/ai-agent-office-reference.png` (worker
proportions, cute style, world color).
Reference #3 = `assets/themes/reference-bright/floors/engineering-floor.webp`
(lighting + local palette compatibility).
Reference #4 = dark `frontend-developer-idle.webp` (SEMANTIC IDENTITY ONLY —
hair/headphones/build; its dark palette and density are forbidden).

## Bright Backend Developer idle

```
One single cute isometric pixel-art office worker character on a fully
TRANSPARENT background - a standalone game sprite, NOT a scene, NO room,
NO floor, NO shadow, NO background of any kind.

CHARACTER FAMILY: this sprite must belong to the exact same character
family as the approved worker in reference image #4 - the same fine pixel
density, the same thin soft outlines, the same soft daylight shading with
gentle highlights and a subtle cool screen-light bounce, the same cute
small-body proportions (roughly 1:2.5 head-to-body), the same sprite
cleanliness. But he is a DIFFERENT PERSON - do not copy image #4's face,
hair, outfit or pose.

CAMERA: 3/4 top-down isometric-inspired view like the workers in image #1
- camera slightly above. Body turned about 35 degrees to the viewer's
LEFT (mirrored from image #4) for composition variety.

IDENTITY (a Backend Developer): male-presenting, dark-brown hair in a
short undercut, short neat beard / light stubble that stays readable at
small size, warmer deeper skin tone than image #4, slightly TALLER and
BROADER-SHOULDERED than image #4 with a heavier, grounded stance. Outfit:
dark slate technical zip jacket worn open over a light gray tee, with a
clearly visible ID lanyard around the neck, dark trousers, sturdy
sneakers. Accent color TEAL/CYAN (not blue): teal zipper line and sleeve
stripe on the jacket, teal lanyard strap. Calm, technical, reliable
personality in the face.

POSE (idle): relaxed standing, arms loosely crossed low or one hand in a
jacket pocket, weight on one leg, slight asymmetry - clearly a different
pose from image #4. Full body visible head to feet.

AVOID: copying the worker in image #4, blue accents (use teal), heavy
black cyberpunk outfit, security-guard look, oversized beard, chunky
retro pixels, heavy outlines, neon light, anime proportions, any text.
```

Reference #1 = crop sample (camera) · #2 = full reference (world/proportions)
· #3 = bright engineering floor (lighting/palette) · #4 = approved bright
frontend (character family) · #5 = dark backend master (SEMANTIC identity
only — undercut/beard/build; its dark palette is forbidden).

## Bright Backend Developer idle revision

```
One single cute isometric pixel-art office worker character on a fully
TRANSPARENT background - a standalone game sprite, NO room, NO floor, NO
shadow, NO background.

Same character family as the approved worker in reference image #4 (fine
pixel density, thin soft outlines, soft daylight shading, cute 1:2.5
proportions) but a DIFFERENT person: male-presenting Backend Developer,
dark-brown short undercut, short neat beard, warmer deeper skin tone,
slightly taller and broader-shouldered than image #4, calm technical
face. 3/4 top-down camera, body turned about 35 degrees to the viewer's
LEFT. Relaxed idle: one hand in pocket, weight on one leg. Full body
visible.

OUTFIT CORRECTION (the reason for this revision): the outfit must NOT
read as a black mass at small size. Jacket is a MEDIUM slate-TEAL
technical zip jacket - clearly lighter than black, with visible daylight
highlights on the shoulders and sleeves - worn open over a LIGHT
heather-gray tee that shows as a bright chest area. STRONG TEAL/CYAN
accents that stay readable when the sprite is only 60 pixels tall: a wide
teal collar line and sleeve cuffs, a bright TEAL LANYARD with a white ID
card on the chest, teal shoe accents. Dark gray (not black) trousers.

AVOID: black or near-black clothing, cyberpunk look, blue accents (teal
only), copying image #4, heavy outlines, neon, any text.
```

## Bright System Analyst idle

```
One single cute isometric pixel-art office worker character on a fully
TRANSPARENT background - a standalone game sprite, NOT a scene, NO room,
NO floor, NO shadow, NO background of any kind.

CHARACTER FAMILY: this sprite must belong to the exact same character
family as the approved worker in reference image #4 - the same fine pixel
density, the same thin soft outlines, the same soft daylight shading with
gentle highlights, the same cute small-body proportions (roughly 1:2.5
head-to-body), the same sprite cleanliness. But she is a DIFFERENT PERSON
- do not copy image #4's face, hair, outfit or pose.

CAMERA: 3/4 top-down isometric-inspired view like the workers in image #1
- camera slightly above, body turned about 30 degrees to the viewer's
right but with the head tilted slightly toward a small tablet she holds,
a thoughtful reviewing idle.

IDENTITY (a System Analyst): female-presenting, dark-brown hair in a neat
LOW BUN, round thin-framed GLASSES that stay readable, medium skin tone,
slightly SHORTER and slimmer than image #4. Outfit: light cream blouse
under a soft lavender cardigan, tailored dark trousers, simple flats. She
holds a small notebook/tablet naturally in one arm, the other hand
resting on its edge. Accent color PURPLE/LAVENDER: cardigan, a small hair
tie, tablet cover. Thoughtful, professional, warm personality in the
face.

POSE (idle): relaxed thoughtful standing, holding the notebook/tablet,
weight slightly on one foot, natural asymmetry - clearly different from
both developers. Full body visible head to feet.

AVOID: anime styling, fashion-model pose, oversized glasses, formal
corporate suit, copying image #4's body, chunky retro pixels, heavy
outlines, neon light, any text or watermark.
```

Reference #1 = crop sample (camera) · #2 = full reference (world/proportions)
· #3 = bright engineering floor (lighting/palette) · #4 = approved bright
frontend (character family) · #5 = dark analyst master (SEMANTIC identity
only — bun/glasses/build; its dark palette is forbidden).

<!-- ============ BRIGHT TOWER FLOOR EXPANSION ============
All five sections below reuse the LOCKED V3 recipe (see
REFERENCE_BRIGHT_STYLE_LOCK.md): image #1 = camera crop, image #2 = world
reference, image #3 = dark dept floor (semantics only). -->

## Product Management bright floor

```
Recreate reference image #1 as a NEW room: image #1 is a cropped single
office floor from an approved isometric pixel-art management game. Copy its
CAMERA GEOMETRY EXACTLY - the same 3/4 top-down dimetric cutaway where the
viewer looks DOWN INTO the room: the same large diagonal wood floor plane,
the same visible TOP surfaces of desks and tables, the same rear wall
carrying boards and screens, the same receding side depth and front cutaway
rail, the same chibi-scale furniture proportions, the same fine pixel
density and thin outlines, the same bright warm daylight.

Change ONLY the room's purpose: it is now a PRODUCT MANAGEMENT floor for
roadmap, planning and team coordination. Three zones arranged along the
room's diagonal depth: front-left = product roadmap (a large wall board
with a colorful milestone timeline of bars and diamonds, a desk with a
planning screen and stacked documents), center-deeper = planning and
requirements (a desk with a kanban-style board screen of small colored
cards, notebooks, a corkboard of pinned requirement notes), mid-right =
team coordination (a small round meeting table with comfortable chairs and
a wall review screen). Keep bookshelves, potted plants, a coffee corner
detail and daylight windows like the source room. Department accent
colors: soft blue and lavender on chairs, rugs and wall trim, warm wood,
light neutral walls.

NO people, empty chairs only. NO readable text - boards and screens use
symbolic bars, cards and shapes only. NO logos, NO watermark, NO room
signs. NOT a frontal elevation view - the diagonal floor plane and desk
tops MUST stay visible exactly like image #1. Bright daytime only: no
night, no cyberpunk, no dark brown gloom. One single room filling the
whole 1600x600 frame.
```

## Growth bright floor

```
Recreate reference image #1 as a NEW room: image #1 is a cropped single
office floor from an approved isometric pixel-art management game. Copy its
CAMERA GEOMETRY EXACTLY - the same 3/4 top-down dimetric cutaway where the
viewer looks DOWN INTO the room: the same large diagonal wood floor plane,
the same visible TOP surfaces of desks and tables, the same rear wall
carrying boards and screens, the same receding side depth and front cutaway
rail, the same chibi-scale furniture proportions, the same fine pixel
density and thin outlines, the same bright warm daylight.

Change ONLY the room's purpose: it is now a GROWTH / MARKETING floor for
campaign planning, analytics and growth experiments. Three zones arranged
along the room's diagonal depth: front-left = campaign planning (a desk
with a campaign board wall of colorful poster thumbnails and audience
segment cards), center-deeper = analytics (a desk with two monitors
showing symbolic line charts, bar charts and a funnel visualization, plus
a large wall dashboard of colorful graphs), mid-right = growth experiments
(a review desk beside a strategy wall of sticky notes and an experiment
dashboard screen). Keep bookshelves, potted plants and daylight windows
like the source room. Department accent colors: warm orange and coral with
blue highlights on chairs, rugs and wall trim, warm wood, light neutral
walls.

NO people, empty chairs only. NO readable text - all charts and boards are
symbolic shapes only. NO logos, NO watermark, NO room signs. NOT a frontal
elevation view - the diagonal floor plane and desk tops MUST stay visible
exactly like image #1. Bright daytime only: no night, no cyberpunk, no
dark brown gloom. One single room filling the whole 1600x600 frame.
```

## Growth bright floor revision

```
Recreate reference image #1 as a NEW room. Image #1 is a cropped single
office floor from an approved isometric pixel-art management game and it is
the ONLY authority on camera: a 3/4 TOP-DOWN dimetric cutaway where the
viewer looks DOWN INTO the room. THE SINGLE MOST IMPORTANT REQUIREMENT: the
large warm-wood FLOOR PLANE must be clearly visible as a big diagonal
surface covering roughly the lower half of the image, with rugs, and the
TOP surfaces of every desk and table must be visible. Desks sit on
DIAGONAL isometric axes at different depths - absolutely NOT a row of
desks facing the camera along one wall. Foreground furniture at the bottom
edge, midground desks, rear wall with boards at the top.

WALL AND LIGHT CORRECTION: walls are LIGHT - white to pale cream with a
soft blue trim line, exactly like image #1's room. Bright cheerful DAYLIGHT
with a window showing pastel-blue daytime sky. Do NOT make the room amber,
ochre or brown-toned overall; warm orange and coral appear ONLY as small
accents (charts, sticky notes, chair cushions, rug pattern).

Room purpose: GROWTH / MARKETING floor. Three zones along the diagonal
depth: front-left = campaign planning desk with a colorful campaign board
of poster thumbnails, center-deeper = analytics desks with monitors
showing symbolic line/bar charts and one funnel visualization plus a wall
dashboard, mid-right = growth experiments review desk beside a sticky-note
strategy wall. Bookshelves, potted plants, chibi-scale furniture, fine
pixel density, thin outlines.

NO people, empty chairs only. NO readable text - symbolic shapes only.
NO logos, NO watermark. One single room filling the whole 1600x600 frame.
```

## Art & Design bright floor

```
Recreate reference image #1 as a NEW room: image #1 is a cropped single
office floor from an approved isometric pixel-art management game. Copy its
CAMERA GEOMETRY EXACTLY - the same 3/4 top-down dimetric cutaway where the
viewer looks DOWN INTO the room: the same large diagonal wood floor plane,
the same visible TOP surfaces of desks and tables, the same rear wall
carrying boards and screens, the same receding side depth and front cutaway
rail, the same chibi-scale furniture proportions, the same fine pixel
density and thin outlines, the same bright warm daylight.

Change ONLY the room's purpose: it is now an ART & DESIGN floor for UI/UX,
illustration and creative review. Three zones arranged along the room's
diagonal depth: front-left = UI/UX workstation (a desk with a drawing
tablet and a monitor showing colorful interface wireframe blocks, a wall
of small color palette swatch boards), center-deeper = illustration (an
artist desk with a pen display showing a simple landscape sketch, concept
art boards pinned on the wall, art books on shelves), mid-right = creative
review lounge (a cozy sofa, a low review table, a presentation wall with a
mood board of colorful image cards). Keep potted plants and daylight
windows like the source room. Department accent colors: warm pink, muted
rose, lavender and cream on chairs, rugs and wall trim, light wood, light
walls.

NO people, empty chairs only. NO readable text - all boards use symbolic
shapes and color blocks only. NO logos, NO watermark, NO room signs. NOT a
frontal elevation view - the diagonal floor plane and desk tops MUST stay
visible exactly like image #1. Bright daytime only: no night, no
cyberpunk, no dark brown gloom. One single room filling the whole 1600x600
frame.
```

## Art & Design bright floor revision

```
Recreate reference image #1 as a NEW room. Image #1 is a cropped single
office floor from an approved isometric pixel-art management game and it is
the ONLY authority on camera: a 3/4 TOP-DOWN dimetric cutaway where the
viewer looks DOWN INTO the room, with the diagonal wood floor plane and
desk TOP surfaces clearly visible, furniture on diagonal axes, rear wall
with boards, receding side depth.

CRITICAL FRAME CORRECTION: the ROOM must fill the ENTIRE 1600x600 frame
edge to edge. NO dark ceiling corner, NO black empty region, NO void on
any side - every part of the image is bright room interior exactly like
image #1.

LIGHT CORRECTION: bright cheerful DAYLIGHT - light cream walls with soft
rose trim, warm sunlight, windows showing pastel-blue daytime sky. Not
dusk, not dim, not moody.

Room purpose: ART & DESIGN floor with THREE CLEAR ZONES along the diagonal
depth, all with visible equipment: front-left = UI/UX workstation (desk
with a drawing tablet and a monitor showing colorful wireframe blocks,
small color-swatch boards on the wall), center-deeper = illustration
station (artist desk with an angled pen-display showing a simple colorful
landscape sketch, wall of pinned concept-art boards, art books), mid-right
= creative review corner (small sofa, low table with color cards, mood
board wall of colorful image tiles). Potted plants, chibi-scale furniture,
fine pixel density, thin outlines. Palette: warm pink, muted rose,
lavender and cream accents on chairs and rugs, light wood.

NO people, empty chairs only. NO readable text - symbolic shapes only.
NO logos, NO watermark. One single bright room filling the whole frame.
```

## Quality bright floor

```
Recreate reference image #1 as a NEW room: image #1 is a cropped single
office floor from an approved isometric pixel-art management game. Copy its
CAMERA GEOMETRY EXACTLY - the same 3/4 top-down dimetric cutaway where the
viewer looks DOWN INTO the room: the same large diagonal wood floor plane,
the same visible TOP surfaces of desks and tables, the same rear wall
carrying boards and screens, the same receding side depth and front cutaway
rail, the same chibi-scale furniture proportions, the same fine pixel
density and thin outlines, the same bright warm daylight.

Change ONLY the room's purpose: it is now a QUALITY ASSURANCE floor for
manual testing, device automation and bug review. Three zones arranged
along the room's diagonal depth: front-left = manual test station (a desk
with a monitor showing a checklist of green check and red cross symbols,
a phone and tablet on stands), center-deeper = automation and device
testing (a light open shelf rack of small test devices - phones and
tablets with colorful screens - beside a desk with a QA dashboard monitor
of green/amber status tiles), mid-right = bug review (a review desk with a
board of small red and green tickets and a wall screen with a symbolic
bug-tracking kanban). Keep bookshelves, potted plants and daylight windows
like the source room. Department accent colors: aqua, turquoise and
blue-green with white on chairs, rugs and wall trim, light wood, light
walls. This must feel like a bright friendly office - absolutely NOT a
dark server room.

NO people, empty chairs only. NO readable text - checklists, tickets and
dashboards are symbolic shapes only. NO logos, NO watermark, NO room
signs. NOT a frontal elevation view - the diagonal floor plane and desk
tops MUST stay visible exactly like image #1. Bright daytime only: no
night, no cyberpunk, no dark brown gloom. One single room filling the
whole 1600x600 frame.
```

## Game Studio bright floor

```
Recreate reference image #1 as a NEW room: image #1 is a cropped single
office floor from an approved isometric pixel-art management game. Copy its
CAMERA GEOMETRY EXACTLY - the same 3/4 top-down dimetric cutaway where the
viewer looks DOWN INTO the room: the same large diagonal wood floor plane,
the same visible TOP surfaces of desks and tables, the same rear wall
carrying boards and screens, the same receding side depth and front cutaway
rail, the same chibi-scale furniture proportions, the same fine pixel
density and thin outlines, the same bright warm daylight.

Change ONLY the room's purpose: it is now a GAME STUDIO floor for game
design, development and playtesting. Three zones arranged along the room's
diagonal depth: front-left = game design (a desk beside a wall of colorful
world-map concept boards and simple game mechanic flow diagrams made of
shapes and arrows), center-deeper = game development (two desks with
monitors, one showing a cheerful colorful platformer level scene and one
showing symbolic code blocks), mid-right = playtest corner (a comfy couch
facing a TV screen showing a bright generic game scene, a game controller
on the table, a small shelf of game boxes with plain colored covers). Keep
bookshelves, potted plants and daylight windows like the source room.
Department accent colors: warm yellow and blue with playful accents on
chairs, rugs and wall trim, bright wood, light walls. This must stay a
BRIGHT cheerful daytime studio - absolutely NOT a dark gamer cave, NOT an
RGB-lit gaming room, NOT a cyberpunk arcade.

NO people, empty chairs only. NO copyrighted characters, NO readable game
titles or text - all game imagery is generic and symbolic. NO logos, NO
watermark, NO room signs. NOT a frontal elevation view - the diagonal
floor plane and desk tops MUST stay visible exactly like image #1. Bright
daytime only: no night, no neon. One single room filling the whole
1600x600 frame.
```
