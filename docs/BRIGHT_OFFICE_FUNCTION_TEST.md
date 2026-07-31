# Bright Office — Function Test Matrix (FINAL COMPLETION MODE)

Date: 2026-07-13 · Method: Playwright UI automation on the production route
(`scratchpad/ui_function_test.py`, 15/15) + API-level CRUD suite (20/20) +
fixture edge-case runs. "UI" = performed through the Bright interface itself.

## COMPANY

| Test | Result | Evidence |
|---|---|---|
| Select company (card click) | **PASS** | UI: card → `/companies/1`, header + tower + panels switch |
| Add company | **PASS** | UI: Add Company card → modal → creates + navigates to new id (cleaned up) |
| Edit company | **NOT IMPLEMENTED BEFORE RELEASE** (UI) — backend `PUT /companies/{id}` works | API suite |
| Delete company | **NOT IMPLEMENTED BEFORE RELEASE** (UI) — backend `DELETE` works (agents don't cascade — known) | API suite |
| Company data changes header/tower/panels | **PASS** | switch test + empty-company fixture |

## DEPARTMENT

| Test | Result |
|---|---|
| Select department (panel chip + tower floor tab) | **PASS** |
| Add department (UI modal: name/type/floor 1–15, free floors only) | **PASS** |
| Edit department (rename via UI) | **PASS** |
| Delete department (UI + confirm dialog) | **PASS** |
| Job description edit + บันทึกการเปลี่ยนแปลง + persists after reload | **PASS** |
| Floor highlight follows selection (tab ring + opening outline) | **PASS** |
| 1-department layout | **PASS** (fixture: floor 1 real, 2–6 neutral) |
| 6-department layout | **PASS** (company 1) |
| 7–10 department layout (▲▼ window nav) | **PASS** (8-floor fixture) |
| 11–15 department layout | **PASS** (15-floor fixture, nav 15→1) |

## PROJECT

| Test | Result |
|---|---|
| Project list displays (status chips, type) | **PASS** |
| Project select/open (card → `/projects/[id]`) | **PASS** |
| Create project (UI modal) | **PASS** |
| Edit project (UI modal) | **PASS** |
| Delete project (UI + confirm) | **PASS** |
| Project affects worker activity | **PARTIAL (by design)** — backend task engine updates `agent.status`; tower polls agents every 15 s and sprites follow; execution itself is the mock engine (labeled simulation) |

## AI MODEL

| Test | Result |
|---|---|
| Model list displays (5 providers) | **PASS** |
| Selected model displays (radio + per-dept) | **PASS** |
| Change selected model | **PASS** |
| Recommendation displays (per dept type) | **PASS** |
| Assignment persists (reload survives) | **PASS** |

## AGENTS

| Test | Result |
|---|---|
| Agents display on correct floor | **PASS** (fixture: role on its dept floor) |
| Unknown role fallback (generic Bright worker) | **PASS** |
| Status changes affect sprite state | **PASS** (`stateForAgent` mapping + 15 s polling) |
| idle/work/review/offline mapping | **PASS** (offline = dimmed idle; review poses; per-status work poses) |
| No broken sprite paths | **PASS** (0 console errors; state fallback to `initial`/`idle`) |

## VPS

| Test | Result |
|---|---|
| Status displays | **PASS** |
| Open/manage action | **PASS** (→ `/vps`) |
| Mock clearly labeled | **PASS** ("(mock/demo)" in panel header) |

## NAVIGATION

`/bright-office`, `/companies/1`, `/companies/2`, `/companies/3`,
`/companies/999999` (not-found card, no 404 fetch), `/companies/abc`
(invalid-id card), direct refresh on each, browser back/forward —
**ALL PASS**, 0 console errors, 0 real failed requests (only in-flight
aborts during rapid reload, verified benign: files exist, steady-state
diagnose is clean).

## RESPONSIVE

1920×1080 / 1672×941 / 1440×900 / 1366×768: **PASS** (desktop excellent).
Mobile 390: **PASS as usable stacked fallback** (by design, not premium).

## Known NOT IMPLEMENTED (logged, not faked)

- Company edit/delete from the Bright UI (backend endpoints work).
- Agent create/edit from the Bright UI (agents come from seeds/Command Center;
  backend endpoints work).
- Real AI execution (mock engine — labeled "โหมดจำลอง · simulation").
