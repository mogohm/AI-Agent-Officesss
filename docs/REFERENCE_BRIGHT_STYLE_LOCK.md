# Reference-Bright Style Lock — Engineering (source of truth)

Locks the visual style for ALL remaining bright department floors
(`assets/themes/reference-bright/floors/`). Deviating from it requires a new
user decision. **Updated after the Reference Floor Crop experiment (V3).**

## Selection result — FINAL (no further Engineering experiments)

| | |
|---|---|
| **Selected winner** | **V3 (reference-crop camera)** — `floors/engineering-floor-v3-reference-crop.webp` |
| **Locked production copy** | `floors/engineering-floor.webp` (byte-identical to V3) |
| Rejected | V1 frontal (`floors/archive/engineering-floor-v1-frontal.webp`) — palette pass, camera fail |
| Rejected | V2 (`floors/engineering-floor-v2-isometric.webp`) — prompt re-roll, camera unchanged |
| All three preserved for audit | ✅ |

### Why V3 won — six-point camera check (from `outputs/reference-diff/engineering-camera-comparison.png`)

| Criterion | V3 vs V1 |
|---|---|
| More visible floor plane | ✅ large diagonal wood floor + rugs vs none |
| More visible desk top surfaces | ✅ keyboards/desks seen from above vs frontal edges |
| Clearer diagonal/isometric furniture axes | ✅ desks on diagonals vs straight row |
| Stronger foreground→background depth | ✅ desk → chairs → whiteboard/rear wall |
| Better match to the cropped reference room | ✅ same looking-down-into-the-room camera |
| Tower-scale readability maintained | ✅ UI screen / desks / diagram all read in the band |

**Score: 6/6 (needed 4).** Metrics agree (secondary): V1 67.67% → V3 **68.29%**
overall; V3 higher on layout/color/structure too.

### What made the difference (method note)

Two prompt-only attempts (V1, V2) both returned frontal rooms. V3 succeeded by
changing the METHOD: the primary image reference became an **exact cropped
single floor from the approved reference**
(`references/style-lock/reference-floor-isometric-sample.png`, crop
512,452 → 436×123 of the Design/Meeting floor — chosen over IT/Dev because it
teaches the same camera *without* the dark palette; see
`docs/REFERENCE_FLOOR_CROP_SPEC.md`), with the prompt framed as "recreate this
room with a new purpose" and Bright V1 deliberately EXCLUDED from image refs.
**All five remaining floors MUST use this same recipe.**

## Locked style attributes (V3 camera standard)

| Attribute | Locked value |
|---|---|
| Camera | **3/4 top-down dimetric cutaway — viewer looks DOWN INTO the room** |
| Perspective | Visible diagonal floor plane; desk/table TOP surfaces visible; rear wall + corner; receding side depth; foreground/midground/background |
| Furniture direction | Consistent diagonal/isometric axes — never a frontal row |
| Pixel density | Fine pixels, thin dark outlines, chibi-scale furniture (match the crop sample) |
| Palette | Bright daytime; warm wood floors; walls may be light-wood panel or light-gray; pastel-blue sky/greenery through windows; blue dept accent (chairs/rugs) recolored per department |
| Lighting | Soft warm daylight, soft shadows; NO night/neon/cyberpunk |
| Geometry | 1600×600 (8:3) master; content must survive a short wide band crop (tune focal per floor) |
| Windows | Rear/side wall, daytime view |
| Population | NO people in floor masters (characters composite later) |

## Recipe for the remaining five floors (Growth, Quality, Game Studio, Art & Design, Product Management)

1. Prompt skeleton = `docs/REFERENCE_BRIGHT_PROMPTS.md` → "## Engineering
   bright floor v3 reference crop", swapping only the department zones/props.
2. Image refs, in this exact order:
   1. `references/style-lock/reference-floor-isometric-sample.png` (camera)
   2. `references/ai-agent-office-reference.png` (world color)
   3. the department's DARK floor (semantic equipment list only)
3. NEVER pass a frontal bright floor (V1/V2) as an image reference.
4. New files only — no master overwrites; archive every variant.

## DON'T

Dark-theme style refs · frontal elevation · zoomed close-ups that lose the
floor plane · text/logos/people · night/neon · overwriting approved assets.
