# CHARACTER_SPRITE_SPEC.md
Specification for the AI office workers. Sizes/anchor/palette per
`ASSET_DIMENSIONS.md`. Two build modes are defined; **Composited-look mode is the
MVP** (simplest for AI generation, guaranteed alignment). Layered mode is the
target for a future character creator.

## 1. Canvas & anchor (both modes)
- Frame/canvas: **128×192** (display 64×96), 2:3.
- Anchor: **bottom-center** = the feet. All parts and all frames register to this
  point so nothing drifts.
- Facing: default **front-3/4 toward camera-left** (matches iso camera). Provide a
  mirrored variant only if a department needs right-facing desks.
- Proportions (LOCK across every pose/part): total 96px display tall →
  head ≈ 30px, torso ≈ 34px, legs ≈ 32px; head is cute/rounded, ~1/3 body.
- Outline + 3-tone shading, top-left light, soft contact shadow baked OR provided
  as a separate `floor-shadow` sprite (preferred, so scale is independent).

## 2. Palette
- Skin: the 5 skin tones. Hair: the 8 hair colors. Clothing: dept-coded + neutral
  families. (All hex in `ASSET_DIMENSIONS.md §4`.) Keep eyes/mouth minimal and
  readable at 64px.

## 3. Mode A — Composited looks (MVP)
Generate **8 finished character "looks"**, each a person with fixed skin/hair/
outfit, delivered as **one sprite sheet per animation state**. No runtime layering.

| Look id | Persona | Outfit | Hair | Typical dept |
|---|---|---|---|---|
| `pm` | Project Manager | blazer, clipboard | tidy short | Product/PM |
| `dev-a` | Developer | hoodie, headphones | messy, glasses | IT/Dev, DevOps |
| `dev-b` | Developer | tee + lanyard | short | IT/Dev |
| `designer` | Designer | colorful, beanie | dyed | Design, Game |
| `qa` | QA/Research | casual shirt | ponytail | QA, Data |
| `marketer` | Marketing | trendy | bob | Marketing, Content |
| `sales` | Sales | shirt + headset | neat | Sales, Service |
| `hr` | HR | cardigan | bun | HR, Lobby |

Files (per look): `characters/animations/idle/<look>-<state>.webp` and
`characters/animations/working/<look>-<state>.webp` — each a horizontal sheet.

## 4. Mode B — Layered parts (target/advanced)
Separate aligned layers, composited at runtime `base → clothing → hair →
accessory → prop`:
- `characters/base/body-0X.webp` (5 skin tones)
- `characters/hair/hair-XX.webp` (12 styles, same skeleton)
- `characters/clothing/<outfit>.webp` (15)
- `characters/accessories/<item>.webp` (8)
Every part is authored on the **same 128×192 skeleton** and, for animation, must
provide a **matching sheet per state** (`animations/<idle|working>/<layer>/<name>-<state>.webp`)
with identical frame count/timing to the base. This is the alignment burden that
makes Mode A the MVP recommendation.

## 5. Animation states
### Working states (Group 8) — shown when agent.status ∈ work set
| state | pose description | frames | FX (z=8) |
|---|---|---|---|
| `coding` | seated, hands typing, look at monitor | 4 | typing-dots |
| `designing` | seated, hand drawing on tablet | 4 | sparkle |
| `analysing` | standing/seated, pointing at chart | 4 | — |
| `testing` | holding device, tapping | 4 | exclaim on find |
| `writing` | seated, writing/typing doc | 4 | typing-dots |
| `meeting` | standing, gesturing to board | 6 | — |
| `presenting` | standing, arm out to screen | 6 | — |
| `calling` | standing, hand to headset, talking | 4 | — |

### Idle states (Group 9) — shown when agent.status is idle-family (rotates)
| state | pose | frames | FX |
|---|---|---|---|
| `breathe` | standing, subtle bob | 4 | — |
| `coffee` | holding mug, sipping | 4 | coffee-steam |
| `read` | holding a book, reading | 4 | — |
| `chat` | turned to a neighbor, gesturing | 4 | speech dots |
| `walk` | 4-step walk cycle | 4 | — |
| `stretch` | arms up, stretch | 4 | — |
| `phone` | looking at phone | 4 | heart/emoji |
| `relax` | sitting on sofa, leaning | 4 | zzz |

- Playback: 8fps, loop. Sheets are one row, frames left→right, each 128×192.
- Transitions are handled by the engine (state swap), not baked into sheets.

## 6. Behavior rules (engine)
- Map backend `agent.status` → state:
  `coding/writing/designing/testing/reviewing/meeting → working action` (pick by
  department, see `DEPARTMENT_VISUAL_SPEC`), `thinking/planning → thought pose`,
  `idle/done/waiting → rotate idle states`, `error → exclaim`.
- Idle rotation: each agent picks a new idle state every **20–60s**, phase
  **staggered** (never all-synchronous, never all the same on one floor).
- Department flavor: a Developer's default working action is `coding`, a
  Designer's is `designing`, Sales is `calling`, PM is `meeting`, etc. (table in
  `DEPARTMENT_VISUAL_SPEC.md`).

## 7. Role → look mapping (composited mode)
Defined in `lib/assets/departmentScenes.ts` (`lookForRole`). Summary:
PM/BA/SA→`pm`; Developer/Backend/DevOps→`dev-a`; Frontend/Database→`dev-b`;
UI-UX/Game Designer→`designer`; QA/Research→`qa`; Marketing→`marketer`;
Sales→`sales`; HR/Document→`hr`.

## 8. Acceptance for characters
- Reads clearly as a **cute human office worker** at 64px, not an icon/emoji.
- Consistent proportions/lighting/palette across all looks & states.
- Feet on the anchor; no clipping; transparent background.
- At least idle:`breathe`,`coffee` + working:`coding`/`designing`/`calling`/`meeting`
  present for a believable first release; others degrade to `breathe`.
