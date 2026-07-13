# ASSET_BATCH_01.md
Batch 01 — the smallest set that validates the whole visual system: **1 floor +
3 idle characters**. Generate ONLY these 4 files. Do not generate any working/
idle *state* variants until Batch 01 passes visual review (see §BATCH 02 RULE).
Style/camera/palette per `ASSET_DIMENSIONS.md`; the character identities locked
here are permanent and MUST be copied into every future state prompt.

## Scope — exactly 4 files
```
public/assets/office/floors/it-dev/it-dev-floor-base.webp          (1600×600, 8:3)
public/assets/characters/composited/it-dev/frontend-developer-idle.webp  (256×384)
public/assets/characters/composited/it-dev/backend-developer-idle.webp   (256×384)
public/assets/characters/composited/it-dev/system-analyst-idle.webp      (256×384)
```
No other assets. Floor contains **ZERO people**. Characters are **transparent**.

---

## 6. Exact dimensions
| Asset | Canvas (px) | Aspect | Notes |
|---|---|---|---|
| `it-dev-floor-base.webp` | **1600 × 600** | 8:3 | room fills frame edge-to-edge; leftmost ~110px kept visually simple (app draws a floor tab there) |
| each character | **256 × 384** | 2:3 | one figure, centered, feet on the bottom-center anchor |

## 7. Transparency requirement
- Characters: **fully transparent** RGBA background (only the person + any chair/
  prop the pose needs). No ground plate, no box, no backdrop.
- Floor: transparent outside the room silhouette; the room art itself fills the
  1600×600 frame (no empty interior). Export **WebP, alpha, sRGB, q≥90, crisp
  pixels** for all four.

## 5. Negative prompt / prohibited traits (apply to all four)
```
photorealistic, 3d render, realistic photo, blurry, soft focus, jpeg artifacts,
wrong perspective, non-isometric, heavy black cartoon outline, flat vector, anime
illustration, oversized chibi head, tiny body, emoji, icon, mascot, text, letters,
numbers, logo, ui, hud, watermark, signature, opaque background, checkerboard,
drop shadow on the alpha edge, cropped hair/hands/feet, extra limbs, deformed hands,
duplicated people
```
Floor-specific prohibited: **any human/worker/person, any character silhouette,
empty flat banner look, plain single-color wall with no detail**.
Character-specific prohibited: **background scenery, furniture behind the figure
(except a chair the pose sits on), a different-looking person than the identity lock**.

---

## 1. FLOOR — exact final generation prompt
`it-dev-floor-base.webp` (1600×600, no people, transparent outside room)
```
cute detailed isometric pixel art, true 2:1 isometric dimetric camera (3/4
top-down cutaway), premium management-simulation game quality, consistent pixel
size, thin selective outlines, 3-tone shading with soft ambient occlusion, warm
key light from top-left, cozy but technical IT / software development office floor
at night, dark navy interior (#101A30, #16223A) with warm ceiling lamp light pools
(#FFCF7A) and cyan monitor glow (#3BE8E0), rich depth with clear foreground /
midground / background, big night-city windows on the back walls, wooden floor,
clean routed cables. THREE readable work zones across the width:
LEFT ZONE frontend developer workstation with a modern setup, a browser/UI preview
on screen, colorful design reference boards; CENTER ZONE backend developer
workstation with multiple code monitors, terminal screens, a tall server rack and
server tower with blinking lights, technical equipment; RIGHT ZONE system analyst
workstation with a large review monitor showing a system architecture diagram,
pinned process diagrams and requirement documents. Additional details: bookshelves,
several indoor plants, empty office chairs, wall screens, a small relaxation corner
with a sofa, a coffee area, subtle steam. Detailed, storytelling, cozy, professional.
NO people, NO human characters, empty chairs only. 1600x600 wide composition, room
fills the frame, far-left ~110px kept simple, transparent background outside the room.
```

