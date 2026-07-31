# Bright Office V1 — Release Note

Date: 2026-07-13 (superseded by the Modular V3 tower, 2026-07-15) ·
Status: **Bright Office V1 visual baseline approved for functional completion —
deployment pending final user approval.** Reference-inspired, not pixel-identical.

> **Correction (2026-07-15):** the earlier "RELEASE COMPLETE" wording was
> premature. The current V1 baseline is the **Modular V3 Final Polish** tower
> (see `MODULAR_V3_FINAL_POLISH_REPORT.md` and `BRIGHT_OFFICE_V1_FINAL_REVIEW.md`).
> Nothing has been deployed; deployment awaits explicit user approval.

## What shipped

The approved Bright Office visual system is the default production company view.
One shared component (`apps/web/components/bright/BrightCompanyOffice.tsx`)
renders the reference-style bright isometric office — unified wide tower shell
with real floor art clipped into six openings, living worker sprites driven by
real agent status, company cards with mini towers, full right-rail management
panels, and the bottom AI Workers storyboard — entirely from live backend data.

## Routes

| Route | Behavior |
|---|---|
| `/companies/[id]` | **Production** — Bright Office for the route company id |
| `/bright-office` | Preview — same component, internal company selection |
| `/companies/<non-numeric>` | "ไม่พบบริษัท" error card + back button |
| `/companies/<unknown numeric>` | "ไม่พบบริษัท" error card (no 404 fetch fired) |
| Legacy dark view | `NEXT_PUBLIC_BRIGHT_OFFICE=false` → `LegacyCompanyView` (preserved unchanged) |

Direct load, refresh, and browser back/forward verified crash-free with 0
console errors.

## Dynamic data support

- **Company**: name, description, department/project counts; switching via
  company cards navigates the route (URL is source of truth).
- **Departments (1–15)**: floors match `floor_number`; ≤6 all visible; 7–15 use
  ▲▼ floor-window navigation. Unknown department types render the shell's
  neutral interior with the real name/color on the floor tab. Empty floors show
  "ว่าง — เพิ่มแผนกได้".
- **Agents**: real agents only, placed on their department floor (max 3 shown
  per opening), role-mapped to Bright identities, unknown roles fall back to a
  generic Bright worker, `status` mapped to work/review/idle/offline poses.
- **Projects**: live list with status chips + footer project chips.
- **AI models**: per-department selection with live recommendation; updates
  persist via API.
- **VPS panel**: mock/demo, labeled "(mock/demo)" in the UI.

## Release-blocker fix included

`/companies/<nonexistent numeric id>` previously fired a guaranteed-404 company
fetch (2 console errors). The detail fetch is now gated on the loaded companies
list; unknown ids render the not-found card with zero network noise. This was
the only code change made during release hardening.

## Test results (2026-07-13, all on the release build/code)

- **CRUD regression**: 20/20 (company/department/agent/project/model create,
  edit, delete — deletes return HTTP 204). All CRUD actions implemented.
- **Routes**: `/bright-office`, `/companies/1|2|3|999999`, back/forward/reload
  journey — 0 console errors, 0 failed requests on every run.
- **Edge cases**: 0/1/3/6/8/15 departments, unknown dept types, unknown agent
  roles, 0 agents, 0 projects, missing job description, missing AI model — all
  graceful, fallbacks shown, no crashes.
- **Responsive**: 1920×1080, 1672×941, 1440×900, 1366×768 excellent; 390-wide
  mobile renders a usable stacked fallback.
- **Technical**: `eslint --quiet` 0 errors · `tsc --noEmit` clean ·
  `next build` 15/15 pages (`/companies/[id]` 150 kB first-load JS) ·
  0 hydration errors · 0 broken images.
- **Security**: real keys exist only in gitignored `.env.local`; `.env.example`
  templates hold empty values; frontend references only `NEXT_PUBLIC_*` vars;
  built bundle scanned — no secret patterns.

Validation captures: `outputs/final-production-swap/` (01–18, kept out of git).

## Known accepted V1 visual limitations

Accepted by explicit V1 release decision — do not "fix" without a V2 mandate:

- Not 100% identical to the reference image.
- Tower shell still visually different from the reference building.
- Company card thumbnails are stylized mini towers, not perfect miniatures.
- Worker density lower than the reference.
- Bottom storyboard not an exact reference match.

## P2 backlog

Tracked in `docs/BRIGHT_OFFICE_V2_BACKLOG.md`. Not release work.

## Deployment notes

- **Frontend** (`apps/web`, Next.js 14): `npm run build` / `npm start`, or
  Vercel with root directory `apps/web`. Set `NEXT_PUBLIC_API_URL` to the
  public backend URL (defaults to `http://localhost:8000`). Optional
  `NEXT_PUBLIC_BRIGHT_OFFICE=false` restores the legacy view. All art is served
  from `apps/web/public/assets` (self-contained, ~14 MB).
- **Backend** (`server/`, FastAPI): `uvicorn api.main:app` (port 8000). Env per
  `.env.example` — `DATABASE_URL` (SQLite dev default; PostgreSQL for
  production), `CORS_ORIGINS` must include the deployed web origin.
- No server-only code runs in client components; the web app talks to the API
  only through `NEXT_PUBLIC_API_URL`.

## Rollback plan

1. Instant visual rollback: set `NEXT_PUBLIC_BRIGHT_OFFICE=false` and redeploy
   the frontend — the legacy dark company view returns; no data or schema
   changes are involved either way.
2. Full rollback: revert the release commit
   (`git revert <release-commit>`); the backend is untouched by this release.
