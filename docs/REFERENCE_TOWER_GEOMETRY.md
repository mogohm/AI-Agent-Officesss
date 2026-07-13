# Reference Tower Geometry

Measured programmatically from `references/ai-agent-office-reference.png`
(`measure_reference4.py` building bbox + floor-tab runs, `measure_tower.py`
slab probes at x=530/730/930). Canvas 1672×941.

## Tower bounding box

| Property | Value | % of canvas |
|---|---|---|
| Tower X | 424 | 25.4% |
| Tower Y | 20 | 2.1% |
| Tower width | 532 | 31.8% |
| Tower height | 748 | 79.5% |
| Aspect | 0.71 (w/h) | — |

## Vertical structure (y px)

| Element | Range | Height |
|---|---|---:|
| Rooftop band (garden, sign, antenna) | 20 → ~98 | **~78** |
| Six floor region | ~98 → ~628 | 530 |
| **Floor pitch** (tab runs 165/240/333/425/515…) | — | **~88** |
| B1 / basement architecture | ~628 → ~700 | **~72** |
| Foundation / street transition | ~700 → 735 | 35 |
| Project bar (แต่ละบริษัทมีหลายโปรเจกต์) | ~735 → 765 | **~30** |

## Horizontal structure (x px)

| Element | Range | Width |
|---|---|---:|
| Floor label tabs (overlap building left edge) | 424 → ~515 | **~90** |
| Main room viewport zone | ~500 → ~900 | ~400 |
| Right structural depth (glass/elevator/utility) | ~900 → 956 | **~56** |

## Perspective character

- **Slab slope:** the same floor slab sits at y≈139 (x=530), y≈205 (x=730),
  y≈248 (x=930) → drops ~109px across ~400px ⇒ **~15° down-to-the-right
  isometric diagonal**. Floors are NOT horizontal strips — the building is a
  true isometric diamond with zigzag slab lines.
- **Slab thickness:** dark structural bands **~6–10px**.
- **Roof projection:** rooftop garden overhangs slightly and carries plants,
  a sign plate and a small antenna; roof face slopes with the same diagonal.
- **Side-wall:** the right ~56px column is a darker glass/utility shaft
  (elevator + services) running the full floor region — this is what welds
  the floors into ONE silhouette.
- **Room openings:** interiors sit INSIDE the architecture — each opening is
  a parallelogram (not a rectangle), shifted horizontally per floor by the
  diagonal. Openings must be rendered with clip-path polygons following the
  ~15° slope.

## Implications for the unified shell

1. One continuous silhouette: roof + left column + right glass shaft + slabs
   + B1 must be a single artwork; floor CONTENT is layered underneath.
2. Shell alpha: transparent OUTSIDE the silhouette (city shows behind) and
   neutral/low-detail INSIDE the six openings (dynamic layers cover them).
3. Six openings at pitch ~88/748 = **11.8% of tower height each**, first
   opening top at ~10.4% of tower height.
4. B1 belongs to the architecture (server room window is part of the shell).
