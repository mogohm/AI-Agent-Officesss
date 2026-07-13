# Bright Production Integration Audit

Classification of every data source in `/bright-office` before the swap.
A = real API/DB · B = preview config · C = hardcoded display value ·
D = visual fallback.

| Area | Source today | Class | Production action |
|---|---|---|---|
| Company list | `api.listCompanies()` | **A** | keep |
| Selected company | internal state, defaults to first company | **C** (implicit id-1 default) | **route param `/companies/[id]` becomes source of truth**; card click navigates |
| Company detail | `api.getCompany(id)` | **A** | keep |
| Departments | `api.listDepartments(id)` | **A** | keep — but tower slots were driven by `BRIGHT_DEPTS` order (B), see below |
| Tower floor slots | `BRIGHT_DEPTS` fixed 6 floors, fixed floorNumbers | **B** | **rebuild: slots derive from real `department.floor_number` (1–15), window navigation >6; visual asset looked up by `department.type`** |
| Dept labels on tabs | real dept name + config label | A + B | keep; unknown types show real name on neutral tab |
| Floor room art | config `floor` per known type | **B** (approved assets) | keep for known types; **unknown type → neutral shell opening (D)**, never dark art |
| Workers in tower | config staffing (always rendered) | **B** | **production: render only real agents**, mapped to distinct identities by role; unknown role → generic bright worker fallback (D); no cloning, no fake agents |
| Worker states | state machine (visual rotation) | **B** | map real `agent.status`: working→work state, reviewing→review, idle→rotating idle, error→review, offline→idle+dimmed; fallback = idle (no broken images) |
| Worker name labels | real agent names when matched | **A** | keep |
| Agents CRUD | existing endpoints | **A** | untouched |
| Projects | `api.listProjects(id)` + navigation | **A** | keep |
| AI models + selection | `api.listModels()` / `updateDepartment` / `recommendModel` | **A** | keep (real CRUD) |
| Job description | selected dept fields | **A** | keep |
| VPS panel | static pipeline + "mock/demo" label | **C** | keep, clearly labeled mock/demo (no real VPS API exists) |
| "สูงสุด 15 แผนก / 15 ชั้น" badge | constant | **C** | keep (true business rule) |
| Company accents | `COMPANY_ACCENT` name-keyed + `theme_color` fallback | C→A | falls back to real `theme_color` — production-safe |
| Mini tower thumbnails | UnifiedTower renderer | **B** (visual) | keep; selected = real floors, others = neutral shell |
| Add Company card | navigation to creation page | **A** (real flow) | keep |
| Bottom storyboard | config scenes + config workers | **B** (approved "office life" visual layer) | keep as visual layer (documented as illustrative, not per-agent data) |
| Idle Time scene | fixed trio + lounge crop | **B** | keep (approved) |
| Tower shell/geometry | `TOWER_FINAL` + `SHELL_FILTER` | **B** (locked visuals) | keep |

## Hardcoded values removed by this integration

- implicit "first company = selected" on a standalone route → route param
- fixed 6-floor `BRIGHT_DEPTS` ordering as the tower's source of truth →
  real `floor_number` drives slots; config only supplies visuals by type
- always-on preview staffing → real agents only (production mode)

## Preview route behavior after extraction

`/bright-office` remains as a preview wrapper around the same
`BrightCompanyOffice` component with internal company selection (kept for
visual review), while `/companies/[id]` is the production route.
