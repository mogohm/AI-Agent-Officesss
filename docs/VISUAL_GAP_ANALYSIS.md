# VISUAL_GAP_ANALYSIS.md

Reference (image #1) = source of truth. Current build (image #2) = must be replaced.
This lists every major visual difference, grouped by area, with the required fix.

## 0. Root-cause verdict
The current Company Building is a **procedural vector/CSS render** (SVG isometric
geometry + emoji/`Chibi` sprites drawn in code). The reference is a **detailed,
asset-based isometric pixel-art scene**. No amount of color/spacing/shadow tweaks
closes this gap — the **rendering engine and art source must change** from
"draw shapes in code" to "compose pixel-art image assets into scenes."

## 1. Central building
| # | Reference (target) | Current (wrong) | Fix |
|---|---|---|---|
| 1.1 | Detailed isometric **cutaway** with fully furnished rooms | Thin geometric floors, mostly empty dark space | Asset-based `DepartmentFloorScene` per floor |
| 1.2 | Building **dominates** center (~80–90% of scene height), wide floors | Building small, narrow, lots of empty margin | Building fills center; adaptive scale |
| 1.3 | Each floor **looks different** (marketing charts, dev monitors, HR room…) | All floors identical | Department-typed floor art + props |
| 1.4 | Real **furniture**: desks, chairs, monitors, bookshelves, sofas, plants, whiteboards, charts, server racks | 1 tiny desk block + monitor rect + 1 plant | Furniture asset layer per scene |
| 1.5 | **Warm interior lighting**, ambient screen glow, soft shadows | Flat fills, no lighting model | Lighting/overlay asset layer + soft shadow sprites |
| 1.6 | **2–5 pixel-art human workers** per floor, visibly acting | 3 emoji/vector "chibi" figures, same pose | `AgentSprite` from layered pixel-art human sprites |
| 1.7 | B1 server room reads as a real room with racks, cables, glow | Thin dark band + rectangle "racks" | `vps` room scene asset |

## 2. AI workers
| # | Reference | Current | Fix |
|---|---|---|---|
| 2.1 | Small **pixel-art humans** (body/hair/clothes/dept styling) | Emoji + code-drawn `Chibi` | Layered sprite: base + hair + clothes + accessory |
| 2.2 | Distinct **animation states** (coding, designing, coffee, reading, chatting…) | Static, one idle bob | Sprite-sheet/WebP animations + state machine |
| 2.3 | Workers **rotate behavior** over time, staggered | No behavior loop | `useAgentBehavior` timer, staggered per agent |
| 2.4 | Worker action matches department | Generic | Behavior table keyed by department type |

## 3. Page layout
| # | Reference | Current | Fix |
|---|---|---|---|
| 3.1 | **LEFT ≈24%**: app header + company overview + company **building-thumbnail cards** (name, #depts, #projects) | Left = thin global icon nav rail; company cards only appear as a switcher | Dedicated left column with company thumbnail cards |
| 3.2 | **CENTER ≈38%**: selected company title + big building + project selector | Present but building too small | Enlarge building, keep title + project chips |
| 3.3 | **RIGHT ≈38%**: Dept Mgmt, Job Desc, AI Model, Projects, VPS panels | Present, close-ish, styling thinner | Keep panels; match density/spacing/radius |
| 3.4 | **BOTTOM full-width** worker activity strip with rich scenes | Emoji scene cards | Rebuild with worker sprites + mini room bg |
| 3.5 | Dense, rich, "alive" composition; **no empty dark voids** | Noticeable empty dark space around building | Fill center with building; balance columns |
| 3.6 | Looks like an **office-management game** | Looks like a SaaS admin/wireframe | Asset scenes + game-like framing |

## 4. Art style
| # | Reference | Current | Fix |
|---|---|---|---|
| 4.1 | Cute **pixel-art** raster style, cohesive palette, warm lights | Vector shapes + emoji, cool flat palette | Pixel-art asset pack + consistent lighting |
| 4.2 | Isometric depth with painted shadows/AO | Fake skew, hard edges | Pre-baked shadows in assets + soft shadow overlay |

## 5. What is actually acceptable to keep
- Backend/API/data flow, `SectionCard`, `ui.tsx` primitives, `DepartmentPanel`
  modal, Zustand store, types, panels 3–7 **logic**.
- Everything under "current building rendering" (see REMOVE list in the plan) is
  replaced, not tuned.

## 6. Hard external dependency (blocker)
"Asset-based pixel art" requires **actual pixel-art image files** (floors,
furniture, characters, animations). These do not exist in the repo and **cannot
be synthesized from code** without either (a) a licensed/CC0 pixel-art office
asset pack, (b) art the user supplies, or (c) AI-generated sprite assets.
The rendering architecture can be built now; the visual match to image #1 is
bounded by the quality of the assets we load. See the plan's "Asset sourcing".
