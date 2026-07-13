# Reference Floor Crop Spec

Source of the PRIMARY camera/geometry reference for the Engineering V3
perspective experiment.

## Crop

| Property | Value |
|---|---|
| Source image | `references/ai-agent-office-reference.png` (1672 × 941) |
| Crop X | 512 |
| Crop Y | 452 |
| Crop width | 436 |
| Crop height | 123 |
| Output | `references/style-lock/reference-floor-isometric-sample.png` (436×123, unresized) |
| Selected department | **Design / Meeting (floor 2)** |

## Why Design/Meeting instead of the preferred IT/Dev floor

The spec preferred the IT/Development floor. Both floors were extracted and
compared (`outputs/reference-diff/candidate-itdev-b.png` vs
`candidate-design-b.png`):

- **IT/Dev floor**: equally strong 3/4 top-down geometry, **but it is the
  reference's DARK floor** — navy walls, dark code screens. Using it as the
  primary image reference for a *bright* floor risks re-importing the dark
  palette we just eliminated (the exact failure mode this experiment guards
  against).
- **Design/Meeting floor**: camera geometry is just as clear (visible diagonal
  floor plane, desk tops, iso axes, rear wall, side depth) **and** its palette
  is bright/warm daylight — it teaches camera AND palette simultaneously.

## Visible geometry in the sample

| Aspect | Description |
|---|---|
| Floor plane | Large warm-wood plane running on a down-right diagonal; clearly readable between desk groups |
| Rear wall | Upper band, slightly angled, carrying posters/whiteboards/screens |
| Side-wall depth | Left balcony corner + right edge recede; the cutaway front rail crosses the foreground |
| Desk axis | Desks and chairs sit on consistent diagonal (down-left → up-right) axes |
| Camera elevation | ~30–40° above horizontal — viewer looks DOWN INTO the room; desk and table TOP surfaces visible |
| Character | 2:1-ish dimetric, cute chibi scale, fine pixel density, thin outlines |

## Known impurities (accepted)

The crop includes the small "AI_OFFICE" lobby sign lower-left and slivers of
the floors above/below along the diagonal slabs — unavoidable because the
tower's floors are parallelogram-shaped. The prompt instructs the model to
draw ONE room only.