## 2. CHARACTER A — Frontend Developer — exact final prompt
`frontend-developer-idle.webp` (256×384, transparent, feet centered)
```
cute detailed pixel-art human office worker, 3/4 isometric view matching an
isometric office scene, readable clean silhouette, natural human proportions (NOT
oversized-head chibi, NOT realistic, NOT anime, NOT vector), thin outlines, 3-tone
shading, warm top-left light. IDENTITY (Character A, Frontend Developer): young
male-presenting developer, short tousled dark near-black hair with a side-swept
fringe, light-medium skin, friendly alert face with a small smile, slim build,
medium height; wearing a charcoal-navy zip hoodie with a subtle blue accent zipper
over a plain tee, slim dark jeans, sneakers; over-ear headphones resting around the
neck; creative, focused, modern, slightly energetic vibe. POSE: idle, standing
naturally near his workstation, relaxed but ready, hands loose. Single character,
centered, full body, feet flat on the bottom-center anchor, nothing cropped,
transparent background, no scenery, no furniture behind him.
```

## 3. CHARACTER B — Backend Developer — exact final prompt
`backend-developer-idle.webp` (256×384, transparent, feet centered)
```
cute detailed pixel-art human office worker, 3/4 isometric view, clean silhouette,
natural human proportions (not chibi, not realistic, not anime, not vector), thin
outlines, 3-tone shading, warm top-left light. IDENTITY (Character B, Backend
Developer): male-presenting engineer, distinctly different from Character A: short
dark-brown undercut with slightly longer top and neat short stubble/beard, warm
deeper skin tone, calm analytical expression, slightly taller and broader build;
wearing a dark zip-up technical jacket (near-black) with a subtle cyan/teal accent
seam over a dark shirt, a company lanyard, dark trousers; calm, technical,
methodical vibe. POSE: idle, standing relaxed at his technical workstation, one
hand near hip, composed. Single character, centered, full body, feet on the
bottom-center anchor, nothing cropped, transparent background, no scenery.
```

## 4. CHARACTER C — System Analyst — exact final prompt
`system-analyst-idle.webp` (256×384, transparent, feet centered)
```
cute detailed pixel-art human office worker, 3/4 isometric view, clearly different
silhouette from the two developers, natural human proportions (not chibi, not
realistic, not anime, not vector), thin outlines, 3-tone shading, warm top-left
light. IDENTITY (Character C, System Analyst): female-presenting analyst,
shoulder-length dark-brown hair tied in a low bun, slim glasses, medium skin tone,
thoughtful organized expression, slightly shorter slim build; wearing a smart-casual
outfit — a light blouse under a soft cardigan with a subtle purple accent, tailored
trousers, flats; holding a small notebook/tablet; thoughtful, organized,
professional vibe. POSE: idle, standing near the architecture workspace reviewing
her notebook, calm. Single character, centered, full body, feet on the bottom-center
anchor, nothing cropped, transparent background, no scenery.
```

---

## 8. IDENTITY LOCK SHEET (all three) — reused in EVERY future state
| Trait | Character A · Frontend | Character B · Backend | Character C · System Analyst |
|---|---|---|---|
| Gender presentation | male-presenting, young | male-presenting | female-presenting |
| Hairstyle | short tousled, side fringe | undercut, longer top | shoulder-length, low bun |
| Hair color | near-black `#2B2B3A` | dark brown `#3A2B22` | dark brown `#3A2B22` |
| Facial hair | none | short stubble/beard | none |
| Face | friendly, alert, small smile | calm, analytical | thoughtful; **glasses** |
| Skin tone | light-medium `#F2C9A0` | warm deeper `#D99A6C` | medium `#E8B48C` |
| Clothing | charcoal-navy zip hoodie + tee, slim jeans, sneakers | dark tech zip jacket + shirt, trousers | blouse + soft cardigan, trousers, flats |
| Accent color | blue `#5B8CFF` | cyan/teal `#3BE8E0` | purple `#A98BFF` |
| Accessories | over-ear headphones around neck | company lanyard | slim glasses + notebook/tablet |
| Build / height | slim, medium | taller, broader | slim, slightly shorter |
| Scale in scene | 1.00 | 1.05 | 0.95 |
| Personality cues | creative, focused, energetic | calm, technical, methodical | thoughtful, organized, professional |
| Silhouette hook | headphones-on-neck | beard + bulky jacket | bun + glasses + cardigan |

