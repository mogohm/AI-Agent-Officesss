# CREATIVE_WORKER.md
Local, Claude-operated creative image worker (Phase 1). A small offline Python CLI
that turns a task JSON into a generated image saved at an exact project asset path,
which the Visual Lab then auto-detects. No server, no queue, no FastAPI endpoints.

- Project root: `ai-agent-office/` (the folder containing `apps/web` and `docs`).
- Worker lives in `tools/creative_worker/`.
- Tasks in `creative_tasks/{pending,completed,failed}/`.
- Outputs in `outputs/{source,generated,screenshots,reports}/`.
- Reference images in `references/`.

## Security
- The OpenAI key lives ONLY in the gitignored `.env.local` at the project root.
- The worker prints only `OPENAI_API_KEY detected: yes|no` — never the value.
- Env priority: `.env.local` → `.env` → OS environment.
- The key is never written into task JSON, reports, source, or logs.
- If the key is missing the worker stops with:
  `OPENAI_API_KEY is missing.` / `Add it to the repository root .env.local file.`

---

## Windows PowerShell — full setup & run

Run everything from the project root: `h:\AIAgentOfficesss\ai-agent-office`.

### 1. Create & activate a virtual environment
```powershell
cd h:\AIAgentOfficesss\ai-agent-office
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
```

### 2. Install dependencies
```powershell
pip install -r tools/creative_worker/requirements.txt
```

### 3. Install the Playwright browser (for the optional screenshot)
```powershell
playwright install chromium
```

### 4. Put the reference image at the exact path
```
references/ai-agent-office-reference.png
```
(Any PNG Pillow can open. Required — generation stops without it.)

### 5. Confirm the secret is present (existence only)
```powershell
Test-Path .env.local                                   # must be True
Select-String -Path .env.local -Pattern '^OPENAI_API_KEY=.+' -Quiet   # must be True
```
The file must contain `OPENAI_API_KEY=<your-key>` and stay gitignored.

### 6. Run generation
```powershell
python tools/creative_worker/run_task.py --task creative_tasks/pending/it-dev-floor-base.json
```
Or the npm convenience script (from `apps/web`, with the venv active):
```powershell
cd apps/web
npm run creative:it-dev-floor
```

### 7. Verify the output
```powershell
Test-Path apps/web/public/assets/office/floors/it-dev/it-dev-floor-base.webp   # True
```
Expected: `1600×600`, `WEBP`. The runner prints `ASSET READY` and
`ENGINE: COMPLETE | ASSET GENERATION: COMPLETE | VISUAL REVIEW: PENDING`.

### 8. Open the Visual Lab
Make sure the web dev server is running (`cd apps/web; npm run dev`), then open:
```
http://localhost:3000/visual-lab/it-dev-floor
```
Asset Status should show `1/13 present · 12 missing`, and the room DEV FALLBACK
disappears (the 3 character fallbacks remain until Batch 02).

### 9. Inspect the report
```
outputs/reports/asset-batch01-it-dev-floor.json
```
Contains status, model used, reference metadata, final asset dimensions,
screenshot status, and any errors. Never contains the key.

### 10. Retry a failed task
On failure the task JSON moves to `creative_tasks/failed/` with an
`error_message`, the source PNG (if any) is preserved in `outputs/source/`, and a
failure report is written. Fix the cause, move the JSON back:
```powershell
Move-Item creative_tasks/failed/it-dev-floor-base.json creative_tasks/pending/
```
then re-run step 6.

---

## How it works (pipeline)
1. Locate project root; load env (`.env.local` > `.env` > OS).
2. Confirm key presence (boolean only).
3. Load + validate the task JSON (Pydantic schema in `task_schema.py`).
4. Load the real prompt from `docs/…` via `prompt_loader.py` (the art prompt is
   NOT hardcoded in Python) and append `prompt_suffix`.
5. Verify the reference image (exists + Pillow-openable; record dims/format).
6. Call OpenAI (`openai_image_worker.py`), reference-guided; save the **untouched
   source PNG** to `outputs/source/`.
7. Post-process (`postprocess.py`): cover-crop to 8:3 honoring focal point, resize
   to exactly 1600×600, save WebP (quality 92, method 6), verify.
8. Optional Visual Lab screenshot (`screenshot_visual_lab.py`, Playwright) →
   `outputs/screenshots/it-dev-floor-latest.png`. Never fails the run.
9. Write `outputs/reports/<task_id>.json`; move the task to `completed/`.

## Model note
The sample task requests `gpt-image-2`. If the current SDK/API rejects that model,
the worker captures the exact API error and retries once with a currently
supported model (`gpt-image-1`), recording the substitution in the report's
`errors` (it does not invent a fake fallback). Generation size is a supported
landscape size; the exact 1600×600 / 8:3 is produced in post-processing.

## Transparency
This first asset uses `transparency_status: "pending_cleanup"` — the floor is
generated opaque and transparency is a later manual/tooling step. The worker does
not fake transparency.
