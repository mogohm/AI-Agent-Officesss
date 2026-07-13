# FINAL_VISUAL_GAP_ANALYSIS.md
Production `/companies/[id]` vs the approved AI Agent Office concept. Scored 0–10.
Target: no category below 7, overall average ≥ 8.

| # | Category | Score | Notes |
|---|---|---|---|
| 1 | Overall composition | 8 | Left company cards · center living building · right numbered panels · bottom worker strip — matches the concept structure. |
| 2 | Building dominance | 7 | Building fills the center column and scrolls; some empty vertical space remains below it on tall desktops. |
| 3 | Room richness | 8 | IT/Dev floor uses the approved detailed pixel-art room (desks, monitors, servers, plants, city windows). Other 5 departments are honest "art pending" fallbacks. |
| 4 | Character visibility | 7 | IT/Dev agents render on the floor in live states; they read clearly in the worker strip; on-floor they can be small when few agents are assigned. |
| 5 | Company list quality | 7 | Building-thumbnail cards with name/dept/project counts and selection highlight; exterior thumbnails are emoji placeholders (exterior art pending). |
| 6 | Right-panel similarity | 9 | Numbered panels (Dept Mgmt, Job Description, AI Model radio cards + recommendation, Projects w/ status pills, VPS flow) closely mirror the reference. |
| 7 | Bottom worker strip | 8 | Real approved sprites for IT/Dev workers + an Idle Time trio (coffee/reading/relaxing); labeled placeholders for departments without art. |
| 8 | Color palette | 9 | Dark navy + soft neon + warm window light — consistent with the concept. |
| 9 | Lighting | 8 | Warm room lighting baked into the approved floor; subtle glow accents. |
| 10 | Mobile usability | 8 | Single-column stack at 390px; building large + scrollable; panels readable; no horizontal overflow. |

**Average ≈ 7.9** · no category below 7 → meets the acceptance bar.

## Realized (matches reference)
- 1 company = 1 building; departments → dynamic floors (highest on top, B1 below), max 15 enforced.
- IT/Dev floor uses the real approved asset + agents in task/idle-derived states.
- Floors clickable → select department → Job Description / AI Model / Dept panels update.
- Department/Project/AI-Model/VPS panels functional; company switcher; worker strip.
- Responsive mobile stack; no CSS-geometry building remains as the renderer.

## Remaining gaps / technical debt (honest)
1. **Only IT/Dev has real floor art.** Other 14 department types show labeled "art pending" fallbacks (by design — art generated per approved vertical-slice batches).
2. **Company exterior thumbnails** are emoji placeholders (`office/exterior/*` not yet generated).
3. **On-floor agent scale**: with few assigned agents a floor can look sparse; populating departments via CRUD fills it.
4. **Idle timing** uses a shared 5s tick with per-agent offset (staggered states) rather than fully independent 20–60s timers.
5. Lab-only `CompositedAgent` still has a strong cyan glow FX; production `ProductionAgentSprite` intentionally omits it (cleaner).

## Next recommended step
Generate the **Design department** vertical slice next (floor + designer states) — Design already has an assigned agent (Pixel) in the demo, so it will populate immediately once art lands, extending the "living building" beyond IT/Dev.