## 9. Exact expected output filenames
```
office/floors/it-dev/it-dev-floor-base.webp
characters/composited/it-dev/frontend-developer-idle.webp
characters/composited/it-dev/backend-developer-idle.webp
characters/composited/it-dev/system-analyst-idle.webp
```
(Under `apps/web/public/assets/…`; the Visual Lab auto-detects them.)

## 10. Visual review checklist (must pass before Batch 02)
Floor:
- [ ] Detailed isometric pixel art, NOT a flat banner, NOT CSS-looking.
- [ ] Reads as a dark-blue IT/dev office; warm lamps + cyan monitor glow present.
- [ ] Three role zones readable: LEFT frontend (UI/browser), CENTER backend
      (terminals/servers), RIGHT analyst (architecture diagram).
- [ ] Server racks, bookshelves, plants, chairs, wall screens, relax/coffee corner,
      windows/city all visible; clear fore/mid/background depth.
- [ ] **Zero people / empty chairs only.** Fills 1600×600, left ~110px simple.
Characters (each):
- [ ] Same visual language as the floor; clean readable silhouette at ~186px.
- [ ] Natural proportions (not big-head chibi, not realistic/anime/vector/emoji).
- [ ] Matches its Identity Lock exactly; three silhouettes clearly distinct.
- [ ] Transparent background; feet on bottom-center anchor; nothing cropped.
System:
- [ ] In the Visual Lab, all 4 show `✓` in Asset Status; DEV FALLBACKs gone.
- [ ] Characters sit correctly in their zones (tune positions in data if needed).
- [ ] Showcase 8:3 looks close to the reference; Band 5:1 focal crop looks sane.

---

## A) FLOOR_POSITION_MAP (idle placement, % of the 1600×600 room; anchor = feet, bottom-center)
Matches `lib/assets/verticalSlice.ts` (idle = each agent's base position).
| Agent | Asset | x% | y% | scale | facing | z | anchor |
|---|---|---|---|---|---|---|---|
| Frontend Developer (A) | `frontend-developer-idle.webp` | **25** | **66** | **1.00** | right | 3 | bottom-center |
| Backend Developer (B) | `backend-developer-idle.webp` | **50** | **70** | **1.05** | left | 4 | bottom-center |
| System Analyst (C) | `system-analyst-idle.webp` | **76** | **63** | **0.95** | right | 2 | bottom-center |

Engine placement: `left:x% top:y%`, `transform: translate(-50%,-100%) scale(display)`,
`facing:left` mirrors via `scaleX(-1)`. Display height ≈ `sceneHeight × 0.46 × scale`.
Zone mapping: LEFT=Frontend, CENTER=Backend, RIGHT=Analyst (matches the floor art zones).

## B) CHARACTER_IDENTITY_LOCK (compact block to paste into ALL future state prompts)
```
CHARACTER A — Frontend Developer: young male-presenting, short tousled near-black
hair (#2B2B3A) side fringe, light-medium skin (#F2C9A0), no facial hair, charcoal-
navy zip hoodie + tee + slim jeans + sneakers, over-ear headphones around neck,
blue accent (#5B8CFF), slim medium build, scale 1.00. Keep identical every state.

CHARACTER B — Backend Developer: male-presenting, dark-brown undercut (#3A2B22)
with short stubble/beard, warm deeper skin (#D99A6C), dark tech zip jacket + shirt
+ trousers, company lanyard, cyan/teal accent (#3BE8E0), taller broader build,
scale 1.05. Keep identical every state.

CHARACTER C — System Analyst: female-presenting, shoulder-length dark-brown hair in
a low bun (#3A2B22), slim glasses, medium skin (#E8B48C), light blouse + soft
cardigan + trousers + flats, notebook/tablet, purple accent (#A98BFF), slim slightly-
shorter build, scale 0.95. Keep identical every state.
```

## BATCH 02 DEPENDENCY RULE
**Do NOT generate any working or idle STATE assets** (coding, reviewing, coffee,
debugging, monitoring, reading, analysing, relaxing, etc.) until **Batch 01 passes
the §10 visual review**. Batch 02 will reuse the exact `CHARACTER_IDENTITY_LOCK`
above so every state shows the same three people. Only after sign-off do we expand.
