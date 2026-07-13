# REFERENCE_LAYOUT_SPEC.md

Measured from reference image #1 (≈1670×944). Values are given as ratios so they
scale; px are the reference-scale equivalents. This is the layout contract the
rebuilt Company Building page must satisfy.

## 1. Top-level grid (desktop ≥1280px)
```
┌──────────────┬───────────────────────┬───────────────────────┐
│  LEFT  ~24%  │      CENTER ~38%       │      RIGHT ~38%        │
│  company     │  selected company +    │  panels 3–7           │
│  overview +  │  BIG isometric bldg +  │  (Dept, JobDesc,      │
│  bldg cards  │  project selector      │  AIModel, Proj, VPS)  │
├──────────────┴───────────────────────┴───────────────────────┤
│           BOTTOM — full-width AI Worker activity strip ~16%    │
└───────────────────────────────────────────────────────────────┘
```
- Column widths: `grid-template-columns: 24fr 38fr 38fr` (≈ `minmax(300px,24%) 1fr 38%`).
- Outer gutter ≈ 16px; inter-column gap ≈ 16px.
- Bottom strip: full width, height ≈ 150px (16% of height), spans under all 3 cols.
- Below 1280px: collapse to single column (stack: header → building → panels → strip).
  Building stays large (min-height 60vh) and horizontally scrollable if needed.

## 2. LEFT column (≈24%)
- App header block: robot mascot tile (~40px) + `AI AGENT OFFICE` (pixel font,
  ~16px) + tagline `Smart Work, Better Results` (~10px).
- Section title: `หน้ารวมบริษัท` + `1 ตึก = 1 บริษัท`.
- Company cards: **2-column grid** of building-thumbnail cards.
  - Card ≈ 175×190px: isometric building **image thumbnail** on top (~110px tall),
    then name (bold ~14px), `N แผนก` with a small people icon, `เปิดดู` button.
  - Selected card: neon outline + subtle glow.

## 3. CENTER column (≈38%)
- Header row: numbered chip `2` + `บริษัทที่เลือก: <NAME>` (pixel font, neon),
  sub `คลิกชั้นเพื่อจัดการแผนก`; right-aligned badge `สูงสุด 15 แผนก / 15 ชั้น`.
- **Building scene**: occupies **80–90% of the center height** (target min-height
  ≈ 620px at reference scale / ≈ 70vh). Floors are wide enough to show furniture
  + 2–5 workers. Left edge of each floor has a **colored floor tab**:
  `6 MARKETING`(purple) `5 SALES`(blue) `4 HR`(pink/red) `3 IT/DEV`(blue)
  `2 DESIGN/MEETING`(orange) `1 LOBBY/SUPPORT`(teal) `B1 VPS/SERVER`(cyan).
- Project selector row (bottom): `⭐ แต่ละบริษัทมีหลายโปรเจกต์` + project chips
  (Alpha/Beta/Gamma) + `+ เพิ่มโปรเจกต์`.

## 4. RIGHT column (≈38%) — numbered panels
Each panel = card, radius ≈ 16px, header with numbered chip + title + Thai sub.
- `3 Department Management`: three large action buttons **เพิ่ม (green) / แก้ไข
  (blue) / ลบ (red)** on the left, department list with pencil/trash icons on the right.
- `4 Job Description`: avatar + example bullet list + `บันทึกการเปลี่ยนแปลง` button.
- `5 AI Model Selection`: 2×3 grid of provider **radio cards** (GPT/Claude/Gemini/
  Local LLM/Image AI) each with icon + "เหมาะกับ …", plus an `AI Recommendation` box.
- `6 Projects`: `+ สร้างโปรเจกต์` button; project cards with status pill
  (Active green / Draft gray / Archived slate) + date + edit/delete/open icons.
- `7 VPS Workspace`: horizontal flow `Web Platform → VPS Cloud → Compute Nodes →
  Storage` (node icons + arrows) + right-side check bullets.

## 5. BOTTOM strip (full width, ≈16%)
- Numbered chip `8` + `AI Workers` + Thai subtitle.
- Horizontal row of **department mini-scenes** (Marketing/Sales/HR/IT-Dev/Design)
  each showing 1–2 worker sprites at a desk with a label, then an **Idle Time**
  group (coffee/read/chat/game/relax). Horizontal scroll on overflow.

## 6. Design tokens (sampled)
| Token | Value |
|---|---|
| Page background | deep navy `#0A0F1F` w/ subtle blue/purple radial glows |
| Panel background | `#101A30` / `#152040`, 1px border `#26365C` |
| Panel radius | 16–20px |
| Numbered chip | ~28px rounded square, provider/section accent, pixel font |
| Text ink / muted / faint | `#EAF0FF` / `#9AA7C7` / `#61708F` |
| Warm window light | `#FFCF7A` (with glow) |
| Neon accents | blue `#5B8CFF`, cyan `#3BE8E0`, purple `#A98BFF`, pink `#FF7AC6`, lime `#5BE49B`, amber `#FFD166`, orange `#FF9F6B` |
| Floor tab colors | 6 purple / 5 blue / 4 pink / 3 blue / 2 orange / 1 teal / B1 cyan |
| Fonts | pixel display (headers/numbers) + clean sans (body) |
| Shadow | soft `0 10px 34px rgba(0,0,0,.45)` |

## 7. Building scale rules (adaptive)
| Departments | Rendering |
|---|---|
| 1–6 | All floors, full height (~90–110px/floor), max detail |
| 7–10 | Slightly reduced floor height (~78–90px), full detail kept |
| 11–15 | Vertical **scroll/pan** viewport (or zoom-out with pan); never shrink until furniture/workers become unreadable |
Building must never be smaller than the point where a worker sprite is < ~28px tall.
